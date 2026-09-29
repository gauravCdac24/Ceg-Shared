import { useState } from 'react'
import { ChevronDown, Wrench, Check, AlertCircle } from 'lucide-react'
import { LoadingState } from './LoadingState.jsx'
import {
  humanizeToolName,
  mapToolStatus,
  isSubagentTool,
  isEphemeralTool,
  summarizeToolOutput,
} from './utils.js'

const STATUS_LABEL = {
  running: 'Working',
  completed: 'Done',
  error: 'Failed',
  pending: 'Queued',
}

export function Tool({ name, text, status = 'running', input, output, errorText, defaultOpen = false, className = '' }) {
  const [open, setOpen] = useState(defaultOpen)
  const mapped = mapToolStatus(status)
  const label = text || humanizeToolName(name)
  const summary = summarizeToolOutput(output || errorText)
  const statusHint = mapped === 'error' ? (summary || 'Something went wrong') : summary
  const hasDetails = Boolean(errorText || input || output)

  const icon =
    mapped === 'running' ? (
      <LoadingState
        variant={isSubagentTool(name) ? 'Orbit' : 'Drive'}
        showLabel={false}
        showTimer={false}
        compact
        className="pk-tool__pixel"
      />
    ) :
    mapped === 'error' ? <AlertCircle size={14} aria-hidden /> :
    mapped === 'completed' ? <Check size={14} aria-hidden /> :
    <Wrench size={14} aria-hidden />

  return (
    <div className={`pk-tool pk-tool--${mapped}${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="pk-tool__trigger"
        onClick={() => hasDetails && setOpen((v) => !v)}
        aria-expanded={hasDetails ? open : undefined}
        disabled={!hasDetails}
      >
        {icon}
        <span className="pk-tool__name">{humanizeToolName(name)}</span>
        <span className="pk-tool__status" aria-label={STATUS_LABEL[mapped] || mapped}>
          {STATUS_LABEL[mapped] || mapped}
        </span>
        {statusHint && mapped !== 'running' ? (
          <span className="pk-tool__hint">{statusHint}</span>
        ) : null}
        {hasDetails ? (
          <ChevronDown size={14} className={`pk-tool__chev${open ? ' pk-tool__chev--open' : ''}`} aria-hidden />
        ) : null}
      </button>
      {open && hasDetails ? (
        <div className="pk-tool__body">
          {label && label !== humanizeToolName(name) ? <p className="pk-tool__summary">{label}</p> : null}
          {errorText ? (
            <p className="pk-tool__error">{summarizeToolOutput(errorText) || 'Something went wrong'}</p>
          ) : null}
          {input ? (
            <details className="pk-tool__detail">
              <summary>Details</summary>
              <pre>{typeof input === 'string' ? summarizeToolOutput(input) || input : JSON.stringify(input, null, 2)}</pre>
            </details>
          ) : null}
          {output ? (
            <details className="pk-tool__detail">
              <summary>Result</summary>
              <pre>{typeof output === 'string' ? (summarizeToolOutput(output) || 'Completed') : JSON.stringify(output, null, 2)}</pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function ToolChain({ tools = [], className = '' }) {
  const visible = tools.filter((t) => !isEphemeralTool(t.name))
  if (!visible.length) return null
  return (
    <div className={`pk-tool-chain${className ? ` ${className}` : ''}`}>
      {visible.map((t) => (
        <Tool
          key={t.id}
          name={t.name}
          text={t.text}
          status={t.status}
          output={t.output}
          errorText={t.error ? t.text : undefined}
          defaultOpen={false}
        />
      ))}
    </div>
  )
}
