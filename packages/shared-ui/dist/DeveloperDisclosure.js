import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import "./DeveloperDisclosure.css";
/**
 * Only sanctioned way to show JSON / curl / job ids / env vars to operator-facing admin roles.
 * Pattern extracted from IntegrationHubDocs operator audience toggle.
 */
export function DeveloperDisclosure({ label = "For developers", hint = "Show technical details", hideHint = "Hide technical details", defaultOpen = false, onOpenChange, children, className, }) {
    const [open, setOpen] = React.useState(defaultOpen);
    return (_jsxs("div", { className: ["ceg-dev-disclosure", className].filter(Boolean).join(" "), children: [_jsxs("button", { type: "button", className: "ceg-dev-disclosure__toggle", "aria-expanded": open, onClick: () => {
                    setOpen((v) => {
                        const next = !v;
                        onOpenChange?.(next);
                        return next;
                    });
                }, children: [_jsx("strong", { children: label }), _jsx("span", { children: open ? hideHint : hint })] }), open ? _jsx("div", { className: "ceg-dev-disclosure__body", children: children }) : null] }));
}
//# sourceMappingURL=DeveloperDisclosure.js.map