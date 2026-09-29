import { isSafeMarkdownHref } from './markdownSafety.js'

const FENCE_RE = /```(\w*)\n([\s\S]*?)```/g

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inlineFormat(text) {
  let out = escapeHtml(text)
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    if (!isSafeMarkdownHref(href)) return escapeHtml(label)
    const safeHref = escapeHtml(href.trim())
    return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
  })
  return out
}

export function parseMarkdownParts(text) {
  const parts = []
  let lastIndex = 0
  const re = new RegExp(FENCE_RE.source, 'g')
  let match
  const source = text || ''
  while ((match = re.exec(source)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: source.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'code', lang: match[1] || 'text', code: match[2] })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < source.length) {
    parts.push({ type: 'text', content: source.slice(lastIndex) })
  }
  if (!parts.length && source) {
    parts.push({ type: 'text', content: source })
  }
  return parts
}

function renderTextBlock(content) {
  const lines = content.split('\n')
  const nodes = []
  let listItems = null
  let listOrdered = false

  const flushList = () => {
    if (!listItems?.length) return
    const Tag = listOrdered ? 'ol' : 'ul'
    nodes.push(
      <Tag key={`list-${nodes.length}`} className="pk-md-list">
        {listItems.map((item, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
        ))}
      </Tag>,
    )
    listItems = null
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      flushList()
      continue
    }
    const h3 = trimmed.match(/^###\s+(.+)/)
    const h2 = trimmed.match(/^##\s+(.+)/)
    const h1 = trimmed.match(/^#\s+(.+)/)
    const ul = trimmed.match(/^[-*•]\s+(.+)/)
    const ol = trimmed.match(/^\d+[.)]\s+(.+)/)

    if (h3) {
      flushList()
      nodes.push(<h3 key={`h3-${nodes.length}`} className="pk-md-h3" dangerouslySetInnerHTML={{ __html: inlineFormat(h3[1]) }} />)
    } else if (h2) {
      flushList()
      nodes.push(<h2 key={`h2-${nodes.length}`} className="pk-md-h2" dangerouslySetInnerHTML={{ __html: inlineFormat(h2[1]) }} />)
    } else if (h1) {
      flushList()
      nodes.push(<h1 key={`h1-${nodes.length}`} className="pk-md-h1" dangerouslySetInnerHTML={{ __html: inlineFormat(h1[1]) }} />)
    } else if (ul) {
      if (!listItems) {
        listItems = []
        listOrdered = false
      }
      listItems.push(ul[1])
    } else if (ol) {
      if (!listItems) {
        listItems = []
        listOrdered = true
      }
      listItems.push(ol[1])
    } else {
      flushList()
      nodes.push(<p key={`p-${nodes.length}`} className="pk-md-p" dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed) }} />)
    }
  }
  flushList()
  return nodes
}

export function Markdown({ children, id, className = '' }) {
  const text = typeof children === 'string' ? children : String(children || '')
  const parts = parseMarkdownParts(text)

  return (
    <article id={id} className={`pk-markdown not-prose${className ? ` ${className}` : ''}`}>
      {parts.map((part, index) =>
        part.type === 'code' ? (
          <CodeBlock key={`code-${index}`} lang={part.lang} code={part.code} />
        ) : (
          <div key={`text-${index}`}>{renderTextBlock(part.content)}</div>
        ),
      )}
    </article>
  )
}

export function CodeBlock({ code, lang = 'text', title, onCopy, onApply, applyLabel = 'Apply' }) {
  const copy = async () => {
    if (onCopy) {
      onCopy(code)
      return
    }
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="pk-code-block not-prose">
      <div className="pk-code-block__header">
        <span className="pk-code-block__lang">{title || lang || 'text'}</span>
        <div className="pk-code-block__actions">
          <button type="button" className="pk-code-block__btn" onClick={() => void copy()}>
            Copy
          </button>
          {onApply ? (
            <button type="button" className="pk-code-block__btn pk-code-block__btn--primary" onClick={() => onApply(code, lang)}>
              {applyLabel}
            </button>
          ) : null}
        </div>
      </div>
      <pre className="pk-code-block__pre">
        <code className={`language-${lang}`}>{code}</code>
      </pre>
    </div>
  )
}
