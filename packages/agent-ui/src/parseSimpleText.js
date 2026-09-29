/**
 * Minimal inline formatting: **bold** and `code` (no markdown library).
 */
export function parseSimpleText(text) {
  if (!text) return []
  const parts = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  let match
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: 'text', value: text.slice(last, match.index) })
    }
    const token = match[0]
    if (token.startsWith('**')) {
      parts.push({ type: 'bold', value: token.slice(2, -2) })
    } else {
      parts.push({ type: 'code', value: token.slice(1, -1) })
    }
    last = match.index + token.length
  }
  if (last < text.length) {
    parts.push({ type: 'text', value: text.slice(last) })
  }
  return parts
}

export function renderSimpleText(text) {
  return parseSimpleText(text).map((part, i) => {
    if (part.type === 'bold') {
      return { key: i, node: 'strong', text: part.value }
    }
    if (part.type === 'code') {
      return { key: i, node: 'code', text: part.value }
    }
    return { key: i, node: 'span', text: part.value }
  })
}
