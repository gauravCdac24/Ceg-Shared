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
export function parseServerValidationErrors(envelope) {
    if (!envelope)
        return {};
    const raw = (envelope.errors ?? envelope.data);
    if (!Array.isArray(raw))
        return {};
    const out = {};
    for (const item of raw) {
        if (!item || typeof item.field !== "string")
            continue;
        let field = item.field;
        if (field.startsWith("body."))
            field = field.slice(5);
        if (!out[field]) {
            out[field] = item.message || "Invalid value";
        }
    }
    return out;
}
/** True if the response looks like a 422 envelope (regardless of HTTP status). */
export function isServerValidationError(envelope) {
    if (!envelope || typeof envelope !== "object")
        return false;
    const e = envelope;
    if (e.code === "validation_error")
        return true;
    if (Array.isArray(e.errors))
        return true;
    if (Array.isArray(e.data)) {
        return e.data.every((d) => d && typeof d.field === "string");
    }
    return false;
}
function isRecord(value) {
    return value !== null && typeof value === "object";
}
/**
 * Pull a 422 validation envelope from common API error shapes:
 * axios (`error.response.data`), CeG fetch (`error.data`), or a bare envelope.
 */
export function extractServerValidationEnvelope(error) {
    if (!error)
        return null;
    if (isServerValidationError(error))
        return error;
    if (!isRecord(error))
        return null;
    if (isServerValidationError(error.data)) {
        return error.data;
    }
    if (isServerValidationError(error.responseData)) {
        return error.responseData;
    }
    const response = error.response;
    if (isRecord(response) && isServerValidationError(response.data)) {
        return response.data;
    }
    return null;
}
//# sourceMappingURL=server-errors.js.map