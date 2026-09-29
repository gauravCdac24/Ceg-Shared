import React from 'react';
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
export declare function OtpVerificationPanel({ title, subtitle, email, icon, children, error, devHint, actions, footer, resendLabel, onResend, resendDisabled, meta, theme, variant, showHandle, className, style, }: OtpVerificationPanelProps): import("react/jsx-runtime").JSX.Element;
export type OtpVerificationModalProps = Omit<OtpVerificationPanelProps, 'variant' | 'showHandle'> & {
    open: boolean;
    onClose?: () => void;
    closeOnBackdrop?: boolean;
    labelledBy?: string;
};
export declare function OtpVerificationModal({ open, onClose, closeOnBackdrop, labelledBy, theme, ...panelProps }: OtpVerificationModalProps): React.ReactPortal | null;
//# sourceMappingURL=OtpVerificationPanel.d.ts.map