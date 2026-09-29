import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import './ChangePasswordForm.css';
export function ChangePasswordForm({ api, minPasswordLength = 8, title = 'Change password', className = '', username = '', }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [devHint, setDevHint] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const requestOtp = async () => {
        setError('');
        setLoading(true);
        try {
            const res = await api.requestOtp();
            setOtpSent(true);
            setDevHint(res && typeof res === 'object' && 'dev_otp_hint' in res
                ? String(res.dev_otp_hint ?? '')
                : null);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Could not send verification code');
        }
        finally {
            setLoading(false);
        }
    };
    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < minPasswordLength) {
            setError(`Password must be at least ${minPasswordLength} characters`);
            return;
        }
        if (newPassword !== confirm) {
            setError('New passwords do not match');
            return;
        }
        if (!otpSent) {
            setError('Request a verification code first');
            return;
        }
        setLoading(true);
        try {
            await api.changePassword({
                current_password: currentPassword,
                new_password: newPassword,
                otp: otp.trim(),
            });
            setSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirm('');
            setOtp('');
            setOtpSent(false);
            setDevHint(null);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Password change failed');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("section", { className: `ceg-change-password ${className}`.trim(), children: [title ? _jsx("h3", { className: "ceg-change-password__title", style: { margin: '0 0 8px', fontSize: '1rem', fontWeight: 700 }, children: title }) : null, _jsx("p", { className: "ceg-change-password__lead", children: "Confirm your current password, verify by email, then choose a new password." }), _jsxs("div", { className: "ceg-change-password__steps", "aria-hidden": true, children: [_jsxs("span", { className: `ceg-change-password__step${currentPassword ? ' ceg-change-password__step--done' : ''}`, children: [_jsx("span", { className: "ceg-change-password__step-num", children: "1" }), " Current password"] }), _jsxs("span", { className: `ceg-change-password__step${otpSent ? ' ceg-change-password__step--done' : ''}`, children: [_jsx("span", { className: "ceg-change-password__step-num", children: "2" }), " Email code"] }), _jsxs("span", { className: `ceg-change-password__step${newPassword && confirm ? ' ceg-change-password__step--done' : ''}`, children: [_jsx("span", { className: "ceg-change-password__step-num", children: "3" }), " New password"] })] }), success ? (_jsx("p", { role: "status", className: "ceg-change-password__alert ceg-change-password__alert--success", children: "Password updated successfully." })) : (_jsxs(_Fragment, { children: [_jsxs("form", { onSubmit: (e) => {
                            e.preventDefault();
                            void requestOtp();
                        }, className: "ceg-change-password__form", autoComplete: "on", children: [username ? (_jsx("input", { type: "text", name: "username", value: username, autoComplete: "username", tabIndex: -1, "aria-hidden": "true", readOnly: true, className: "ceg-change-password__username-offscreen" })) : null, error && !otpSent ? (_jsx("p", { role: "alert", className: "ceg-change-password__alert ceg-change-password__alert--error", children: error })) : null, _jsxs("label", { className: "ceg-change-password__field", children: [_jsx("span", { className: "ceg-change-password__label", children: "Current password" }), _jsx("input", { type: "password", className: "ceg-change-password__input", value: currentPassword, onChange: (e) => setCurrentPassword(e.target.value), required: true, autoComplete: "current-password" })] }), _jsx("button", { type: "submit", className: "ceg-change-password__btn ceg-change-password__btn--secondary", disabled: loading || !currentPassword, style: { alignSelf: 'flex-start' }, children: otpSent ? 'Resend code' : 'Send code' })] }), _jsxs("form", { onSubmit: onSubmit, className: "ceg-change-password__form", autoComplete: "on", children: [error && otpSent ? (_jsx("p", { role: "alert", className: "ceg-change-password__alert ceg-change-password__alert--error", children: error })) : null, _jsxs("label", { className: "ceg-change-password__field", children: [_jsx("span", { className: "ceg-change-password__label", children: "Email verification code" }), _jsx("input", { type: "text", inputMode: "numeric", pattern: "\\d{6}", maxLength: 6, className: "ceg-change-password__input", value: otp, onChange: (e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)), required: true, disabled: !otpSent, placeholder: otpSent ? '6-digit code' : 'Send code first' })] }), devHint ? (_jsxs("p", { className: "ceg-change-password__hint", children: ["Dev OTP: ", _jsx("strong", { children: devHint })] })) : null, _jsxs("div", { className: "ceg-change-password__grid-2", children: [_jsxs("label", { className: "ceg-change-password__field", children: [_jsx("span", { className: "ceg-change-password__label", children: "New password" }), _jsx("input", { type: "password", className: "ceg-change-password__input", value: newPassword, onChange: (e) => setNewPassword(e.target.value), required: true, minLength: minPasswordLength, autoComplete: "new-password", disabled: !otpSent })] }), _jsxs("label", { className: "ceg-change-password__field", children: [_jsx("span", { className: "ceg-change-password__label", children: "Confirm new password" }), _jsx("input", { type: "password", className: "ceg-change-password__input", value: confirm, onChange: (e) => setConfirm(e.target.value), required: true, autoComplete: "new-password", disabled: !otpSent })] })] }), _jsx("button", { type: "submit", className: "ceg-change-password__btn ceg-change-password__btn--primary", disabled: loading || !otpSent, style: { alignSelf: 'flex-start' }, children: loading ? 'Updating…' : 'Update password' })] })] }))] }));
}
//# sourceMappingURL=ChangePasswordForm.js.map