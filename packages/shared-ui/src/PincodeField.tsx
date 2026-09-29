import * as React from "react";

import { Controller, type Control, type FieldValues, type Path, type PathValue } from "react-hook-form";



import { validatePincodeIN, lookupPincode } from "@ceg/shared-validation";



import { uiCopy } from "./copy";

import { FieldShell, fieldClassNames } from "./fieldPrimitives";



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

export function PincodeField<T extends FieldValues>(props: PincodeFieldProps<T>) {

  const { name, control, onAutoFill, label, required, className, helperText, disabled } = props;

  const [hint, setHint] = React.useState<string>("");

  const [busy, setBusy] = React.useState(false);



  return (

    <Controller

      name={name}

      control={control}

      rules={{

        validate: (v) => {

          if (!v && !required) return true;

          const r = validatePincodeIN(String(v ?? ""));

          return r.ok || r.message;

        },

      }}

      render={({ field, fieldState }) => {

        const debounced = React.useRef<number | null>(null);



        const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {

          const next = e.target.value.replace(/\D/g, "").slice(0, 6);

          field.onChange(next as PathValue<T, Path<T>>);

          setHint("");



          if (debounced.current !== null) window.clearTimeout(debounced.current);

          if (next.length !== 6) return;

          const local = validatePincodeIN(next);

          if (!local.ok) return;



          debounced.current = window.setTimeout(async () => {

            const cacheKey = `pincode:${next}`;

            try {

              const cached = window.localStorage.getItem(cacheKey);

              if (cached) {

                const parsed = JSON.parse(cached) as { state: string; district: string; cities: string[] };

                onAutoFill?.({ state: parsed.state, city: parsed.cities[0] ?? "", district: parsed.district }, parsed.cities);

                setHint(uiCopy.form.pincodeCached(parsed.state));

                return;

              }

            } catch {

              /* ignore quota / private mode */

            }

            setBusy(true);

            try {

              const lookup = await lookupPincode(next);

              if (lookup.ok) {

                onAutoFill?.(

                  { state: lookup.state, city: lookup.cities[0] ?? "", district: lookup.district },

                  lookup.cities,

                );

                setHint(uiCopy.form.pincodeAutoFilled(lookup.state));

                try {

                  window.localStorage.setItem(

                    cacheKey,

                    JSON.stringify({ state: lookup.state, district: lookup.district, cities: lookup.cities }),

                  );

                } catch {

                  /* ignore */

                }

              } else {

                setHint(

                  lookup.reason === "timeout"

                    ? uiCopy.form.pincodeTimeout

                    : uiCopy.form.pincodeNotFound,

                );

              }

            } finally {

              setBusy(false);

            }

          }, 350);

        };



        const hintText = busy ? uiCopy.form.pincodeLookupBusy : hint || helperText;



        return (

          <FieldShell

            name={name as string}

            label={label}

            required={required}

            className={className}

            error={fieldState.error?.message}

            hint={!fieldState.error ? hintText : undefined}

          >

            <input

              className={fieldClassNames.control}

              type="text"

              inputMode="numeric"

              autoComplete="postal-code"

              placeholder="6-digit PIN"

              maxLength={6}

              value={(field.value as unknown as string) ?? ""}

              onChange={onChange}

              onBlur={field.onBlur}

              name={field.name}

              ref={field.ref}

              disabled={disabled}

              aria-invalid={!!fieldState.error}

            />

          </FieldShell>

        );

      }}

    />

  );

}

