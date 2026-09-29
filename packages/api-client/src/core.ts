import createClient, { type Middleware, type Client } from "openapi-fetch";

import {
  isServerValidationError,
  type ServerValidationEnvelope,
} from "@ceg/shared-validation";

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

export class ApiError extends Error {
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
  }) {
    super(opts.message);
    this.name = "ApiError";
    this.status = opts.status;
    this.code = opts.code ?? "unknown_error";
    this.envelope = opts.envelope;
    this.fieldErrors = opts.fieldErrors ?? null;
    this.requestId = opts.requestId ?? null;
  }
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
export function createApiClient<Paths extends {}>(opts: CreateApiOptions): Client<Paths> {
  const { baseUrl, tokens, extraHeaders, withCredentials } = opts;

  let inflightRefresh: Promise<string | null> | null = null;

  const authMiddleware: Middleware = {
    async onRequest({ request }) {
      const token = tokens.get();
      if (token) request.headers.set("Authorization", `Bearer ${token}`);
      if (extraHeaders) {
        for (const [k, v] of Object.entries(extraHeaders())) {
          request.headers.set(k, v);
        }
      }
      return request;
    },
    async onResponse({ request, response }) {
      if (response.ok || response.status !== 401) return response;
      if (!tokens.refresh) return response;
      // Only one refresh in flight at a time.
      inflightRefresh ??= tokens.refresh().finally(() => {
        // Allow the next 401 to try again.
        setTimeout(() => { inflightRefresh = null; }, 0);
      });
      const newToken = await inflightRefresh;
      if (!newToken) {
        tokens.clear();
        return response;
      }
      tokens.set(newToken);
      // Retry once with a fresh request so Authorization is not taken from the clone.
      const retryHeaders = new Headers(request.headers);
      retryHeaders.set("Authorization", `Bearer ${newToken}`);
      const retryInit: RequestInit = {
        method: request.method,
        headers: retryHeaders,
        credentials: withCredentials ? "include" : "same-origin",
      };
      if (request.method !== "GET" && request.method !== "HEAD") {
        retryInit.body = await request.clone().text();
      }
      const retry = await fetch(request.url, retryInit);
      return retry;
    },
  };

  const errorMiddleware: Middleware = {
    async onResponse({ response }) {
      if (response.ok) return response;
      // Try to parse the body once; clone so the caller can still read it
      // if they want via the result envelope.
      let bodyJson: unknown = null;
      try {
        const clone = response.clone();
        bodyJson = await clone.json();
      } catch {
        bodyJson = null;
      }
      const fieldErrors = isServerValidationError(bodyJson)
        ? Object.fromEntries(
            Array.from(
              Object.entries(
                // Re-parse manually so we don't import the package twice.
                ((): Record<string, string> => {
                  const env = bodyJson as ServerValidationEnvelope;
                  const items = (env.errors ?? env.data) as
                    | Array<{ field: string; message: string }>
                    | undefined;
                  if (!Array.isArray(items)) return {};
                  const out: Record<string, string> = {};
                  for (const it of items) {
                    if (!it?.field) continue;
                    const f = it.field.startsWith("body.") ? it.field.slice(5) : it.field;
                    if (!out[f]) out[f] = it.message ?? "Invalid value";
                  }
                  return out;
                })(),
              ),
            ),
          )
        : null;
      const envObj = bodyJson as Record<string, unknown> | null;
      const errorObj = envObj && typeof envObj.error === "object" ? (envObj.error as Record<string, unknown>) : null;
      const canonicalErrorCode =
        errorObj && typeof errorObj.code === "string" ? (errorObj.code as string) : undefined;
      const topLevelCode = typeof envObj?.code === "string" ? (envObj.code as string) : undefined;
      const code = topLevelCode ?? canonicalErrorCode ?? "http_error";
      const message =
        (typeof envObj?.message === "string" && envObj.message) ||
        (typeof errorObj?.message === "string" && errorObj.message) ||
        (typeof envObj?.detail === "string" && envObj.detail) ||
        `HTTP ${response.status}`;
      const requestId =
        response.headers.get("x-request-id") ||
        response.headers.get("X-Request-ID") ||
        null;
      throw new ApiError({
        status: response.status,
        code,
        message,
        envelope: bodyJson,
        fieldErrors,
        requestId,
      });
    },
  };

  const client = createClient<Paths>({
    baseUrl,
    ...(withCredentials ? { credentials: "include" as RequestCredentials } : {}),
  });
  client.use(errorMiddleware);
  client.use(authMiddleware);
  return client;
}
