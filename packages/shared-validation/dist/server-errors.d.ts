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
export declare function parseServerValidationErrors(envelope: ServerValidationEnvelope | null | undefined): Record<string, string>;
/** True if the response looks like a 422 envelope (regardless of HTTP status). */
export declare function isServerValidationError(envelope: unknown): envelope is ServerValidationEnvelope;
/**
 * Pull a 422 validation envelope from common API error shapes:
 * axios (`error.response.data`), CeG fetch (`error.data`), or a bare envelope.
 */
export declare function extractServerValidationEnvelope(error: unknown): ServerValidationEnvelope | null;
//# sourceMappingURL=server-errors.d.ts.map