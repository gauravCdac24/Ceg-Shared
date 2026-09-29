import { ArrowDown } from 'lucide-react'

export function ScrollButton({ onClick, className = '', label = 'Scroll to bottom' }) {
  return (
    <button
      type="button"
      className={`pk-scroll-btn${className ? ` ${className}` : ''}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <ArrowDown size={14} aria-hidden />
    </button>
  )
}
