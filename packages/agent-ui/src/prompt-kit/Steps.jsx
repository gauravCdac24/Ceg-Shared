import { useState } from 'react'
import { ChevronDown, Circle, Loader2, Check, AlertCircle } from 'lucide-react'
import { Loader } from './Loader.jsx'
import { humanizeToolName, mapToolStatus } from './utils.js'

export function Steps({ title = 'Agent steps', defaultOpen = true, children, className = '' }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`pk-steps${className ? ` ${className}` : ''}`}>
      <button type="button" className="pk-steps__trigger" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Circle size={8} className="pk-steps__dot" aria-hidden />
        <span>{title}</span>
        <ChevronDown size={14} className={`pk-steps__chev${open ? ' pk-steps__chev--open' : ''}`} aria-hidden />
      </button>
      {open ? (
        <div className="pk-steps__content">
          <div className="pk-steps__bar" aria-hidden />
          <div className="pk-steps__items">{children}</div>
        </div>
      ) : null}
    </div>
  )
}

export function StepsItem({ children, status = 'pending', className = '' }) {
  const icon =
    status === 'running' ? <Loader2 size={13} className="ceg-agent-spin" aria-hidden /> :
    status === 'done' || status === 'completed' ? <Check size={13} aria-hidden /> :
    status === 'error' ? <AlertCircle size={13} aria-hidden /> :
    <Circle size={8} aria-hidden />

  return (
    <div className={`pk-steps__item pk-steps__item--${status}${className ? ` ${className}` : ''}`}>
      <span className="pk-steps__item-icon">{icon}</span>
      <span className="pk-steps__item-text">{children}</span>
    </div>
  )
}

export function StepsFromEvents({ planSteps = [], toolSteps = [], todos = [], streaming = false, className = '' }) {
  const items = []
  for (const t of todos) {
    items.push({ id: t.id, text: t.text, status: t.status || 'pending' })
  }
  for (const p of planSteps) {
    if (!items.some((i) => i.text === p.text)) {
      items.push({ id: p.id, text: p.text, status: p.status || 'done' })
    }
  }
  for (const tool of toolSteps) {
    items.push({
      id: tool.id,
      text: tool.text || humanizeToolName(tool.name),
      status: mapToolStatus(tool.status),
    })
  }
  if (!items.length) return null

  const running = items.some((i) => i.status === 'running')
  const title = streaming || running ? 'Working on it…' : 'Steps completed'

  return (
    <Steps title={title} defaultOpen={streaming || running} className={className}>
      {items.map((item) => (
        <StepsItem key={item.id} status={item.status === 'done' ? 'completed' : item.status}>
          {item.text}
        </StepsItem>
      ))}
      {streaming && !items.some((i) => i.status === 'running') ? (
        <StepsItem status="running">
          <Loader variant="drive" size="sm" text="Planning next action" />
        </StepsItem>
      ) : null}
    </Steps>
  )
}
