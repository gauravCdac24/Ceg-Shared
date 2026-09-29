import { Bot, User } from 'lucide-react'
import { Markdown } from './Markdown.jsx'
import { Image } from './Image.jsx'

export function Message({ children, role = 'assistant', className = '' }) {
  return (
    <div className={`pk-message pk-message--${role}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  )
}

export function MessageAvatar({ role = 'assistant', src, alt, fallback }) {
  if (src) {
    return <img className="pk-message__avatar" src={src} alt={alt || ''} />
  }
  return (
    <div className={`pk-message__avatar pk-message__avatar--${role}`} aria-hidden>
      {role === 'user' ? <User size={14} /> : <Bot size={14} />}
    </div>
  )
}

export function MessageContent({ children, markdown = false, className = '' }) {
  return (
    <div className={`pk-message__content${className ? ` ${className}` : ''}`}>
      {markdown && typeof children === 'string' ? <Markdown>{children}</Markdown> : children}
    </div>
  )
}

export function MessageActions({ children, className = '' }) {
  return (
    <div className={`pk-message__actions${className ? ` ${className}` : ''}`} role="toolbar">
      {children}
    </div>
  )
}

export function MessageAction({ children, tooltip, onClick, className = '' }) {
  return (
    <button type="button" className={`pk-message__action${className ? ` ${className}` : ''}`} title={tooltip} aria-label={tooltip} onClick={onClick}>
      {children}
    </button>
  )
}

export function MessageRow({
  role,
  text,
  markdown = true,
  meta,
  attachments,
  children,
  actions,
  className = '',
}) {
  const isUser = role === 'user'
  return (
    <div className={`pk-message-row pk-message-row--${role}${className ? ` ${className}` : ''}`}>
      {!isUser ? <MessageAvatar role="assistant" /> : null}
      <div className="pk-message-row__stack">
        <Message role={role}>
          <MessageContent markdown={markdown && !isUser}>{text}</MessageContent>
          {attachments?.length ? (
            <div className="pk-message__attachments">
              {attachments.map((att) =>
                String(att.media_type || '').startsWith('image/') && att.preview ? (
                  <Image key={att.filename} src={att.preview} alt={att.filename} />
                ) : (
                  <span key={att.filename} className="pk-message__file-chip">{att.filename}</span>
                ),
              )}
            </div>
          ) : null}
          {children}
        </Message>
        {meta ? <p className="pk-message__meta">{meta}</p> : null}
        {actions}
      </div>
      {isUser ? <MessageAvatar role="user" /> : null}
    </div>
  )
}
