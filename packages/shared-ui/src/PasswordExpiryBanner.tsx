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
export function PasswordExpiryBanner({
  info,
  changePasswordHref = "/settings/password",
  className = "",
}: Props) {
  if (!info) return null;
  const expired = Boolean(info.password_expired);
  const days = info.password_expires_in_days;
  const expiringSoon = typeof days === "number" && days >= 0 && days <= 14;
  if (!expired && !expiringSoon) return null;

  const message = expired
    ? "Your password has expired. Change it now to keep access to your account."
    : `Your password expires in ${days} day${days === 1 ? "" : "s"}. Update it in account settings.`;

  return (
    <div
      className={className}
      role="alert"
      style={{
        padding: "12px 16px",
        marginBottom: 12,
        borderRadius: 8,
        background: expired ? "#fef2f2" : "#fffbeb",
        border: `1px solid ${expired ? "#fecaca" : "#fde68a"}`,
        color: expired ? "#991b1b" : "#92400e",
        fontSize: 14,
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span>{message}</span>
      <a
        href={changePasswordHref}
        style={{
          fontWeight: 700,
          color: "inherit",
          textDecoration: "underline",
          whiteSpace: "nowrap",
        }}
      >
        Change password
      </a>
    </div>
  );
}
