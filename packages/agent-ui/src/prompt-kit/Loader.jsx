import { TextShimmer } from './TextShimmer.jsx'
import { LoadingState } from './LoadingState.jsx'

const VARIANTS = new Set([
  'circular',
  'classic',
  'pulse',
  'pulse-dot',
  'dots',
  'typing',
  'wave',
  'bars',
  'terminal',
  'text-blink',
  'text-shimmer',
  'loading-dots',
  'flicker',
  'drive',
  'orbit',
])

const PIXEL_VARIANTS = {
  flicker: 'Drive',
  drive: 'Drive',
  dots: 'Dots',
  orbit: 'Orbit',
}

export function Loader({ variant = 'circular', size = 'md', text, className = '' }) {
  const v = VARIANTS.has(variant) ? variant : 'circular'
  const sizeClass = size === 'sm' || size === 'lg' ? ` pk-loader--${size}` : ''

  if (v === 'text-shimmer' || v === 'text-blink') {
    return (
      <div className={`pk-loader pk-loader--${v}${sizeClass}${className ? ` ${className}` : ''}`}>
        {text ? <TextShimmer>{text}</TextShimmer> : <TextShimmer>Thinking</TextShimmer>}
      </div>
    )
  }

  if (v === 'loading-dots') {
    return (
      <div className={`pk-loader pk-loader--loading-dots${sizeClass}${className ? ` ${className}` : ''}`} aria-label={text || 'Loading'}>
        {text ? <span>{text}</span> : null}
        <span className="pk-loader__dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </div>
    )
  }

  if (PIXEL_VARIANTS[v]) {
    return (
      <LoadingState
        label={text || 'Thinking'}
        variant={PIXEL_VARIANTS[v]}
        compact={size === 'sm'}
        className={`pk-loader pk-loader--pixel${sizeClass}${className ? ` ${className}` : ''}`}
      />
    )
  }

  return (
    <div
      className={`pk-loader pk-loader--${v}${sizeClass}${className ? ` ${className}` : ''}`}
      role="status"
      aria-label={text || 'Loading'}
    >
      <span className="pk-loader__indicator" aria-hidden />
      {text ? <span className="pk-loader__label">{text}</span> : null}
    </div>
  )
}
