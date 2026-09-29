/** @param {string} query @param {{ title?: string, session_id?: string }[]} sessions */
export function fuzzyFilterSessions(sessions, query) {
  const list = Array.isArray(sessions) ? sessions : []
  const q = String(query || '')
    .trim()
    .toLowerCase()
  if (!q) return list
  const tokens = q.split(/\s+/).filter(Boolean)
  return list.filter((s) => {
    const hay = `${s.title || ''} ${s.session_id || ''}`.toLowerCase()
    return tokens.every((t) => hay.includes(t))
  })
}
