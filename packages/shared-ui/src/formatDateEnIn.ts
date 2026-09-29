const IST = "Asia/Kolkata";

export type FormatDateEnInOptions = {
  /** Include time (12-hour, en-IN). */
  time?: boolean;
  /** IANA timezone; defaults to Asia/Kolkata for government display. */
  timeZone?: string;
};

/**
 * Format a date for Indian government UIs: `19 May 2026` (DD MMM YYYY).
 * Returns empty string for invalid or missing values.
 */
export function formatDateEnIn(
  value: string | number | Date | null | undefined,
  options: FormatDateEnInOptions = {},
): string {
  if (value == null || value === "") return "";
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return "";

  const timeZone = options.timeZone ?? IST;
  if (options.time) {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(dt);
  }

  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(dt);
}
