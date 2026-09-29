const WARN_RATIO = 0.8

export function AgentContextMeter({
  contextTokens = 0,
  contextLimit = 8192,
  turnCount = 0,
  sessionTurnLimit = 0,
  className = '',
}) {
  const limit = Math.max(1, Number(contextLimit) || 8192)
  const used = Math.max(0, Number(contextTokens) || 0)
  const ratio = used / limit
  const pct = Math.min(100, Math.round(ratio * 100))
  const warn = ratio >= WARN_RATIO
  const turnCap = Math.max(0, Number(sessionTurnLimit) || 0)
  const turnsNearCap = turnCap > 0 && turnCount >= Math.max(1, turnCap - 2)

  if (!used && !turnCount) return null

  const turnLabel = turnCap > 0 ? `${turnCount}/${turnCap} turns` : turnCount > 0 ? `${turnCount} turns` : 'Context'

  return (
    <div
      className={`ceg-agent-context-meter${warn || turnsNearCap ? ' ceg-agent-context-meter--warn' : ''}${className ? ` ${className}` : ''}`}
      role="status"
      title={`~${used.toLocaleString()} / ${limit.toLocaleString()} tokens · ${turnLabel}`}
    >
      <span className="ceg-agent-context-meter__label">{turnLabel}</span>
      <span className="ceg-agent-context-meter__bar" aria-hidden>
        <span className="ceg-agent-context-meter__fill" style={{ width: `${pct}%` }} />
      </span>
      {warn || turnsNearCap ? (
        <span className="ceg-agent-context-meter__hint">Start a new chat for best results</span>
      ) : null}
    </div>
  )
}
