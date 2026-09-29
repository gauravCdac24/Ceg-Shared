export function PromptSuggestion({
  children,
  highlight,
  onClick,
  variant = 'outline',
  className = '',
  disabled = false,
}) {
  const text = typeof children === 'string' ? children : String(children || '')

  if (highlight && text.toLowerCase().includes(highlight.toLowerCase())) {
    const idx = text.toLowerCase().indexOf(highlight.toLowerCase())
    const before = text.slice(0, idx)
    const match = text.slice(idx, idx + highlight.length)
    const after = text.slice(idx + highlight.length)
    return (
      <button
        type="button"
        className={`pk-prompt-suggestion pk-prompt-suggestion--highlight${className ? ` ${className}` : ''}`}
        onClick={onClick}
        disabled={disabled}
      >
        {before}
        <mark className="pk-prompt-suggestion__mark">{match}</mark>
        {after}
      </button>
    )
  }

  return (
    <button
      type="button"
      className={`pk-prompt-suggestion pk-prompt-suggestion--${variant}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export function PromptSuggestionGroup({ children, className = '' }) {
  return <div className={`pk-prompt-suggestion-group${className ? ` ${className}` : ''}`}>{children}</div>
}
