import { type ServerValidationEnvelope } from "@ceg/shared-validation";
/** Loose enough to accept RHF UseFormSetError without Path<T> inference fights. */
type SetFormError = (name: never, error: {
    type?: string;
    message?: string;
}) => void;
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
export declare function applyServerErrors(setError: SetFormError, envelope: ServerValidationEnvelope | null | undefined, opts?: {
    fallbackField?: string;
    defaultMessage?: string;
}): boolean;
/**
 * Apply field errors from a caught API error (axios, CeG fetch, or bare envelope).
 * Returns true when at least one field error was mapped.
 */
export declare function applyServerErrorsFromApiError(setError: SetFormError, error: unknown, opts?: {
    fallbackField?: string;
    defaultMessage?: string;
}): boolean;
export {};
//# sourceMappingURL=applyServerErrors.d.ts.map