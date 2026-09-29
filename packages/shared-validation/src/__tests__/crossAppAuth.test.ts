import { describe, expect, it } from "vitest";

import {
  buildEcosystemLinks,
  CROSS_APP_CONSENT_STORAGE_KEY,
  gateCrossAppRedirect,
  readSharedAuthEnv,
  setCrossAppConsent,
  clearCrossAppConsent,
} from "../crossAppAuth";

function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("crossAppAuth env parsing", () => {
  it("defaults flags off", () => {
    const s = readSharedAuthEnv({});
    expect(s.enabled).toBe(false);
    expect(s.gateRedirects).toBe(false);
    expect(s.cookieDomain).toBeNull();
    expect(s.cegPortalUrl).toBeNull();
    expect(s.quizforgeUrl).toBeNull();
    expect(s.workshoposUrl).toBeNull();
    expect(s.certStudioUrl).toBeNull();
    expect(s.fetchdeskUrl).toBeNull();
  });

  it("parses booleans case-insensitively", () => {
    const s = readSharedAuthEnv({
      VITE_SHARED_AUTH_ENABLED: "TRUE",
      VITE_SHARED_AUTH_GATE_REDIRECTS: "True",
      VITE_SHARED_AUTH_COOKIE_DOMAIN: ".localhost",
      VITE_SHARED_AUTH_CEG_URL: "http://localhost:5173",
    });
    expect(s.enabled).toBe(true);
    expect(s.gateRedirects).toBe(true);
    expect(s.cookieDomain).toBe(".localhost");
    expect(s.cegPortalUrl).toBe("http://localhost:5173");
    expect(s.quizforgeUrl).toBeNull();
  });
});

describe("buildEcosystemLinks", () => {
  it("excludes the current app from sibling links", () => {
    const shared = readSharedAuthEnv({
      VITE_SHARED_AUTH_LINK_WORKSHOPOS: "http://localhost:5180",
      VITE_SHARED_AUTH_LINK_FETCHDESK: "http://localhost:5190",
    });
    const links = buildEcosystemLinks(shared, { exclude: "workshopos" });
    expect(links.map((l) => l.key)).toEqual(["fetchdesk"]);
  });

  it("integratedOnly omits CeG Portal even when URL is set", () => {
    const shared = readSharedAuthEnv({
      VITE_SHARED_AUTH_CEG_URL: "http://localhost:5173",
      VITE_SHARED_AUTH_LINK_CERT_STUDIO: "http://localhost:5174",
      VITE_SHARED_AUTH_LINK_QUIZFORGE: "http://localhost:5175",
    });
    const links = buildEcosystemLinks(shared, { exclude: "quizforge", integratedOnly: true });
    expect(links.map((l) => l.key)).toEqual(["cert-studio"]);
  });
});

describe("crossAppRedirect gating", () => {
  it("allows navigation when redirect gating is disabled", () => {
    const mem = memoryStorage();
    expect(gateCrossAppRedirect(readSharedAuthEnv({}), mem)).toEqual({ ok: true });
  });

  it("blocks navigation without persisted consent when gating enabled", () => {
    const mem = memoryStorage();

    const blocked = gateCrossAppRedirect(readSharedAuthEnv({ VITE_SHARED_AUTH_GATE_REDIRECTS: "true" }), mem);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reason).toBe("missing_consent");

    setCrossAppConsent(mem);
    expect(gateCrossAppRedirect(readSharedAuthEnv({ VITE_SHARED_AUTH_GATE_REDIRECTS: "true" }), mem)).toEqual({
      ok: true,
    });

    clearCrossAppConsent(mem);
    expect(mem.getItem(CROSS_APP_CONSENT_STORAGE_KEY)).toBeNull();
  });
});
