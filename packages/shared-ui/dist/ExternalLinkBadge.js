import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import "./ExternalLinkBadge.css";
const DEFAULT_LABEL = {
    "new-tab": "Opens in new tab",
    inline: "Leaves this page",
};
/**
 * Visual cue for cross-product / external entry points. Does not change navigation —
 * place next to the control that already opens the other product.
 */
export function ExternalLinkBadge({ mode = "new-tab", className, label, }) {
    const text = label ?? DEFAULT_LABEL[mode];
    return (_jsxs("span", { className: ["ceg-ext-link-badge", `ceg-ext-link-badge--${mode}`, className]
            .filter(Boolean)
            .join(" "), title: text, children: [mode === "new-tab" ? (_jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", children: _jsx("path", { fill: "currentColor", d: "M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7zM5 5v14h14v-7h-2v5H7V7h5V5H5z" }) })) : (_jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", children: _jsx("path", { fill: "currentColor", d: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" }) })), _jsx("span", { className: "ceg-ext-link-badge__text", children: text })] }));
}
//# sourceMappingURL=ExternalLinkBadge.js.map