export type AiProviderMode = 'platform' | 'byo';
export type AiProviderKind = 'ollama' | 'openai' | 'anthropic' | 'google' | 'openai_compatible';
export type AiProviderPublicSettings = {
    mode: AiProviderMode;
    provider: AiProviderKind;
    model: string;
    model_fast: string;
    base_url: string;
    api_key_hint: string | null;
    has_api_key: boolean;
    platform_default_provider: string;
    platform_default_model: string;
};
export type AiProviderSaveRequest = {
    mode: AiProviderMode;
    provider: AiProviderKind;
    model?: string;
    model_fast?: string;
    base_url?: string;
    /** Plain key — only sent on save, never returned */
    api_key?: string | null;
};
export type AiProviderTestResult = {
    ok: boolean;
    message: string;
    model_used?: string | null;
    latency_ms?: number | null;
};
/** BYO picker — cloud / compatible only. Platform mode may still use server-side Ollama. */
export declare const AI_PROVIDER_OPTIONS: {
    id: Exclude<AiProviderKind, 'ollama'>;
    label: string;
    hint: string;
    needsKey: boolean;
    defaultModel: string;
}[];
//# sourceMappingURL=aiProvider.d.ts.map