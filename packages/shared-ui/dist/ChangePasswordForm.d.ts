import './ChangePasswordForm.css';
export type ChangePasswordApi = {
    requestOtp: () => Promise<{
        dev_otp_hint?: string;
    } | void>;
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
export declare function ChangePasswordForm({ api, minPasswordLength, title, className, username, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ChangePasswordForm.d.ts.map