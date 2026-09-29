import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createCookieApiClient, createCookieRefreshCoordinator } from "./cookie-client";

let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("createCookieApiClient", () => {
  it("sends credentials include on requests", async () => {
    let credentials: RequestCredentials | undefined;
    globalThis.fetch = vi.fn(async (_url, init) => {
      credentials = init?.credentials;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;

    const client = createCookieApiClient({ baseUrl: "http://api.test/v1" });
    await client.fetch("/items");
    expect(credentials).toBe("include");
  });

  it("401 → refresh → retry succeeds once", async () => {
    const calls: string[] = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      const u = String(url);
      calls.push(u);
      if (u.endsWith("/auth/refresh")) {
        return new Response("{}", { status: 200 });
      }
      if (u.includes("/items") && calls.filter((c) => c.includes("/items")).length === 1) {
        return new Response("{}", { status: 401 });
      }
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }) as typeof fetch;

    const client = createCookieApiClient({ baseUrl: "http://api.test/v1" });
    const r = await client.fetch("/items");
    expect(r.status).toBe(200);
    expect(calls.some((c) => c.endsWith("/auth/refresh"))).toBe(true);
    expect(calls.filter((c) => c.includes("/items")).length).toBe(2);
  });

  it("does not refresh on auth/login 401", async () => {
    const calls: string[] = [];
    globalThis.fetch = vi.fn(async (url) => {
      calls.push(String(url));
      return new Response("{}", { status: 401 });
    }) as typeof fetch;

    const client = createCookieApiClient({ baseUrl: "http://api.test/v1" });
    const r = await client.fetch("/auth/login", { method: "POST" });
    expect(r.status).toBe(401);
    expect(calls.some((c) => c.includes("/auth/refresh"))).toBe(false);
  });

  it("dedupes concurrent refresh attempts", async () => {
    let refreshCalls = 0;
    globalThis.fetch = vi.fn(async (url) => {
      const u = String(url);
      if (u.endsWith("/auth/refresh")) {
        refreshCalls++;
        await new Promise((r) => setTimeout(r, 10));
        return new Response("{}", { status: 200 });
      }
      return new Response("{}", { status: 401 });
    }) as typeof fetch;

    const client = createCookieApiClient({ baseUrl: "http://api.test/v1" });
    await Promise.all([client.fetch("/a"), client.fetch("/b")]);
    expect(refreshCalls).toBe(1);
  });
});

describe("createCookieRefreshCoordinator", () => {
  it("POSTs {} JSON so FastAPI does not 422 on empty body", async () => {
    let method: string | undefined;
    let body: BodyInit | null | undefined;
    let contentType: string | null = null;
    globalThis.fetch = vi.fn(async (_url, init) => {
      method = init?.method;
      body = init?.body;
      const h = new Headers(init?.headers);
      contentType = h.get("Content-Type");
      return new Response("{}", { status: 401 });
    }) as typeof fetch;

    const { tryRefreshSession } = createCookieRefreshCoordinator({
      baseUrl: "http://api.test",
      refreshPath: "/v1/auth/refresh",
    });
    await tryRefreshSession();
    expect(method).toBe("POST");
    expect(body).toBe("{}");
    expect(contentType).toBe("application/json");
  });
});
