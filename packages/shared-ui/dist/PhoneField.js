import { jsx as _jsx } from "react/jsx-runtime";
import { Controller } from "react-hook-form";
import { validatePhone } from "@ceg/shared-validation";
import { FieldShell, fieldClassNames } from "./fieldPrimitives";
/**

 * RHF-aware phone input with live validation via `validatePhone()`.

 * On blur, the value is normalised to E.164. Style via `className` or design-token field classes.

 */
export function PhoneField(props) {
    const { name, control, label, defaultCountry = "IN", required, placeholder, className, helperText, disabled, mobileOnly = true, } = props;
    return (_jsx(Controller, { name: name, control: control, rules: {
            validate: (v) => {
                if (!v && !required)
                    return true;
                const r = validatePhone(v, { defaultCountry: defaultCountry, mobileOnly });
                return r.ok || r.message;
            },
        }, render: ({ field, fieldState }) => (_jsx(FieldShell, { name: name, label: label, required: required, className: className, error: fieldState.error?.message, hint: !fieldState.error ? helperText : undefined, children: _jsx("input", { ...field, className: fieldClassNames.control, type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: placeholder ?? (defaultCountry === "IN" ? "9876500100" : "+1 555 555 5555"), disabled: disabled, "aria-invalid": !!fieldState.error, onBlur: (e) => {
                    const r = validatePhone(e.target.value, { defaultCountry: defaultCountry, mobileOnly });
                    if (r.ok) {
                        field.onChange(r.e164);
                    }
                    field.onBlur();
                } }) })) }));
}
//# sourceMappingURL=PhoneField.js.map