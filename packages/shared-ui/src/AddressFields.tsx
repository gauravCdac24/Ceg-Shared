import * as React from "react";

import {

  Controller,

  type Control,

  type FieldPath,

  type FieldValues,

  useWatch,

} from "react-hook-form";



import { STATE_NAMES, citiesForState } from "@ceg/shared-validation";



import { uiCopy } from "./copy";

import { FieldShell, fieldClassNames } from "./fieldPrimitives";

import { PincodeField, type PincodeAutoFill } from "./PincodeField";



export type AddressFieldNames<T extends FieldValues> = {

  pincode: FieldPath<T>;

  state: FieldPath<T>;

  city: FieldPath<T>;

  district?: FieldPath<T>;

};



export type AddressFieldsProps<T extends FieldValues> = {

  control: Control<T>;

  names: AddressFieldNames<T>;

  setValue: (name: FieldPath<T>, value: any, opts?: { shouldValidate?: boolean }) => void;

  required?: boolean;

  className?: string;

};



/**

 * Composite pincode → state → city block with auto-fill from pincode lookup.

 */

export function AddressFields<T extends FieldValues>(props: AddressFieldsProps<T>) {

  const { control, names, setValue, required, className } = props;

  const [pincodeCities, setPincodeCities] = React.useState<readonly string[] | null>(null);



  const watchedState = useWatch({ control, name: names.state }) as unknown as string | undefined;

  const staticCities = React.useMemo(

    () => (watchedState ? citiesForState(watchedState) : []),

    [watchedState],

  );



  const cityOptions = pincodeCities && pincodeCities.length > 0 ? pincodeCities : staticCities;



  const handleAutoFill = (fill: PincodeAutoFill, allCities: readonly string[]) => {

    setValue(names.state, fill.state as any, { shouldValidate: true });

    setValue(names.city, fill.city as any, { shouldValidate: true });

    if (names.district) setValue(names.district, (fill.district ?? "") as any);

    setPincodeCities(allCities);

  };



  return (

    <div className={className} data-block="address-fields">

      <PincodeField

        name={names.pincode}

        control={control}

        onAutoFill={handleAutoFill}

        label="Pincode"

        required={required}

      />



      <Controller

        control={control}

        name={names.state}

        rules={{

          validate: (v) =>

            !required || (v && STATE_NAMES.some((s) => s === v))

              ? true

              : uiCopy.form.stateRequired,

        }}

        render={({ field, fieldState }) => (

          <FieldShell

            name={names.state as string}

            label="State"

            required={required}

            error={fieldState.error?.message}

          >

            <select

              {...field}

              className={fieldClassNames.control}

              value={(field.value as string | undefined) ?? ""}

              onChange={(e) => {

                field.onChange(e.target.value);

                setPincodeCities(null);

                setValue(names.city, "" as any);

              }}

              aria-invalid={!!fieldState.error}

            >

              <option value="">{uiCopy.form.selectState}</option>

              {STATE_NAMES.map((s) => (

                <option key={s} value={s}>{s}</option>

              ))}

            </select>

          </FieldShell>

        )}

      />



      <Controller

        control={control}

        name={names.city}

        rules={{

          validate: (v) =>

            !required || (typeof v === "string" && v.trim().length >= 2)

              ? true

              : uiCopy.form.cityRequired,

        }}

        render={({ field, fieldState }) => (

          <FieldShell

            name={names.city as string}

            label="City"

            required={required}

            error={fieldState.error?.message}

          >

            {cityOptions.length > 0 ? (

              <select

                {...field}

                className={fieldClassNames.control}

                value={(field.value as string | undefined) ?? ""}

                onChange={(e) => field.onChange(e.target.value)}

                aria-invalid={!!fieldState.error}

              >

                <option value="">{uiCopy.form.selectCity}</option>

                {cityOptions.map((c) => (

                  <option key={c} value={c}>{c}</option>

                ))}

                <option value="__other__">{uiCopy.form.cityOther}</option>

              </select>

            ) : (

              <input

                {...field}

                className={fieldClassNames.control}

                type="text"

                placeholder="City name"

                value={(field.value as string | undefined) ?? ""}

                onChange={(e) => field.onChange(e.target.value)}

                aria-invalid={!!fieldState.error}

              />

            )}

          </FieldShell>

        )}

      />

    </div>

  );

}



