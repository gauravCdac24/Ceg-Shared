const IST = "Asia/Kolkata";
/**
 * Format a date for Indian government UIs: `19 May 2026` (DD MMM YYYY).
 * Returns empty string for invalid or missing values.
 */
export function formatDateEnIn(value, options = {}) {
    if (value == null || value === "")
        return "";
    const dt = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dt.getTime()))
        return "";
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
//# sourceMappingURL=formatDateEnIn.js.map