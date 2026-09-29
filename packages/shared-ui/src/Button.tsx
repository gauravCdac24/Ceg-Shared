import * as React from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a subtle busy state without disabling the button unless `disabled` is also set. */
  loading?: boolean;
  fullWidth?: boolean;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: "ceg-btn ceg-btn--primary",
  secondary: "ceg-btn ceg-btn--secondary",
  ghost: "ceg-btn ceg-btn--ghost",
  danger: "ceg-btn ceg-btn--danger",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "ceg-btn--sm",
  md: "ceg-btn--md",
  lg: "ceg-btn--lg",
};

/**
 * Presentation-agnostic button using design-token classes.
 * Import `@ceg/design-tokens/styles.css` in the app entry.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    className,
    disabled,
    children,
    type = "button",
    ...rest
  },
  ref,
) {
  const classes = [
    variantClass[variant],
    sizeClass[size],
    fullWidth ? "ceg-btn--block" : "",
    loading ? "ceg-btn--loading" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {children}
    </button>
  );
});
