import { Bot, ChevronDown, ClipboardList, MessageCircle, Palette } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const DEFAULT_MODES = [
  { id: 'agent', label: 'Agent', icon: Bot, hint: 'Execute changes with tools' },
  { id: 'plan', label: 'Plan', icon: ClipboardList, hint: 'Plan only — review before applying' },
  { id: 'design', label: 'Design', icon: Palette, hint: 'Design-focused suggestions (read + preview first)' },
  { id: 'ask', label: 'Ask', icon: MessageCircle, hint: 'Quick Q&A — no tool execution' },
]

/**
 * Agent mode picker. `variant="tabs"` keeps the legacy segmented control;
 * `variant="dropdown"` is the compact composer control (Tools-sibling).
 */
export function AgentModeToggle({
  mode = 'agent',
  onChange,
  disabled = false,
  modes = DEFAULT_MODES,
  className = '',
  variant = 'tabs',
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const active = modes.find((m) => m.id === mode) || modes[0]
  const ActiveIcon = active?.icon || Bot

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  if (variant === 'dropdown') {
    return (
      <div
        ref={rootRef}
        className={'ceg-agent-mode-dropdown' + (className ? ` ${className}` : '')}
        aria-label="Agent mode"
        data-tour="ai-agent-modes"
      >
        <button
          type="button"
          className={`ceg-agent-mode-dropdown__toggle${open ? ' ceg-agent-mode-dropdown__toggle--open' : ''}`}
          disabled={disabled}
          aria-haspopup="menu"
          aria-expanded={open}
          title={active?.hint || 'Agent mode'}
          onClick={() => setOpen((v) => !v)}
        >
          <ActiveIcon size={13} aria-hidden />
          <span>{active?.label || 'Agent'}</span>
          <ChevronDown size={14} aria-hidden />
        </button>
        {open ? (
          <div className="ceg-agent-mode-dropdown__menu" role="menu">
            {modes.map(({ id, label, icon: Icon, hint, disabled: modeDisabled }) => {
              const isDisabled = disabled || Boolean(modeDisabled)
              const isActive = mode === id
              return (
                <button
                  key={id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  title={hint}
                  disabled={isDisabled}
                  className={`ceg-agent-mode-dropdown__item${isActive ? ' ceg-agent-mode-dropdown__item--active' : ''}`}
                  onClick={() => {
                    if (isDisabled) return
                    onChange?.(id)
                    setOpen(false)
                  }}
                >
                  {Icon ? <Icon size={13} aria-hidden /> : null}
                  <span className="ceg-agent-mode-dropdown__item-text">
                    <span className="ceg-agent-mode-dropdown__item-label">{label}</span>
                    {hint ? <span className="ceg-agent-mode-dropdown__item-hint">{hint}</span> : null}
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={'ceg-agent-panel__mode-toggle' + (className ? ' ' + className : '')}
      role="tablist"
      aria-label="Agent mode"
      data-tour="ai-agent-modes"
    >
      {modes.map(({ id, label, icon: Icon, hint, disabled: modeDisabled }) => {
        const isActive = mode === id
        const isDisabled = disabled || Boolean(modeDisabled)
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled || undefined}
            title={hint}
            className={'ceg-agent-panel__mode-btn' + (isActive ? ' ceg-agent-panel__mode-btn--active' : '')}
            disabled={isDisabled}
            onClick={() => {
              if (isDisabled) return
              onChange?.(id)
            }}
          >
            {Icon ? <Icon size={13} aria-hidden /> : null}
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
