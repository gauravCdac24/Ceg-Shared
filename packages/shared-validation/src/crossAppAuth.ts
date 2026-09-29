/**
 * Local-dev helpers for optional cross-app auth UX (consent + env parsing).
 * Gate production behaviour with `VITE_SHARED_AUTH_*`; defaults keep current prod-safe behaviour.
 */

export const CROSS_APP_CONSENT_STORAGE_KEY = "ceg_shared_apps_consent_v1";

export type CrossAppConsentPayload = {
  v: 1;
  /** ISO timestamp when the user accepted cross-app access wording */
  acceptedAt: string;
};

export type EcosystemAppKey = "ceg" | "quizforge" | "workshopos" | "cert-studio" | "fetchdesk";

export type EcosystemLink = {
  key: EcosystemAppKey;
  label: string;
  href: string;
};

export type SharedAuthEnv = {
  enabled: boolean;
  /** When true, linked navigations should check consent first */
  gateRedirects: boolean;
  /** Optional cookie Domain= value for manual/dev experiments only (see docs). */
  cookieDomain: string | null;
  /** CeG Portal base URL for SSO stub / manual deep-links */
  cegPortalUrl: string | null;
  /** Optional absolute URLs for local multi-app hops (leave unset to hide pills). */
  quizforgeUrl: string | null;
  workshoposUrl: string | null;
  certStudioUrl: string | null;
  fetchdeskUrl: string | null;
};

function envBool(env: Record<string, unknown>, key: string): boolean {
  const raw = env[key];
  return String(raw ?? "")
    .trim()
    .toLowerCase() === "true";
}

function envStr(env: Record<string, unknown>, key: string): string {
  const raw = env[key];
  if (raw == null) return "";
  const s = String(raw).trim();
  return s;
}

/** Read feature flags from `import.meta.env` (Vite) or any plain object of strings. */
export function readSharedAuthEnv(env: Record<string, unknown>): SharedAuthEnv {
  const enabled = envBool(env, "VITE_SHARED_AUTH_ENABLED");
  const gateRedirects = envBool(env, "VITE_SHARED_AUTH_GATE_REDIRECTS");
  const cookieDomain = envStr(env, "VITE_SHARED_AUTH_COOKIE_DOMAIN") || null;
  const cegPortalUrl = envStr(env, "VITE_SHARED_AUTH_CEG_URL") || null;
  const quizforgeUrl = envStr(env, "VITE_SHARED_AUTH_LINK_QUIZFORGE") || null;
  const workshoposUrl = envStr(env, "VITE_SHARED_AUTH_LINK_WORKSHOPOS") || null;
  const certStudioUrl = envStr(env, "VITE_SHARED_AUTH_LINK_CERT_STUDIO") || null;
  const fetchdeskUrl = envStr(env, "VITE_SHARED_AUTH_LINK_FETCHDESK") || null;
  return {
    enabled,
    gateRedirects,
    cookieDomain,
    cegPortalUrl,
    quizforgeUrl,
    workshoposUrl,
    certStudioUrl,
    fetchdeskUrl,
  };
}

/** Programme apps that share register-once / linked sign-in intent (never CeG Portal). */
export const INTEGRATED_ECOSYSTEM_KEYS: Exclude<EcosystemAppKey, "ceg">[] = [
  "quizforge",
  "workshopos",
  "cert-studio",
  "fetchdesk",
];

/** Local-dev / staging product picker links (exclude current app so users hop to siblings). */
export function buildEcosystemLinks(
  shared: SharedAuthEnv,
  opts?: {
    exclude?: EcosystemAppKey | EcosystemAppKey[];
    /** When true, omit CeG Portal — satellite products only (default for programme apps). */
    integratedOnly?: boolean;
  },
): EcosystemLink[] {
  const excludeList = opts?.exclude == null ? [] : Array.isArray(opts.exclude) ? opts.exclude : [opts.exclude];
  const exclude = new Set<EcosystemAppKey>(excludeList);
  if (opts?.integratedOnly) exclude.add("ceg");

  const candidates: (EcosystemLink | null)[] = [
    shared.cegPortalUrl ? { key: "ceg", label: "CeG Portal", href: shared.cegPortalUrl } : null,
    shared.quizforgeUrl ? { key: "quizforge", label: "QuizForge", href: shared.quizforgeUrl } : null,
    shared.workshoposUrl ? { key: "workshopos", label: "WorkshopOS", href: shared.workshoposUrl } : null,
    shared.certStudioUrl ? { key: "cert-studio", label: "Cert Studio", href: shared.certStudioUrl } : null,
    shared.fetchdeskUrl ? { key: "fetchdesk", label: "FetchDesk", href: shared.fetchdeskUrl } : null,
  ];
  return candidates.filter((e): e is EcosystemLink => e != null && !exclude.has(e.key));
}

function parseConsent(raw: string | null): CrossAppConsentPayload | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Partial<CrossAppConsentPayload>;
    if (j && j.v === 1 && typeof j.acceptedAt === "string") return j as CrossAppConsentPayload;
  } catch {
    /* ignore */
  }
  return null;
}

export function hasCrossAppConsent(storage: Pick<Storage, "getItem"> = typeof localStorage !== "undefined"
  ? localStorage
  : { getItem: () => null }): boolean {
  return parseConsent(storage.getItem(CROSS_APP_CONSENT_STORAGE_KEY)) != null;
}

export function setCrossAppConsent(
  storage: Pick<Storage, "setItem"> = typeof localStorage !== "undefined" ? localStorage : { setItem: () => {} },
): void {
  const payload: CrossAppConsentPayload = { v: 1, acceptedAt: new Date().toISOString() };
  storage.setItem(CROSS_APP_CONSENT_STORAGE_KEY, JSON.stringify(payload));
}

export function clearCrossAppConsent(
  storage: Pick<Storage, "removeItem"> = typeof localStorage !== "undefined"
    ? localStorage
    : { removeItem: () => {} },
): void {
  storage.removeItem(CROSS_APP_CONSENT_STORAGE_KEY);
}

export type CrossAppNavGateResult =
  | { ok: true }
  | { ok: false; reason: "missing_consent" };

/** Returns whether an outbound navigation to another ecosystem app should proceed. */
export function gateCrossAppRedirect(
  shared: SharedAuthEnv,
  storage?: Pick<Storage, "getItem">,
): CrossAppNavGateResult {
  if (!shared.gateRedirects) return { ok: true };
  if (hasCrossAppConsent(storage)) return { ok: true };
  return { ok: false, reason: "missing_consent" };
}
