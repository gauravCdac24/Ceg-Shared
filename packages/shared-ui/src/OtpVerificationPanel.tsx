import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import './OtpVerificationPanel.css';

export type OtpVerificationTheme = 'light' | 'dark';

export type OtpVerificationPanelProps = {
  title?: string;
  subtitle?: React.ReactNode;
  email?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  error?: string;
  devHint?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  resendLabel?: string;
  onResend?: () => void;
  resendDisabled?: boolean;
  meta?: React.ReactNode;
  theme?: OtpVerificationTheme;
  variant?: 'embedded' | 'fullscreen';
  showHandle?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export function OtpVerificationPanel({
  title = 'Enter verification code',
  subtitle,
  email,
  icon,
  children,
  error,
  devHint,
  actions,
  footer,
  resendLabel = 'Resend',
  onResend,
  resendDisabled = false,
  meta,
  theme = 'light',
  variant = 'embedded',
  showHandle = false,
  className = '',
  style,
}: OtpVerificationPanelProps) {
  const subtitleContent =
    subtitle ??
    (email ? (
      <>
        We sent a verification code to
        <br />
        <span className="otp-verification-panel__email">{email}</span>
      </>
    ) : (
      'Enter the code from your email to continue.'
    ));

  return (
    <div
      className={`otp-verification-shell otp-verification-shell--${theme}${variant === 'fullscreen' ? ' otp-verification-shell--fullscreen' : ''} ${className}`.trim()}
      style={style}
    >
      <div className="otp-verification-shell__ambient" aria-hidden>
        <div className="otp-verification-shell__tunnel" />
      </div>
      <div className="otp-verification-panel">
        {showHandle ? <div className="otp-verification-panel__handle" aria-hidden /> : null}
        {icon ? <div className="otp-verification-panel__icon">{icon}</div> : null}
        <header className="otp-verification-panel__header">
          <h1 className="otp-verification-panel__title">{title}</h1>
          <p className="otp-verification-panel__subtitle">{subtitleContent}</p>
        </header>
        {devHint ? (
          <p className="otp-verification-panel__dev-hint" role="status">
            Local dev: use <strong>{devHint}</strong>
          </p>
        ) : null}
        <div className="otp-verification-panel__input">{children}</div>
        {error ? (
          <div className="otp-verification-panel__error" role="alert">
            {error}
          </div>
        ) : null}
        {actions ? <div className="otp-verification-panel__actions">{actions}</div> : null}
        {onResend || footer || meta ? (
          <div className="otp-verification-panel__footer">
            {footer ?? (
              <>
                Didn&apos;t get the code?{' '}
                <button
                  type="button"
                  className="otp-verification-panel__resend"
                  onClick={onResend}
                  disabled={resendDisabled || !onResend}
                >
                  {resendLabel}
                </button>
              </>
            )}
            {meta ? <div className="otp-verification-panel__meta">{meta}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export type OtpVerificationModalProps = Omit<OtpVerificationPanelProps, 'variant' | 'showHandle'> & {
  open: boolean;
  onClose?: () => void;
  closeOnBackdrop?: boolean;
  labelledBy?: string;
};

export function OtpVerificationModal({
  open,
  onClose,
  closeOnBackdrop = true,
  labelledBy,
  theme = 'dark',
  ...panelProps
}: OtpVerificationModalProps) {
  const fallbackId = useId();
  const titleId = labelledBy || fallbackId;

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="otp-verification-modal" role="presentation">
      <div
        className="otp-verification-modal__backdrop"
        role="presentation" onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden
      />
      <div
        className="otp-verification-modal__panel-wrap"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <OtpVerificationPanel
          {...panelProps}
          theme={theme}
          variant="embedded"
          showHandle
          title={panelProps.title}
        />
      </div>
    </div>,
    document.body,
  );
}
