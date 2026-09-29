export function AgentMemoryBadge({ count = 0, onClear }) {
  if (!count) return null
  return (
    <button
      type="button"
      className="ceg-agent-panel__memory-badge"
      title="Session has stored memory"
      onClick={onClear}
    >
      Memory · {count}
    </button>
  )
}
