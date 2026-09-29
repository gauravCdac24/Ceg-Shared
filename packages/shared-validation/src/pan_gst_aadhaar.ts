import { hasLongRepeatedRun, stripNonDigits } from "./spam";

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export type Verdict<T extends string = string> =
  | { ok: true; value: string }
  | { ok: false; code: T; message: string };

export function validatePAN(raw: string | null | undefined): Verdict<"empty" | "invalid"> {
  if (!raw || !raw.trim()) return { ok: false, code: "empty", message: "PAN is required" };
  const v = raw.trim().toUpperCase();
  if (!PAN_RE.test(v)) {
    return { ok: false, code: "invalid", message: "PAN must be 10 chars (5 letters + 4 digits + 1 letter)" };
  }
  return { ok: true, value: v };
}

export function validateGST(raw: string | null | undefined): Verdict<"empty" | "invalid"> {
  if (!raw || !raw.trim()) return { ok: false, code: "empty", message: "GSTIN is required" };
  const v = raw.trim().toUpperCase();
  if (!GST_RE.test(v)) {
    return { ok: false, code: "invalid", message: "GSTIN format is invalid" };
  }
  return { ok: true, value: v };
}

// Verhoeff checksum tables (same as the Python module).
const D = [
  [0,1,2,3,4,5,6,7,8,9],
  [1,2,3,4,0,6,7,8,9,5],
  [2,3,4,0,1,7,8,9,5,6],
  [3,4,0,1,2,8,9,5,6,7],
  [4,0,1,2,3,9,5,6,7,8],
  [5,9,8,7,6,0,4,3,2,1],
  [6,5,9,8,7,1,0,4,3,2],
  [7,6,5,9,8,2,1,0,4,3],
  [8,7,6,5,9,3,2,1,0,4],
  [9,8,7,6,5,4,3,2,1,0],
];
const P = [
  [0,1,2,3,4,5,6,7,8,9],
  [1,5,7,6,2,8,3,0,9,4],
  [5,8,0,3,7,9,6,1,4,2],
  [8,9,1,6,0,4,3,5,2,7],
  [9,4,5,3,1,2,6,8,7,0],
  [4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5],
  [7,0,4,6,9,1,3,2,5,8],
];

function verhoeffValid(digits: string): boolean {
  let c = 0;
  const reversed = digits.split("").reverse();
  for (let i = 0; i < reversed.length; i++) {
    const ch = parseInt(reversed[i]!, 10);
    c = D[c]![P[i % 8]![ch]!]!;
  }
  return c === 0;
}

export function validateAadhaar(
  raw: string | null | undefined,
): Verdict<"empty" | "wrong_length" | "leading_digit" | "spam_repeated" | "checksum"> {
  if (!raw || !raw.trim()) return { ok: false, code: "empty", message: "Aadhaar is required" };
  const digits = stripNonDigits(raw);
  if (digits.length !== 12) {
    return { ok: false, code: "wrong_length", message: "Aadhaar must be 12 digits" };
  }
  if (digits[0] === "0" || digits[0] === "1") {
    return { ok: false, code: "leading_digit", message: "Aadhaar cannot start with 0 or 1" };
  }
  if (hasLongRepeatedRun(digits, 5)) {
    return { ok: false, code: "spam_repeated", message: "Aadhaar looks like spam" };
  }
  if (!verhoeffValid(digits)) {
    return { ok: false, code: "checksum", message: "Aadhaar checksum is invalid" };
  }
  return { ok: true, value: digits };
}
