import * as React from "react";
import "./DeveloperDisclosure.css";

export type DeveloperDisclosureProps = {
  /** Toggle button primary label. Default: "For developers". */
  label?: string;
  /** Secondary hint when collapsed. */
  hint?: string;
  /** Secondary hint when expanded. */
  hideHint?: string;
  defaultOpen?: boolean;
  /** Fires when expand/collapse changes (e.g. sync JSON from form before show). */
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
};

/**
 * Only sanctioned way to show JSON / curl / job ids / env vars to operator-facing admin roles.
 * Pattern extracted from IntegrationHubDocs operator audience toggle.
 */
export function DeveloperDisclosure({
  label = "For developers",
  hint = "Show technical details",
  hideHint = "Hide technical details",
  defaultOpen = false,
  onOpenChange,
  children,
  className,
}: DeveloperDisclosureProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className={["ceg-dev-disclosure", className].filter(Boolean).join(" ")}>
      <button
        type="button"
        className="ceg-dev-disclosure__toggle"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            onOpenChange?.(next);
            return next;
          });
        }}
      >
        <strong>{label}</strong>
        <span>{open ? hideHint : hint}</span>
      </button>
      {open ? <div className="ceg-dev-disclosure__body">{children}</div> : null}
    </div>
  );
}
