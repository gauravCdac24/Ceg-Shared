export type PasswordExpiryInfo = {
    password_expired?: boolean;
    password_expires_in_days?: number | null;
};
type Props = {
    info?: PasswordExpiryInfo | null;
    changePasswordHref?: string;
    className?: string;
};
/** Banner when password is expired or expiring within 14 days. */
export declare function PasswordExpiryBanner({ info, changePasswordHref, className, }: Props): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=PasswordExpiryBanner.d.ts.map