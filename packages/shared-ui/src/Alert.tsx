import * as React from "react";
import { uiCopy } from "./copy";

export type AlertVariant = "info" | "success" | "warning" | "error";

export type AlertProps = {
  variant?: AlertVariant;
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Called when the dismiss control is clicked. Omit to hide dismiss. */
  onDismiss?: () => void;
  className?: string;
  role?: "alert" | "status";
};

const variantClass: Record<AlertVariant, string> = {
  info: "ceg-alert ceg-alert--info",
  success: "ceg-alert ceg-alert--success",
  warning: "ceg-alert ceg-alert--warning",
  error: "ceg-alert ceg-alert--error",
};

const defaultBody: Record<AlertVariant, string> = {
  info: uiCopy.alert.info,
  success: uiCopy.alert.success,
  warning: uiCopy.alert.warning,
  error: uiCopy.alert.error,
};

export function Alert({
  variant = "info",
  title,
  children,
  onDismiss,
  className,
  role = variant === "error" || variant === "warning" ? "alert" : "status",
}: AlertProps) {
  return (
    <div
      className={[variantClass[variant], className].filter(Boolean).join(" ")}
      role={role}
    >
      <div className="ceg-alert__body">
        {title != null && title !== false && <div className="ceg-alert__title">{title}</div>}
        <div>{children ?? defaultBody[variant]}</div>
      </div>
      {onDismiss && (
        <button type="button" className="ceg-alert__dismiss" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}
