import { FormEvent, KeyboardEvent, useCallback, useId, useState } from 'react'
import { useAnimatedText } from '../hooks/useAnimatedText'
import '../agent-chat-panel.css'

export type AgentChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export type AgentChatPanelProps = {
  productName: string
  userName?: string
  suggestedPrompts?: string[]
  messages?: AgentChatMessage[]
  streamingText?: string
  isStreaming?: boolean
  disabled?: boolean
  placeholder?: string
  onSendMessage: (text: string) => void | Promise<void>
  onSuggestedPrompt?: (text: string) => void
  className?: string
}

export function AgentChatPanel({
  productName,
  userName,
  suggestedPrompts = [],
  messages = [],
  streamingText = '',
  isStreaming = false,
  disabled = false,
  placeholder = 'Ask a question…',
  onSendMessage,
  onSuggestedPrompt,
  className = '',
}: AgentChatPanelProps) {
  const [draft, setDraft] = useState('')
  const inputId = useId()
  const animatedStream = useAnimatedText(streamingText, { enabled: isStreaming })

  const submit = useCallback(async () => {
    const trimmed = draft.trim()
    if (!trimmed || disabled || isStreaming) return
    setDraft('')
    await onSendMessage(trimmed)
  }, [draft, disabled, isStreaming, onSendMessage])

  const onFormSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault()
      void submit()
    },
    [submit],
  )

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        void submit()
      }
    },
    [submit],
  )

  const pickSuggestion = useCallback(
    (prompt: string) => {
      if (onSuggestedPrompt) {
        onSuggestedPrompt(prompt)
        return
      }
      void onSendMessage(prompt)
    },
    [onSendMessage, onSuggestedPrompt],
  )

  const greeting = userName ? `Hi ${userName}` : `Hi — I'm ${productName}`

  return (
    <section
      className={`ceg-agent-chat${className ? ` ${className}` : ''}`}
      aria-label={`${productName} chat`}
    >
      <header className="ceg-agent-chat__head">
        <span className="ceg-agent-chat__brand">{productName}</span>
      </header>

      <div className="ceg-agent-chat__body" role="log" aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 && !streamingText ? (
          <div className="ceg-agent-chat__empty">
            <p className="ceg-agent-chat__greeting">{greeting}</p>
            {suggestedPrompts.length > 0 ? (
              <ul className="ceg-agent-chat__suggestions">
                {suggestedPrompts.map((prompt) => (
                  <li key={prompt}>
                    <button
                      type="button"
                      className="ceg-agent-chat__suggestion"
                      disabled={disabled || isStreaming}
                      onClick={() => pickSuggestion(prompt)}
                    >
                      {prompt}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <ul className="ceg-agent-chat__messages">
            {messages.map((msg) => (
              <li
                key={msg.id}
                className={`ceg-agent-chat__msg ceg-agent-chat__msg--${msg.role}`}
              >
                <span className="ceg-agent-chat__msg-label">
                  {msg.role === 'user' ? 'You' : productName}
                </span>
                <p className="ceg-agent-chat__msg-text">{msg.content}</p>
              </li>
            ))}
            {streamingText ? (
              <li className="ceg-agent-chat__msg ceg-agent-chat__msg--assistant">
                <span className="ceg-agent-chat__msg-label">{productName}</span>
                <p className="ceg-agent-chat__msg-text ceg-agent-chat__msg-text--stream">
                  {animatedStream}
                  {isStreaming ? <span className="ceg-agent-chat__cursor" aria-hidden="true" /> : null}
                </p>
              </li>
            ) : null}
          </ul>
        )}
      </div>

      <form className="ceg-agent-chat__composer" onSubmit={onFormSubmit}>
        <label className="sr-only" htmlFor={inputId}>
          Message {productName}
        </label>
        <textarea
          id={inputId}
          className="ceg-agent-chat__input"
          rows={2}
          value={draft}
          placeholder={placeholder}
          disabled={disabled || isStreaming}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          type="submit"
          className="ceg-agent-chat__send"
          disabled={disabled || isStreaming || !draft.trim()}
        >
          Send
        </button>
      </form>
    </section>
  )
}
