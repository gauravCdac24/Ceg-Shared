import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import './AnimatedOtpInput.css';

const DEFAULT_LENGTH = 6;

export function emptyOtp(length = DEFAULT_LENGTH): string[] {
  return Array(length).fill('');
}

export type AnimatedOtpInputProps = {
  value: string[];
  onChange: (digits: string[]) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  animateOnComplete?: boolean;
  onComplete?: (code: string) => void;
  /** Change to reset success animation and allow re-entry after a failed verify. */
  resetSignal?: number | string;
  verifiedLabel?: string;
  className?: string;
  boxSize?: number;
  gap?: number;
};

function mergeOffset(index: number, length: number, boxSize: number, gap: number): number {
  const totalWidth = length * boxSize + (length - 1) * gap;
  const center = totalWidth / 2 - boxSize / 2;
  const boxLeft = index * (boxSize + gap);
  return center - boxLeft;
}

export function AnimatedOtpInput({
  value,
  onChange,
  length = DEFAULT_LENGTH,
  disabled = false,
  autoFocus = true,
  animateOnComplete = true,
  onComplete,
  resetSignal,
  verifiedLabel,
  className = '',
  boxSize = 52,
  gap = 8,
}: AnimatedOtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [status, setStatus] = useState<'idle' | 'success'>('idle');
  const completeRef = useRef(false);

  const digits = useMemo(() => {
    const next = [...value];
    while (next.length < length) next.push('');
    return next.slice(0, length);
  }, [value, length]);

  const filled = digits.every((d) => d !== '');

  useEffect(() => {
    setStatus('idle');
    completeRef.current = false;
  }, [resetSignal]);

  useEffect(() => {
    if (!filled) {
      setStatus('idle');
      completeRef.current = false;
      return;
    }
    if (animateOnComplete) {
      refs.current.forEach((ref) => ref?.blur());
      setStatus('success');
    }
    if (!completeRef.current) {
      completeRef.current = true;
      onComplete?.(digits.join(''));
    }
  }, [filled, animateOnComplete, digits, onComplete]);

  useEffect(() => {
    if (autoFocus && !disabled) {
      refs.current[0]?.focus();
    }
  }, [autoFocus, disabled]);

  const handleChange = useCallback(
    (index: number, raw: string) => {
      if (status !== 'idle' || disabled) return;
      const char = raw.replace(/\D/g, '').slice(-1);
      if (!char) return;
      const next = [...digits];
      next[index] = char;
      onChange(next);
      if (index < length - 1) refs.current[index + 1]?.focus();
    },
    [digits, disabled, length, onChange, status],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (status !== 'idle' || disabled) return;
      if (e.key === 'Backspace') {
        if (!digits[index] && index > 0) {
          const next = [...digits];
          next[index - 1] = '';
          onChange(next);
          refs.current[index - 1]?.focus();
        } else {
          const next = [...digits];
          next[index] = '';
          onChange(next);
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        refs.current[index - 1]?.focus();
      } else if (e.key === 'ArrowRight' && index < length - 1) {
        refs.current[index + 1]?.focus();
      }
    },
    [digits, disabled, length, onChange, status],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (status !== 'idle' || disabled) return;
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
      if (!pasted) return;
      const next = Array(length).fill('');
      pasted.split('').forEach((ch, i) => {
        next[i] = ch;
      });
      onChange(next);
      const focusIdx = Math.min(pasted.length, length - 1);
      refs.current[focusIdx]?.focus();
    },
    [disabled, length, onChange, status],
  );

  const boxVariants = useMemo<Variants>(
    () => ({
      idle: {
        x: 0,
        rotate: 0,
        scale: 1,
        opacity: 1,
        transition: { duration: 0.3, ease: 'easeInOut' },
      },
      success: (i: number) => {
        const delay = 0.35;
        const offset = mergeOffset(i, length, boxSize, gap);
        if (i === 0) {
          return {
            x: [0, offset, offset],
            rotate: [0, 10, 0],
            scale: [1, 0.95, 1.12, 1],
            zIndex: length,
            transition: {
              duration: 0.85,
              times: [0, 0.5, 0.72, 1],
              delay,
              ease: [0.25, 1, 0.5, 1],
            },
          };
        }
        const partial = offset * (1 - i / (length - 1 || 1));
        return {
          x: [0, partial, partial],
          rotate: i <= length / 2 ? -6 : 6,
          scale: [1, 0.85, 0],
          opacity: [1, 1, 0],
          zIndex: length - i,
          transition: {
            duration: 0.55,
            times: [0, 0.75, 1],
            delay,
            ease: 'easeInOut',
          },
        };
      },
    }),
    [boxSize, gap, length],
  );

  const style = {
    '--animated-otp-box-size': `${boxSize}px`,
    '--animated-otp-gap': `${gap}px`,
  } as React.CSSProperties;

  return (
    <div className={`animated-otp-root ${className}`.trim()}>
      <div
        className={`animated-otp-inputs ${status === 'success' ? 'is-complete' : ''}`.trim()}
        style={style}
        onPaste={handlePaste}
      >
      {digits.map((digit, index) => (
        <motion.div
          key={index}
          className="animated-otp-wrapper"
          custom={index}
          variants={boxVariants}
          initial="idle"
          animate={animateOnComplete && status === 'success' ? 'success' : 'idle'}
        >
          <motion.input
            ref={(el: HTMLInputElement | null) => {
              refs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(index, e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(index, e)}
            disabled={disabled || status !== 'idle'}
            aria-label={`Digit ${index + 1} of ${length}`}
            className="animated-otp-field"
            animate={
              status === 'success'
                ? { color: 'transparent', transition: { delay: 0.35, duration: 0.2 } }
                : { color: 'var(--animated-otp-text, #fff)' }
            }
          />
          {index === 0 ? (
            <motion.svg
              viewBox="0 0 24 24"
              fill="none"
              className="animated-otp-tick"
              initial={{ opacity: 0, scale: 0.5, x: '-50%', y: '-50%' }}
              animate={
                status === 'success'
                  ? {
                      opacity: 1,
                      scale: 1,
                      x: '-50%',
                      y: '-50%',
                      transition: { delay: 0.75, duration: 0.45, type: 'spring', stiffness: 260, damping: 22 },
                    }
                  : { opacity: 0, scale: 0.5, x: '-50%', y: '-50%' }
              }
            >
              <motion.path
                d="M5 13l4 4L19 7"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={status === 'success' ? { pathLength: 1, transition: { delay: 0.8, duration: 0.35 } } : { pathLength: 0 }}
              />
            </motion.svg>
          ) : null}
        </motion.div>
      ))}
      </div>
      {status === 'success' && verifiedLabel ? (
        <motion.p
          className="animated-otp-verified-label"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 1.05, duration: 0.35 } }}
        >
          {verifiedLabel}
        </motion.p>
      ) : null}
    </div>
  );
}
