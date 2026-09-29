import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import { Controller } from "react-hook-form";
import { validatePincodeIN, lookupPincode } from "@ceg/shared-validation";
import { uiCopy } from "./copy";
import { FieldShell, fieldClassNames } from "./fieldPrimitives";
/**

 * RHF pincode input with debounced lookup auto-fill for state/city.

 * Network lookup is cached, timed out at 3s, and never blocks submission.

 */
export function PincodeField(props) {
    const { name, control, onAutoFill, label, required, className, helperText, disabled } = props;
    const [hint, setHint] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    return (_jsx(Controller, { name: name, control: control, rules: {
            validate: (v) => {
                if (!v && !required)
                    return true;
                const r = validatePincodeIN(String(v ?? ""));
                return r.ok || r.message;
            },
        }, render: ({ field, fieldState }) => {
            const debounced = React.useRef(null);
            const onChange = (e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, 6);
                field.onChange(next);
                setHint("");
                if (debounced.current !== null)
                    window.clearTimeout(debounced.current);
                if (next.length !== 6)
                    return;
                const local = validatePincodeIN(next);
                if (!local.ok)
                    return;
                debounced.current = window.setTimeout(async () => {
                    const cacheKey = `pincode:${next}`;
                    try {
                        const cached = window.localStorage.getItem(cacheKey);
                        if (cached) {
                            const parsed = JSON.parse(cached);
                            onAutoFill?.({ state: parsed.state, city: parsed.cities[0] ?? "", district: parsed.district }, parsed.cities);
                            setHint(uiCopy.form.pincodeCached(parsed.state));
                            return;
                        }
                    }
                    catch {
                        /* ignore quota / private mode */
                    }
                    setBusy(true);
                    try {
                        const lookup = await lookupPincode(next);
                        if (lookup.ok) {
                            onAutoFill?.({ state: lookup.state, city: lookup.cities[0] ?? "", district: lookup.district }, lookup.cities);
                            setHint(uiCopy.form.pincodeAutoFilled(lookup.state));
                            try {
                                window.localStorage.setItem(cacheKey, JSON.stringify({ state: lookup.state, district: lookup.district, cities: lookup.cities }));
                            }
                            catch {
                                /* ignore */
                            }
                        }
                        else {
                            setHint(lookup.reason === "timeout"
                                ? uiCopy.form.pincodeTimeout
                                : uiCopy.form.pincodeNotFound);
                        }
                    }
                    finally {
                        setBusy(false);
                    }
                }, 350);
            };
            const hintText = busy ? uiCopy.form.pincodeLookupBusy : hint || helperText;
            return (_jsx(FieldShell, { name: name, label: label, required: required, className: className, error: fieldState.error?.message, hint: !fieldState.error ? hintText : undefined, children: _jsx("input", { className: fieldClassNames.control, type: "text", inputMode: "numeric", autoComplete: "postal-code", placeholder: "6-digit PIN", maxLength: 6, value: field.value ?? "", onChange: onChange, onBlur: field.onBlur, name: field.name, ref: field.ref, disabled: disabled, "aria-invalid": !!fieldState.error }) }));
        } }));
}
//# sourceMappingURL=PincodeField.js.map