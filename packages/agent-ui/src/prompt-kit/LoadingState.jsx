import { useEffect, useState } from 'react'
import { resolveLoadingPattern } from './loadingStatePatterns.js'

/** Live elapsed label — 100ms ticks anchored to mount time (drift-safe). */
export function useElapsed(active = true) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!active) {
      setSeconds(0)
      return undefined
    }
    const start = performance.now()
    setSeconds(0)
    const tick = window.setInterval(() => {
      setSeconds((performance.now() - start) / 1000)
    }, 100)
    return () => window.clearInterval(tick)
  }, [active])

  if (seconds < 60) return `${seconds.toFixed(1)}s`
  return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(1)}s`
}

/**
 * Pixel-grid loader for long-running AI work (Cleo thinking, tools, reasoning).
 * Variants: Drive (chevron wave), Dots (round cells), Orbit (perimeter comet).
 */
export function LoadingState({
  label = 'Churning',
  variant = 'Drive',
  showLabel = true,
  showTimer = true,
  compact = false,
  active = true,
  className = '',
}) {
  const elapsed = useElapsed(active && showTimer)
  const { delays, dur, round } = resolveLoadingPattern(variant)

  return (
    <div
      className={`pk-loading-state${compact ? ' pk-loading-state--compact' : ''}${className ? ` ${className}` : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={showLabel ? `${label} ${elapsed}` : 'Loading'}
    >
      <span aria-hidden className="pk-loading-state__grid">
        {delays.map((d, i) => (
          <span
            key={i}
            className={`pk-loading-state__cell${round ? ' pk-loading-state__cell--round' : ''}`}
            style={{
              opacity: d === null ? 0.07 : 0.15,
              animation: d === null ? 'none' : `pk-pixel-on ${dur}ms ease-in-out ${d}ms infinite`,
            }}
          />
        ))}
      </span>
      {showLabel ? (
        <span className="pk-loading-state__label">{label}</span>
      ) : null}
      {showTimer ? (
        <span className="pk-loading-state__timer" aria-hidden={!showLabel}>
          {elapsed}
        </span>
      ) : null}
    </div>
  )
}
