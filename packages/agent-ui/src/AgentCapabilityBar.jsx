import { Bug, ChevronDown, Globe, GlobeLock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/**
 * Per-chat capability toggles (web search, debug trace).
 * Web search defaults OFF — user opts in per conversation.
 */
export function AgentCapabilityBar({
  webSearchEnabled = false,
  onWebSearchChange,
  webSearchAllowed = true,
  debugMode = false,
  onDebugModeChange,
  disabled = false,
  showDebugToggle = true,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (e) => {
      const el = rootRef.current
      if (!el) return
      if (el.contains(e.target)) return
      setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const showWebToggle = Boolean(webSearchAllowed)
  const showDebug = Boolean(showDebugToggle)
  if (!showWebToggle && !showDebug) return null

  return (
    <div ref={rootRef} className="ceg-agent-capability-dropdown" aria-label="Chat capabilities">
      <button
        type="button"
        className={`ceg-agent-capability-dropdown__toggle${open ? ' ceg-agent-capability-dropdown__toggle--open' : ''}`}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="Chat capability toggles"
      >
        <span className="ceg-agent-capability-dropdown__toggle-label">Tools</span>
        <ChevronDown size={14} aria-hidden />
      </button>

      {open ? (
        <div className="ceg-agent-capability-dropdown__menu ceg-agent-capability-dropdown__menu--up" role="menu">
          <div className="ceg-agent-capability-bar" role="group" aria-label="Chat capabilities">
            {showWebToggle ? (
              <button
                type="button"
                className={`ceg-agent-capability-bar__btn${webSearchEnabled ? ' ceg-agent-capability-bar__btn--active' : ''}`}
                disabled={disabled || !webSearchAllowed}
                aria-pressed={webSearchEnabled}
                title={
                  !webSearchAllowed
                    ? 'Web search disabled by your organization'
                    : webSearchEnabled
                      ? 'Web search on — agent may search the internet for this chat'
                      : 'Web search off — enable to allow live internet lookup'
                }
                onClick={() => onWebSearchChange?.(!webSearchEnabled)}
              >
                {webSearchEnabled ? <Globe size={14} aria-hidden /> : <GlobeLock size={14} aria-hidden />}
                <span>{webSearchEnabled ? 'Web on' : 'Web off'}</span>
              </button>
            ) : null}

            {showDebug ? (
              <button
                type="button"
                className={`ceg-agent-capability-bar__btn${debugMode ? ' ceg-agent-capability-bar__btn--active' : ''}`}
                disabled={disabled}
                aria-pressed={debugMode}
                title="Show agent tool trace and reasoning steps"
                onClick={() => onDebugModeChange?.(!debugMode)}
              >
                <Bug size={14} aria-hidden />
                <span>Debug</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
