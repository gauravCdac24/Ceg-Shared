import { useEffect, useRef, useState } from 'react'

export type UseAnimatedTextOptions = {
  /** When false, return full text immediately (e.g. finished stream). */
  enabled?: boolean
  /** Delay between revealed characters in ms. */
  msPerChar?: number
}

/**
 * Reveals streaming assistant text character-by-character.
 * State updates run in useEffect — never during render.
 */
export function useAnimatedText(text: string, options: UseAnimatedTextOptions = {}): string {
  const { enabled = true, msPerChar = 14 } = options
  const [displayed, setDisplayed] = useState(() => (enabled ? '' : text))
  const prevTextRef = useRef('')
  const indexRef = useRef(0)

  useEffect(() => {
    if (!enabled) {
      prevTextRef.current = text
      indexRef.current = text.length
      setDisplayed(text)
      return
    }

    const prev = prevTextRef.current
    if (text !== prev) {
      if (!text.startsWith(prev) || text.length < prev.length) {
        indexRef.current = 0
        setDisplayed('')
      } else {
        indexRef.current = Math.min(indexRef.current, text.length)
        setDisplayed(text.slice(0, indexRef.current))
      }
      prevTextRef.current = text
    }

    if (indexRef.current >= text.length) {
      setDisplayed(text)
      return
    }

    const timer = window.setInterval(() => {
      indexRef.current = Math.min(indexRef.current + 1, text.length)
      setDisplayed(text.slice(0, indexRef.current))
      if (indexRef.current >= text.length) {
        window.clearInterval(timer)
      }
    }, msPerChar)

    return () => window.clearInterval(timer)
  }, [text, enabled, msPerChar])

  return displayed
}
