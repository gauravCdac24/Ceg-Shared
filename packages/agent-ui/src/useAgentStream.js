import { useCallback, useEffect, useRef, useState } from 'react'

function parseSseChunk(buffer) {
  const events = []
  const blocks = buffer.split('\n\n')
  const rest = blocks.pop() || ''
  for (const block of blocks) {
    const line = block.split('\n').find((l) => l.startsWith('data: '))
    if (!line) continue
    try {
      events.push(JSON.parse(line.slice(6)))
    } catch {
      /* ignore malformed */
    }
  }
  return { events, rest }
}

/**
 * SSE client for agent POST streams (HttpOnly cookie + CSRF via buildHeaders).
 */
export function useAgentStream({
  streamPath = '/stream',
  apiBase = '/v1/agent',
  buildUrl,
  buildHeaders,
  preferQueue = false,
  onQueueFallback,
}) {
  const [streaming, setStreaming] = useState(false)
  const [events, setEvents] = useState([])
  const abortRef = useRef(null)

  const reset = useCallback(() => {
    setEvents([])
  }, [])

  const send = useCallback(
    async (payload, { onEvent, onAction, retries = 3, timeoutMs } = {}) => {
      if (!buildUrl || !buildHeaders) {
        throw new Error('useAgentStream requires buildUrl and buildHeaders')
      }
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const path = `${apiBase.replace(/\/$/, '')}${streamPath.startsWith('/') ? streamPath : `/${streamPath}`}`
      setStreaming(true)
      setEvents([])

      const dispatch = (ev) => {
        if (ev?.event === 'action' && onAction) onAction(ev.action || ev)
        onEvent?.(ev)
      }

      try {
        const base = apiBase.replace(/\/$/, '')
        if (preferQueue) {
          return await queueAndPollAgentJob({
            payload,
            apiBase: base,
            buildUrl,
            buildHeaders,
            controller,
            onSseEvent: (ev) => {
              setEvents((prev) => [...prev, ev])
              dispatch(ev)
            },
            fetchImpl: fetch,
            sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
          })
        }
        return await streamAgentRequest({
          payload,
          path,
          apiBase: base,
          buildUrl,
          buildHeaders,
          retries,
          timeoutMs,
          controller,
          onSseEvent: (ev) => {
            setEvents((prev) => [...prev, ev])
            dispatch(ev)
          },
          onQueueFallback,
        })
      } finally {
        setStreaming(false)
      }
    },
    [apiBase, buildHeaders, buildUrl, preferQueue, streamPath, onQueueFallback],
  )

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  return { send, streaming, events, reset, abort: () => abortRef.current?.abort() }
}

export { parseSseChunk }

const AGENT_JOB_POLL_MS = 350
const AGENT_JOB_IDLE_TIMEOUT_MS = 600_000

export async function queueAndPollAgentJob({
  payload,
  apiBase,
  buildUrl,
  buildHeaders,
  controller,
  fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  onSseEvent,
}) {
  const activeController = controller || new AbortController()
  const queueRes = await fetchImpl(buildUrl(`${apiBase}/jobs`), {
    method: 'POST',
    credentials: 'include',
    headers: await buildHeaders('POST'),
    body: JSON.stringify(payload),
    signal: activeController.signal,
  })
  if (!queueRes.ok) {
    let detail = 'Agent queue request failed'
    try {
      const j = await queueRes.json()
      detail = j?.detail?.message || j?.detail || detail
    } catch {
      /* ignore */
    }
    const err = new Error(typeof detail === 'string' ? detail : 'Agent queue request failed')
    err.status = queueRes.status
    throw err
  }
  const queued = await queueRes.json()
  const jobId = queued?.job_id
  if (!jobId) throw new Error('Agent queue did not return job_id')
  return pollAgentJobEvents({
    jobId,
    apiBase,
    buildUrl,
    buildHeaders,
    controller: activeController,
    fetchImpl,
    sleep,
    onSseEvent,
  })
}

export async function pollAgentJobEvents({
  jobId,
  apiBase,
  buildUrl,
  buildHeaders,
  controller,
  fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  onSseEvent,
}) {
  const activeController = controller || new AbortController()
  const collected = []
  let offset = 0
  let idleMs = 0
  onSseEvent?.({ event: 'status', text: 'Queued…', job_id: jobId })

  while (idleMs < AGENT_JOB_IDLE_TIMEOUT_MS) {
    if (activeController.signal.aborted) throw new DOMException('Aborted', 'AbortError')
    const res = await fetchImpl(buildUrl(`${apiBase}/jobs/${jobId}/events?offset=${offset}`), {
      credentials: 'include',
      headers: await buildHeaders('GET'),
      signal: activeController.signal,
    })
    if (!res.ok) throw new Error(`Agent job poll failed: HTTP ${res.status}`)
    const data = await res.json()
    const events = Array.isArray(data?.events) ? data.events : []
    if (events.length) {
      idleMs = 0
      for (const ev of events) {
        offset += 1
        const normalized = typeof ev === 'object' && ev !== null ? ev : { event: 'message', text: String(ev) }
        collected.push(normalized)
        onSseEvent?.(normalized)
        if (normalized.event === 'done') return collected
      }
    } else {
      idleMs += AGENT_JOB_POLL_MS
    }
    const status = String(data?.status || '')
    if (status === 'ready' || status === 'done') {
      const doneEv = { event: 'done', job_id: jobId, status }
      collected.push(doneEv)
      onSseEvent?.(doneEv)
      return collected
    }
    if (status === 'error' || status === 'failed') {
      const errEv = { event: 'error', text: String(data?.error || 'Agent job failed') }
      collected.push(errEv)
      onSseEvent?.(errEv)
      const doneEv = { event: 'done', job_id: jobId, status }
      collected.push(doneEv)
      onSseEvent?.(doneEv)
      return collected
    }
    await sleep(AGENT_JOB_POLL_MS)
  }
  const timeoutEv = { event: 'error', text: 'Timed out waiting for queued agent job' }
  collected.push(timeoutEv)
  onSseEvent?.(timeoutEv)
  onSseEvent?.({ event: 'done', job_id: jobId, status: 'timeout' })
  return collected
}

export async function streamAgentRequest({
  payload,
  path,
  apiBase = '/v1/agent',
  buildUrl,
  buildHeaders,
  retries = 3,
  timeoutMs,
  controller,
  fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  onSseEvent,
  onQueueFallback,
}) {
  const activeController = controller || new AbortController()
  const abortAfterMs = typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : null
  const timeoutId = abortAfterMs ? setTimeout(() => activeController.abort(), abortAfterMs) : null

  let attempt = 0
  try {
    while (attempt <= retries) {
      try {
        const res = await fetchImpl(buildUrl(path), {
          method: 'POST',
          credentials: 'include',
          headers: await buildHeaders('POST'),
          body: JSON.stringify(payload),
          signal: activeController.signal,
        })

        if (!res.ok) {
          let detail = 'Agent request failed'
          try {
            const text = await res.text()
            const j = JSON.parse(text)
            detail = j?.detail?.message || j?.detail || j?.error?.message || detail
            if (Array.isArray(j?.errors) && j.errors.length) {
              detail = j.errors.map((e) => e.message || e.code).filter(Boolean).join('; ') || detail
            }
          } catch {
            /* ignore */
          }
          const detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail)
          if (res.status === 409 && detailStr.includes('agent_queue_mode')) {
            onQueueFallback?.()
            return await queueAndPollAgentJob({
              payload,
              apiBase: apiBase.replace(/\/$/, ''),
              buildUrl,
              buildHeaders,
              controller: activeController,
              fetchImpl,
              sleep,
              onSseEvent,
            })
          }
          const err = new Error(typeof detail === 'string' ? detail : 'Agent request failed')
          err.status = res.status
          throw err
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error('Streaming not supported')

        const decoder = new TextDecoder()
        let buffer = ''
        const collected = []

        while (true) {
          let chunk
          try {
            chunk = await reader.read()
          } catch (readErr) {
            if (readErr?.name === 'AbortError') throw readErr
            throw new Error('Connection lost during AI response. Please try again.')
          }
          const { done, value } = chunk
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const { events: chunkEvents, rest } = parseSseChunk(buffer)
          buffer = rest
          for (const ev of chunkEvents) {
            collected.push(ev)
            onSseEvent?.(ev)
            if (ev?.event === 'done') return collected
          }
        }

        if (buffer.trim()) {
          const { events: tail } = parseSseChunk(`${buffer}\n\n`)
          for (const ev of tail) {
            collected.push(ev)
            onSseEvent?.(ev)
          }
        }
        return collected
      } catch (err) {
        if (err?.name === 'AbortError') throw err
        const status = err?.status
        // Retry only transient network/429 — never hammer opaque 5xx (console spam).
        if (typeof status === 'number' && status >= 400 && status !== 429) {
          throw err
        }
        attempt += 1
        if (attempt > retries) throw err
        await sleep(400 * 2 ** (attempt - 1))
      }
    }
    return []
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
