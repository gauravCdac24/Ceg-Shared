import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatDateEnIn } from "./formatDateEnIn";
/**
 * Renders a date in en-IN display form: DD MMM YYYY (e.g. 19 May 2026).
 */
export function DateDisplay({ value, time, timeZone, fallback = null, className, label, }) {
    const formatted = formatDateEnIn(value, { time, timeZone });
    if (!formatted) {
        return fallback != null ? _jsx(_Fragment, { children: fallback }) : null;
    }
    const content = label ? (_jsxs(_Fragment, { children: [_jsxs("span", { className: "ceg-date-display__label", children: [label, " "] }), _jsx("time", { dateTime: toIsoDate(value), children: formatted })] })) : (_jsx("time", { dateTime: toIsoDate(value), children: formatted }));
    return _jsx("span", { className: ["ceg-date-display", className].filter(Boolean).join(" "), children: content });
}
function toIsoDate(value) {
    if (value == null || value === "")
        return undefined;
    const dt = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dt.getTime()))
        return undefined;
    return dt.toISOString();
}
//# sourceMappingURL=DateDisplay.js.map