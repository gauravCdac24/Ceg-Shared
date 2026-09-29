import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { Controller, useWatch, } from "react-hook-form";
import { STATE_NAMES, citiesForState } from "@ceg/shared-validation";
import { uiCopy } from "./copy";
import { FieldShell, fieldClassNames } from "./fieldPrimitives";
import { PincodeField } from "./PincodeField";
/**

 * Composite pincode → state → city block with auto-fill from pincode lookup.

 */
export function AddressFields(props) {
    const { control, names, setValue, required, className } = props;
    const [pincodeCities, setPincodeCities] = React.useState(null);
    const watchedState = useWatch({ control, name: names.state });
    const staticCities = React.useMemo(() => (watchedState ? citiesForState(watchedState) : []), [watchedState]);
    const cityOptions = pincodeCities && pincodeCities.length > 0 ? pincodeCities : staticCities;
    const handleAutoFill = (fill, allCities) => {
        setValue(names.state, fill.state, { shouldValidate: true });
        setValue(names.city, fill.city, { shouldValidate: true });
        if (names.district)
            setValue(names.district, (fill.district ?? ""));
        setPincodeCities(allCities);
    };
    return (_jsxs("div", { className: className, "data-block": "address-fields", children: [_jsx(PincodeField, { name: names.pincode, control: control, onAutoFill: handleAutoFill, label: "Pincode", required: required }), _jsx(Controller, { control: control, name: names.state, rules: {
                    validate: (v) => !required || (v && STATE_NAMES.some((s) => s === v))
                        ? true
                        : uiCopy.form.stateRequired,
                }, render: ({ field, fieldState }) => (_jsx(FieldShell, { name: names.state, label: "State", required: required, error: fieldState.error?.message, children: _jsxs("select", { ...field, className: fieldClassNames.control, value: field.value ?? "", onChange: (e) => {
                            field.onChange(e.target.value);
                            setPincodeCities(null);
                            setValue(names.city, "");
                        }, "aria-invalid": !!fieldState.error, children: [_jsx("option", { value: "", children: uiCopy.form.selectState }), STATE_NAMES.map((s) => (_jsx("option", { value: s, children: s }, s)))] }) })) }), _jsx(Controller, { control: control, name: names.city, rules: {
                    validate: (v) => !required || (typeof v === "string" && v.trim().length >= 2)
                        ? true
                        : uiCopy.form.cityRequired,
                }, render: ({ field, fieldState }) => (_jsx(FieldShell, { name: names.city, label: "City", required: required, error: fieldState.error?.message, children: cityOptions.length > 0 ? (_jsxs("select", { ...field, className: fieldClassNames.control, value: field.value ?? "", onChange: (e) => field.onChange(e.target.value), "aria-invalid": !!fieldState.error, children: [_jsx("option", { value: "", children: uiCopy.form.selectCity }), cityOptions.map((c) => (_jsx("option", { value: c, children: c }, c))), _jsx("option", { value: "__other__", children: uiCopy.form.cityOther })] })) : (_jsx("input", { ...field, className: fieldClassNames.control, type: "text", placeholder: "City name", value: field.value ?? "", onChange: (e) => field.onChange(e.target.value), "aria-invalid": !!fieldState.error })) })) })] }));
}
//# sourceMappingURL=AddressFields.js.map