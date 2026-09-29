import * as React from "react";
import { type FormatDateEnInOptions } from "./formatDateEnIn";
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
export declare function DateDisplay({ value, time, timeZone, fallback, className, label, }: DateDisplayProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=DateDisplay.d.ts.map