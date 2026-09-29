import { createElement, useId, type ElementType, type ReactNode } from "react";
import "./HintTooltip.css";

export type HintTooltipProps = {
  hint: string;
  label?: string;
};

/** Instructional copy as a hover/focus tooltip — not a visible paragraph. */
export function HintTooltip({ hint, label = "More information" }: HintTooltipProps) {
  const id = useId();
  const text = hint.trim();
  if (!text) return null;

  return (
    <span className="ceg-hint">
      <button type="button" className="ceg-hint__btn" aria-label={label} aria-describedby={id}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M12 11.25v5M12 8.25h.01"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <span className="ceg-hint__tip" role="tooltip" id={id}>
        {text}
      </span>
    </span>
  );
}

export type HeadingWithHintProps = {
  title: ReactNode;
  hint?: string | null;
  as?: ElementType;
  className?: string;
};

export function HeadingWithHint({ title, hint, as: Tag = "h1", className }: HeadingWithHintProps) {
  const text = typeof hint === "string" ? hint.trim() : "";
  return createElement(
    Tag,
    { className },
    <span className="ceg-heading-hint">
      {title}
      {text ? <HintTooltip hint={text} /> : null}
    </span>,
  );
}

/** Long / sentence-like supporting copy belongs in a tooltip, not under the title. */
export function looksLikeHint(text: string): boolean {
  const t = text.trim();
  if (t.length >= 48) return true;
  const words = t.split(/\s+/).filter(Boolean);
  return words.length >= 6 && /[.?!]/.test(t);
}
