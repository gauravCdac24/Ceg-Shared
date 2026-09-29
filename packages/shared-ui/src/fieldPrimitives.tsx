import * as React from "react";
import { HintTooltip } from "./HintTooltip";

/** Shared field chrome — uses @ceg/design-tokens CSS variables via class names. */
export const fieldClassNames = {
  root: "ceg-field",
  label: "ceg-field__label",
  control: "ceg-field__control",
  error: "ceg-field__error",
  hint: "ceg-field__hint",
} as const;

export type FieldShellProps = {
  name?: string;
  label?: React.ReactNode;
  required?: boolean;
  className?: string;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
};

export function FieldShell({
  name,
  label,
  required,
  className,
  error,
  hint,
  children,
}: FieldShellProps) {
  return (
    <label className={[fieldClassNames.root, className].filter(Boolean).join(" ")} data-field={name}>
      {label != null && label !== false && (
        <span className={fieldClassNames.label}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
          {!error && typeof hint === "string" && hint.trim() ? <HintTooltip hint={hint} /> : null}
        </span>
      )}
      {children}
      {error && (
        <span role="alert" className={fieldClassNames.error}>
          {error}
        </span>
      )}
      {!error && hint != null && hint !== false && typeof hint !== "string" && (
        <span className={fieldClassNames.hint}>{hint}</span>
      )}
    </label>
  );
}
