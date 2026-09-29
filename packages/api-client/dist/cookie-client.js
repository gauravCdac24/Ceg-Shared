/**
 * HttpOnly-cookie API client helpers (no Bearer TokenStore).
 * Use when JWTs live only in HttpOnly cookies and refresh is POST /auth/refresh.
 */
const DEFAULT_SKIP = (path) => path.includes("/auth/login") ||
    path.includes("/auth/me") ||
    path.includes("/auth/refresh") ||
    path.includes("/auth/register");
/**
 * Shared refresh coordinator for axios or fetch stacks.
 */
export function createCookieRefreshCoordinator(config) {
    const { baseUrl, refreshPath = "/auth/refresh", refreshBody = "{}", getCsrfHeaders = () => ({}), shouldSkipRefresh = DEFAULT_SKIP, } = config;
    const base = baseUrl.replace(/\/$/, "");
    let refreshInFlight = null;
    async function tryRefreshSession() {
        if (!refreshInFlight) {
            refreshInFlight = (async () => {
                try {
                    const headers = new Headers();
                    if (refreshBody != null) {
                        headers.set("Content-Type", "application/json");
                    }
                    const csrf = getCsrfHeaders();
                    for (const [k, v] of Object.entries(csrf)) {
                        if (typeof v === "string" && v)
                            headers.set(k, v);
                    }
                    const r = await fetch(`${base}${refreshPath}`, {
                        method: "POST",
                        headers,
                        credentials: "include",
                        ...(refreshBody != null ? { body: refreshBody } : {}),
                    });
                    return r.ok;
                }
                catch {
                    return false;
                }
            })().finally(() => {
                refreshInFlight = null;
            });
        }
        return refreshInFlight;
    }
    return { tryRefreshSession, shouldSkipRefresh };
}
/**
 * Build a cookie-authenticated fetch client shared across CEG frontends.
 * Tokens are never read from or written to JavaScript storage.
 */
export function createCookieApiClient(config) {
    const { getCsrfHeaders = () => ({}), shouldSkipRefresh = DEFAULT_SKIP, } = config;
    const { tryRefreshSession } = createCookieRefreshCoordinator(config);
    async function fetchWithRetry(path, init, retried) {
        const normalized = path.startsWith("/") ? path : `/${path}`;
        const base = config.baseUrl.replace(/\/$/, "");
        const headers = new Headers(init?.headers);
        const method = (init?.method ?? "GET").toUpperCase();
        if (method !== "GET" && method !== "HEAD") {
            const csrf = getCsrfHeaders();
            for (const [k, v] of Object.entries(csrf)) {
                if (typeof v === "string" && v && !headers.has(k))
                    headers.set(k, v);
            }
        }
        const response = await fetch(`${base}${normalized}`, {
            ...init,
            headers,
            credentials: "include",
        });
        if (response.status === 401 && !retried && !shouldSkipRefresh(normalized)) {
            const refreshed = await tryRefreshSession();
            if (refreshed) {
                return fetchWithRetry(path, init, true);
            }
        }
        return response;
    }
    return {
        fetch: (path, init) => fetchWithRetry(path, init, false),
    };
}
//# sourceMappingURL=cookie-client.js.map