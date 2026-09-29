import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

import { hasLongRepeatedRun, hasSequentialRun, stripNonDigits } from "./spam";

const IN_MOBILE_RE = /^[6-9]\d{9}$/;

export type PhoneValidationOk = {
  ok: true;
  e164: string;       // canonical E.164, e.g. "+919876500100"
  country: string;    // "IN" / "US" / ...
  national: string;   // "9876500100" / "(555) 123-4567"
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
export function validatePhone(
  raw: string | null | undefined,
  opts: { defaultCountry?: CountryCode; mobileOnly?: boolean } = {},
): PhoneValidationResult {
  if (raw == null || raw.trim() === "") {
    return { ok: false, code: "empty", message: "Phone number is required" };
  }
  const value = raw.trim();
  const digits = stripNonDigits(value);
  if (hasLongRepeatedRun(digits, 5)) {
    return { ok: false, code: "spam_repeated", message: "Please double-check your number — it appears to contain too many repeated digits" };
  }
  if (hasSequentialRun(digits, 6)) {
    return { ok: false, code: "spam_sequential", message: "Please double-check your number — it appears to follow a sequential pattern" };
  }
  const country = opts.defaultCountry ?? "IN";
  const parsed = parsePhoneNumberFromString(value, country);
  if (!parsed) {
    return { ok: false, code: "invalid_format", message: "Phone number format is invalid" };
  }
  if (!parsed.isValid()) {
    return { ok: false, code: "invalid_format", message: "Phone number is not valid for the country" };
  }
  if (opts.mobileOnly) {
    const type = parsed.getType();
    if (type !== "MOBILE" && type !== "FIXED_LINE_OR_MOBILE") {
      return { ok: false, code: "not_mobile", message: "A mobile phone number is required" };
    }
  }
  return {
    ok: true,
    e164: parsed.number,
    country: parsed.country ?? country,
    national: parsed.formatNational(),
  };
}

/**
 * Fast Indian-only validator that doesn't pull libphonenumber metadata. Used
 * on hot paths (e.g. live keystroke validation) where the cost matters.
 */
export function isValidIndianMobile(raw: string): boolean {
  const digits = stripNonDigits(raw);
  if (digits.length < 10) return false;
  const last10 = digits.slice(-10);
  if (!IN_MOBILE_RE.test(last10)) return false;
  if (hasLongRepeatedRun(last10, 5)) return false;
  if (hasSequentialRun(last10, 6)) return false;
  return true;
}
