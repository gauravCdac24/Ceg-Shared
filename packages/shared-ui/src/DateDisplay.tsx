import * as React from "react";
import { formatDateEnIn, type FormatDateEnInOptions } from "./formatDateEnIn";

export type DateDisplayProps = FormatDateEnInOptions & {
  value: string | number | Date | null | undefined;
  /** Shown when value is empty or invalid. */
  fallback?: React.ReactNode;
  className?: string;
  /** Accessible label prefix, e.g. "Published on". */
  label?: string;
};

/**
 * Renders a date in en-IN display form: DD MMM YYYY (e.g. 19 May 2026).
 */
export function DateDisplay({
  value,
  time,
  timeZone,
  fallback = null,
  className,
  label,
}: DateDisplayProps) {
  const formatted = formatDateEnIn(value, { time, timeZone });
  if (!formatted) {
    return fallback != null ? <>{fallback}</> : null;
  }

  const content = label ? (
    <>
      <span className="ceg-date-display__label">{label} </span>
      <time dateTime={toIsoDate(value)}>{formatted}</time>
    </>
  ) : (
    <time dateTime={toIsoDate(value)}>{formatted}</time>
  );

  return <span className={["ceg-date-display", className].filter(Boolean).join(" ")}>{content}</span>;
}

function toIsoDate(value: string | number | Date | null | undefined): string | undefined {
  if (value == null || value === "") return undefined;
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return undefined;
  return dt.toISOString();
}
