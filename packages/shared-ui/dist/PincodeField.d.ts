import * as React from "react";
import { type Control, type FieldValues, type Path } from "react-hook-form";
export type PincodeAutoFill = {
    state: string;
    city: string;
    district?: string;
};
export type PincodeFieldProps<T extends FieldValues> = {
    name: Path<T>;
    control: Control<T>;
    /** Optional callback when a valid pincode auto-fills state/city. */
    onAutoFill?: (fill: PincodeAutoFill, allCities: readonly string[]) => void;
    label?: string;
    required?: boolean;
    className?: string;
    helperText?: React.ReactNode;
    disabled?: boolean;
};
/**

 * RHF pincode input with debounced lookup auto-fill for state/city.

 * Network lookup is cached, timed out at 3s, and never blocks submission.

 */
export declare function PincodeField<T extends FieldValues>(props: PincodeFieldProps<T>): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=PincodeField.d.ts.map