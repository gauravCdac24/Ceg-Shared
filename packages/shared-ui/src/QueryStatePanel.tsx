import * as React from "react";
import "./QueryStatePanel.css";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

export type QueryStatePanelProps = {
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  useCard?: boolean;
  loadingText?: string;
  errorText?: string;
  /** Optional support reference (e.g. request id) shown under the error message. */
  errorDetail?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onRetry?: () => void;
  /** table = list bones; page = KPI + panels; inline = compact */
  loadingVariant?: "table" | "page" | "inline";
  children?: React.ReactNode;
};

function Bone({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`ceg-query-bone ${className}`.trim()} style={style} aria-hidden="true" />;
}

function Boneyard({ variant }: { variant: NonNullable<QueryStatePanelProps["loadingVariant"]> }) {
  if (variant === "inline") {
    return (
      <div className="ceg-query-boneyard ceg-query-boneyard--inline" aria-hidden="true">
        <Bone style={{ height: 14, width: "38%" }} />
        <Bone className="ceg-query-skeleton__row" style={{ height: 36 }} />
        <Bone className="ceg-query-skeleton__row" style={{ height: 36 }} />
      </div>
    );
  }

  if (variant === "page") {
    return (
      <div className="ceg-query-boneyard ceg-query-boneyard--page" aria-hidden="true">
        <div className="ceg-query-boneyard__kpis">
          {[1, 2, 3, 4].map((i) => (
            <Bone key={i} className="ceg-query-bone--kpi" />
          ))}
        </div>
        <div className="ceg-query-boneyard__panels">
          <Bone className="ceg-query-bone--panel" />
          <Bone className="ceg-query-bone--panel" />
        </div>
      </div>
    );
  }

  return (
    <div className="ceg-query-boneyard ceg-query-boneyard--table" aria-hidden="true">
      <div className="ceg-query-boneyard__toolbar">
        <Bone style={{ height: 32, width: 160 }} />
        <Bone style={{ height: 32, width: 96 }} />
      </div>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Bone key={i} className="ceg-query-skeleton__row" style={{ height: i === 1 ? 40 : 36 }} />
      ))}
    </div>
  );
}

/**
 * Unified loading / error / empty wrapper for admin list queries (PS-DS-002).
 * Promoted from QuizForge — use instead of toast-only error flashes.
 */
export function QueryStatePanel({
  loading = false,
  error = false,
  empty = false,
  useCard = true,
  loadingText = "Loading data…",
  errorText = "Something went wrong while loading this section.",
  errorDetail,
  emptyTitle = "Nothing to show yet",
  emptyDescription,
  emptyIcon,
  emptyActionLabel,
  onEmptyAction,
  onRetry,
  loadingVariant = "table",
  children,
}: QueryStatePanelProps) {
  const wrap = (content: React.ReactNode) =>
    useCard ? <div className="ceg-query-panel">{content}</div> : <>{content}</>;

  if (loading) {
    const content = (
      <div aria-live="polite" role="status">
        <span className="ceg-query-panel__sr-only">{loadingText}</span>
        <Boneyard variant={loadingVariant} />
      </div>
    );
    return loadingVariant === "page" ? content : wrap(content);
  }

  if (error) {
    return wrap(
      <div className="ceg-query-panel__center">
        <p className="ceg-query-panel__message">{errorText}</p>
        {errorDetail ? (
          <p className="ceg-query-panel__detail" aria-label="Support reference">
            {errorDetail}
          </p>
        ) : null}
        {onRetry ? (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>,
    );
  }

  if (empty) {
    return wrap(
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />,
    );
  }

  return <>{children}</>;
}
