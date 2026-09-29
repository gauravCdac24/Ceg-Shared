import { Square } from 'lucide-react'
import { LoadingState } from './LoadingState.jsx'

export function ThinkingBar({ text = 'Thinking', stopLabel = 'Answer now', onStop, onClick, className = '' }) {
  return (
    <button
      type="button"
      className={`pk-thinking-bar${className ? ` ${className}` : ''}`}
      onClick={onClick}
      aria-live="polite"
    >
      <LoadingState label={text} variant="Drive" className="pk-thinking-bar__loader" />
      {onStop ? (
        <span
          role="button"
          tabIndex={0}
          className="pk-thinking-bar__stop"
          onClick={(e) => {
            e.stopPropagation()
            onStop()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              onStop()
            }
          }}
        >
          <Square size={10} aria-hidden />
          {stopLabel}
        </span>
      ) : null}
    </button>
  )
}
