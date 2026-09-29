import { hasLongRepeatedRun, hasSequentialRun } from "./spam";

const PINCODE_IN_RE = /^[1-9]\d{5}$/;

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

export function validatePincodeIN(raw: string | null | undefined): PincodeResult {
  if (raw == null || raw.trim() === "") {
    return { ok: false, code: "empty", message: "Pincode is required" };
  }
  const v = raw.trim();
  if (v.length !== 6 || !/^\d{6}$/.test(v)) {
    return { ok: false, code: "wrong_length", message: "Pincode must be 6 digits" };
  }
  if (!PINCODE_IN_RE.test(v)) {
    return { ok: false, code: "leading_zero", message: "Pincode cannot start with 0" };
  }
  if (hasLongRepeatedRun(v, 5)) {
    return { ok: false, code: "spam_repeated", message: "Pincode looks like spam" };
  }
  if (hasSequentialRun(v, 6)) {
    return { ok: false, code: "spam_sequential", message: "Pincode looks like spam" };
  }
  return { ok: true, pincode: v };
}

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

export async function lookupPincode(
  raw: string,
  opts: { fetch?: typeof fetch; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<PincodeLookupOk | PincodeLookupErr> {
  const v = validatePincodeIN(raw);
  if (!v.ok) return { ok: false, reason: "invalid" };
  const f = opts.fetch ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 3000;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    const r = await f(`https://api.postalpincode.in/pincode/${v.pincode}`, {
      method: "GET",
      signal: opts.signal ?? controller.signal,
    });
    if (!r.ok) return { ok: false, reason: "network" };
    const json = (await r.json()) as Array<{ Status: string; PostOffice?: Array<{ Name: string; District: string; State: string; Region: string }> }>;
    const entry = json[0];
    if (!entry || entry.Status !== "Success" || !entry.PostOffice?.length) {
      return { ok: false, reason: "not_found" };
    }
    const offices = entry.PostOffice;
    const first = offices[0]!;
    const cities = Array.from(new Set(offices.map((p) => p.Name).filter(Boolean)));
    return {
      ok: true,
      pincode: v.pincode,
      state: first.State,
      district: first.District,
      region: first.Region,
      cities,
    };
  } catch (exc) {
    const isAbort = (exc as DOMException | undefined)?.name === "AbortError";
    return { ok: false, reason: isAbort ? "timeout" : "network" };
  } finally {
    clearTimeout(t);
  }
}
