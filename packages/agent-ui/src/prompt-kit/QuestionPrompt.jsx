import { useEffect, useMemo, useState } from 'react'

const CUSTOM_ID = '__custom__'

function optionBadge(idx) {
  return String.fromCharCode(65 + idx)
}

/**
 * Lean clarifying-question UI (Cursor/Claude-style). No Tailwind — uses agent-panel CSS.
 * questions: [{ kind: 'single'|'multi'|'text', title, options?: [{id,label}], allowCustom?, ... }]
 */
export function QuestionPrompt({
  questions = [],
  questionIndex = 1,
  totalQuestions,
  submitLabel = 'Send',
  nextLabel = 'Next',
  skipLabel = 'Skip',
  allowSkip = true,
  onSubmit,
  onSkip,
  className = '',
}) {
  const [selectedIds, setSelectedIds] = useState([])
  const [customText, setCustomText] = useState('')
  const [textValue, setTextValue] = useState('')
  const resolvedTotal = totalQuestions ?? questions.length
  const clampedIndex = Math.max(1, Math.min(questionIndex, Math.max(resolvedTotal, 1)))
  const active = questions[clampedIndex - 1]
  const customEnabled = Boolean(active?.allowCustom)
  const isLast = clampedIndex >= resolvedTotal
  const primaryLabel = isLast ? submitLabel : nextLabel

  useEffect(() => {
    setSelectedIds([])
    setCustomText('')
    setTextValue('')
  }, [clampedIndex, active?.title])

  const canSubmit = useMemo(() => {
    if (!active) return false
    if (active.kind === 'text') return textValue.trim().length > 0
    const nonCustom = selectedIds.filter((id) => id !== CUSTOM_ID).length
    const hasCustom = customText.trim().length > 0
    const total = nonCustom + (hasCustom ? 1 : 0)
    if (active.kind === 'single') return total === 1
    const min = active.minSelections ?? 1
    return total >= min
  }, [active, selectedIds, customText, textValue])

  if (!active) return null

  const submit = () => {
    if (!canSubmit) return
    if (active.kind === 'text') {
      onSubmit?.({ kind: 'text', text: textValue.trim() })
      return
    }
    onSubmit?.({
      kind: active.kind || 'single',
      selectedIds: selectedIds.filter((id) => id !== CUSTOM_ID),
      text: customText.trim() || undefined,
    })
  }

  return (
    <div className={`ceg-question-prompt${className ? ` ${className}` : ''}`}>
      <div className="ceg-question-prompt__head">
        <span className="ceg-question-prompt__idx">{clampedIndex}</span>
        <span className="ceg-question-prompt__title">{active.title}</span>
        {resolvedTotal > 1 ? (
          <span className="ceg-question-prompt__count">
            {clampedIndex}/{resolvedTotal}
          </span>
        ) : null}
      </div>
      {active.description ? <p className="ceg-question-prompt__desc">{active.description}</p> : null}

      {active.kind !== 'text' && (active.options?.length || 0) > 0 ? (
        <div className="ceg-question-prompt__options">
          {active.options.map((option, idx) => {
            const checked = selectedIds.includes(option.id)
            return (
              <button
                key={option.id}
                type="button"
                className={`ceg-question-prompt__option${checked ? ' ceg-question-prompt__option--on' : ''}`}
                onClick={() => {
                  if (active.kind === 'single') {
                    setSelectedIds([option.id])
                    if (customEnabled) setCustomText('')
                  } else {
                    setSelectedIds((prev) =>
                      prev.includes(option.id) ? prev.filter((x) => x !== option.id) : [...prev, option.id],
                    )
                  }
                }}
              >
                <span className={`ceg-question-prompt__badge${checked ? ' ceg-question-prompt__badge--on' : ''}`}>
                  {optionBadge(idx)}
                </span>
                <span>{option.label}</span>
              </button>
            )
          })}
          {customEnabled ? (
            <div className="ceg-question-prompt__custom">
              <span
                className={`ceg-question-prompt__badge${
                  selectedIds.includes(CUSTOM_ID) ? ' ceg-question-prompt__badge--on' : ''
                }`}
              >
                {optionBadge(active.options.length)}
              </span>
              <input
                value={customText}
                placeholder={active.customPlaceholder || 'Type your answer'}
                onChange={(e) => {
                  const next = e.target.value
                  setCustomText(next)
                  if (active.kind === 'single') {
                    setSelectedIds(next.trim() ? [CUSTOM_ID] : [])
                  } else {
                    setSelectedIds((prev) => {
                      const has = prev.includes(CUSTOM_ID)
                      if (next.trim() && !has) return [...prev, CUSTOM_ID]
                      if (!next.trim() && has) return prev.filter((id) => id !== CUSTOM_ID)
                      return prev
                    })
                  }
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {active.kind === 'text' ? (
        <textarea
          className="ceg-question-prompt__textarea"
          rows={3}
          value={textValue}
          placeholder={active.placeholder || 'Type your answer'}
          onChange={(e) => setTextValue(e.target.value)}
        />
      ) : null}

      <div className="ceg-question-prompt__actions">
        {allowSkip ? (
          <button
            type="button"
            className="ceg-question-prompt__skip"
            onClick={() => {
              onSkip?.()
              onSubmit?.({ kind: 'skip' })
            }}
          >
            {skipLabel}
          </button>
        ) : null}
        <button type="button" className="ceg-question-prompt__submit" disabled={!canSubmit} onClick={submit}>
          {primaryLabel}
        </button>
      </div>
    </div>
  )
}

/** Map plain string questions from the agent into QuestionPrompt configs. */
export function questionsFromStrings(strings = [], title = 'A bit more context helps:') {
  const list = (Array.isArray(strings) ? strings : []).map((s) => String(s || '').trim()).filter(Boolean)
  if (!list.length) return []
  return [
    {
      kind: 'single',
      title,
      allowCustom: true,
      customPlaceholder: 'Or type your own answer…',
      options: list.map((label, i) => ({ id: `q-${i}`, label })),
    },
  ]
}
