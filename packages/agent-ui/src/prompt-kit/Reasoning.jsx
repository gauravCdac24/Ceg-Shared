import { useEffect, useState } from 'react'
import { ChevronDown, Brain } from 'lucide-react'
import { Markdown } from './Markdown.jsx'
import { LoadingState } from './LoadingState.jsx'

export function ReasoningTrigger({ children, open, onToggle, className = '' }) {
  return (
    <button type="button" className={`pk-reasoning-trigger${className ? ` ${className}` : ''}`} onClick={onToggle} aria-expanded={open}>
      <Brain size={14} aria-hidden />
      <span>{children || 'Show reasoning'}</span>
      <ChevronDown size={14} className={`pk-reasoning-trigger__chev${open ? ' pk-reasoning-trigger__chev--open' : ''}`} aria-hidden />
    </button>
  )
}

export function ReasoningContent({ children, open, markdown = false, className = '' }) {
  if (!open) return null
  return (
    <div className={`pk-reasoning-content${className ? ` ${className}` : ''}`}>
      {markdown ? <Markdown>{children}</Markdown> : children}
    </div>
  )
}

export function Reasoning({
  children,
  isStreaming = false,
  defaultOpen,
  markdown = true,
  className = '',
  label = 'Reasoning',
}) {
  const [open, setOpen] = useState(defaultOpen ?? isStreaming)
  const controlledOpen = isStreaming ? true : open

  return (
    <div className={`pk-reasoning${className ? ` ${className}` : ''}`}>
      <ReasoningTrigger open={controlledOpen} onToggle={() => setOpen((v) => !v)}>
        {isStreaming ? `${label}…` : label}
      </ReasoningTrigger>
      <ReasoningContent open={controlledOpen} markdown={markdown}>
        {children}
      </ReasoningContent>
    </div>
  )
}

export function ReasoningAuto({ text, isStreaming, steps, className = '', label = 'Thinking' }) {
  const [open, setOpen] = useState(Boolean(isStreaming))
  const hasContent = Boolean(text?.trim()) || (steps?.length > 0)

  useEffect(() => {
    if (isStreaming) setOpen(true)
  }, [isStreaming])

  if (!hasContent && !isStreaming) return null

  if (!hasContent && isStreaming) {
    return <LoadingState label={label} variant="Drive" className={className} />
  }

  if (steps?.length) {
    return (
      <div className={`pk-reasoning${className ? ` ${className}` : ''}`}>
        <ReasoningTrigger open={open || isStreaming} onToggle={() => setOpen((v) => !v)}>
          {isStreaming ? `${label}…` : label}
        </ReasoningTrigger>
        <ReasoningContent open={open || isStreaming}>
          <ul className="pk-reasoning-steps">
            {steps.map((s) => (
              <li key={s.id} className={`pk-reasoning-steps__item pk-reasoning-steps__item--${s.status || 'done'}`}>
                {s.text}
              </li>
            ))}
          </ul>
        </ReasoningContent>
      </div>
    )
  }

  return (
    <Reasoning isStreaming={isStreaming} defaultOpen={isStreaming} label={label} className={className} markdown={false}>
      <Markdown>{text}</Markdown>
    </Reasoning>
  )
}
