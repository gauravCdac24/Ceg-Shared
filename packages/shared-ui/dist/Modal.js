import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { uiCopy } from "./copy";
const sizeClass = {
    sm: "ceg-modal__panel--sm",
    md: "ceg-modal__panel--md",
    lg: "ceg-modal__panel--lg",
    xl: "ceg-modal__panel--xl",
};
export function Modal({ open, onClose, title, children, size = "md", className, surfaceClassName = "ceg-frosted-modal", closeLabel = uiCopy.modal.close, }) {
    const titleId = React.useId();
    const modalRef = React.useRef(null);
    const triggerRef = React.useRef(null);
    React.useEffect(() => {
        if (!open)
            return;
        triggerRef.current = document.activeElement;
        const focusable = modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        focusable?.[0]?.focus();
    }, [open]);
    React.useEffect(() => {
        if (!open) {
            if (triggerRef.current instanceof HTMLElement) {
                triggerRef.current.focus();
            }
            return;
        }
        const trap = (e) => {
            if (e.key !== "Tab")
                return;
            const focusable = Array.from(modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []);
            if (focusable.length === 0)
                return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
            }
            else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
            }
        };
        document.addEventListener("keydown", trap);
        return () => document.removeEventListener("keydown", trap);
    }, [open]);
    React.useEffect(() => {
        if (!open)
            return;
        const onKey = (e) => {
            if (e.key === "Escape")
                onClose();
        };
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);
    if (!open)
        return null;
    return (_jsxs("div", { className: "ceg-modal", role: "presentation", children: [_jsx("button", { type: "button", className: "ceg-modal__backdrop", "aria-label": closeLabel, onClick: onClose }), _jsxs("div", { ref: modalRef, className: [
                    "ceg-modal__panel",
                    surfaceClassName,
                    sizeClass[size],
                    className,
                ]
                    .filter(Boolean)
                    .join(" "), role: "dialog", "aria-modal": "true", "aria-labelledby": title ? titleId : undefined, children: [title != null && title !== false && (_jsxs("header", { className: "ceg-modal__header", children: [_jsx("h2", { id: titleId, className: "ceg-modal__title", children: title }), _jsx("button", { type: "button", className: "ceg-modal__close", onClick: onClose, "aria-label": closeLabel, children: "\u00D7" })] })), _jsx("div", { className: "ceg-modal__body", children: children })] })] }));
}
//# sourceMappingURL=Modal.js.map