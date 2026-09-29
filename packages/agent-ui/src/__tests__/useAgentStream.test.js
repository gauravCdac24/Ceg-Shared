import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { streamAgentRequest } from '../useAgentStream.js'

const encoder = new TextEncoder()

function sseResponse(events) {
  const chunks = events.map((ev) => encoder.encode(`data: ${JSON.stringify(ev)}\n\n`))
  return {
    ok: true,
    status: 200,
    body: {
      getReader() {
        let idx = 0
        return {
          read: async () => {
            if (idx >= chunks.length) return { done: true, value: undefined }
            const value = chunks[idx]
            idx += 1
            return { done: false, value }
          },
        }
      },
    },
  }
}

describe('streamAgentRequest', () => {
  it('sends POST with CSRF headers from buildHeaders', async () => {
    const headerCalls = []
    const fetchCalls = []
    const events = []

    const out = await streamAgentRequest({
      payload: { prompt: 'hi' },
      path: '/v1/agent/stream',
      buildUrl: (p) => `http://api.local${p}`,
      buildHeaders: async (method) => {
        headerCalls.push(method)
        return { 'X-CSRF-Token': 'csrf-token', 'Content-Type': 'application/json' }
      },
      fetchImpl: async (url, options) => {
        fetchCalls.push({ url, options })
        return sseResponse([{ event: 'done' }])
      },
      onSseEvent: (ev) => events.push(ev),
    })

    assert.deepEqual(headerCalls, ['POST'])
    assert.equal(fetchCalls.length, 1)
    assert.equal(fetchCalls[0].url, 'http://api.local/v1/agent/stream')
    assert.equal(fetchCalls[0].options.credentials, 'include')
    assert.equal(fetchCalls[0].options.headers['X-CSRF-Token'], 'csrf-token')
    assert.equal(events.length, 1)
    assert.equal(events[0].event, 'done')
    assert.equal(out.length, 1)
  })

  it('retries on 429 and succeeds on second attempt', async () => {
    let attempts = 0

    const out = await streamAgentRequest({
      payload: { prompt: 'retry test' },
      path: '/v1/agent/stream',
      buildUrl: (p) => p,
      buildHeaders: async () => ({ 'X-CSRF-Token': 'csrf-token' }),
      retries: 1,
      sleep: async () => {},
      fetchImpl: async () => {
        attempts += 1
        if (attempts === 1) {
          return {
            ok: false,
            status: 429,
            text: async () => JSON.stringify({ detail: 'Too many requests' }),
          }
        }
        return sseResponse([{ event: 'done' }])
      },
    })

    assert.equal(attempts, 2)
    assert.equal(out.at(-1)?.event, 'done')
  })

  it('aborts stream when timeout is exceeded', async () => {
    const started = Date.now()

    await assert.rejects(
      streamAgentRequest({
        payload: { prompt: 'slow request' },
        path: '/v1/agent/stream',
        buildUrl: (p) => p,
        buildHeaders: async () => ({ 'X-CSRF-Token': 'csrf-token' }),
        timeoutMs: 20,
        fetchImpl: async (_url, options) =>
          await new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => {
              const err = new Error('Aborted')
              err.name = 'AbortError'
              reject(err)
            })
          }),
      }),
      (err) => err?.name === 'AbortError',
    )

    assert.ok(Date.now() - started < 500)
  })
})
