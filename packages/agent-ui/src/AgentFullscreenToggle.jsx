import { Maximize2, Minimize2 } from 'lucide-react'

/** Icon button — host applies `ceg-agent-panel--viewport` when active. */
export function AgentFullscreenToggle({
  active = false,
  onToggle,
  disabled = false,
  expandLabel = 'Expand chat',
  collapseLabel = 'Exit full screen',
}) {
  return (
    <button
      type="button"
      className="ceg-agent-panel__icon-btn"
      onClick={() => onToggle?.(!active)}
      disabled={disabled}
      aria-pressed={active}
      aria-label={active ? collapseLabel : expandLabel}
      title={active ? collapseLabel : expandLabel}
    >
      {active ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
    </button>
  )
}
