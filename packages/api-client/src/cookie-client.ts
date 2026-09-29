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

const DEFAULT_SKIP = (path: string): boolean =>
  path.includes("/auth/login") ||
  path.includes("/auth/me") ||
  path.includes("/auth/refresh") ||
  path.includes("/auth/register");

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
export function createCookieRefreshCoordinator(
  config: CookieApiClientConfig,
): CookieRefreshCoordinator {
  const {
    baseUrl,
    refreshPath = "/auth/refresh",
    refreshBody = "{}",
    getCsrfHeaders = () => ({}),
    shouldSkipRefresh = DEFAULT_SKIP,
  } = config;

  const base = baseUrl.replace(/\/$/, "");
  let refreshInFlight: Promise<boolean> | null = null;

  async function tryRefreshSession(): Promise<boolean> {
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        try {
          const headers = new Headers();
          if (refreshBody != null) {
            headers.set("Content-Type", "application/json");
          }
          const csrf = getCsrfHeaders();
          for (const [k, v] of Object.entries(csrf)) {
            if (typeof v === "string" && v) headers.set(k, v);
          }
          const r = await fetch(`${base}${refreshPath}`, {
            method: "POST",
            headers,
            credentials: "include",
            ...(refreshBody != null ? { body: refreshBody } : {}),
          });
          return r.ok;
        } catch {
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
export function createCookieApiClient(config: CookieApiClientConfig): CookieApiClient {
  const {
    getCsrfHeaders = () => ({}),
    shouldSkipRefresh = DEFAULT_SKIP,
  } = config;

  const { tryRefreshSession } = createCookieRefreshCoordinator(config);

  async function fetchWithRetry(
    path: string,
    init: RequestInit | undefined,
    retried: boolean,
  ): Promise<Response> {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    const base = config.baseUrl.replace(/\/$/, "");
    const headers = new Headers(init?.headers);
    const method = (init?.method ?? "GET").toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
      const csrf = getCsrfHeaders();
      for (const [k, v] of Object.entries(csrf)) {
        if (typeof v === "string" && v && !headers.has(k)) headers.set(k, v);
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
