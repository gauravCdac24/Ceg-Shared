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
/**
 * Presentation-agnostic button using design-token classes.
 * Import `@ceg/design-tokens/styles.css` in the app entry.
 */
export declare const Button: React.ForwardRefExoticComponent<React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Shows a subtle busy state without disabling the button unless `disabled` is also set. */
    loading?: boolean;
    fullWidth?: boolean;
} & React.RefAttributes<HTMLButtonElement>>;
//# sourceMappingURL=Button.d.ts.map