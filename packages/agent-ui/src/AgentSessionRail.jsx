import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'

function formatWhen(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export function AgentSessionRail({
  sessions = [],
  activeSessionId = null,
  open = true,
  onToggle,
  onSelect,
  loading = false,
  className = '',
}) {
  return (
    <div
      className={`ceg-agent-session-rail${open ? '' : ' ceg-agent-session-rail--collapsed'}${className ? ` ${className}` : ''}`}
    >
      <button
        type="button"
        className="ceg-agent-session-rail__toggle"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? 'Collapse session list' : 'Expand session list'}
      >
        {open ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
      {open ? (
        <div className="ceg-agent-session-rail__list" role="listbox" aria-label="Recent chats">
          {loading ? <p className="ceg-agent-session-rail__empty">Loading…</p> : null}
          {!loading && sessions.length === 0 ? (
            <p className="ceg-agent-session-rail__empty">No prior chats</p>
          ) : null}
          {sessions.map((s) => {
            const active = String(s.session_id) === String(activeSessionId)
            return (
              <button
                key={s.session_id}
                type="button"
                role="option"
                aria-selected={active}
                className={`ceg-agent-session-rail__item${active ? ' ceg-agent-session-rail__item--active' : ''}`}
                onClick={() => onSelect?.(s.session_id)}
                title={s.title}
              >
                <MessageSquare size={12} aria-hidden />
                <span className="ceg-agent-session-rail__title">{s.title || 'New chat'}</span>
                <span className="ceg-agent-session-rail__when">{formatWhen(s.updated_at)}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
