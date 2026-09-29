import { Copy, Loader2, RefreshCw, ThumbsDown, ThumbsUp } from 'lucide-react'

export function AgentMessageActions({
  message,
  onRegenerate,
  onFeedback,
  feedbackState = null,
  busy = false,
  streaming = false,
}) {
  if (message?.role !== 'assistant') return null

  const voted = feedbackState?.sentiment
  const canCopy = Boolean(message?.text)

  return (
    <div className="ceg-agent-msg-actions" role="toolbar" aria-label="Message actions">
      <button
        type="button"
        className={`ceg-agent-msg-actions__btn${voted === 'positive' ? ' ceg-agent-msg-actions__btn--on' : ''}`}
        disabled={busy || streaming || Boolean(voted)}
        title="Helpful"
        aria-label="Helpful"
        onClick={() => onFeedback?.(message, { sentiment: 'positive', rating: 5 })}
      >
        {busy && voted === 'positive' ? <Loader2 size={14} className="ceg-agent-spin" /> : <ThumbsUp size={14} />}
      </button>
      <button
        type="button"
        className={`ceg-agent-msg-actions__btn${voted === 'negative' ? ' ceg-agent-msg-actions__btn--on' : ''}`}
        disabled={busy || streaming || Boolean(voted)}
        title="Not helpful"
        aria-label="Not helpful"
        onClick={() => onFeedback?.(message, { sentiment: 'negative', rating: 2 })}
      >
        {busy && voted === 'negative' ? <Loader2 size={14} className="ceg-agent-spin" /> : <ThumbsDown size={14} />}
      </button>
      <button
        type="button"
        className="ceg-agent-msg-actions__btn"
        disabled={!canCopy}
        title="Copy"
        aria-label="Copy"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(String(message.text || ''))
          } catch {
            /* ignore */
          }
        }}
      >
        <Copy size={14} />
      </button>
      {onRegenerate ? (
        <button
          type="button"
          className="ceg-agent-msg-actions__btn ceg-agent-msg-actions__btn--text"
          disabled={streaming}
          title="Regenerate response"
          aria-label="Regenerate response"
          onClick={() => onRegenerate(message)}
        >
          <RefreshCw size={14} />
          <span>Regenerate</span>
        </button>
      ) : null}
    </div>
  )
}
