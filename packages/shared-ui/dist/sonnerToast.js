import { jsx as _jsx } from "react/jsx-runtime";
import { toast as sonnerToast, Toaster as SonnerToaster } from "sonner";
function normalizeMsg(message) {
    if (message == null)
        return "";
    if (typeof message === "string")
        return message;
    if (typeof message === "object" && message !== null && "message" in message) {
        return String(message.message);
    }
    return String(message);
}
function normalizeOpts(opts = {}) {
    const { icon, className, ...rest } = opts;
    const out = { ...rest };
    if (className) {
        out.classNames = { ...(out.classNames ?? {}), toast: className };
    }
    if (icon != null) {
        out.icon = icon;
    }
    return out;
}
function emit(message, opts, fn = sonnerToast) {
    const msg = normalizeMsg(message);
    const o = normalizeOpts(opts);
    if (opts?.icon != null && fn === sonnerToast) {
        return sonnerToast.message(msg, o);
    }
    return fn(msg, o);
}
export const toast = Object.assign((message, opts) => emit(message, opts), {
    success: (msg, opts) => emit(msg, opts, sonnerToast.success),
    error: (msg, opts) => emit(msg, opts, sonnerToast.error),
    info: (msg, opts) => emit(msg, opts, sonnerToast.info),
    warning: (msg, opts) => emit(msg, opts, sonnerToast.warning),
    loading: (msg, opts) => emit(msg, opts, sonnerToast.loading),
    message: (msg, opts) => emit(msg, opts, sonnerToast.message),
    dismiss: (id) => sonnerToast.dismiss(id),
    promise: sonnerToast.promise.bind(sonnerToast),
    custom: (render, opts) => {
        const o = normalizeOpts(opts);
        const duration = opts?.duration ?? o.duration ?? 5000;
        return sonnerToast.custom(render, { ...o, duration });
    },
    warn: (msg, opts) => emit(msg, opts, sonnerToast.warning),
});
/** Maps legacy react-hot-toast Toaster styling to Sonner fleet defaults. */
export function CegSonnerToaster({ position = "top-right", richColors = true, closeButton = true, duration, toastOptions = {}, }) {
    const style = {
        background: "var(--bg-surface, var(--surface-elevated, #fff))",
        color: "var(--text-primary, #111)",
        border: "1px solid var(--border-glass, var(--border-subtle, #e5e7eb))",
        fontSize: "14px",
        maxWidth: "90vw",
        ...toastOptions.style,
    };
    const toastClass = toastOptions.className ?? toastOptions.classNames?.toast;
    return (_jsx(SonnerToaster, { position: position, richColors: richColors, closeButton: closeButton, duration: duration ?? toastOptions.duration ?? 5000, expand: true, visibleToasts: 4, toastOptions: {
            ...toastOptions,
            style,
            classNames: {
                ...(toastOptions.classNames ?? {}),
                ...(toastClass ? { toast: toastClass } : {}),
            },
        } }));
}
/** Alias for react-hot-toast `Toaster` import sites migrating to shared Sonner. */
export const Toaster = CegSonnerToaster;
export default toast;
//# sourceMappingURL=sonnerToast.js.map