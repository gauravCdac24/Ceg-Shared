import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
const variantClass = {
    primary: "ceg-btn ceg-btn--primary",
    secondary: "ceg-btn ceg-btn--secondary",
    ghost: "ceg-btn ceg-btn--ghost",
    danger: "ceg-btn ceg-btn--danger",
};
const sizeClass = {
    sm: "ceg-btn--sm",
    md: "ceg-btn--md",
    lg: "ceg-btn--lg",
};
/**
 * Presentation-agnostic button using design-token classes.
 * Import `@ceg/design-tokens/styles.css` in the app entry.
 */
export const Button = React.forwardRef(function Button({ variant = "primary", size = "md", loading = false, fullWidth = false, className, disabled, children, type = "button", ...rest }, ref) {
    const classes = [
        variantClass[variant],
        sizeClass[size],
        fullWidth ? "ceg-btn--block" : "",
        loading ? "ceg-btn--loading" : "",
        className,
    ]
        .filter(Boolean)
        .join(" ");
    return (_jsx("button", { ref: ref, type: type, className: classes, disabled: disabled || loading, "aria-busy": loading || undefined, ...rest, children: children }));
});
//# sourceMappingURL=Button.js.map