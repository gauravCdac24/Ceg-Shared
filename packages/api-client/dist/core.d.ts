import { type Client } from "openapi-fetch";
import { type ServerValidationEnvelope } from "@ceg/shared-validation";
export type TokenStore = {
    /** Return the current access token, or null if unauthenticated. */
    get: () => string | null;
    /** Persist a new access token (e.g. after refresh). */
    set: (token: string) => void;
    /** Forget the access token. */
    clear: () => void;
    /** Optional: a refresh function the client can call on 401. */
    refresh?: () => Promise<string | null>;
};
export declare class ApiError extends Error {
    readonly status: number;
    readonly code: string;
    readonly envelope: ServerValidationEnvelope | unknown;
    /** When the backend returned a 422 envelope, this is the parsed errors map. */
    readonly fieldErrors: Record<string, string> | null;
    /** Correlation id from `X-Request-ID` response header when present. */
    readonly requestId: string | null;
    constructor(opts: {
        status: number;
        code?: string;
        message: string;
        envelope?: unknown;
        fieldErrors?: Record<string, string> | null;
        requestId?: string | null;
    });
}
export type CreateApiOptions = {
    baseUrl: string;
    tokens: TokenStore;
    /** Extra headers to send on EVERY request (e.g. tenant id). */
    extraHeaders?: () => Record<string, string>;
    /** Add `credentials: "include"` for cookie-based refresh flows. */
    withCredentials?: boolean;
};
/**
 * Build a typed `openapi-fetch` client with the standard middleware stack:
 *
 *  1. Authorization header injection from `tokens.get()`.
 *  2. Optional refresh on 401: calls `tokens.refresh()` and retries ONCE.
 *  3. 422 -> ApiError with `fieldErrors` already parsed.
 *  4. Non-2xx -> ApiError with `status` + best-effort `code` from the envelope.
 */
export declare function createApiClient<Paths extends {}>(opts: CreateApiOptions): Client<Paths>;
//# sourceMappingURL=core.d.ts.map