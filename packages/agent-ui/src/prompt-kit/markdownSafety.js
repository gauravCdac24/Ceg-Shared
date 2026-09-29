/** Allow only http(s) and mailto links in assistant markdown. */
export function isSafeMarkdownHref(href) {
  const raw = String(href || '').trim()
  if (!raw) return false
  try {
    const parsed = new URL(raw, 'https://example.invalid')
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:'
  } catch {
    return false
  }
}
