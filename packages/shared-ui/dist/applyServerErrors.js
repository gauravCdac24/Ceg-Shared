import { extractServerValidationEnvelope, parseServerValidationErrors, } from "@ceg/shared-validation";
import { uiCopy } from "./copy";
/**
 * Apply a backend 422 response to an RHF form.
 *
 *   try {
 *     await postRegister(values);
 *   } catch (err) {
 *     applyServerErrors(form.setError, await err.response.json(),
 *                       { fallbackField: "root" });
 *   }
 */
export function applyServerErrors(setError, envelope, opts = {}) {
    const map = parseServerValidationErrors(envelope);
    const entries = Object.entries(map);
    if (entries.length === 0) {
        if (opts.fallbackField) {
            setError(opts.fallbackField, {
                type: "server",
                message: opts.defaultMessage ?? uiCopy.form.serverRejected,
            });
        }
        return false;
    }
    for (const [field, message] of entries) {
        setError(field, { type: "server", message: String(message) });
    }
    return true;
}
/**
 * Apply field errors from a caught API error (axios, CeG fetch, or bare envelope).
 * Returns true when at least one field error was mapped.
 */
export function applyServerErrorsFromApiError(setError, error, opts = {}) {
    return applyServerErrors(setError, extractServerValidationEnvelope(error), opts);
}
//# sourceMappingURL=applyServerErrors.js.map