import { Check, Circle, Loader2 } from 'lucide-react'

export function AgentTodoList({ items = [] }) {
  if (!items.length) return null

  return (
    <div className="ceg-agent-panel__todos" aria-live="polite">
      <p className="ceg-agent-panel__todos-title">Working on it</p>
      <ul className="ceg-agent-panel__todo-list">
        {items.map((item) => (
          <li key={item.id} className={`ceg-agent-panel__todo ceg-agent-panel__todo--${item.status}`}>
            {item.status === 'running' ? (
              <Loader2 size={13} className="ceg-agent-spin" aria-hidden />
            ) : item.status === 'done' ? (
              <Check size={13} aria-hidden />
            ) : (
              <Circle size={13} aria-hidden />
            )}
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
