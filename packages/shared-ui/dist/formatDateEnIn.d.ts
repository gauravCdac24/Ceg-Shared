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
export declare function formatDateEnIn(value: string | number | Date | null | undefined, options?: FormatDateEnInOptions): string;
//# sourceMappingURL=formatDateEnIn.d.ts.map