import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Lightweight stick-to-bottom scroll for chat containers.
 * Disables auto-scroll when user scrolls up; resumes when near bottom.
 */
export function useStickToBottom({ threshold = 48 } = {}) {
  const rootRef = useRef(null)
  const [atBottom, setAtBottom] = useState(true)

  const checkPosition = useCallback(() => {
    const el = rootRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    setAtBottom(distance <= threshold)
  }, [threshold])

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const el = rootRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
    setAtBottom(true)
  }, [])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    el.addEventListener('scroll', checkPosition, { passive: true })
    return () => el.removeEventListener('scroll', checkPosition)
  }, [checkPosition])

  return { rootRef, atBottom, scrollToBottom, checkPosition }
}
