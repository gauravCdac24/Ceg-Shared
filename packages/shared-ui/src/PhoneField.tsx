import * as React from "react";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

import { validatePhone } from "@ceg/shared-validation";



import { FieldShell, fieldClassNames } from "./fieldPrimitives";



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

export function PhoneField<T extends FieldValues>(props: PhoneFieldProps<T>) {

  const {

    name, control, label, defaultCountry = "IN", required, placeholder,

    className, helperText, disabled, mobileOnly = true,

  } = props;



  return (

    <Controller

      name={name}

      control={control}

      rules={{

        validate: (v) => {

          if (!v && !required) return true;

          const r = validatePhone(v, { defaultCountry: defaultCountry as "IN", mobileOnly });

          return r.ok || r.message;

        },

      }}

      render={({ field, fieldState }) => (

        <FieldShell

          name={name as string}

          label={label}

          required={required}

          className={className}

          error={fieldState.error?.message}

          hint={!fieldState.error ? helperText : undefined}

        >

          <input

            {...field}

            className={fieldClassNames.control}

            type="tel"

            inputMode="tel"

            autoComplete="tel"

            placeholder={placeholder ?? (defaultCountry === "IN" ? "9876500100" : "+1 555 555 5555")}

            disabled={disabled}

            aria-invalid={!!fieldState.error}

            onBlur={(e) => {

              const r = validatePhone(e.target.value, { defaultCountry: defaultCountry as "IN", mobileOnly });

              if (r.ok) {

                field.onChange(r.e164);

              }

              field.onBlur();

            }}

          />

        </FieldShell>

      )}

    />

  );

}

