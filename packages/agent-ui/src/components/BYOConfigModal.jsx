import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const PROVIDERS = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'google', label: 'Google' },
  { id: 'openai_compatible', label: 'OpenAI-compatible' },
  { id: 'ollama', label: 'Ollama (remote)' },
]

function buildUrl(apiBase, path, buildUrlFn) {
  const full = `${apiBase}${path}`
  return buildUrlFn ? buildUrlFn(full) : full
}

export function BYOConfigModal({
  open,
  onClose,
  apiBase = '/v1/agent',
  aiConfigPath,
  buildUrl: buildUrlFn,
  buildHeaders,
  initialSettings = null,
  onSaved,
}) {
  const [mode, setMode] = useState('platform')
  const [provider, setProvider] = useState('openai')
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setMode(initialSettings?.mode || 'platform')
    setProvider(initialSettings?.provider || 'openai')
    setModel(initialSettings?.model || '')
    setBaseUrl(initialSettings?.base_url || '')
    setApiKey('')
    setTestResult(null)
    setError('')
  }, [open, initialSettings])

  if (!open) return null

  const payload = () => ({
    mode,
    provider,
    model: model.trim(),
    model_fast: model.trim(),
    base_url: baseUrl.trim(),
    api_key: apiKey.trim() || undefined,
  })

  const resolveHeaders = async (method = 'POST') => {
    const base = { 'Content-Type': 'application/json' }
    if (!buildHeaders) return base
    const extra = await buildHeaders(method)
    return { ...base, ...extra }
  }

  const runTest = async () => {
    setTesting(true)
    setTestResult(null)
    setError('')
    try {
      const res = await fetch(buildUrl(apiBase, '/test-model', buildUrlFn), {
        method: 'POST',
        credentials: 'include',
        headers: await resolveHeaders('POST'),
        body: JSON.stringify({
          base_url: baseUrl.trim(),
          model: model.trim(),
          api_key: apiKey.trim() || undefined,
        }),
      })
      const data = await res.json()
      setTestResult(data)
      if (!res.ok) setError(data?.error || 'Connection test failed')
    } catch (e) {
      setError(e?.message || 'Connection test failed')
    } finally {
      setTesting(false)
    }
  }

  const save = async () => {
    if (!aiConfigPath) {
      setError('AI config save path not configured for this product')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(buildUrl('', aiConfigPath, buildUrlFn), {
        method: 'PUT',
        credentials: 'include',
        headers: await resolveHeaders('PUT'),
        body: JSON.stringify(payload()),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.detail || data?.message || 'Save failed')
      }
      onSaved?.(data)
      onClose?.()
    } catch (e) {
      setError(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ceg-agent-byo-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ceg-agent-byo-modal"
        role="dialog"
        aria-label="Bring your own model"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ceg-agent-byo-modal__head">
          <span>AI model settings</span>
          <button type="button" className="ceg-agent-panel__icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <form
          className="ceg-agent-byo-modal__body"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <label className="ceg-agent-byo-field">
            <span>Mode</span>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="platform">Platform (Ollama)</option>
              <option value="byo">Bring your own</option>
            </select>
          </label>

          {mode === 'byo' ? (
            <>
              <label className="ceg-agent-byo-field">
                <span>Provider</span>
                <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ceg-agent-byo-field">
                <span>Base URL</span>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                />
              </label>
              <label className="ceg-agent-byo-field">
                <span>Model</span>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="gpt-4o-mini"
                />
              </label>
              <label className="ceg-agent-byo-field">
                <span>API key</span>
                <input
                  type="password"
                  name="api_key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter a new key, or leave blank to keep the saved one"
                  autoComplete="new-password"
                />
              </label>
            </>
          ) : null}

          {error ? <p className="ceg-agent-byo-error">{error}</p> : null}
          {testResult ? (
            <p className={`ceg-agent-byo-test${testResult.ok ? ' ceg-agent-byo-test--ok' : ''}`}>
              {testResult.ok
                ? `Connected (${testResult.latency_ms ?? '?'} ms)`
                : testResult.error || 'Test failed'}
            </p>
          ) : null}
        </form>

        <footer className="ceg-agent-byo-modal__foot">
          {mode === 'byo' ? (
            <button type="button" className="ceg-agent-byo-btn" disabled={testing} onClick={() => void runTest()}>
              {testing ? 'Testing…' : 'Test connection'}
            </button>
          ) : null}
          <button type="button" className="ceg-agent-byo-btn ceg-agent-byo-btn--primary" disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </div>
    </div>
  )
}
