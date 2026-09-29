/** Per-user "seen" keys for contextual QuickExplain micro-tours. */
export const CEG_QUICK_EXPLAIN_KEY = 'ceg_quick_explain_seen_v1'

export function quickExplainStorageKey(featureKey, userId = null) {
  const uid = userId ? String(userId) : 'anon'
  return `${CEG_QUICK_EXPLAIN_KEY}:${uid}:${featureKey}`
}

export function hasSeenQuickExplain(featureKey, userId = null) {
  if (!featureKey) return true
  try {
    return localStorage.getItem(quickExplainStorageKey(featureKey, userId)) === '1'
  } catch {
    return false
  }
}

export function markQuickExplainSeen(featureKey, userId = null) {
  if (!featureKey) return
  try {
    localStorage.setItem(quickExplainStorageKey(featureKey, userId), '1')
  } catch {
    /* ignore */
  }
}
