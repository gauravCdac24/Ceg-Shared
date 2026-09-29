import {
  extractServerValidationEnvelope,
  parseServerValidationErrors,
  type ServerValidationEnvelope,
} from "@ceg/shared-validation";

import { uiCopy } from "./copy";

/** Loose enough to accept RHF UseFormSetError without Path<T> inference fights. */
type SetFormError = (name: never, error: { type?: string; message?: string }) => void;

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
export function applyServerErrors(
  setError: SetFormError,
  envelope: ServerValidationEnvelope | null | undefined,
  opts: { fallbackField?: string; defaultMessage?: string } = {},
): boolean {
  const map = parseServerValidationErrors(envelope);
  const entries = Object.entries(map);
  if (entries.length === 0) {
    if (opts.fallbackField) {
      setError(opts.fallbackField as never, {
        type: "server",
        message: opts.defaultMessage ?? uiCopy.form.serverRejected,
      });
    }
    return false;
  }
  for (const [field, message] of entries) {
    setError(field as never, { type: "server", message: String(message) });
  }
  return true;
}

/**
 * Apply field errors from a caught API error (axios, CeG fetch, or bare envelope).
 * Returns true when at least one field error was mapped.
 */
export function applyServerErrorsFromApiError(
  setError: SetFormError,
  error: unknown,
  opts: { fallbackField?: string; defaultMessage?: string } = {},
): boolean {
  return applyServerErrors(setError, extractServerValidationEnvelope(error), opts);
}
