import * as React from "react";
/** Shared field chrome — uses @ceg/design-tokens CSS variables via class names. */
export declare const fieldClassNames: {
    readonly root: "ceg-field";
    readonly label: "ceg-field__label";
    readonly control: "ceg-field__control";
    readonly error: "ceg-field__error";
    readonly hint: "ceg-field__hint";
};
export type FieldShellProps = {
    name?: string;
    label?: React.ReactNode;
    required?: boolean;
    className?: string;
    error?: string;
    hint?: React.ReactNode;
    children: React.ReactNode;
};
export declare function FieldShell({ name, label, required, className, error, hint, children, }: FieldShellProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=fieldPrimitives.d.ts.map