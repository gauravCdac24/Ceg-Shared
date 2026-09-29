/**
 * Local-dev helpers for optional cross-app auth UX (consent + env parsing).
 * Gate production behaviour with `VITE_SHARED_AUTH_*`; defaults keep current prod-safe behaviour.
 */
export declare const CROSS_APP_CONSENT_STORAGE_KEY = "ceg_shared_apps_consent_v1";
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
/** Read feature flags from `import.meta.env` (Vite) or any plain object of strings. */
export declare function readSharedAuthEnv(env: Record<string, unknown>): SharedAuthEnv;
/** Programme apps that share register-once / linked sign-in intent (never CeG Portal). */
export declare const INTEGRATED_ECOSYSTEM_KEYS: Exclude<EcosystemAppKey, "ceg">[];
/** Local-dev / staging product picker links (exclude current app so users hop to siblings). */
export declare function buildEcosystemLinks(shared: SharedAuthEnv, opts?: {
    exclude?: EcosystemAppKey | EcosystemAppKey[];
    /** When true, omit CeG Portal — satellite products only (default for programme apps). */
    integratedOnly?: boolean;
}): EcosystemLink[];
export declare function hasCrossAppConsent(storage?: Pick<Storage, "getItem">): boolean;
export declare function setCrossAppConsent(storage?: Pick<Storage, "setItem">): void;
export declare function clearCrossAppConsent(storage?: Pick<Storage, "removeItem">): void;
export type CrossAppNavGateResult = {
    ok: true;
} | {
    ok: false;
    reason: "missing_consent";
};
/** Returns whether an outbound navigation to another ecosystem app should proceed. */
export declare function gateCrossAppRedirect(shared: SharedAuthEnv, storage?: Pick<Storage, "getItem">): CrossAppNavGateResult;
//# sourceMappingURL=crossAppAuth.d.ts.map