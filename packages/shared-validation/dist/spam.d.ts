/**
 * Anti-spam heuristics shared by every form. Same logic as
 * `shared/python/pii_validators.py` — keep them in sync when changing.
 */
/** True if `digits` contains `minRun` or more identical consecutive chars. */
export declare function hasLongRepeatedRun(digits: string, minRun?: number): boolean;
/** True if `digits` contains an ascending OR descending run >= `minRun`. */
export declare function hasSequentialRun(digits: string, minRun?: number): boolean;
/** Strip everything that isn't a 0-9 digit. */
export declare function stripNonDigits(s: string | null | undefined): string;
/**
 * True if `s` LOOKS like spam — repeated chars, sequential digits, pure
 * digits in a name field, only whitespace, etc. Use this as a quick guard
 * BEFORE running the field-specific validator.
 */
export declare function looksLikeSpam(s: string): boolean;
//# sourceMappingURL=spam.d.ts.map