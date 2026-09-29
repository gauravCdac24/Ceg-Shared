import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef, createElement } from 'react'
import { History, Sparkles, X } from 'lucide-react'
import { AgentHeader } from './AgentHeader.jsx'
import { AgentMessages } from './AgentMessages.jsx'
import { AgentInput } from './AgentInput.jsx'
import { AgentCapabilityBar } from './AgentCapabilityBar.jsx'
import { AgentModeToggle } from './AgentModeToggle.jsx'
import { AgentAttachmentPicker } from './AgentAttachmentPicker.jsx'
import { AgentMemoryBadge } from './AgentMemoryBadge.jsx'
import { AgentSessionRail } from './AgentSessionRail.jsx'
import { AgentHistoryPalette } from './AgentHistoryPalette.jsx'
import { AgentFullscreenToggle } from './AgentFullscreenToggle.jsx'
import { AgentContextMeter } from './AgentContextMeter.jsx'
import { ModelSwitcher } from './components/ModelSwitcher.jsx'
import { useAgentStream } from './useAgentStream.js'
import { useSpeech } from './useSpeech.js'
import {
  parseSourcesFromToolResult,
  isInternalAgentThought,
  isEphemeralTool,
  sanitizeAssistantText,
} from './prompt-kit/utils.js'
import './prompt-kit/prompt-kit.css'
import './agent-panel.css'

export function AgentFab({ onClick, open, label = 'Open AI agent', ...rest }) {
  return (
    <button
      type="button"
      className={`ceg-agent-fab${open ? ' ceg-agent-fab--open' : ''}`}
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? 'Close AI agent' : label}
      title={label}
      {...rest}
    >
      {open ? <X size={22} /> : <Sparkles size={22} />}
    </button>
  )
}

function extractPlanTodos(thoughtText) {
  const lines = String(thoughtText || '')
    .split(/\n+/)
    .map((line) => line.replace(/^[\s\-*•\d.)]+/, '').trim())
    .filter((line) => line.length > 4)
  return lines.slice(0, 6).map((text, index) => ({
    id: `plan-${index}`,
    text,
    status: 'pending',
  }))
}

/** Short human label for pending actions — never dump raw JSON in the panel. */
function describePendingAction(action) {
  if (!action || typeof action !== 'object') return 'Proposed change'
  const type = String(action.type || action.action || 'change').replace(/_/g, ' ')
  if (action.message) return String(action.message).slice(0, 160)
  if (action.text) return `${type}: ${String(action.text).slice(0, 120)}`
  if (action.css) return `${type} (preview)`
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export const AgentPanel = forwardRef(function AgentPanel(
  {
  product = 'agent',
  sessionMeta = null,
  apiBase = '/v1/agent',
  streamPath = '/stream',
  requestTimeoutMs,
  title = 'AI Agent',
  mode = 'sidebar',
  className = '',
  open = true,
  onClose,
  buildUrl,
  buildHeaders,
  buildPayload,
  onAction,
  onCertificateIssued,
  onError,
  onToolResult,
  onEvent,
  quickActions = [],
  initialMessage = '',
  greeting = '',
  emptyMessage,
  memoryCount = 0,
  onClearMemory,
  disabled = false,
  children,
  showPendingActions = true,
  defaultAgentMode = 'agent',
  onAgentModeChange,
  enableSpeech = true,
  enableModelSwitcher = true,
  aiConfigPath,
  agentModes,
  showToolSteps = true,
  showCapabilityBar = true,
  showModeDropdown = false,
  showAttachmentPicker = true,
  defaultWebSearchEnabled = false,
  showDebugToggle = true,
  renderMessageContent,
  renderAssistantFooter,
  onMessageFeedback,
  enableMessageActions = true,
  footerChildren,
  composerLeading = null,
  composerExtraActions = null,
  composerSuggestions = null,
  composerDisclaimer = null,
  inputPlaceholder,
  showHeader = true,
  showFeedbackBar = true,
  showContextMeta = false,
  showSessionList = false,
  showHistoryPalette = false,
  showFullscreenToggle = false,
  historyPaletteMode = 'modal',
  onHistoryArchive,
  onHistoryUnarchive,
  archivedSessionIds,
  onContextBudgetChange,
  onSessionChange,
  thinkingLabel = 'Cleo is thinking',
  onQueueFallback,
},
  ref,
) {
  const [connectionStatus, setConnectionStatus] = useState({ status: 'idle', text: '' })
  const [chatInput, setChatInput] = useState(initialMessage)
  const [messages, setMessages] = useState([])
  const [streamText, setStreamText] = useState('')
  const [thought, setThought] = useState('')
  const [thoughtHistory, setThoughtHistory] = useState([])
  const [planSteps, setPlanSteps] = useState([])
  const [sources, setSources] = useState([])
  const [toolSteps, setToolSteps] = useState([])
  const [todos, setTodos] = useState([])
  const [pendingActions, setPendingActions] = useState([])
  const [agentMode, setAgentMode] = useState(defaultAgentMode)
  const [webSearchEnabled, setWebSearchEnabled] = useState(defaultWebSearchEnabled)

  useEffect(() => {
    setAgentMode(defaultAgentMode)
  }, [defaultAgentMode])

  const handleAgentModeChange = useCallback(
    (next) => {
      setAgentMode(next)
      onAgentModeChange?.(next)
    },
    [onAgentModeChange],
  )
  const [webSearchAllowed, setWebSearchAllowed] = useState(true)
  const [debugMode, setDebugMode] = useState(false)
  const capabilitiesLoadedRef = useRef(false)
  const [attachments, setAttachments] = useState([])
  const [lastAssistantText, setLastAssistantText] = useState('')
  const [messageFeedback, setMessageFeedback] = useState({})
  const [feedbackBusyId, setFeedbackBusyId] = useState(null)
  const [streamMeta, setStreamMeta] = useState(null)
  const [greetingShown, setGreetingShown] = useState(false)
  const lastRequestMetaRef = useRef(null)
  const endRef = useRef(null)
  const [sessionId, setSessionId] = useState(null)
  const [sessionList, setSessionList] = useState([])
  const [sessionRailOpen, setSessionRailOpen] = useState(true)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [preferQueue, setPreferQueue] = useState(false)
  const [contextBudget, setContextBudget] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyArchiveFilter, setHistoryArchiveFilter] = useState('active')
  const [viewportFullscreen, setViewportFullscreen] = useState(false)
  const [localArchivedIds, setLocalArchivedIds] = useState(() => new Set())

  const { send, streaming, reset, abort } = useAgentStream({
    streamPath,
    apiBase,
    buildUrl,
    buildHeaders,
    preferQueue,
    onQueueFallback,
  })

  const handleTranscript = useCallback((text) => {
    setChatInput((prev) => (prev ? `${prev} ${text}`.trim() : text))
  }, [])

  const speech = useSpeech({ onTranscript: handleTranscript })
  const sendMessageRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText, toolSteps, pendingActions, todos, thought, planSteps, sources])

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  useEffect(() => {
    if (!open) {
      setConnectionStatus({ status: 'idle', text: '' })
    }
  }, [open])

  useEffect(() => {
    if (!open || capabilitiesLoadedRef.current) return
    const loadCapabilities = async () => {
      try {
        const hdrs = buildHeaders ? await buildHeaders('GET') : {}
        const path = `${apiBase.replace(/\/$/, '')}/capabilities`
        const url = buildUrl ? buildUrl(path) : path
        const res = await fetch(url, { credentials: 'include', headers: hdrs })
        if (!res.ok) return
        const data = await res.json()
        capabilitiesLoadedRef.current = true
        const allowed = data.web_search_allowed !== false
        setWebSearchAllowed(allowed)
        if (data.agent_queue_mode === true) {
          setPreferQueue(true)
        }
        if (!allowed) {
          setWebSearchEnabled(false)
        } else if (!defaultWebSearchEnabled) {
          setWebSearchEnabled(Boolean(data.web_search_default))
        }
      } catch {
        /* capabilities endpoint optional on older backends */
      }
    }
    void loadCapabilities()
  }, [open, apiBase, buildUrl, buildHeaders, defaultWebSearchEnabled])

  const pushMessage = useCallback((entry) => {
    setMessages((rows) => [
      ...rows.slice(-48),
      {
        id: `${Date.now()}-${Math.random()}`,
        ...entry,
        at: entry?.at || new Date().toISOString(),
      },
    ])
  }, [])

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId
    if (!buildUrl || !buildHeaders) throw new Error('AgentPanel requires buildUrl and buildHeaders')
    const path = `${apiBase.replace(/\/$/, '')}/sessions`
    const url = buildUrl(path)
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: await buildHeaders('POST'),
      body: JSON.stringify({
        meta: { product, ...(sessionMeta && typeof sessionMeta === 'object' ? sessionMeta : {}) },
      }),
    })
    if (!res.ok) throw new Error('Failed to create agent session')
    const data = await res.json()
    const id = data?.id || data?.session_id
    if (id) setSessionId(id)
    return id
  }, [apiBase, buildHeaders, buildUrl, product, sessionId, sessionMeta])

  const fetchSessions = useCallback(async () => {
    if ((!showSessionList && !showHistoryPalette) || !buildUrl || !buildHeaders) return
    setSessionsLoading(true)
    try {
      const path = `${apiBase.replace(/\/$/, '')}/sessions`
      const url = buildUrl(path)
      const res = await fetch(url, { credentials: 'include', headers: await buildHeaders('GET') })
      if (!res.ok) return
      const data = await res.json()
      const rows = Array.isArray(data?.sessions) ? data.sessions : []
      setSessionList(rows)
    } catch {
      /* optional endpoint */
    } finally {
      setSessionsLoading(false)
    }
  }, [apiBase, buildHeaders, buildUrl, showHistoryPalette, showSessionList])

  const loadSession = useCallback(
    async (sid) => {
      if (!sid || !buildUrl || !buildHeaders) return false
      abort()
      reset()
      setSessionId(sid)
      setMessages([])
      setStreamText('')
      setThought('')
      setThoughtHistory([])
      setPlanSteps([])
      setSources([])
      setToolSteps([])
      setTodos([])
      setPendingActions([])
      setMessageFeedback({})
      setGreetingShown(true)
      setConnectionStatus({ status: 'idle', text: '' })
      try {
        const path = `${apiBase.replace(/\/$/, '')}/sessions/${sid}/history`
        const url = buildUrl(path)
        const res = await fetch(url, { credentials: 'include', headers: await buildHeaders('GET') })
        if (!res.ok) {
          setConnectionStatus({ status: 'error', text: 'Could not load chat history.' })
          onError?.(new Error('Could not load chat history.'))
          return false
        }
        const data = await res.json()
        const items = Array.isArray(data?.messages) ? data.messages : []
        const hydrated = items.map((m, i) => ({
          id: m.id || `hist-${i}`,
          role: m.role === 'assistant' || m.role === 'user' ? m.role : 'assistant',
          text:
            m.role === 'user'
              ? String(m.content || m.text || '')
              : sanitizeAssistantText(String(m.content || m.text || '')) || String(m.content || m.text || ''),
          meta: m.meta || {},
          at: m.created_at || m.at || null,
        })).filter((m) => m.role === 'user' || Boolean(String(m.text || '').trim()))
        setMessages(hydrated)
        if (hydrated.length === 0) {
          setConnectionStatus({ status: 'idle', text: 'No messages in this chat yet.' })
        }
        return true
      } catch (err) {
        setConnectionStatus({ status: 'error', text: 'Could not load chat history.' })
        onError?.(err instanceof Error ? err : new Error('Could not load chat history.'))
        return false
      }
    },
    [abort, apiBase, buildHeaders, buildUrl, onError, reset],
  )

  useEffect(() => {
    if (open && (showSessionList || showHistoryPalette)) void fetchSessions()
  }, [open, showSessionList, showHistoryPalette, fetchSessions])

  useEffect(() => {
    if (!showHistoryPalette || !open) return undefined
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod || String(e.key).toLowerCase() !== 'k') return
      e.preventDefault()
      setHistoryOpen(true)
      void fetchSessions()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fetchSessions, open, showHistoryPalette])

  useEffect(() => {
    if (!viewportFullscreen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !historyOpen) {
        e.preventDefault()
        setViewportFullscreen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [historyOpen, viewportFullscreen])

  useEffect(() => {
    if (!open) {
      setHistoryOpen(false)
      setViewportFullscreen(false)
    }
  }, [open])

  const archivedIdSet = useMemo(() => {
    if (archivedSessionIds) return new Set([...archivedSessionIds].map(String))
    return localArchivedIds
  }, [archivedSessionIds, localArchivedIds])

  const historySessions = useMemo(
    () =>
      sessionList.map((s) => ({
        ...s,
        archived: archivedIdSet.has(String(s.session_id)),
      })),
    [archivedIdSet, sessionList],
  )

  const handleHistoryArchive = useCallback(
    (sid) => {
      setLocalArchivedIds((prev) => new Set([...prev, String(sid)]))
      onHistoryArchive?.(sid)
    },
    [onHistoryArchive],
  )

  const handleHistoryUnarchive = useCallback(
    (sid) => {
      setLocalArchivedIds((prev) => {
        const next = new Set(prev)
        next.delete(String(sid))
        return next
      })
      onHistoryUnarchive?.(sid)
    },
    [onHistoryUnarchive],
  )

  useEffect(() => {
    if (sessionId) onSessionChange?.(sessionId)
  }, [sessionId, onSessionChange])

  const hydrateLatestAssistantMessageId = useCallback(async (sid, assistantText) => {
    if (!sid || !assistantText || !buildUrl || !buildHeaders) return null
    try {
      const path = `${apiBase.replace(/\/$/, '')}/sessions/${sid}/history`
      const url = buildUrl(path)
      const res = await fetch(url, { method: 'GET', credentials: 'include', headers: await buildHeaders('GET') })
      if (!res.ok) return null
      const data = await res.json()
      const items = Array.isArray(data?.messages) ? data.messages : []
      // Find the most recent assistant message matching this exact content.
      for (let i = items.length - 1; i >= 0; i -= 1) {
        const m = items[i]
        if (m?.role === 'assistant' && String(m?.content || m?.text || '') === assistantText) {
          return m?.id || null
        }
      }
    } catch {
      /* non-fatal */
    }
    return null
  }, [apiBase, buildHeaders, buildUrl])

  useEffect(() => {
    if (open && greeting && !greetingShown && messages.length === 0 && !streaming) {
      pushMessage({ role: 'assistant', text: greeting })
      setGreetingShown(true)
    }
  }, [open, greeting, greetingShown, messages.length, streaming, pushMessage])

  const buildMessageMeta = useCallback((payload) => {
    const canvas = payload?.canvas_json
    const objects = canvas && typeof canvas === 'object' ? canvas.objects : null
    return {
      canvas_elements: Array.isArray(objects) ? objects.length : payload?.context?.canvas_element_count,
      template_id: payload?.template_id || payload?.context?.template_id,
    }
  }, [])

  const regenerateMessage = useCallback(
    (assistantMsg) => {
      if (streaming || disabled || !assistantMsg?.id) return
      setMessages((rows) => {
        const idx = rows.findIndex((m) => m.id === assistantMsg.id)
        if (idx <= 0) return rows
        let userIdx = idx - 1
        while (userIdx >= 0 && rows[userIdx].role !== 'user') userIdx -= 1
        if (userIdx < 0) return rows
        const prompt = rows[userIdx].text
        const trimmed = rows.slice(0, idx)
        queueMicrotask(() => void sendMessageRef.current?.(prompt, trimmed))
        return trimmed
      })
    },
    [disabled, streaming],
  )

  const handleMessageFeedback = useCallback(
    async (message, fb) => {
      if (!onMessageFeedback || messageFeedback[message.id]) return
      setFeedbackBusyId(message.id)
      try {
        await onMessageFeedback(message, fb)
        setMessageFeedback((prev) => ({ ...prev, [message.id]: fb }))
      } finally {
        setFeedbackBusyId(null)
      }
    },
    [messageFeedback, onMessageFeedback],
  )

  const handleEvent = useCallback(
    (ev) => {
      if (ev?.event && ev.event !== 'error') {
        setConnectionStatus((prev) => (prev.status === 'idle' ? prev : { status: 'idle', text: '' }))
      }
      if (ev.event === 'thought') {
        const text = ev.text || ''
        const hideThought = isInternalAgentThought(text)
        if ((!hideThought || debugMode) && text.trim()) {
          setThought(text)
          setThoughtHistory((rows) => [...rows, { id: `th-${rows.length}`, text }])
        }
        const planItems = extractPlanTodos(text)
        if (planItems.length) {
          setTodos((rows) => (rows.length ? rows : planItems))
        }
      } else if (ev.event === 'plan_step') {
        const stepText = ev.text || `Step ${ev.step || ''}`
        setPlanSteps((rows) => [
          ...rows,
          { id: `plan-${rows.length}`, text: stepText, status: 'done', step: ev.step },
        ])
        setTodos((rows) => [
          ...rows,
          { id: `plan-${rows.length}`, text: stepText, status: 'pending' },
        ])
      } else if (ev.event === 'plan_complete') {
        setPlanSteps((rows) => rows.map((r) => ({ ...r, status: 'done' })))
        setTodos((rows) => rows.map((r) => ({ ...r, status: 'done' })))
      } else if (ev.event === 'tool_result') {
        const outputText = ev.text || ''
        let toolStatus = ev.error ? 'error' : 'done'
        if (!ev.error && outputText) {
          try {
            const parsed = JSON.parse(outputText)
            if (parsed && typeof parsed === 'object' && parsed.error) toolStatus = 'error'
          } catch {
            /* plain text result */
          }
        }
        setToolSteps((rows) =>
          rows.map((r) =>
            r.name === ev.name
              ? {
                  ...r,
                  status: toolStatus,
                  text: outputText || r.text,
                  output: outputText,
                  error: toolStatus === 'error',
                }
              : r,
          ),
        )
        const found = parseSourcesFromToolResult(ev.text, ev.name)
        if (found.length) {
          setSources((rows) => [...rows, ...found.filter((s) => !rows.some((x) => x.href === s.href))])
        }
        onToolResult?.(ev)
      } else if (ev.event === 'tool') {
        const label = ev.text || ev.name || 'Running tool'
        if (!isEphemeralTool(ev.name)) {
          setToolSteps((rows) => [
            ...rows,
            { id: `t-${rows.length}`, name: ev.name, text: ev.text, status: 'running' },
          ])
          // Todos only when ToolChain is off (StepsFromEvents fallback).
          if (!showToolSteps && !debugMode) {
            setTodos((rows) => [
              ...rows,
              { id: `todo-${rows.length}`, text: label, status: 'running' },
            ])
          }
        }
      } else if (ev.event === 'status') {
        const label = ev.text || 'Working…'
        setToolSteps((rows) => {
          const idx = rows.findIndex((r) => r.name === '_status')
          if (idx >= 0) {
            return rows.map((r, i) => (i === idx ? { ...r, text: label, status: 'running' } : r))
          }
          return [...rows, { id: `status-${rows.length}`, name: '_status', text: label, status: 'running' }]
        })
      } else if (ev.event === 'heartbeat') {
        setToolSteps((rows) => {
          if (rows.some((r) => r.status === 'running')) return rows
          return [
            ...rows,
            { id: `hb-${rows.length}`, name: '_status', text: 'Still working…', status: 'running' },
          ]
        })
      } else if (ev.event === 'token') {
        setStreamText((prev) => prev + (ev.text || ''))
      } else if (ev.event === 'message') {
        setStreamText(sanitizeAssistantText(ev.text || '') || ev.text || '')
      } else if (ev.event === 'action') {
        const action = ev.action || {}
        setPendingActions((rows) => [
          ...rows,
          { id: ev.id || `a-${rows.length}`, action, status: 'pending' },
        ])
        if (agentMode === 'agent') {
          onAction?.(action, 'preview')
        }
      } else if (ev.event === 'error') {
        const text = String(ev.text || 'Agent error')
        // tool_timeout / model loading ≠ Ollama offline — avoid false "Start Ollama" banners
        const isOffline =
          /503|unavailable|circuit|connection refused|connection failed|ECONNREFUSED/i.test(text) &&
          !/tool_timeout|timed out|may still be loading/i.test(text)
        const isOllamaDown = /ollama/i.test(text) && /offline|unavailable|not running|start ollama/i.test(text)
        setConnectionStatus({
          status: isOffline || isOllamaDown ? 'offline' : 'error',
          text,
        })
        // Surface as a chat bubble so "no response" never looks silent.
        setMessages((rows) => [
          ...rows.slice(-48),
          {
            id: `err-${Date.now()}`,
            role: 'system',
            tone: 'error',
            text,
            at: new Date().toISOString(),
          },
        ])
        onError?.(text)
      } else if (ev.event === 'done') {
        // Drop ephemeral status chips; mark real tools done.
        setToolSteps((rows) =>
          rows
            .filter((r) => !isEphemeralTool(r.name))
            .map((r) => ({ ...r, status: r.status === 'error' ? 'error' : 'done' })),
        )
        setTodos((rows) => rows.map((r) => ({ ...r, status: 'done' })))
        if (ev.meta && typeof ev.meta === 'object') {
          setContextBudget(ev.meta)
          onContextBudgetChange?.(ev.meta)
        }
        if (showSessionList) void fetchSessions()
      }

      onEvent?.(ev)

      if (ev?.job_id || ev?.action?.job_id) {
        onCertificateIssued?.(ev.job_id || ev.action?.job_id)
      }
    },
    [agentMode, debugMode, fetchSessions, onAction, onCertificateIssued, onContextBudgetChange, onError, onEvent, onToolResult, showSessionList, showToolSteps],
  )

  const sendMessage = useCallback(
    async (overrideText, messagesOverride) => {
      const text = (overrideText ?? chatInput).trim()
      if (!text || streaming || disabled) return

      const sid = await ensureSession()
      if (sid) setSessionId(sid)
      setConnectionStatus({ status: 'connecting', text: '' })

      if (Array.isArray(messagesOverride)) {
        setMessages(messagesOverride)
      }

      setStreamText('')
      setThought('')
      setThoughtHistory([])
      setPlanSteps([])
      setSources([])
      setToolSteps([])
      setTodos([])
      // WL-081: surface status before first token when TTFT > 500ms
      const earlyStatusTimer = window.setTimeout(() => {
        setToolSteps((rows) => {
          if (rows.length) return rows
          return [{ id: 'early-status', name: '_status', text: 'Working on it…', status: 'running' }]
        })
      }, 500)
      if (!messagesOverride) {
        pushMessage({
          role: 'user',
          text,
          attachments: attachments.map(({ filename, media_type, preview }) => ({
            filename,
            media_type,
            preview,
          })),
        })
      }
      const sentAttachments = attachments.map(({ filename, media_type, base64_data }) => ({
        filename,
        media_type,
        base64_data,
      }))
      setAttachments([])
      setChatInput('')

      let tokenBuf = ''
      try {
        const basePayload = buildPayload(text) || { prompt: text }
        const payload = {
          ...basePayload,
          prompt: basePayload.prompt ?? text,
          session_id: sid || basePayload.session_id,
          mode: agentMode,
          web_search_enabled: webSearchEnabled,
          url_fetch_enabled: webSearchEnabled,
          debug_mode: debugMode,
          attachments: sentAttachments.length ? sentAttachments : basePayload.attachments,
          context: {
            ...(basePayload.context || {}),
            agent_mode: agentMode,
            web_search_enabled: webSearchEnabled,
            url_fetch_enabled: webSearchEnabled,
            debug_mode: debugMode,
            session_capabilities: {
              web_search_enabled: webSearchEnabled,
              url_fetch_enabled: webSearchEnabled,
              debug_mode: debugMode,
            },
          },
        }
        const meta = buildMessageMeta(payload)
        lastRequestMetaRef.current = meta
        setStreamMeta(meta)

        await send(payload, {
          onEvent: (ev) => {
            if (ev.event === 'token') tokenBuf += ev.text || ''
            if (ev.event === 'message') tokenBuf = ev.text || tokenBuf
            handleEvent(ev)
          },
          timeoutMs: requestTimeoutMs,
        })
        if (tokenBuf.trim()) {
          const assistantText = sanitizeAssistantText(tokenBuf) || tokenBuf.trim()
          if (assistantText) {
            const serverId = await hydrateLatestAssistantMessageId(sid, assistantText)
            pushMessage({
              role: 'assistant',
              text: assistantText,
              userPrompt: text,
              meta: { ...lastRequestMetaRef.current, session_id: sid, message_id: serverId || undefined },
            })
            setLastAssistantText(assistantText)
          }
        }
        setStreamText('')
        setToolSteps((rows) => rows.filter((r) => !isEphemeralTool(r.name)))
        setStreamMeta(null)
        setConnectionStatus({ status: 'idle', text: '' })
      } catch (e) {
        if (e?.name !== 'AbortError') {
          const msg = e?.message || 'Agent request failed'
          const textMsg = String(msg || 'Agent request failed')
          const isOffline =
            /503|unavailable|circuit|connection refused|connection failed|ECONNREFUSED/i.test(textMsg) &&
            !/tool_timeout|timed out|aborted|AbortError/i.test(textMsg)
          const isOllamaDown = /ollama/i.test(textMsg) && /offline|unavailable|not running|start ollama/i.test(textMsg)
          setConnectionStatus({
            status: isOffline || isOllamaDown ? 'offline' : 'error',
            text: textMsg,
          })
          onError?.(msg)
        }
        setStreamMeta(null)
      } finally {
        window.clearTimeout(earlyStatusTimer)
      }
    },
    [agentMode, attachments, buildMessageMeta, buildPayload, chatInput, debugMode, disabled, ensureSession, handleEvent, hydrateLatestAssistantMessageId, onError, pushMessage, send, streaming, webSearchEnabled],
  )

  sendMessageRef.current = sendMessage

  const startNewChat = useCallback(() => {
    abort()
    reset()
    setSessionId(null)
    setMessages([])
    setStreamText('')
    setThought('')
    setThoughtHistory([])
    setPlanSteps([])
    setSources([])
    setToolSteps([])
    setTodos([])
    setPendingActions([])
    setMessageFeedback({})
    setGreetingShown(false)
    setConnectionStatus({ status: 'idle', text: '' })
    setContextBudget(null)
    onContextBudgetChange?.(null)
    void fetchSessions()
  }, [abort, fetchSessions, onContextBudgetChange, reset])

  const deleteSession = useCallback(
    async (sid) => {
      if (!sid || !buildUrl || !buildHeaders) return false
      try {
        const path = `${apiBase.replace(/\/$/, '')}/sessions/${sid}`
        const url = buildUrl(path)
        const res = await fetch(url, {
          method: 'DELETE',
          credentials: 'include',
          headers: await buildHeaders('DELETE'),
        })
        if (!res.ok && res.status !== 204) return false
        if (String(sessionId) === String(sid)) startNewChat()
        else void fetchSessions()
        return true
      } catch {
        return false
      }
    },
    [apiBase, buildHeaders, buildUrl, fetchSessions, sessionId, startNewChat],
  )

  useImperativeHandle(
    ref,
    () => ({
      sendPrompt: (promptText) => sendMessageRef.current?.(promptText),
      setAgentMode: (mode) => setAgentMode(mode),
      getAgentMode: () => agentMode,
      startNewChat,
      loadSession,
      deleteSession,
      getContextBudget: () => contextBudget,
      getSessionId: () => sessionId,
      openHistoryPalette: () => {
        setHistoryOpen(true)
        void fetchSessions()
      },
      closeHistoryPalette: () => setHistoryOpen(false),
      setViewportFullscreen,
      getViewportFullscreen: () => viewportFullscreen,
      setChatInput,
      getChatInput: () => chatInput,
      abortStream: () => abort(),
      isStreaming: () => streaming,
    }),
    [abort, agentMode, chatInput, contextBudget, deleteSession, fetchSessions, loadSession, sessionId, startNewChat, streaming, viewportFullscreen],
  )

  const handleSpeakLast = () => {
    if (speech.speaking) {
      speech.stopSpeaking()
      return
    }
    const toRead = lastAssistantText || chatInput
    if (toRead) speech.speak(toRead)
  }

  if (!open) return null

  const panelClass = [
    'ceg-agent-panel',
    mode === 'full'
      ? 'ceg-agent-panel--full'
      : mode === 'embedded'
        ? 'ceg-agent-panel--embedded'
        : 'ceg-agent-panel--sidebar',
    viewportFullscreen ? 'ceg-agent-panel--viewport' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      {mode === 'sidebar' && onClose ? (
        <button type="button" className="ceg-agent-panel__backdrop" aria-label="Close agent" onClick={onClose} />
      ) : null}
      <aside className={panelClass} role="dialog" aria-label={title}>
        {showHeader ? (
          <AgentHeader title={title} product={product} onClose={onClose}>
            <AgentMemoryBadge count={memoryCount} onClear={onClearMemory} />
            {contextBudget ? (
              <AgentContextMeter
                contextTokens={contextBudget.context_tokens}
                contextLimit={contextBudget.context_limit}
                turnCount={contextBudget.turn_count}
              />
            ) : null}
            {showHistoryPalette ? (
              <button
                type="button"
                className="ceg-agent-panel__icon-btn"
                aria-label="Chat history"
                title="Chat history (Ctrl+K)"
                onClick={() => {
                  setHistoryOpen(true)
                  void fetchSessions()
                }}
              >
                <History size={16} />
              </button>
            ) : null}
            {showFullscreenToggle ? (
              <AgentFullscreenToggle
                active={viewportFullscreen}
                onToggle={setViewportFullscreen}
              />
            ) : null}
          </AgentHeader>
        ) : null}

        <div className="ceg-agent-panel__body">
          {showSessionList && buildUrl ? (
            <AgentSessionRail
              sessions={sessionList}
              activeSessionId={sessionId}
              open={sessionRailOpen}
              loading={sessionsLoading}
              onToggle={() => setSessionRailOpen((v) => !v)}
              onSelect={(sid) => void loadSession(sid)}
            />
          ) : null}

          <div className="ceg-agent-panel__main">
        {quickActions.length > 0 ? (
          <div className="ceg-agent-panel__quick">
            {quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="ceg-agent-panel__quick-btn"
                disabled={streaming || disabled}
                title={action.label}
                onClick={() => void action.run?.()}
              >
                {action.icon ? createElement(action.icon, { size: 14 }) : null}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        ) : null}

        {children}

        <AgentMessages
          messages={messages}
          streamText={streamText}
          thought={thought}
          thoughtHistory={thoughtHistory}
          planSteps={planSteps}
          sources={sources}
          toolSteps={toolSteps}
          todos={todos}
          emptyMessage={emptyMessage}
          agentMode={agentMode}
          showToolSteps={showToolSteps || debugMode}
          renderMessageContent={renderMessageContent}
          renderAssistantFooter={renderAssistantFooter}
          onRegenerate={enableMessageActions ? regenerateMessage : undefined}
          onMessageFeedback={onMessageFeedback ? handleMessageFeedback : undefined}
          messageFeedback={messageFeedback}
          feedbackBusyId={feedbackBusyId}
          streaming={streaming}
          streamMeta={streamMeta}
          onStopThinking={() => abort()}
          showFeedbackBar={showFeedbackBar && Boolean(onMessageFeedback)}
          showContextMeta={showContextMeta}
          thinkingLabel={thinkingLabel}
          connectionStatus={connectionStatus}
        />
        <div ref={endRef} />

        {showPendingActions && pendingActions.filter((a) => a.status === 'pending').length > 0 ? (
          <div className="ceg-agent-panel__actions-panel">
            <p className="ceg-agent-panel__actions-title">
              {agentMode === 'plan' ? 'Proposed plan — switch to Agent to apply' : 'Proposed changes'}
            </p>
            {pendingActions
              .filter((a) => a.status === 'pending')
              .map((row) => (
                <div key={row.id} className="ceg-agent-panel__action-card">
                  <pre>{describePendingAction(row.action)}</pre>
                  {agentMode === 'plan' ? (
                    <button
                      type="button"
                      className="ceg-agent-panel__apply-btn"
                      onClick={() => {
                        onAction?.(row.action, 'commit')
                        setPendingActions((items) =>
                          items.map((a) => (a.id === row.id ? { ...a, status: 'accepted' } : a)),
                        )
                      }}
                    >
                      Apply this change
                    </button>
                  ) : null}
                </div>
              ))}
          </div>
        ) : null}

        {footerChildren}

        <div className="ceg-agent-panel__composer">
          {composerSuggestions}
          {showAttachmentPicker ? (
            <AgentAttachmentPicker
              attachments={attachments}
              onChange={setAttachments}
              disabled={streaming || disabled}
            />
          ) : null}
          <AgentInput
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onSend={() => void sendMessage()}
            onStop={() => abort()}
            streaming={streaming}
            disabled={disabled}
            placeholder={inputPlaceholder || 'Message the agent?'}
            leadingSlot={composerLeading}
            extraActions={composerExtraActions}
            modeDropdown={
              showModeDropdown ? (
                <AgentModeToggle
                  variant="dropdown"
                  mode={agentMode}
                  modes={agentModes}
                  onChange={handleAgentModeChange}
                  disabled={streaming || disabled}
                />
              ) : null
            }
            capabilityDropdown={
              showCapabilityBar ? (
                <AgentCapabilityBar
                  webSearchEnabled={webSearchEnabled}
                  webSearchAllowed={webSearchAllowed}
                  onWebSearchChange={setWebSearchEnabled}
                  debugMode={debugMode}
                  onDebugModeChange={setDebugMode}
                  disabled={streaming || disabled}
                  showDebugToggle={showDebugToggle}
                />
              ) : null
            }
            onToggleListen={enableSpeech ? speech.toggleListening : undefined}
            listening={speech.listening}
            speechSupported={enableSpeech && speech.supported.stt}
            onSpeakLast={enableSpeech ? handleSpeakLast : undefined}
            speaking={speech.speaking}
            ttsSupported={enableSpeech && speech.supported.tts}
          />
          {composerDisclaimer ? (
            <p className="ceg-agent-panel__composer-disclaimer">{composerDisclaimer}</p>
          ) : null}

          {enableModelSwitcher ? (
            <ModelSwitcher
              mode={agentMode}
              onModeChange={handleAgentModeChange}
              modes={agentModes}
              apiBase={apiBase}
              aiConfigPath={aiConfigPath}
              buildUrl={buildUrl}
              buildHeaders={buildHeaders}
              disabled={streaming || disabled}
              showBYO={Boolean(aiConfigPath)}
            />
          ) : null}
        </div>
          </div>
        </div>
      </aside>
      {showHistoryPalette ? (
        <AgentHistoryPalette
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          sessions={historySessions}
          activeSessionId={sessionId}
          loading={sessionsLoading}
          archiveFilter={historyArchiveFilter}
          onArchiveFilterChange={setHistoryArchiveFilter}
          onSelect={(sid) => void loadSession(sid)}
          onArchive={handleHistoryArchive}
          onUnarchive={handleHistoryUnarchive}
          onDelete={(sid) => void deleteSession(sid)}
          mode={historyPaletteMode}
        />
      ) : null}
    </>
  )
})
