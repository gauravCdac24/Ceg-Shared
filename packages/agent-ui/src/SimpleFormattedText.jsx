import { renderSimpleText } from './parseSimpleText.js'

export function SimpleFormattedText({ text, className = '' }) {
  const parts = renderSimpleText(text || '')
  return (
    <span className={className}>
      {parts.map((part) => {
        if (part.node === 'strong') {
          return <strong key={part.key}>{part.text}</strong>
        }
        if (part.node === 'code') {
          return <code key={part.key}>{part.text}</code>
        }
        return <span key={part.key}>{part.text}</span>
      })}
    </span>
  )
}
