import React, { useState } from 'react';
import './ChangePasswordForm.css';

export type ChangePasswordApi = {
  requestOtp: () => Promise<{ dev_otp_hint?: string } | void>;
  changePassword: (payload: {
    current_password: string;
    new_password: string;
    otp: string;
  }) => Promise<void>;
};

type Props = {
  api: ChangePasswordApi;
  minPasswordLength?: number;
  title?: string;
  className?: string;
  /** Account email/username for password-manager autofill (hidden field). */
  username?: string;
};

export function ChangePasswordForm({
  api,
  minPasswordLength = 8,
  title = 'Change password',
  className = '',
  username = '',
}: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devHint, setDevHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const requestOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.requestOtp();
      setOtpSent(true);
      setDevHint(
        res && typeof res === 'object' && 'dev_otp_hint' in res
          ? String((res as { dev_otp_hint?: string }).dev_otp_hint ?? '')
          : null,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send verification code');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`ceg-change-password ${className}`.trim()}>
      {title ? <h3 className="ceg-change-password__title" style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 700 }}>{title}</h3> : null}
      <p className="ceg-change-password__lead">
        Confirm your current password, verify by email, then choose a new password.
      </p>

      <div className="ceg-change-password__steps" aria-hidden>
        <span className={`ceg-change-password__step${currentPassword ? ' ceg-change-password__step--done' : ''}`}>
          <span className="ceg-change-password__step-num">1</span> Current password
        </span>
        <span className={`ceg-change-password__step${otpSent ? ' ceg-change-password__step--done' : ''}`}>
          <span className="ceg-change-password__step-num">2</span> Email code
        </span>
        <span className={`ceg-change-password__step${newPassword && confirm ? ' ceg-change-password__step--done' : ''}`}>
          <span className="ceg-change-password__step-num">3</span> New password
        </span>
      </div>

      {success ? (
        <p role="status" className="ceg-change-password__alert ceg-change-password__alert--success">
          Password updated successfully.
        </p>
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void requestOtp();
            }}
            className="ceg-change-password__form"
            autoComplete="on"
          >
            {username ? (
              <input
                type="text"
                name="username"
                value={username}
                autoComplete="username"
                tabIndex={-1}
                aria-hidden="true"
                readOnly
                className="ceg-change-password__username-offscreen"
              />
            ) : null}
            {error && !otpSent ? (
              <p role="alert" className="ceg-change-password__alert ceg-change-password__alert--error">
                {error}
              </p>
            ) : null}

            <label className="ceg-change-password__field">
              <span className="ceg-change-password__label">Current password</span>
              <input
                type="password"
                className="ceg-change-password__input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>

            <button
              type="submit"
              className="ceg-change-password__btn ceg-change-password__btn--secondary"
              disabled={loading || !currentPassword}
              style={{ alignSelf: 'flex-start' }}
            >
              {otpSent ? 'Resend code' : 'Send code'}
            </button>
          </form>

          <form onSubmit={onSubmit} className="ceg-change-password__form" autoComplete="on">
            {error && otpSent ? (
              <p role="alert" className="ceg-change-password__alert ceg-change-password__alert--error">
                {error}
              </p>
            ) : null}

            <label className="ceg-change-password__field">
              <span className="ceg-change-password__label">Email verification code</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                className="ceg-change-password__input"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                disabled={!otpSent}
                placeholder={otpSent ? '6-digit code' : 'Send code first'}
              />
            </label>

            {devHint ? (
              <p className="ceg-change-password__hint">
                Dev OTP: <strong>{devHint}</strong>
              </p>
            ) : null}

            <div className="ceg-change-password__grid-2">
              <label className="ceg-change-password__field">
                <span className="ceg-change-password__label">New password</span>
                <input
                  type="password"
                  className="ceg-change-password__input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={minPasswordLength}
                  autoComplete="new-password"
                  disabled={!otpSent}
                />
              </label>
              <label className="ceg-change-password__field">
                <span className="ceg-change-password__label">Confirm new password</span>
                <input
                  type="password"
                  className="ceg-change-password__input"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={!otpSent}
                />
              </label>
            </div>

            <button
              type="submit"
              className="ceg-change-password__btn ceg-change-password__btn--primary"
              disabled={loading || !otpSent}
              style={{ alignSelf: 'flex-start' }}
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
