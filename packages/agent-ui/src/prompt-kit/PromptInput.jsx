import { Send, Square } from 'lucide-react'
import { FlickerSpinner } from './FlickerSpinner.jsx'
import { useCegInputLang } from '../useCegInputLang.js'

export function PromptInput({
  value,
  onValueChange,
  onSubmit,
  onStop,
  isLoading = false,
  disabled = false,
  placeholder = 'Message the agent…',
  children,
  className = '',
  inputId = 'pk-prompt-input',
  ariaLabel = 'Message the AI agent',
  useCegLang = true,
}) {
  const cegLang = useCegInputLang()
  const containerLangProps = useCegLang
    ? {
        lang: cegLang.lang,
        dir: cegLang.dir,
        'data-ceg-lang': cegLang['data-ceg-lang'],
        translate: cegLang.translate,
      }
    : { lang: 'en-IN', translate: 'no' }

  return (
    <div
      className={`pk-prompt-input notranslate${className ? ` ${className}` : ''}`}
      role="form"
      aria-label="AI message composer"
      data-ceg-input-container=""
      {...containerLangProps}
    >
      <div className="pk-prompt-input__row">
        <PromptInputTextarea
          id={inputId}
          value={value}
          onChange={(e) => onValueChange?.(e.target.value)}
          onSubmit={onSubmit}
          disabled={disabled || isLoading}
          placeholder={placeholder}
          ariaLabel={ariaLabel}
          useCegLang={useCegLang}
        />
        {isLoading && onStop ? (
          <button
            type="button"
            className="pk-prompt-input__send pk-prompt-input__send--stop"
            onClick={onStop}
            aria-label="Stop generating"
            title="Stop"
          >
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            className="pk-prompt-input__send"
            disabled={disabled || isLoading || !String(value || '').trim()}
            onClick={onSubmit}
            aria-label="Send message"
          >
            {isLoading ? <FlickerSpinner size={18} /> : <Send size={16} />}
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

export function PromptInputTextarea({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
  id,
  className = '',
  maxHeight = 240,
  ariaLabel = 'Message the AI agent',
  useCegLang = true,
  name = 'agent_message',
}) {
  const cegLang = useCegInputLang()
  const langProps = useCegLang
    ? {
        lang: cegLang.lang,
        dir: cegLang.dir,
        spellCheck: cegLang.spellCheck,
        autoComplete: cegLang.autoComplete,
        autoCorrect: cegLang.autoCorrect,
        'data-ceg-lang': cegLang['data-ceg-lang'],
        translate: cegLang.translate,
      }
    : { lang: 'en-IN', spellCheck: true, autoComplete: 'off' }

  return (
    <textarea
      id={id}
      name={name}
      className={`pk-prompt-input__textarea ceg-editable-input notranslate${className ? ` ${className}` : ''}`}
      rows={2}
      style={{ maxHeight }}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-multiline="true"
      inputMode="text"
      {...langProps}
      onChange={onChange}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          onSubmit?.()
        }
        if (e.key === 'Escape') {
          e.stopPropagation()
        }
      }}
    />
  )
}

export function PromptInputActions({ children, className = '' }) {
  return <div className={`pk-prompt-input__actions${className ? ` ${className}` : ''}`}>{children}</div>
}

export function PromptInputAction({ children, tooltip, onClick, disabled, className = '' }) {
  return (
    <button
      type="button"
      className={`pk-prompt-input__action${className ? ` ${className}` : ''}`}
      title={tooltip}
      aria-label={tooltip}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
