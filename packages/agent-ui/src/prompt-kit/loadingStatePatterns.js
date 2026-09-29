export const CHEVRON_PATTERN = {
  delays: Array.from({ length: 9 }, (_, i) => {
    const r = Math.floor(i / 3)
    const c = i % 3
    return (c + Math.abs(r - 1)) * 90
  }),
  dur: 650,
  round: false,
}

const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3]

export const ORBIT_PATTERN = {
  delays: Array.from({ length: 9 }, (_, i) => {
    const k = ORBIT_ORDER.indexOf(i)
    return k === -1 ? null : k * 110
  }),
  dur: 950,
  round: false,
}

export const LOADING_PATTERNS = {
  Drive: CHEVRON_PATTERN,
  Dots: { ...CHEVRON_PATTERN, round: true },
  Orbit: ORBIT_PATTERN,
}

export function resolveLoadingPattern(variant) {
  if (variant && LOADING_PATTERNS[variant]) return LOADING_PATTERNS[variant]
  const key = Object.keys(LOADING_PATTERNS).find(
    (k) => k.toLowerCase() === String(variant || '').toLowerCase(),
  )
  return LOADING_PATTERNS[key] || LOADING_PATTERNS.Drive
}
