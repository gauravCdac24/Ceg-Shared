/**
 * Anti-spam heuristics shared by every form. Same logic as
 * `shared/python/pii_validators.py` — keep them in sync when changing.
 */
const ASCENDING = "0123456789";
const DESCENDING = "9876543210";
/** True if `digits` contains `minRun` or more identical consecutive chars. */
export function hasLongRepeatedRun(digits, minRun = 5) {
    if (digits.length < minRun)
        return false;
    let runLen = 1;
    for (let i = 1; i < digits.length; i++) {
        if (digits[i] === digits[i - 1]) {
            runLen += 1;
            if (runLen >= minRun)
                return true;
        }
        else {
            runLen = 1;
        }
    }
    return false;
}
/** True if `digits` contains an ascending OR descending run >= `minRun`. */
export function hasSequentialRun(digits, minRun = 6) {
    if (digits.length < minRun)
        return false;
    for (let start = 0; start <= digits.length - minRun; start++) {
        const window = digits.slice(start, start + minRun);
        if (ASCENDING.includes(window) || DESCENDING.includes(window))
            return true;
    }
    return false;
}
/** Strip everything that isn't a 0-9 digit. */
export function stripNonDigits(s) {
    if (!s)
        return "";
    return s.replace(/\D/g, "");
}
/**
 * True if `s` LOOKS like spam — repeated chars, sequential digits, pure
 * digits in a name field, only whitespace, etc. Use this as a quick guard
 * BEFORE running the field-specific validator.
 */
export function looksLikeSpam(s) {
    if (!s)
        return false;
    const v = s.trim();
    if (v.length < 2)
        return true;
    const digits = stripNonDigits(v);
    if (digits.length > 0 && hasLongRepeatedRun(digits, 5))
        return true;
    if (digits.length > 0 && hasSequentialRun(digits, 6))
        return true;
    // 4+ identical consecutive chars in any string (e.g. "aaaaa")
    if (/(.)\1{3,}/.test(v))
        return true;
    return false;
}
//# sourceMappingURL=spam.js.map