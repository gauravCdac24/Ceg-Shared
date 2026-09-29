import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { HintTooltip } from "./HintTooltip";
/** Shared field chrome — uses @ceg/design-tokens CSS variables via class names. */
export const fieldClassNames = {
    root: "ceg-field",
    label: "ceg-field__label",
    control: "ceg-field__control",
    error: "ceg-field__error",
    hint: "ceg-field__hint",
};
export function FieldShell({ name, label, required, className, error, hint, children, }) {
    return (_jsxs("label", { className: [fieldClassNames.root, className].filter(Boolean).join(" "), "data-field": name, children: [label != null && label !== false && (_jsxs("span", { className: fieldClassNames.label, children: [label, required && _jsx("span", { "aria-hidden": "true", children: " *" }), !error && typeof hint === "string" && hint.trim() ? _jsx(HintTooltip, { hint: hint }) : null] })), children, error && (_jsx("span", { role: "alert", className: fieldClassNames.error, children: error })), !error && hint != null && hint !== false && typeof hint !== "string" && (_jsx("span", { className: fieldClassNames.hint, children: hint }))] }));
}
//# sourceMappingURL=fieldPrimitives.js.map