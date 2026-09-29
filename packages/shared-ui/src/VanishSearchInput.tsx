import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import './VanishSearchInput.css';

export type VanishSearchInputProps = {
  /** Rotating placeholder phrases shown when the field is empty */
  placeholders: string[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Fired on Enter; when vanishOnSubmit is true the value is cleared after the effect */
  onSubmit?: (value: string) => void;
  /** Particle vanish on Enter (best for explicit search, not live filters) */
  vanishOnSubmit?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
  leftIcon?: ReactNode;
  placeholderIntervalMs?: number;
};

type Particle = { x: number; y: number; vx: number; vy: number; alpha: number; r: number; g: number; b: number };

function sampleParticles(
  canvas: HTMLCanvasElement,
  input: HTMLInputElement,
  text: string,
): Particle[] {
  const ctx = canvas.getContext('2d');
  if (!ctx || !text.trim()) return [];

  const style = getComputedStyle(input);
  const rect = input.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width));
  canvas.height = Math.max(1, Math.floor(rect.height));

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = style.color;
  ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  ctx.textBaseline = 'middle';
  const padLeft = Number.parseFloat(style.paddingLeft) || 0;
  ctx.fillText(text, padLeft, canvas.height / 2);

  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const particles: Particle[] = [];
  const step = 4;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const alpha = (data[i + 3] ?? 0) / 255;
      if (alpha < 0.15) continue;
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 2.4,
        vy: (Math.random() - 0.5) * 2.4 - 0.6,
        alpha,
        r: data[i] ?? 0,
        g: data[i + 1] ?? 0,
        b: data[i + 2] ?? 0,
      });
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  return particles;
}

/**
 * Search input with rotating placeholders and optional particle vanish on submit.
 * Adapted from Aceternity PlaceholdersAndVanishInput for the Ceg monorepo (no shadcn).
 */
export function VanishSearchInput({
  placeholders,
  value: controlledValue,
  defaultValue = '',
  onChange,
  onSubmit,
  vanishOnSubmit = false,
  disabled = false,
  className = '',
  inputClassName = '',
  ariaLabel = 'Search',
  leftIcon,
  placeholderIntervalMs = 3200,
}: VanishSearchInputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  const [internal, setInternal] = useState(defaultValue);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [vanishing, setVanishing] = useState(false);
  const [hideInput, setHideInput] = useState(false);

  const value = controlledValue !== undefined ? controlledValue : internal;
  const showRotatingPlaceholder = !value && placeholders.length > 0 && !vanishing;

  useEffect(() => {
    if (placeholders.length <= 1 || value) return undefined;
    const id = window.setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % placeholders.length);
    }, placeholderIntervalMs);
    return () => window.clearInterval(id);
  }, [placeholders.length, placeholderIntervalMs, value]);

  const setValue = useCallback(
    (next: string) => {
      if (controlledValue === undefined) setInternal(next);
      onChange?.(next);
    },
    [controlledValue, onChange],
  );

  const runVanish = useCallback(
    (submitted: string) => {
      const input = inputRef.current;
      const canvas = canvasRef.current;
      if (!input || !canvas || !submitted.trim()) {
        onSubmit?.(submitted);
        return;
      }

      const particles = sampleParticles(canvas, input, submitted);
      if (particles.length === 0) {
        setValue('');
        onSubmit?.(submitted);
        return;
      }

      setVanishing(true);
      setHideInput(true);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setVanishing(false);
        setHideInput(false);
        onSubmit?.(submitted);
        return;
      }

      let frame = 0;
      const maxFrames = 28;

      const tick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.04;
          p.alpha *= 0.92;
          ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${Math.max(0, p.alpha)})`;
          ctx.fillRect(p.x, p.y, 2, 2);
        }
        frame += 1;
        if (frame < maxFrames) {
          animRef.current = requestAnimationFrame(tick);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          setVanishing(false);
          setHideInput(false);
          setValue('');
          onSubmit?.(submitted);
        }
      };

      animRef.current = requestAnimationFrame(tick);
    },
    [onSubmit, setValue],
  );

  useEffect(
    () => () => {
      if (animRef.current != null) cancelAnimationFrame(animRef.current);
    },
    [],
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (vanishOnSubmit) {
      runVanish(value);
    } else {
      onSubmit?.(value);
    }
  };

  const rootClass = [
    'ceg-vanish-search',
    leftIcon ? 'ceg-vanish-search--with-icon' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass}>
      {leftIcon ? <span className="ceg-vanish-search__icon">{leftIcon}</span> : null}
      <div className="ceg-vanish-search__field-wrap">
        <canvas ref={canvasRef} className="ceg-vanish-search__canvas" aria-hidden />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          className={`ceg-vanish-search__input ${inputClassName}`.trim()}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || vanishing}
          aria-label={ariaLabel}
          autoComplete="off"
          style={hideInput ? { color: 'transparent', caretColor: 'transparent' } : undefined}
        />
        <AnimatePresence mode="wait">
          {showRotatingPlaceholder ? (
            <motion.span
              key={placeholders[placeholderIdx]}
              className="ceg-vanish-search__placeholder"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.22 }}
              aria-hidden
            >
              {placeholders[placeholderIdx]}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
