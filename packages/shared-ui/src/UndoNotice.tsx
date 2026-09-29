import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import './UndoNotice.css';

export type UndoInteraction = 'keyboard' | 'pointer';

export type UndoNoticeProps = {
  className?: string;
  duration?: number;
  message?: string;
  onExpire: () => void;
  onUndo: (input: UndoInteraction) => void;
  undoLabel?: string;
};

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path
        d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm45.66 85.66-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L116 148.69l50.34-50.35a8 8 0 0 1 11.32 11.32Z"
      />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path
        d="M224 128a8 8 0 0 1-8 8h-99.59l30.35 30.34a8 8 0 0 1-11.32 11.32l-48-48a8 8 0 0 1 0-11.32l48-48a8 8 0 0 1 11.32 11.32L118.41 120H216a8 8 0 0 1 8 8Z"
      />
    </svg>
  );
}

export function UndoNotice({
  className,
  duration = 5000,
  message = 'Action completed',
  onExpire,
  onUndo,
  undoLabel = 'Undo',
}: UndoNoticeProps) {
  const [isCounting, setIsCounting] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsCounting(true));
    const timer = window.setTimeout(onExpire, duration);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [duration, onExpire]);

  const undoOverlayStyle = {
    clipPath: isCounting ? 'inset(0 100% 0 0)' : 'inset(0 0 0 0)',
    transitionDuration: shouldReduceMotion ? '0ms' : `${duration}ms`,
    transitionProperty: 'clip-path',
    transitionTimingFunction: 'linear',
  };

  return (
    <div className={cn('undo-notice', className)} role="status" aria-live="polite">
      <div className="undo-notice__message">
        <CheckIcon />
        <p>{message}</p>
      </div>
      <button
        type="button"
        className="undo-notice__undo"
        onClick={(event) => onUndo(event.detail === 0 ? 'keyboard' : 'pointer')}
      >
        <span className="undo-notice__undo-content">
          <UndoIcon />
          {undoLabel}
        </span>
        <span aria-hidden="true" className="undo-notice__undo-overlay" style={undoOverlayStyle}>
          <UndoIcon />
          {undoLabel}
        </span>
      </button>
    </div>
  );
}
