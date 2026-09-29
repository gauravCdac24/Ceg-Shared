/**
 * Local-dev helpers for optional cross-app auth UX (consent + env parsing).
 * Gate production behaviour with `VITE_SHARED_AUTH_*`; defaults keep current prod-safe behaviour.
 */
export const CROSS_APP_CONSENT_STORAGE_KEY = "ceg_shared_apps_consent_v1";
function envBool(env, key) {
    const raw = env[key];
    return String(raw ?? "")
        .trim()
        .toLowerCase() === "true";
}
function envStr(env, key) {
    const raw = env[key];
    if (raw == null)
        return "";
    const s = String(raw).trim();
    return s;
}
/** Read feature flags from `import.meta.env` (Vite) or any plain object of strings. */
export function readSharedAuthEnv(env) {
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
export const INTEGRATED_ECOSYSTEM_KEYS = [
    "quizforge",
    "workshopos",
    "cert-studio",
    "fetchdesk",
];
/** Local-dev / staging product picker links (exclude current app so users hop to siblings). */
export function buildEcosystemLinks(shared, opts) {
    const excludeList = opts?.exclude == null ? [] : Array.isArray(opts.exclude) ? opts.exclude : [opts.exclude];
    const exclude = new Set(excludeList);
    if (opts?.integratedOnly)
        exclude.add("ceg");
    const candidates = [
        shared.cegPortalUrl ? { key: "ceg", label: "CeG Portal", href: shared.cegPortalUrl } : null,
        shared.quizforgeUrl ? { key: "quizforge", label: "QuizForge", href: shared.quizforgeUrl } : null,
        shared.workshoposUrl ? { key: "workshopos", label: "WorkshopOS", href: shared.workshoposUrl } : null,
        shared.certStudioUrl ? { key: "cert-studio", label: "Cert Studio", href: shared.certStudioUrl } : null,
        shared.fetchdeskUrl ? { key: "fetchdesk", label: "FetchDesk", href: shared.fetchdeskUrl } : null,
    ];
    return candidates.filter((e) => e != null && !exclude.has(e.key));
}
function parseConsent(raw) {
    if (!raw)
        return null;
    try {
        const j = JSON.parse(raw);
        if (j && j.v === 1 && typeof j.acceptedAt === "string")
            return j;
    }
    catch {
        /* ignore */
    }
    return null;
}
export function hasCrossAppConsent(storage = typeof localStorage !== "undefined"
    ? localStorage
    : { getItem: () => null }) {
    return parseConsent(storage.getItem(CROSS_APP_CONSENT_STORAGE_KEY)) != null;
}
export function setCrossAppConsent(storage = typeof localStorage !== "undefined" ? localStorage : { setItem: () => { } }) {
    const payload = { v: 1, acceptedAt: new Date().toISOString() };
    storage.setItem(CROSS_APP_CONSENT_STORAGE_KEY, JSON.stringify(payload));
}
export function clearCrossAppConsent(storage = typeof localStorage !== "undefined"
    ? localStorage
    : { removeItem: () => { } }) {
    storage.removeItem(CROSS_APP_CONSENT_STORAGE_KEY);
}
/** Returns whether an outbound navigation to another ecosystem app should proceed. */
export function gateCrossAppRedirect(shared, storage) {
    if (!shared.gateRedirects)
        return { ok: true };
    if (hasCrossAppConsent(storage))
        return { ok: true };
    return { ok: false, reason: "missing_consent" };
}
//# sourceMappingURL=crossAppAuth.js.map