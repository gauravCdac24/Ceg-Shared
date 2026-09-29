import { X } from 'lucide-react'

export function AgentHeader({ title = 'AI Agent', onClose, children, product }) {
  return (
    <header className="ceg-agent-panel__head">
      <span className="ceg-agent-panel__title">{title}</span>
      {product ? <span className="ceg-agent-panel__product">{product}</span> : null}
      <div className="ceg-agent-panel__head-actions">
        {children}
        {onClose ? (
          <button type="button" className="ceg-agent-panel__icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        ) : null}
      </div>
    </header>
  )
}
