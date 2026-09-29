import * as React from "react";
export type AlertVariant = "info" | "success" | "warning" | "error";
export type AlertProps = {
    variant?: AlertVariant;
    title?: React.ReactNode;
    children?: React.ReactNode;
    /** Called when the dismiss control is clicked. Omit to hide dismiss. */
    onDismiss?: () => void;
    className?: string;
    role?: "alert" | "status";
};
export declare function Alert({ variant, title, children, onDismiss, className, role, }: AlertProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=Alert.d.ts.map