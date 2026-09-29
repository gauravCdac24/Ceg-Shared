import { Loader2, Wrench } from 'lucide-react'

export function ToolCallStep({ name, text, status = 'running' }) {
  return (
    <div className={`ceg-agent-panel__tool-step ceg-agent-panel__tool-step--${status}`}>
      {status === 'running' ? <Loader2 size={14} className="ceg-agent-spin" /> : <Wrench size={14} />}
      <span className="ceg-agent-panel__tool-name">{name || 'tool'}</span>
      {text ? <span className="ceg-agent-panel__tool-text">{text}</span> : null}
    </div>
  )
}
