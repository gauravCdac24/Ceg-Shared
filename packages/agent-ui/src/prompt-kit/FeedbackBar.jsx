import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { Loader2 } from 'lucide-react'

/** Compact per-message thumbs — inline icon pair (~16px), no labels. */
export function FeedbackBar({
  onHelpful,
  onNotHelpful,
  voted,
  busy = false,
  className = '',
  compact = true,
  title,
  onClose,
}) {
  if (voted && !onClose) return null

  if (compact) {
    return (
      <div
        className={`pk-feedback-icons${className ? ` ${className}` : ''}`}
        role="group"
        aria-label="Message feedback"
      >
        <button
          type="button"
          className={`pk-feedback-icons__btn${voted === 'positive' ? ' pk-feedback-icons__btn--on' : ''}`}
          disabled={busy || voted}
          onClick={onHelpful}
          aria-label="Helpful"
          title="Helpful"
        >
          {busy && voted === 'positive' ? (
            <Loader2 size={14} className="ceg-agent-spin" />
          ) : (
            <ThumbsUp size={14} />
          )}
        </button>
        <button
          type="button"
          className={`pk-feedback-icons__btn${voted === 'negative' ? ' pk-feedback-icons__btn--on' : ''}`}
          disabled={busy || voted}
          onClick={onNotHelpful}
          aria-label="Not helpful"
          title="Not helpful"
        >
          {busy && voted === 'negative' ? (
            <Loader2 size={14} className="ceg-agent-spin" />
          ) : (
            <ThumbsDown size={14} />
          )}
        </button>
      </div>
    )
  }

  return (
    <div className={`pk-feedback-bar${className ? ` ${className}` : ''}`} role="group" aria-label="Message feedback">
      {title ? <span className="pk-feedback-bar__title">{title}</span> : null}
      <div className="pk-feedback-bar__actions">
        <button
          type="button"
          className={`pk-feedback-bar__btn${voted === 'positive' ? ' pk-feedback-bar__btn--on' : ''}`}
          disabled={busy || voted}
          onClick={onHelpful}
          aria-label="Helpful"
        >
          {busy && voted === 'positive' ? <Loader2 size={13} className="ceg-agent-spin" /> : <ThumbsUp size={13} />}
        </button>
        <button
          type="button"
          className={`pk-feedback-bar__btn${voted === 'negative' ? ' pk-feedback-bar__btn--on' : ''}`}
          disabled={busy || voted}
          onClick={onNotHelpful}
          aria-label="Not helpful"
        >
          {busy && voted === 'negative' ? <Loader2 size={13} className="ceg-agent-spin" /> : <ThumbsDown size={13} />}
        </button>
      </div>
    </div>
  )
}
