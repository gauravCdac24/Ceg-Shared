import { Info, AlertTriangle, AlertCircle } from 'lucide-react'
import { renderIcon } from './renderIcon.js'

const VARIANTS = {
  action: { icon: Info, className: 'pk-sys-msg--action' },
  warning: { icon: AlertTriangle, className: 'pk-sys-msg--warning' },
  error: { icon: AlertCircle, className: 'pk-sys-msg--error' },
}

export function SystemMessage({
  children,
  variant = 'action',
  fill = false,
  icon,
  isIconHidden = false,
  cta,
  className = '',
}) {
  const cfg = VARIANTS[variant] || VARIANTS.action
  const Icon = icon || cfg.icon

  return (
    <div
      className={`pk-sys-msg ${cfg.className}${fill ? ' pk-sys-msg--fill' : ''}${className ? ` ${className}` : ''}`}
      role="status"
    >
      {!isIconHidden ? (
        <span className="pk-sys-msg__icon" aria-hidden>
          {renderIcon(Icon, { size: 14 })}
        </span>
      ) : null}
      <div className="pk-sys-msg__body">{children}</div>
      {cta?.label ? (
        <button type="button" className={`pk-sys-msg__cta pk-sys-msg__cta--${cta.variant || 'solid'}`} onClick={cta.onClick}>
          {cta.label}
        </button>
      ) : null}
    </div>
  )
}
