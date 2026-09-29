import { useEffect } from 'react'
import { useStickToBottom } from './useStickToBottom.js'
import { ScrollButton } from './ScrollButton.jsx'

export function ChatContainerRoot({ children, className = '', onAtBottomChange, scrollTrigger = 0 }) {
  const { rootRef, atBottom, scrollToBottom, checkPosition } = useStickToBottom()

  useEffect(() => {
    onAtBottomChange?.(atBottom)
  }, [atBottom, onAtBottomChange])

  useEffect(() => {
    if (atBottom) scrollToBottom('auto')
  }, [atBottom, scrollToBottom, scrollTrigger])

  return (
    <div
      ref={rootRef}
      className={`pk-chat-root${className ? ` ${className}` : ''}`}
      onLoad={checkPosition}
    >
      {typeof children === 'function' ? children({ atBottom, scrollToBottom }) : children}
    </div>
  )
}

export function ChatContainerContent({ children, className = '' }) {
  return <div className={`pk-chat-content${className ? ` ${className}` : ''}`}>{children}</div>
}

export function ChatContainerScrollAnchor({ className = '' }) {
  return <div className={`pk-chat-anchor${className ? ` ${className}` : ''}`} aria-hidden />
}

export function ChatContainerWithScroll({ children, className = '', contentClassName = '', scrollTrigger = 0 }) {
  return (
    <ChatContainerRoot className={className} scrollTrigger={scrollTrigger}>
      {({ atBottom, scrollToBottom }) => (
        <>
          <ChatContainerContent className={contentClassName}>{children}</ChatContainerContent>
          <ChatContainerScrollAnchor />
          {!atBottom ? (
            <div className="pk-chat-scroll-btn-wrap">
              <ScrollButton onClick={() => scrollToBottom('smooth')} />
            </div>
          ) : null}
        </>
      )}
    </ChatContainerRoot>
  )
}
