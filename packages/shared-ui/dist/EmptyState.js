import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { uiCopy } from "./copy";
import { Button } from "./Button";
export function EmptyState({ title = uiCopy.emptyState.title, description = uiCopy.emptyState.description, icon, actionLabel = uiCopy.emptyState.action, onAction, actionProps, className, }) {
    return (_jsxs("section", { className: ["ceg-empty-state", className].filter(Boolean).join(" "), "aria-label": typeof title === "string" ? title : "Empty state", children: [icon && _jsx("div", { className: "ceg-empty-state__icon", "aria-hidden": "true", children: icon }), _jsx("h3", { className: "ceg-empty-state__title", children: title }), description != null && description !== false && (_jsx("p", { className: "ceg-empty-state__description", children: description })), onAction && (_jsx(Button, { variant: "primary", onClick: onAction, ...actionProps, children: actionLabel }))] }));
}
//# sourceMappingURL=EmptyState.js.map