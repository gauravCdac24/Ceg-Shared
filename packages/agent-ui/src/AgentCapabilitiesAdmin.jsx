import { useCallback, useEffect, useState } from 'react'
import './agent-caps-admin.css'

const DEFAULT_CAPS = {
  web_search_allowed: true,
  web_search_default: false,
  url_fetch_allowed: true,
  pdf_parse_allowed: true,
  image_vision_allowed: true,
  debug_mode_allowed: true,
  platform_web_search: true,
  platform_pdf_parse: true,
}

function detailFromError(err) {
  if (!err) return 'Request failed'
  if (typeof err === 'string') return err
  return err?.response?.data?.detail || err?.message || 'Request failed'
}

/**
 * Tenant admin panel for agent capability policy (PATCH /v1/agent/capabilities/policy).
 *
 * Pass either `axios` (axios instance) or `requestFn(method, path, body?)`.
 */
export function AgentCapabilitiesAdmin({
  apiBase = '/v1/agent',
  axios,
  requestFn,
  disabled = false,
  showHeader = true,
  className = '',
}) {
  const [caps, setCaps] = useState(DEFAULT_CAPS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  const callApi = useCallback(
    async (method, suffix, body) => {
      const path = `${apiBase.replace(/\/$/, '')}${suffix}`
      if (axios) {
        const res =
          method === 'GET'
            ? await axios.get(path)
            : await axios.patch(path, body)
        return res.data
      }
      if (requestFn) {
        return requestFn(method, path, body)
      }
      throw new Error('AgentCapabilitiesAdmin requires axios or requestFn')
    },
    [apiBase, axios, requestFn],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await callApi('GET', '/capabilities')
      setCaps({ ...DEFAULT_CAPS, ...data })
    } catch (e) {
      setError(detailFromError(e))
    } finally {
      setLoading(false)
    }
  }, [callApi])

  useEffect(() => {
    void load()
  }, [load])

  const patch = async (field, value) => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const data = await callApi('PATCH', '/capabilities/policy', { [field]: value })
      setCaps({ ...DEFAULT_CAPS, ...data })
      setSaved(true)
    } catch (e) {
      setError(detailFromError(e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={`ceg-agent-caps-admin ${className}`.trim()} aria-busy="true">
        Loading agent capabilities…
      </div>
    )
  }

  const toggles = [
    { key: 'web_search_allowed', label: 'Allow web search', hint: 'Users can enable globe toggle per chat' },
    { key: 'web_search_default', label: 'Web search on by default', hint: 'New chats start with web search enabled' },
    { key: 'url_fetch_allowed', label: 'Allow URL fetch', hint: 'Agent may read URLs when web search is on' },
    { key: 'pdf_parse_allowed', label: 'Allow PDF attachments', hint: 'Syllabus PDF upload in agent composer' },
    { key: 'image_vision_allowed', label: 'Allow image vision', hint: 'Describe uploaded images via llava' },
    { key: 'debug_mode_allowed', label: 'Allow debug mode', hint: 'Show tool trace in chat UI' },
  ]

  return (
    <div className={`ceg-agent-caps-admin ${className}`.trim()}>
      {showHeader ? (
        <>
          <h3 className="ceg-agent-caps-admin__title">Agent capabilities</h3>
          <p className="ceg-agent-caps-admin__intro">
            Control what your organization&apos;s AI agent may do. Platform kill switches still apply
            {!caps.platform_web_search ? ' (web search disabled on this deployment).' : '.'}
          </p>
        </>
      ) : null}
      {caps.new_agent_tools_enabled === false ? (
        <p className="ceg-agent-caps-admin__hint" role="status">
          Extended agent tools are off on this deployment (<code>ENABLE_NEW_AGENT_TOOLS</code>).
          Runtime tools: {(caps.enabled_tool_names || []).length} registered.
        </p>
      ) : null}
      {error ? (
        <p className="ceg-agent-caps-admin__error" role="alert">
          {error}
        </p>
      ) : null}
      {!caps.platform_web_search ? (
        <p className="ceg-agent-caps-admin__notice">
          Web search is disabled by the deployment policy.
        </p>
      ) : null}
      {saved ? <p className="ceg-agent-caps-admin__saved">Saved.</p> : null}
      <ul className="ceg-agent-caps-admin__list">
        {toggles.map(({ key, label, hint }) => {
          const on = Boolean(caps[key])
          const platformBlocked =
            (key.startsWith('web_search') || key === 'url_fetch_allowed') && !caps.platform_web_search
          const itemDisabled = disabled || saving || platformBlocked
          return (
            <li key={key} className="ceg-agent-caps-admin__item">
              <label className="ceg-agent-caps-admin__label">
                <span className="ceg-agent-caps-admin__copy">
                  <span className="ceg-agent-caps-admin__name">{label}</span>
                  <span className="ceg-agent-caps-admin__hint">{hint}</span>
                </span>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={itemDisabled}
                  onChange={(e) => void patch(key, e.target.checked)}
                />
                <span className="ceg-agent-caps-admin__switch" aria-hidden="true">
                  <span className="ceg-agent-caps-admin__switch-thumb" />
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
