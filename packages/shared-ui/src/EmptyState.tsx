import * as React from "react";
import { uiCopy } from "./copy";
import { Button, type ButtonProps } from "./Button";

export type EmptyStateProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  actionProps?: Omit<ButtonProps, "children" | "onClick">;
  className?: string;
};

export function EmptyState({
  title = uiCopy.emptyState.title,
  description = uiCopy.emptyState.description,
  icon,
  actionLabel = uiCopy.emptyState.action,
  onAction,
  actionProps,
  className,
}: EmptyStateProps) {
  return (
    <section
      className={["ceg-empty-state", className].filter(Boolean).join(" ")}
      aria-label={typeof title === "string" ? title : "Empty state"}
    >
      {icon && <div className="ceg-empty-state__icon" aria-hidden="true">{icon}</div>}
      <h3 className="ceg-empty-state__title">{title}</h3>
      {description != null && description !== false && (
        <p className="ceg-empty-state__description">{description}</p>
      )}
      {onAction && (
        <Button variant="primary" onClick={onAction} {...actionProps}>
          {actionLabel}
        </Button>
      )}
    </section>
  );
}
