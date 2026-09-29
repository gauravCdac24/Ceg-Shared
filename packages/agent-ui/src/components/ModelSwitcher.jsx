import { useCallback, useEffect, useState } from 'react'
import { Bot, ClipboardList, Settings2 } from 'lucide-react'
import { BYOConfigModal } from './BYOConfigModal.jsx'

function formatModelName(name) {
  if (!name) return ''
  const clean = name.replace(/^ollama\//, '')
  if (clean.toLowerCase().includes('qwen')) {
    return 'Cleo Core'
  }
  return clean
}

const DEFAULT_MODES = [
  { id: 'ask', label: 'Ask', icon: Bot, hint: 'Quick Q&A — no tool execution' },
  { id: 'plan', label: 'Plan', icon: ClipboardList, hint: 'Plan only — review before applying' },
  { id: 'agent', label: 'Agent', icon: Bot, hint: 'Execute changes with tools' },
]

function resolveUrl(apiBase, path, buildUrlFn) {
  const full = `${apiBase}${path}`
  return buildUrlFn ? buildUrlFn(full) : full
}

export function ModelSwitcher({
  mode = 'agent',
  onModeChange,
  modes = DEFAULT_MODES,
  apiBase = '/v1/agent',
  aiConfigPath,
  buildUrl,
  buildHeaders,
  disabled = false,
  showModelDropdown = true,
  showBYO = true,
}) {
  const [models, setModels] = useState({ platform: [], active: '', byo: null })
  const [selectedModel, setSelectedModel] = useState('')
  const [loadingModels, setLoadingModels] = useState(false)
  const [byoOpen, setByoOpen] = useState(false)
  const [byoSettings, setByoSettings] = useState(null)

  const loadModels = useCallback(async () => {
    setLoadingModels(true)
    try {
      const headerFn = buildHeaders
      const hdrs = headerFn ? await headerFn('GET') : {}
      const res = await fetch(resolveUrl(apiBase, '/models', buildUrl), {
        credentials: 'include',
        headers: hdrs,
      })
      if (!res.ok) return
      const data = await res.json()
      setModels({
        platform: data.platform || [],
        active: data.active || '',
        byo: data.byo || null,
      })
      setSelectedModel(data.active || data.platform?.[0] || '')
    } catch {
      /* optional endpoint */
    } finally {
      setLoadingModels(false)
    }
  }, [apiBase, buildUrl, buildHeaders])

  useEffect(() => {
    if (showModelDropdown) void loadModels()
  }, [loadModels, showModelDropdown])

  const loadByoSettings = useCallback(async () => {
    if (!aiConfigPath) return
    try {
      const headerFn = buildHeaders
      const hdrs = headerFn ? await headerFn('GET') : {}
      const res = await fetch(resolveUrl('', aiConfigPath, buildUrl), {
        credentials: 'include',
        headers: hdrs,
      })
      if (res.ok) setByoSettings(await res.json())
    } catch {
      /* admin-only on some products */
    }
  }, [aiConfigPath, buildUrl, buildHeaders])

  const openByo = () => {
    void loadByoSettings()
    setByoOpen(true)
  }

  const platformOptions = models.platform.length ? models.platform : selectedModel ? [selectedModel] : []

  return (
    <>
      <div className="ceg-agent-model-switcher">
        <div className="ceg-agent-panel__mode-toggle ceg-agent-model-switcher__modes" role="tablist" aria-label="Agent mode">
          {modes.map(({ id, label, icon: Icon, hint }) => {
            const active = mode === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                title={hint}
                className={`ceg-agent-panel__mode-btn${active ? ' ceg-agent-panel__mode-btn--active' : ''}`}
                disabled={disabled}
                onClick={() => onModeChange?.(id)}
              >
                <Icon size={13} aria-hidden />
                <span>{label}</span>
              </button>
            )
          })}
        </div>

        {showModelDropdown ? (
          <label className="ceg-agent-model-switcher__model">
            <span className="sr-only">Model</span>
            <select
              value={selectedModel}
              disabled={disabled || loadingModels || Boolean(models.byo)}
              onChange={(e) => setSelectedModel(e.target.value)}
              title={models.byo ? `Custom provider: ${formatModelName(models.byo.model)}` : 'Platform model'}
            >
              {models.byo ? (
                <option value={models.byo.model}>Custom: {formatModelName(models.byo.model)}</option>
              ) : (
                platformOptions.map((m) => (
                  <option key={m} value={m}>
                    {formatModelName(m)}
                  </option>
                ))
              )}
              {!platformOptions.length && !models.byo ? <option value="">Default</option> : null}
            </select>
          </label>
        ) : null}

        {showBYO && aiConfigPath ? (
          <button
            type="button"
            className="ceg-agent-model-switcher__byo"
            title="Configure your own AI provider"
            disabled={disabled}
            onClick={openByo}
          >
            <Settings2 size={14} />
            <span>Your provider</span>
          </button>
        ) : null}
      </div>

      <BYOConfigModal
        open={byoOpen}
        onClose={() => setByoOpen(false)}
        apiBase={apiBase}
        aiConfigPath={aiConfigPath}
        buildUrl={buildUrl}
        buildHeaders={buildHeaders}
        initialSettings={byoSettings}
        onSaved={() => {
          void loadModels()
          void loadByoSettings()
        }}
      />
    </>
  )
}
