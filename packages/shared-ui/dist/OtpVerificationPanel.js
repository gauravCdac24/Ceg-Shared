import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import './OtpVerificationPanel.css';
export function OtpVerificationPanel({ title = 'Enter verification code', subtitle, email, icon, children, error, devHint, actions, footer, resendLabel = 'Resend', onResend, resendDisabled = false, meta, theme = 'light', variant = 'embedded', showHandle = false, className = '', style, }) {
    const subtitleContent = subtitle ??
        (email ? (_jsxs(_Fragment, { children: ["We sent a verification code to", _jsx("br", {}), _jsx("span", { className: "otp-verification-panel__email", children: email })] })) : ('Enter the code from your email to continue.'));
    return (_jsxs("div", { className: `otp-verification-shell otp-verification-shell--${theme}${variant === 'fullscreen' ? ' otp-verification-shell--fullscreen' : ''} ${className}`.trim(), style: style, children: [_jsx("div", { className: "otp-verification-shell__ambient", "aria-hidden": true, children: _jsx("div", { className: "otp-verification-shell__tunnel" }) }), _jsxs("div", { className: "otp-verification-panel", children: [showHandle ? _jsx("div", { className: "otp-verification-panel__handle", "aria-hidden": true }) : null, icon ? _jsx("div", { className: "otp-verification-panel__icon", children: icon }) : null, _jsxs("header", { className: "otp-verification-panel__header", children: [_jsx("h1", { className: "otp-verification-panel__title", children: title }), _jsx("p", { className: "otp-verification-panel__subtitle", children: subtitleContent })] }), devHint ? (_jsxs("p", { className: "otp-verification-panel__dev-hint", role: "status", children: ["Local dev: use ", _jsx("strong", { children: devHint })] })) : null, _jsx("div", { className: "otp-verification-panel__input", children: children }), error ? (_jsx("div", { className: "otp-verification-panel__error", role: "alert", children: error })) : null, actions ? _jsx("div", { className: "otp-verification-panel__actions", children: actions }) : null, onResend || footer || meta ? (_jsxs("div", { className: "otp-verification-panel__footer", children: [footer ?? (_jsxs(_Fragment, { children: ["Didn't get the code?", ' ', _jsx("button", { type: "button", className: "otp-verification-panel__resend", onClick: onResend, disabled: resendDisabled || !onResend, children: resendLabel })] })), meta ? _jsx("div", { className: "otp-verification-panel__meta", children: meta }) : null] })) : null] })] }));
}
export function OtpVerificationModal({ open, onClose, closeOnBackdrop = true, labelledBy, theme = 'dark', ...panelProps }) {
    const fallbackId = useId();
    const titleId = labelledBy || fallbackId;
    useEffect(() => {
        if (!open)
            return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);
    useEffect(() => {
        if (!open)
            return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape')
                onClose?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    if (!open || typeof document === 'undefined')
        return null;
    return createPortal(_jsxs("div", { className: "otp-verification-modal", role: "presentation", children: [_jsx("div", { className: "otp-verification-modal__backdrop", role: "presentation", onClick: closeOnBackdrop ? onClose : undefined, "aria-hidden": true }), _jsx("div", { className: "otp-verification-modal__panel-wrap", role: "dialog", "aria-modal": "true", "aria-labelledby": titleId, children: _jsx(OtpVerificationPanel, { ...panelProps, theme: theme, variant: "embedded", showHandle: true, title: panelProps.title }) })] }), document.body);
}
//# sourceMappingURL=OtpVerificationPanel.js.map