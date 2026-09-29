import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { useReducedMotion } from 'framer-motion';
import './HoldToConfirmButton.css';

export type ConfirmationInput = 'keyboard' | 'pointer';
export type HoldStatus = 'confirmed' | 'holding' | 'idle';

export type HoldToConfirmButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'onClick'
> & {
  children?: ReactNode;
  confirmedContent?: ReactNode;
  compact?: boolean;
  duration?: number;
  onConfirm: (input: ConfirmationInput) => void;
  resetAfter?: number;
};

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path
        d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm45.66 85.66-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L116 148.69l50.34-50.35a8 8 0 0 1 11.32 11.32Z"
      />
    </svg>
  );
}

export function HoldToConfirmButton({
  children = 'Hold to confirm',
  className,
  confirmedContent,
  compact = false,
  disabled,
  duration = 1600,
  onConfirm,
  resetAfter = 1800,
  ...buttonProps
}: HoldToConfirmButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const confirmTimerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const inputModeRef = useRef<ConfirmationInput>('pointer');
  const isHoldingRef = useRef(false);
  const [inputMode, setInputMode] = useState<ConfirmationInput | null>(null);
  const [status, setStatus] = useState<HoldStatus>('idle');
  const shouldReduceMotion = useReducedMotion();

  const clearConfirmTimer = useCallback(() => {
    if (confirmTimerRef.current === null) return;
    window.clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = null;
  }, []);

  const completeHold = useCallback(() => {
    if (!isHoldingRef.current) return;
    isHoldingRef.current = false;
    activePointerIdRef.current = null;
    clearConfirmTimer();
    setStatus('confirmed');
    onConfirm(inputModeRef.current);

    if (resetAfter > 0) {
      resetTimerRef.current = window.setTimeout(() => {
        setStatus('idle');
        resetTimerRef.current = null;
      }, resetAfter);
    }
  }, [clearConfirmTimer, onConfirm, resetAfter]);

  const cancelHold = useCallback(() => {
    if (!isHoldingRef.current) return;
    isHoldingRef.current = false;
    activePointerIdRef.current = null;
    clearConfirmTimer();
    setStatus('idle');
  }, [clearConfirmTimer]);

  const startHold = useCallback(
    (input: ConfirmationInput) => {
      if (disabled || status === 'confirmed' || isHoldingRef.current) return;

      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }

      inputModeRef.current = input;
      setInputMode(input);
      isHoldingRef.current = true;
      setStatus('holding');
      confirmTimerRef.current = window.setTimeout(completeHold, duration);
    },
    [completeHold, disabled, duration, status],
  );

  useEffect(() => {
    return () => {
      clearConfirmTimer();
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, [clearConfirmTimer]);

  useEffect(() => {
    if (disabled) cancelHold();
  }, [cancelHold, disabled]);

  function releasePointerCapture(pointerId: number) {
    const button = buttonRef.current;
    if (button?.hasPointerCapture(pointerId)) {
      button.releasePointerCapture(pointerId);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || disabled) return;
    activePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    startHold('pointer');
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!isHoldingRef.current || activePointerIdRef.current !== event.pointerId) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const boundaryPadding = 8;
    const isOutside =
      event.clientX < rect.left - boundaryPadding ||
      event.clientX > rect.right + boundaryPadding ||
      event.clientY < rect.top - boundaryPadding ||
      event.clientY > rect.bottom + boundaryPadding;

    if (isOutside) {
      cancelHold();
      releasePointerCapture(event.pointerId);
    }
  }

  function handlePointerEnd(event: PointerEvent<HTMLButtonElement>) {
    if (activePointerIdRef.current !== event.pointerId) return;
    cancelHold();
    releasePointerCapture(event.pointerId);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    startHold('keyboard');
  }

  function handleKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    cancelHold();
  }

  const isConfirmed = status === 'confirmed';
  const isHolding = status === 'holding';
  const overlayStyle = {
    clipPath: isHolding ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
    transitionDuration:
      shouldReduceMotion || inputMode === 'keyboard'
        ? '0ms'
        : isHolding
          ? `${duration}ms`
          : '180ms',
    transitionProperty: 'clip-path',
    transitionTimingFunction: isHolding ? 'linear' : 'cubic-bezier(0.23, 1, 0.32, 1)',
  };

  return (
    <button
      {...buttonProps}
      ref={buttonRef}
      type="button"
      aria-busy={isHolding}
      disabled={disabled}
      className={cn(
        'hold-confirm-btn',
        compact && 'hold-confirm-btn--compact',
        isConfirmed && 'hold-confirm-btn--confirmed',
        className,
      )}
      data-input={inputMode}
      onBlur={cancelHold}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onLostPointerCapture={cancelHold}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
    >
      {isConfirmed ? (
        <span className="hold-confirm-btn__content">
          {confirmedContent ?? (
            <>
              <CheckIcon />
              Confirmed
            </>
          )}
        </span>
      ) : (
        <>
          <span className="hold-confirm-btn__content">{children}</span>
          <span aria-hidden="true" className="hold-confirm-btn__overlay" style={overlayStyle}>
            {children}
          </span>
        </>
      )}
    </button>
  );
}
