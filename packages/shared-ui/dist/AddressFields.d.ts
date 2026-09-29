import { type Control, type FieldPath, type FieldValues } from "react-hook-form";
export type AddressFieldNames<T extends FieldValues> = {
    pincode: FieldPath<T>;
    state: FieldPath<T>;
    city: FieldPath<T>;
    district?: FieldPath<T>;
};
export type AddressFieldsProps<T extends FieldValues> = {
    control: Control<T>;
    names: AddressFieldNames<T>;
    setValue: (name: FieldPath<T>, value: any, opts?: {
        shouldValidate?: boolean;
    }) => void;
    required?: boolean;
    className?: string;
};
/**

 * Composite pincode → state → city block with auto-fill from pincode lookup.

 */
export declare function AddressFields<T extends FieldValues>(props: AddressFieldsProps<T>): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=AddressFields.d.ts.map