import { createElement, isValidElement } from 'react'

/** Render Lucide / forwardRef icon components safely (avoids React #31). */
export function renderIcon(Icon, props = {}) {
  if (!Icon) return null
  if (isValidElement(Icon)) return Icon
  if (typeof Icon === 'function') return createElement(Icon, props)
  if (typeof Icon === 'object' && typeof Icon.render === 'function') {
    return createElement(Icon, props)
  }
  return null
}
