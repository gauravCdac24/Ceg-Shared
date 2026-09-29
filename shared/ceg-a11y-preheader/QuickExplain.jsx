import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { hasSeenQuickExplain, markQuickExplainSeen } from './quickExplain.js'
import './quick-explain.css'

function placeTip(anchor, tip, position) {
  if (!anchor || !tip) return
  const el =
    anchor.getBoundingClientRect().width > 0 || anchor.getBoundingClientRect().height > 0
      ? anchor
      : anchor.firstElementChild || anchor
  const margin = 10
  const r = el.getBoundingClientRect()
  const tw = tip.offsetWidth
  const th = tip.offsetHeight
  let top = r.bottom + margin
  let left = r.left + Math.max(0, r.width / 2 - tw / 2)
  let pos = position

  if (position === 'top' || (position === 'auto' && top + th > window.innerHeight - margin)) {
    top = r.top - th - margin
    pos = 'top'
  } else {
    pos = 'bottom'
  }

  left = Math.max(margin, Math.min(left, window.innerWidth - tw - margin))
  top = Math.max(margin, Math.min(top, window.innerHeight - th - margin))
  tip.style.top = `${top}px`
  tip.style.left = `${left}px`
  tip.classList.remove('ceg-quick-explain--top', 'ceg-quick-explain--bottom')
  tip.classList.add(pos === 'top' ? 'ceg-quick-explain--top' : 'ceg-quick-explain--bottom')
}

/**
 * First-interaction contextual hint — lighter than full guided tours.
 * @param {{ featureKey: string, text: string, userId?: string|null, dismissMs?: number, position?: 'auto'|'top'|'bottom', children: import('react').ReactNode }} props
 */
export default function QuickExplain({
  featureKey,
  text,
  userId = null,
  dismissMs = 4500,
  position = 'auto',
  children,
}) {
  const wrapRef = useRef(null)
  const tipRef = useRef(null)
  const timerRef = useRef(null)
  const [open, setOpen] = useState(false)

  const dismiss = useCallback(() => {
    setOpen(false)
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const maybeShow = useCallback(() => {
    if (!featureKey || !text || hasSeenQuickExplain(featureKey, userId)) return
    markQuickExplainSeen(featureKey, userId)
    setOpen(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(dismiss, dismissMs)
  }, [featureKey, text, userId, dismissMs, dismiss])

  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => placeTip(wrapRef.current, tipRef.current, position))
    const onResize = () => placeTip(wrapRef.current, tipRef.current, position)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open, position])

  useEffect(() => {
    if (!open) return
    const onPointer = (e) => {
      if (tipRef.current?.contains(e.target) || wrapRef.current?.contains(e.target)) return
      dismiss()
    }
    document.addEventListener('pointerdown', onPointer, true)
    return () => document.removeEventListener('pointerdown', onPointer, true)
  }, [open, dismiss])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return (
    <>
      <span
        ref={wrapRef}
        className="ceg-quick-explain-wrap"
        onPointerDownCapture={maybeShow}
        onFocusCapture={maybeShow}
      >
        {children}
      </span>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div ref={tipRef} className="ceg-quick-explain" role="status" aria-live="polite">
              <p>{text}</p>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
