import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { uiCopy } from "./copy";
const variantClass = {
    info: "ceg-alert ceg-alert--info",
    success: "ceg-alert ceg-alert--success",
    warning: "ceg-alert ceg-alert--warning",
    error: "ceg-alert ceg-alert--error",
};
const defaultBody = {
    info: uiCopy.alert.info,
    success: uiCopy.alert.success,
    warning: uiCopy.alert.warning,
    error: uiCopy.alert.error,
};
export function Alert({ variant = "info", title, children, onDismiss, className, role = variant === "error" || variant === "warning" ? "alert" : "status", }) {
    return (_jsxs("div", { className: [variantClass[variant], className].filter(Boolean).join(" "), role: role, children: [_jsxs("div", { className: "ceg-alert__body", children: [title != null && title !== false && _jsx("div", { className: "ceg-alert__title", children: title }), _jsx("div", { children: children ?? defaultBody[variant] })] }), onDismiss && (_jsx("button", { type: "button", className: "ceg-alert__dismiss", onClick: onDismiss, "aria-label": "Dismiss", children: "\u00D7" }))] }));
}
//# sourceMappingURL=Alert.js.map