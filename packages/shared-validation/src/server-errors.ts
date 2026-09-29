/**
 * Parse the uniform 422 envelope produced by every backend's
 * `/app/validators/validation_errors.py` and turn it into a shape that
 * `react-hook-form`'s `setError()` consumes directly.
 *
 *   const errors = await response.json();
 *   const fieldErrors = parseServerValidationErrors(errors);
 *   for (const [field, message] of Object.entries(fieldErrors)) {
 *     form.setError(field as any, { type: "server", message });
 *   }
 */

export type RawValidationItem = {
  field: string;
  code: string;
  message: string;
  input?: string;
};

export type ServerValidationEnvelope = {
  ok?: boolean;
  success?: boolean;
  code?: string;
  message?: string;
  data?: RawValidationItem[] | unknown;
  errors?: RawValidationItem[];
};

/**
 * Returns a `{ fieldPath: message }` map suitable for RHF.
 *
 * Backend envelope variants supported:
 *   CeG core:        { ok: false, code: "validation_error", data: [...] }
 *   QuizForge/WS:    { ok: false, code: "validation_error", errors: [...] }
 *   Cert-Studio:     { success: false, error: {...}, errors: [...] }
 *   FetchDesk:       { success: false, error: {...}, errors: [...] }
 *
 * Field paths are stripped of the leading `body.` if present (FastAPI
 * always wraps body-bound fields in `("body", "field_name", ...)`).
 */
export function parseServerValidationErrors(
  envelope: ServerValidationEnvelope | null | undefined,
): Record<string, string> {
  if (!envelope) return {};
  const raw = (envelope.errors ?? envelope.data) as RawValidationItem[] | undefined;
  if (!Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const item of raw) {
    if (!item || typeof item.field !== "string") continue;
    let field = item.field;
    if (field.startsWith("body.")) field = field.slice(5);
    if (!out[field]) {
      out[field] = item.message || "Invalid value";
    }
  }
  return out;
}

/** True if the response looks like a 422 envelope (regardless of HTTP status). */
export function isServerValidationError(envelope: unknown): envelope is ServerValidationEnvelope {
  if (!envelope || typeof envelope !== "object") return false;
  const e = envelope as ServerValidationEnvelope;
  if (e.code === "validation_error") return true;
  if (Array.isArray(e.errors)) return true;
  if (Array.isArray(e.data)) {
    return (e.data as RawValidationItem[]).every((d) => d && typeof d.field === "string");
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

/**
 * Pull a 422 validation envelope from common API error shapes:
 * axios (`error.response.data`), CeG fetch (`error.data`), or a bare envelope.
 */
export function extractServerValidationEnvelope(error: unknown): ServerValidationEnvelope | null {
  if (!error) return null;
  if (isServerValidationError(error)) return error;
  if (!isRecord(error)) return null;

  if (isServerValidationError(error.data)) {
    return error.data as ServerValidationEnvelope;
  }
  if (isServerValidationError(error.responseData)) {
    return error.responseData as ServerValidationEnvelope;
  }

  const response = error.response;
  if (isRecord(response) && isServerValidationError(response.data)) {
    return response.data as ServerValidationEnvelope;
  }

  return null;
}
