import { cloneElement, isValidElement, useState } from 'react'
import { ChevronDown, Circle } from 'lucide-react'
import { renderIcon } from './renderIcon.js'

export function ChainOfThoughtItem({ children, className = '' }) {
  return <div className={`pk-cot-item${className ? ` ${className}` : ''}`}>{children}</div>
}

export function ChainOfThoughtTrigger({ children, open, onToggle, leftIcon, className = '' }) {
  return (
    <button
      type="button"
      className={`pk-cot-trigger${className ? ` ${className}` : ''}`}
      onClick={onToggle}
      aria-expanded={open}
      data-cot="trigger"
    >
      <span className="pk-cot-trigger__icon" aria-hidden>
        {leftIcon ? renderIcon(leftIcon, { size: 8, className: 'pk-cot-trigger__dot' }) : (
          <Circle size={8} className="pk-cot-trigger__dot" />
        )}
      </span>
      <span className="pk-cot-trigger__text">{children}</span>
      <ChevronDown size={14} className={`pk-cot-trigger__chev${open ? ' pk-cot-trigger__chev--open' : ''}`} aria-hidden />
    </button>
  )
}

export function ChainOfThoughtContent({ children, open, className = '' }) {
  if (!open) return null
  return (
    <div className={`pk-cot-content${className ? ` ${className}` : ''}`} data-cot="content">
      <div className="pk-cot-content__bar" aria-hidden />
      <div className="pk-cot-content__body">{children}</div>
    </div>
  )
}

function isCotTrigger(child) {
  if (!isValidElement(child)) return false
  if (child.props?.['data-cot'] === 'trigger') return true
  if (child.type?.displayName === 'ChainOfThoughtTrigger') return true
  if (typeof child.type === 'function' && child.type.name === 'ChainOfThoughtTrigger') return true
  return false
}

function isCotContent(child) {
  if (!isValidElement(child)) return false
  if (child.props?.['data-cot'] === 'content') return true
  if (child.type?.displayName === 'ChainOfThoughtContent') return true
  if (typeof child.type === 'function' && child.type.name === 'ChainOfThoughtContent') return true
  return false
}

export function ChainOfThoughtStep({ children, defaultOpen = false, isLast = false, className = '' }) {
  const [open, setOpen] = useState(defaultOpen)
  const childArr = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean)
  let trigger = null
  let content = null
  for (const child of childArr) {
    if (isCotTrigger(child)) trigger = child
    else if (isCotContent(child)) content = child
  }
  return (
    <div className={`pk-cot-step${isLast ? ' pk-cot-step--last' : ''}${className ? ` ${className}` : ''}`}>
      {trigger && isValidElement(trigger)
        ? cloneElement(trigger, { open, onToggle: () => setOpen((v) => !v) })
        : null}
      {content && isValidElement(content) ? cloneElement(content, { open }) : null}
      {!isLast ? <div className="pk-cot-step__connector" aria-hidden /> : null}
    </div>
  )
}

ChainOfThoughtTrigger.displayName = 'ChainOfThoughtTrigger'
ChainOfThoughtContent.displayName = 'ChainOfThoughtContent'

function renderCotItem(item, key) {
  if (item == null) return null
  if (isValidElement(item)) return item
  if (typeof item === 'string' || typeof item === 'number') return item
  return String(item)
}

export function ChainOfThought({ steps = [], className = '' }) {
  if (!steps.length) return null
  return (
    <div className={`pk-cot${className ? ` ${className}` : ''}`}>
      {steps.map((step, index) => (
        <ChainOfThoughtStep key={step.id} isLast={index === steps.length - 1} defaultOpen={step.live || index === steps.length - 1}>
          <ChainOfThoughtTrigger>{step.title}</ChainOfThoughtTrigger>
          <ChainOfThoughtContent>
            {(step.items || []).map((item, i) => (
              <ChainOfThoughtItem key={`${step.id}-${i}`}>{renderCotItem(item, i)}</ChainOfThoughtItem>
            ))}
          </ChainOfThoughtContent>
        </ChainOfThoughtStep>
      ))}
    </div>
  )
}
