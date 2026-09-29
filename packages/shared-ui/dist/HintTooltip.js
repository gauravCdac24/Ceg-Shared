import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createElement, useId } from "react";
import "./HintTooltip.css";
/** Instructional copy as a hover/focus tooltip — not a visible paragraph. */
export function HintTooltip({ hint, label = "More information" }) {
    const id = useId();
    const text = hint.trim();
    if (!text)
        return null;
    return (_jsxs("span", { className: "ceg-hint", children: [_jsx("button", { type: "button", className: "ceg-hint__btn", "aria-label": label, "aria-describedby": id, children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", children: [_jsx("circle", { cx: "12", cy: "12", r: "9", fill: "none", stroke: "currentColor", strokeWidth: "1.75" }), _jsx("path", { d: "M12 11.25v5M12 8.25h.01", fill: "none", stroke: "currentColor", strokeWidth: "1.75", strokeLinecap: "round" })] }) }), _jsx("span", { className: "ceg-hint__tip", role: "tooltip", id: id, children: text })] }));
}
export function HeadingWithHint({ title, hint, as: Tag = "h1", className }) {
    const text = typeof hint === "string" ? hint.trim() : "";
    return createElement(Tag, { className }, _jsxs("span", { className: "ceg-heading-hint", children: [title, text ? _jsx(HintTooltip, { hint: text }) : null] }));
}
/** Long / sentence-like supporting copy belongs in a tooltip, not under the title. */
export function looksLikeHint(text) {
    const t = text.trim();
    if (t.length >= 48)
        return true;
    const words = t.split(/\s+/).filter(Boolean);
    return words.length >= 6 && /[.?!]/.test(t);
}
//# sourceMappingURL=HintTooltip.js.map