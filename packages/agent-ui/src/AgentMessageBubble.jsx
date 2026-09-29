import { Bot, User } from 'lucide-react'
import { AgentMessageActions } from './AgentMessageActions.jsx'

function formatModelName(name) {
  if (!name) return ''
  const clean = name.replace(/^ollama\//, '')
  if (clean.toLowerCase().includes('qwen')) {
    return 'Cleo Core'
  }
  return clean
}

function formatContextMeta(meta) {
  if (!meta || typeof meta !== 'object') return null
  const parts = []
  if (meta.canvas_elements != null) parts.push(`${meta.canvas_elements} canvas elements`)
  if (meta.template_id) parts.push('template context')
  if (meta.model) {
    const formatted = formatModelName(String(meta.model))
    if (formatted) parts.push(formatted)
  }
  if (meta.latency_ms) parts.push(`${meta.latency_ms}ms`)
  return parts.length ? parts.join(' · ') : null
}

export function AgentMessageBubble({
  message,
  renderContent,
  onRegenerate,
  onFeedback,
  feedbackState,
  feedbackBusy,
  streaming,
  showActions = true,
  renderFooter,
}) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const contextLabel = !isUser ? formatContextMeta(message.meta) : null

  if (isSystem) {
    return (
      <div className="ceg-agent-bubble ceg-agent-bubble--system" role="status">
        {renderContent(message.text)}
      </div>
    )
  }

  return (
    <div className={`ceg-agent-bubble-row ceg-agent-bubble-row--${message.role}`}>
      {!isUser ? (
        <div className="ceg-agent-bubble__avatar ceg-agent-bubble__avatar--ai" aria-hidden>
          <Bot size={14} />
        </div>
      ) : null}
      <div className="ceg-agent-bubble-stack">
        <div className={`ceg-agent-bubble ceg-agent-bubble--${message.role}${message.tone ? ` ceg-agent-bubble--${message.tone}` : ''}`}>
          {renderContent(message.text)}
        </div>
        {contextLabel ? (
          <p className="ceg-agent-bubble__meta" title="Context used for this reply">
            {contextLabel}
          </p>
        ) : null}
        {showActions && !isUser && !renderFooter ? (
          <AgentMessageActions
            message={message}
            onRegenerate={onRegenerate}
            onFeedback={onFeedback}
            feedbackState={feedbackState}
            busy={feedbackBusy}
            streaming={streaming}
          />
        ) : null}
        {renderFooter ? renderFooter(message) : null}
      </div>
      {isUser ? (
        <div className="ceg-agent-bubble__avatar ceg-agent-bubble__avatar--user" aria-hidden>
          <User size={14} />
        </div>
      ) : null}
    </div>
  )
}
