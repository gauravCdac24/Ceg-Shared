export type PincodeOk = {
    ok: true;
    pincode: string;
};
export type PincodeErr = {
    ok: false;
    code: "empty" | "wrong_length" | "leading_zero" | "spam_repeated" | "spam_sequential";
    message: string;
};
export type PincodeResult = PincodeOk | PincodeErr;
export declare function validatePincodeIN(raw: string | null | undefined): PincodeResult;
/**
 * Look up a pincode in the official Indian postal lookup service.
 *
 * NOTE: `api.postalpincode.in` is community-run and rate-limited. For
 * production we should mirror the data.gov.in dataset locally (~250 KB
 * gzipped) and only fall back to the network for unknown pincodes.
 *
 * Always wrap callers in:
 *   - a debounce (>= 300 ms)
 *   - a localStorage cache (key = `pincode:${v}`)
 *   - a timeout (3 s)
 *   - graceful degradation: if the lookup fails, let the user type state+city
 */
export type PincodeLookupOk = {
    ok: true;
    pincode: string;
    state: string;
    district: string;
    region: string;
    cities: string[];
};
export type PincodeLookupErr = {
    ok: false;
    reason: "invalid" | "not_found" | "network" | "timeout";
};
export declare function lookupPincode(raw: string, opts?: {
    fetch?: typeof fetch;
    timeoutMs?: number;
    signal?: AbortSignal;
}): Promise<PincodeLookupOk | PincodeLookupErr>;
//# sourceMappingURL=pincode.d.ts.map