import { RefreshCw, Bot, User } from 'lucide-react'
import {
  ChatContainerWithScroll,
  ChainOfThought,
  ReasoningAuto,
  StepsFromEvents,
  ToolChain,
  ThinkingBar,
  Loader,
  SourceList,
  SystemMessage,
  FeedbackBar,
  Markdown,
  parseThoughtIntoSteps,
  streamingStatusLabel,
  isSubagentTool,
  sanitizeAssistantText,
} from './prompt-kit/index.js'
import { AgentMessageActions } from './AgentMessageActions.jsx'

function formatModelName(name) {
  if (!name) return ''
  const clean = name.replace(/^ollama\//, '')
  if (clean.toLowerCase().includes('qwen')) {
    return 'Cleo Core'
  }
  return clean
}

function formatMessageTime(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  try {
    if (sameDay) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    }
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return null
  }
}

function formatContextMeta(meta) {
  if (!meta || typeof meta !== 'object') return null
  const parts = []
  if (meta.canvas_elements != null) parts.push(`${meta.canvas_elements} canvas elements`)
  if (meta.template_id) parts.push('template context')
  if (meta.model) {
    const formatted = formatModelName(String(meta.model))
    if (formatted) parts.push(formatted)
  }
  if (meta.latency_ms) parts.push(`${meta.latency_ms}ms`)
  return parts.length ? parts.join(' · ') : null
}

export function AgentMessages({
  messages = [],
  streamText = '',
  thought = '',
  thoughtHistory = [],
  toolSteps = [],
  planSteps = [],
  todos = [],
  sources = [],
  emptyMessage = 'Ask a question to get started.',
  agentMode = 'agent',
  showToolSteps = true,
  renderMessageContent,
  renderAssistantFooter,
  onRegenerate,
  onMessageFeedback,
  messageFeedback = {},
  feedbackBusyId = null,
  streaming = false,
  onStopThinking,
  showFeedbackBar = true,
  showContextMeta = false,
  thinkingLabel = 'Cleo is thinking',
  connectionStatus = { status: 'idle', text: '' },
}) {
  const showEmpty =
    messages.length === 0 && !streamText && !thought && !toolSteps.length && !todos.length && !streaming

  const renderText =
    renderMessageContent ||
    ((text, opts = {}) => (opts.markdown === false ? text : <Markdown>{text}</Markdown>))

  const cotSteps = parseThoughtIntoSteps(thought, thoughtHistory)
  const scrollTrigger = messages.length + (streamText?.length || 0) + toolSteps.length + thought.length
  const statusLabel = streamingStatusLabel(toolSteps, thinkingLabel)
  const subagentActive = toolSteps.some((t) => t.status === 'running' && isSubagentTool(t.name))
  const conn = connectionStatus || { status: 'idle', text: '' }
  const showConn = conn.status && conn.status !== 'idle'

  return (
    <ChatContainerWithScroll
      className="ceg-agent-panel__chat-wrap"
      contentClassName="ceg-agent-panel__chat-inner"
      scrollTrigger={scrollTrigger}
    >
      {showConn ? (
        <SystemMessage
          variant={conn.status === 'offline' ? 'error' : 'warning'}
          fill
        >
          {conn.status === 'connecting'
            ? 'Connecting…'
            : conn.text ||
              (conn.status === 'offline'
                ? 'AI service is temporarily unreachable. Retry in a moment.'
                : 'Something went wrong.')}
        </SystemMessage>
      ) : null}

      {showEmpty && emptyMessage ? <p className="ceg-agent-panel__empty">{emptyMessage}</p> : null}

      {agentMode === 'plan' ? (
        <SystemMessage variant="action" fill>
          Plan mode — the agent outlines steps and proposals without auto-applying canvas changes.
        </SystemMessage>
      ) : null}

      <StepsFromEvents
        planSteps={showToolSteps ? [] : planSteps}
        toolSteps={showToolSteps ? [] : toolSteps}
        /* When ToolChain is on, todos duplicate the same tool rows — hide them. */
        todos={showToolSteps ? [] : todos}
        streaming={streaming}
      />

      {messages.map((m) => {
        if (m.role === 'system') {
          const variant = m.tone === 'error' ? 'error' : m.tone === 'warning' ? 'warning' : 'action'
          return (
            <SystemMessage key={m.id} variant={variant} fill={variant === 'error'}>
              {renderText(m.text, { markdown: false })}
            </SystemMessage>
          )
        }

        const contextLabel =
          showContextMeta && m.role === 'assistant' ? formatContextMeta(m.meta) : null
        const timeLabel = formatMessageTime(m.at || m.created_at)
        const voted = messageFeedback[m.id]?.sentiment
        const showActions = m.role === 'assistant' && (onMessageFeedback || onRegenerate) && !renderAssistantFooter
        const isUser = m.role === 'user'
        const displayText =
          isUser || m.role === 'system'
            ? m.text
            : (sanitizeAssistantText(m.text) || m.text)

        return (
          <div key={m.id} className={`ceg-agent-bubble-row ceg-agent-bubble-row--${m.role}`}>
            {!isUser ? (
              <div className="ceg-agent-bubble__avatar ceg-agent-bubble__avatar--ai" aria-hidden>
                <Bot size={14} />
              </div>
            ) : null}
            <div className="ceg-agent-bubble-stack">
              <div className={`ceg-agent-bubble ceg-agent-bubble--${m.role}`}>
                {renderText(displayText, { markdown: !isUser })}
              </div>
              {m.attachments?.length ? (
                <div className="pk-message__attachments">
                  {m.attachments.map((att) =>
                    att.preview ? (
                      <img key={att.filename} src={att.preview} alt={att.filename} className="pk-image" />
                    ) : (
                      <span key={att.filename} className="pk-message__file-chip">
                        {att.filename}
                      </span>
                    ),
                  )}
                </div>
              ) : null}
              {(timeLabel || contextLabel) ? (
                <p className="ceg-agent-bubble__meta">
                  {timeLabel ? <time dateTime={m.at || m.created_at}>{timeLabel}</time> : null}
                  {timeLabel && contextLabel ? ' · ' : null}
                  {contextLabel}
                </p>
              ) : null}
              {showActions && showFeedbackBar && onMessageFeedback ? (
                <FeedbackBar
                  voted={voted}
                  busy={feedbackBusyId === m.id}
                  onHelpful={() => onMessageFeedback(m, { sentiment: 'positive', rating: 5 })}
                  onNotHelpful={() => onMessageFeedback(m, { sentiment: 'negative', rating: 2 })}
                />
              ) : null}
              {showActions && !(showFeedbackBar && onMessageFeedback) ? (
                <AgentMessageActions
                  message={m}
                  onRegenerate={onRegenerate}
                  onFeedback={onMessageFeedback}
                  feedbackState={messageFeedback[m.id]}
                  feedbackBusy={feedbackBusyId === m.id}
                  streaming={streaming}
                />
              ) : null}
              {renderAssistantFooter && m.role === 'assistant' ? renderAssistantFooter(m) : null}
            </div>
            {isUser ? (
              <div className="ceg-agent-bubble__avatar ceg-agent-bubble__avatar--user" aria-hidden>
                <User size={14} />
              </div>
            ) : null}
          </div>
        )
      })}

      {sources.length ? <SourceList sources={sources} /> : null}
      {cotSteps.length ? <ChainOfThought steps={cotSteps} /> : null}

      {/* Streaming turn: thinking → tools → answer (three distinct lanes) */}
      {(thought || thoughtHistory.length) && !cotSteps.length ? (
        <ReasoningAuto text={thought} isStreaming={streaming && !streamText} steps={planSteps} label="Thinking" />
      ) : null}

      {showToolSteps && toolSteps.length ? <ToolChain tools={toolSteps} /> : null}

      {streaming && toolSteps.length === 0 && thought && !streamText ? (
        <ThinkingBar text="Deep reasoning in progress" stopLabel="Answer now" onStop={onStopThinking} />
      ) : null}

      {streaming && !streamText && !thought ? (
        <div className="ceg-agent-bubble-row ceg-agent-bubble-row--assistant">
          <div className="ceg-agent-bubble__avatar ceg-agent-bubble__avatar--ai" aria-hidden>
            <Bot size={14} />
          </div>
          <div className="ceg-agent-bubble-stack">
            <div className="ceg-agent-bubble ceg-agent-bubble--assistant ceg-agent-bubble--loading">
              <Loader
                variant={subagentActive ? 'orbit' : 'drive'}
                text={statusLabel}
                className={subagentActive ? 'pk-loader--subagent' : ''}
              />
            </div>
          </div>
        </div>
      ) : null}

      {streamText ? (
        <div className="ceg-agent-bubble-row ceg-agent-bubble-row--assistant">
          <div className="ceg-agent-bubble__avatar ceg-agent-bubble__avatar--ai" aria-hidden>
            <Bot size={14} />
          </div>
          <div className="ceg-agent-bubble-stack">
            <div className="ceg-agent-bubble ceg-agent-bubble--assistant ceg-agent-bubble--stream">
              {renderText(sanitizeAssistantText(streamText) || streamText)}
              <span className="ceg-agent-panel__cursor" aria-hidden />
            </div>
          </div>
        </div>
      ) : null}
    </ChatContainerWithScroll>
  )
}

export { RefreshCw }
