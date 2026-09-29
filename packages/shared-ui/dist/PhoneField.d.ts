import * as React from "react";
import { type Control, type FieldValues, type Path } from "react-hook-form";
export type PhoneFieldProps<T extends FieldValues> = {
    name: Path<T>;
    control: Control<T>;
    label?: string;
    defaultCountry?: "IN" | "US" | "GB" | "AU" | string;
    required?: boolean;
    placeholder?: string;
    className?: string;
    helperText?: React.ReactNode;
    disabled?: boolean;
    /** When true, also reject landlines (mobile or fixed-mobile only). Default true. */
    mobileOnly?: boolean;
};
/**

 * RHF-aware phone input with live validation via `validatePhone()`.

 * On blur, the value is normalised to E.164. Style via `className` or design-token field classes.

 */
export declare function PhoneField<T extends FieldValues>(props: PhoneFieldProps<T>): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=PhoneField.d.ts.map