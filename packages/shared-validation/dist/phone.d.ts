import { type CountryCode } from "libphonenumber-js";
export type PhoneValidationOk = {
    ok: true;
    e164: string;
    country: string;
    national: string;
};
export type PhoneValidationErr = {
    ok: false;
    code: "empty" | "spam_repeated" | "spam_sequential" | "invalid_format" | "not_mobile";
    message: string;
};
export type PhoneValidationResult = PhoneValidationOk | PhoneValidationErr;
/**
 * Validate + normalise a phone number.
 *
 * `defaultCountry` (default "IN") is used when the input is in national format
 * (e.g. "9876500100"). Set to `undefined` to require explicit E.164 (`+91…`).
 *
 * Always rejects:
 *   - empty / whitespace
 *   - 5+ consecutive identical digits ("3333333333")
 *   - 6+ char ascending/descending runs ("9876543210", "0123456789")
 *   - any number libphonenumber-js considers invalid
 */
export declare function validatePhone(raw: string | null | undefined, opts?: {
    defaultCountry?: CountryCode;
    mobileOnly?: boolean;
}): PhoneValidationResult;
/**
 * Fast Indian-only validator that doesn't pull libphonenumber metadata. Used
 * on hot paths (e.g. live keystroke validation) where the cost matters.
 */
export declare function isValidIndianMobile(raw: string): boolean;
//# sourceMappingURL=phone.d.ts.map