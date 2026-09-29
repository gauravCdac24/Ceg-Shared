function faviconUrl(href) {
  try {
    const host = new URL(href).hostname
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`
  } catch {
    return null
  }
}

export function Source({ href, children, className = '' }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`pk-source${className ? ` ${className}` : ''}`}>
      {children}
    </a>
  )
}

export function SourceTrigger({ label, href, showFavicon = true, className = '' }) {
  const favicon = showFavicon && href ? faviconUrl(href) : null
  return (
    <span className={`pk-source-trigger${className ? ` ${className}` : ''}`}>
      {favicon ? <img src={favicon} alt="" className="pk-source-trigger__favicon" /> : null}
      <span className="pk-source-trigger__label">{label}</span>
    </span>
  )
}

export function SourceContent({ title, description, className = '' }) {
  return (
    <div className={`pk-source-content${className ? ` ${className}` : ''}`}>
      {title ? <p className="pk-source-content__title">{title}</p> : null}
      {description ? <p className="pk-source-content__desc">{description}</p> : null}
    </div>
  )
}

export function SourceList({ sources = [], className = '' }) {
  if (!sources.length) return null
  return (
    <div className={`pk-source-list${className ? ` ${className}` : ''}`}>
      <p className="pk-source-list__label">Sources</p>
      <div className="pk-source-list__row">
        {sources.map((s) => (
          <Source key={s.id || s.href} href={s.href} className="pk-source-list__chip" title={s.description || s.title}>
            <SourceTrigger label={s.title || s.href} href={s.href} showFavicon />
          </Source>
        ))}
      </div>
    </div>
  )
}
