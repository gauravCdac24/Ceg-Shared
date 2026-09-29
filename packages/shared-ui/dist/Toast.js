import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { uiCopy } from "./copy";
const ToastContext = React.createContext(null);
const variantClass = {
    success: "ceg-toast ceg-toast--success",
    error: "ceg-toast ceg-toast--error",
    warning: "ceg-toast ceg-toast--warning",
    info: "ceg-toast ceg-toast--info",
};
const defaultMessage = {
    success: uiCopy.toast.success,
    error: uiCopy.toast.error,
    warning: uiCopy.toast.warning,
    info: uiCopy.toast.info,
};
function nextId() {
    return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
export function ToastProvider({ children, durationMs = 4500, position = "bottom-right", }) {
    const [toasts, setToasts] = React.useState([]);
    const timers = React.useRef(new Map());
    const dismiss = React.useCallback((id) => {
        const t = timers.current.get(id);
        if (t != null)
            window.clearTimeout(t);
        timers.current.delete(id);
        setToasts((prev) => prev.filter((x) => x.id !== id));
    }, []);
    const show = React.useCallback((variant, message, opts) => {
        const id = nextId();
        const item = {
            id,
            variant,
            message: message ?? defaultMessage[variant],
            durationMs: opts?.durationMs ?? durationMs,
        };
        setToasts((prev) => [...prev, item]);
        if (item.durationMs && item.durationMs > 0) {
            const handle = window.setTimeout(() => dismiss(id), item.durationMs);
            timers.current.set(id, handle);
        }
    }, [dismiss, durationMs]);
    const clear = React.useCallback(() => {
        timers.current.forEach((h) => window.clearTimeout(h));
        timers.current.clear();
        setToasts([]);
    }, []);
    React.useEffect(() => () => {
        timers.current.forEach((h) => window.clearTimeout(h));
        timers.current.clear();
    }, []);
    const value = React.useMemo(() => ({ toasts, show, dismiss, clear }), [toasts, show, dismiss, clear]);
    return (_jsxs(ToastContext.Provider, { value: value, children: [children, _jsx(ToastStack, { toasts: toasts, onDismiss: dismiss, position: position })] }));
}
export function useToast() {
    const ctx = React.useContext(ToastContext);
    if (!ctx) {
        throw new Error("useToast must be used within ToastProvider");
    }
    return ctx;
}
const positionClass = {
    "top-right": "ceg-toast-stack--top-right",
    "bottom-right": "ceg-toast-stack--bottom-right",
    "bottom-center": "ceg-toast-stack--bottom-center",
};
export function ToastStack({ toasts, onDismiss, position }) {
    if (!toasts.length)
        return null;
    return (_jsx("div", { className: ["ceg-toast-stack", positionClass[position]].join(" "), "aria-live": "polite", "aria-relevant": "additions", children: toasts.map((t) => (_jsxs("div", { className: variantClass[t.variant], role: "status", children: [_jsx("span", { children: t.message }), _jsx("button", { type: "button", className: "ceg-toast__dismiss", onClick: () => onDismiss(t.id), "aria-label": "Dismiss", children: "\u00D7" })] }, t.id))) }));
}
//# sourceMappingURL=Toast.js.map