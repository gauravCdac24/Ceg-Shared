/**
 * HttpOnly-cookie API client helpers (no Bearer TokenStore).
 * Use when JWTs live only in HttpOnly cookies and refresh is POST /auth/refresh.
 */
export type CookieApiClientConfig = {
    /** API base including version prefix, e.g. `/v1` or `/api/v1`. */
    baseUrl: string;
    /** Refresh endpoint path relative to baseUrl, e.g. `/auth/refresh`. */
    refreshPath?: string;
    /** Optional JSON body for refresh POST. Defaults to `"{}"` so FastAPI does not 422. Pass `null` for no body. */
    refreshBody?: string | null;
    /** Return CSRF header map for mutating requests (may be empty). */
    getCsrfHeaders?: () => Record<string, string>;
    /** Paths that must not trigger refresh on 401 (login, me probe, refresh itself). */
    shouldSkipRefresh?: (path: string) => boolean;
};
export type CookieRefreshCoordinator = {
    tryRefreshSession: () => Promise<boolean>;
    shouldSkipRefresh: (path: string) => boolean;
};
export type CookieApiClient = {
    /** Fetch with credentials, CSRF on mutating methods, single 401→refresh→retry. */
    fetch: (path: string, init?: RequestInit) => Promise<Response>;
};
/**
 * Shared refresh coordinator for axios or fetch stacks.
 */
export declare function createCookieRefreshCoordinator(config: CookieApiClientConfig): CookieRefreshCoordinator;
/**
 * Build a cookie-authenticated fetch client shared across CEG frontends.
 * Tokens are never read from or written to JavaScript storage.
 */
export declare function createCookieApiClient(config: CookieApiClientConfig): CookieApiClient;
//# sourceMappingURL=cookie-client.d.ts.map