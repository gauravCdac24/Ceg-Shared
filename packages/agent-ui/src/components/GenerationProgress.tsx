import type { CSSProperties, HTMLAttributes, LiHTMLAttributes } from 'react'

export type GenerationStep = {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'failed'
}

export type GenerationProgressProps = {
  title?: string
  steps: GenerationStep[]
  progress?: number
  className?: string
}

const STATUS_LABEL: Record<GenerationStep['status'], string> = {
  pending: 'Waiting',
  running: 'In progress',
  done: 'Complete',
  failed: 'Failed',
}

type MotionDivProps = HTMLAttributes<HTMLDivElement> & {
  initial?: unknown
  animate?: CSSProperties
  transition?: unknown
}

type MotionLiProps = LiHTMLAttributes<HTMLLIElement> & {
  initial?: unknown
  animate?: CSSProperties
  transition?: unknown
}

function MotionDiv({ animate, initial: _initial, transition: _transition, style, ...props }: MotionDivProps) {
  return <div {...props} style={{ ...style, ...animate }} />
}

function MotionLi({ animate, initial: _initial, transition: _transition, style, ...props }: MotionLiProps) {
  return <li {...props} style={{ ...style, ...animate }} />
}

export function GenerationProgress({
  title = 'Working…',
  steps,
  progress,
  className = '',
}: GenerationProgressProps) {
  const pct =
    typeof progress === 'number'
      ? Math.max(0, Math.min(100, progress))
      : steps.length
        ? Math.round((steps.filter((s) => s.status === 'done').length / steps.length) * 100)
        : 0

  return (
    <div className={`ceg-gen-progress${className ? ` ${className}` : ''}`} role="status" aria-live="polite">
      <div className="ceg-gen-progress__head">
        <span className="ceg-gen-progress__title">{title}</span>
        <span className="ceg-gen-progress__pct">{pct}%</span>
      </div>

      <div className="ceg-gen-progress__track" aria-hidden="true">
        <MotionDiv className="ceg-gen-progress__bar" animate={{ width: `${pct}%` }} />
      </div>

      <ol className="ceg-gen-progress__steps">
        {steps.map((step) => (
          <MotionLi
            key={step.id}
            className={`ceg-gen-progress__step ceg-gen-progress__step--${step.status}`}
            animate={{ opacity: 1, transform: 'translateY(0)' }}
          >
            <span className="ceg-gen-progress__dot" aria-hidden="true" />
            <span className="ceg-gen-progress__label">{step.label}</span>
            <span className="ceg-gen-progress__status">{STATUS_LABEL[step.status]}</span>
          </MotionLi>
        ))}
      </ol>
    </div>
  )
}
