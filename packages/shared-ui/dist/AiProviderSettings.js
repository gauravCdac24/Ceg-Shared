import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { AI_PROVIDER_OPTIONS, } from '@ceg/shared-validation';
import './AiProviderSettings.css';
const MODEL_PRESETS = {
    openai: ['gpt-4o-mini', 'gpt-4o', 'o3-mini', 'gpt-4.1-mini'],
    anthropic: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
    google: ['gemini-2.0-flash', 'gemini-2.5-flash-preview-05-20', 'gemini-1.5-pro'],
    openai_compatible: ['gpt-4o-mini', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
};
const PROVIDER_ACCENTS = {
    openai: '#10a37f',
    anthropic: '#d97757',
    google: '#4285f4',
    openai_compatible: 'var(--accent-indigo)',
};
const BYO_PROVIDER_OPTIONS = AI_PROVIDER_OPTIONS;
const DEFAULT_AI_FEATURES = [
    'Template generation & layout assist',
    'Email template drafting',
    'Editor design agent & quick actions',
];
function emptyForm(settings) {
    const openai = AI_PROVIDER_OPTIONS.find((p) => p.id === 'openai');
    const mode = settings?.mode ?? 'platform';
    let provider = settings?.provider ?? 'openai';
    // BYO no longer offers Ollama (hosted backends can't reach laptop localhost).
    if (mode === 'byo' && provider === 'ollama') {
        provider = 'openai';
    }
    const meta = AI_PROVIDER_OPTIONS.find((p) => p.id === provider) ??
        (mode === 'platform' ? undefined : openai);
    return {
        mode,
        provider: (provider === 'ollama' ? 'ollama' : meta?.id ?? provider),
        model: mode === 'byo'
            ? settings?.provider !== 'ollama'
                ? settings?.model ?? meta?.defaultModel ?? ''
                : meta?.defaultModel ?? ''
            : settings?.model ?? '',
        model_fast: mode === 'byo'
            ? settings?.provider !== 'ollama'
                ? settings?.model_fast ?? meta?.defaultModel ?? ''
                : meta?.defaultModel ?? ''
            : settings?.model_fast ?? '',
        base_url: provider === 'openai_compatible' ? settings?.base_url ?? '' : settings?.base_url ?? '',
        api_key: '',
    };
}
function formatTestStatus(result, opts) {
    if (!opts.showTechnicalDetails) {
        if (result.ok) {
            return opts.mode === 'platform'
                ? `${opts.platformDisplayName} is connected.`
                : 'Connection successful.';
        }
        const base = (result.message || 'Connection failed.').split(' · ')[0]?.trim();
        return base || 'Connection failed.';
    }
    let msg = result.message || '';
    if (result.latency_ms != null)
        msg += ` · ${result.latency_ms} ms`;
    if (result.model_used)
        msg += ` · model: ${result.model_used}`;
    return msg;
}
function providerShortLabel(id) {
    if (id === 'openai_compatible')
        return 'Compat';
    if (id === 'anthropic')
        return 'Cl';
    if (id === 'google')
        return 'Gm';
    return 'AI';
}
function ModelField({ label, hint, value, placeholder, presets, onChange, }) {
    return (_jsxs("label", { className: "ceg-ai-provider__field", children: [_jsx("span", { className: "ceg-ai-provider__label", children: label }), _jsx("input", { className: "ceg-ai-provider__input", value: value, onChange: (e) => onChange(e.target.value), placeholder: placeholder }), hint ? _jsx("span", { className: "ceg-ai-provider__hint", children: hint }) : null, _jsx("div", { className: "ceg-ai-provider__chips", children: presets.map((model) => (_jsx("button", { type: "button", className: `ceg-ai-provider__chip${value === model ? ' ceg-ai-provider__chip--active' : ''}`, onClick: () => onChange(model), children: model }, model))) })] }));
}
/**
 * Cursor-style BYO AI settings — platform default vs bring-your-own API keys.
 */
export function AiProviderSettings({ settings, loading = false, saving = false, testing = false, onSave, onTest, className = '', productName = 'this app', aiFeatures = DEFAULT_AI_FEATURES, showFeatureList = true, platformDisplayName = 'Platform AI', showTechnicalDetails = true, }) {
    const [form, setForm] = useState(() => emptyForm(settings));
    const [testResult, setTestResult] = useState(null);
    useEffect(() => {
        setForm(emptyForm(settings));
        setTestResult(null);
    }, [settings]);
    const providerMeta = useMemo(() => AI_PROVIDER_OPTIONS.find((p) => p.id === form.provider) ??
        AI_PROVIDER_OPTIONS[0], [form.provider]);
    const modelPresets = form.provider !== 'ollama' && form.provider in MODEL_PRESETS
        ? MODEL_PRESETS[form.provider]
        : [providerMeta.defaultModel];
    const payload = () => {
        const provider = form.mode === 'byo' && (form.provider === 'ollama' || !AI_PROVIDER_OPTIONS.some((p) => p.id === form.provider))
            ? 'openai'
            : form.provider;
        const meta = AI_PROVIDER_OPTIONS.find((p) => p.id === provider) ?? providerMeta;
        return {
            mode: form.mode,
            provider,
            model: form.model?.trim() || meta.defaultModel,
            model_fast: form.model_fast?.trim() || form.model?.trim() || meta.defaultModel,
            base_url: provider === 'openai_compatible' ? form.base_url?.trim() || '' : '',
            api_key: form.api_key?.trim() || undefined,
        };
    };
    const setMode = (mode) => {
        setForm((f) => {
            if (mode === 'byo' && (f.provider === 'ollama' || !AI_PROVIDER_OPTIONS.some((p) => p.id === f.provider))) {
                const openai = AI_PROVIDER_OPTIONS.find((p) => p.id === 'openai');
                return {
                    ...f,
                    mode,
                    provider: 'openai',
                    model: openai?.defaultModel ?? 'gpt-4o-mini',
                    model_fast: openai?.defaultModel ?? 'gpt-4o-mini',
                    base_url: '',
                };
            }
            return { ...f, mode };
        });
        setTestResult(null);
    };
    const setProvider = (provider) => {
        const meta = AI_PROVIDER_OPTIONS.find((p) => p.id === provider);
        setForm((f) => ({
            ...f,
            provider,
            model: meta?.defaultModel ?? f.model,
            model_fast: meta?.defaultModel ?? f.model_fast,
            base_url: provider === 'openai_compatible' ? f.base_url : '',
        }));
        setTestResult(null);
    };
    const runTest = () => {
        void onTest(payload())
            .then(setTestResult)
            .catch((e) => setTestResult({ ok: false, message: e.message || 'Test failed' }));
    };
    if (loading) {
        return (_jsx("div", { className: ["ceg-ai-provider", className].filter(Boolean).join(" "), children: _jsxs("div", { className: "ceg-ai-provider__loading", "aria-busy": "true", "aria-label": "Loading AI settings", children: [_jsx("div", { className: "ceg-ai-provider__skeleton" }), _jsx("div", { className: "ceg-ai-provider__skeleton", style: { height: 220 } }), _jsx("div", { className: "ceg-ai-provider__skeleton", style: { height: 56 } })] }) }));
    }
    const activeProviderLabel = form.mode === 'platform'
        ? platformDisplayName
        : providerMeta.label;
    const activeModel = form.mode === 'platform' && !showTechnicalDetails
        ? platformDisplayName
        : form.mode === 'platform'
            ? settings?.platform_default_model || 'configured model'
            : form.model?.trim() || providerMeta.defaultModel;
    return (_jsxs("div", { className: ["ceg-ai-provider", className].filter(Boolean).join(" "), children: [_jsxs("div", { className: "ceg-ai-provider__layout", children: [_jsxs("form", { className: "ceg-ai-provider__main", onSubmit: (e) => {
                            e.preventDefault();
                        }, children: [_jsxs("div", { children: [_jsx("h3", { className: "ceg-ai-provider__section-title", children: "Connection mode" }), _jsxs("div", { className: "ceg-ai-provider__modes", children: [_jsxs("button", { type: "button", className: `ceg-ai-provider__mode${form.mode === 'platform' ? ' ceg-ai-provider__mode--active' : ''}`, onClick: () => setMode('platform'), "aria-pressed": form.mode === 'platform', children: [_jsx("span", { className: "ceg-ai-provider__mode-badge", children: "Recommended" }), _jsx("div", { className: "ceg-ai-provider__mode-title", children: "Platform default" }), _jsx("div", { className: "ceg-ai-provider__mode-desc", children: showTechnicalDetails
                                                            ? `Managed on this deployment (${settings?.platform_default_model || 'configured model'}). No API key required.`
                                                            : `${platformDisplayName} is managed by your organisation. No API key required.` })] }), _jsxs("button", { type: "button", className: `ceg-ai-provider__mode${form.mode === 'byo' ? ' ceg-ai-provider__mode--active' : ''}`, onClick: () => setMode('byo'), "aria-pressed": form.mode === 'byo', children: [_jsx("span", { className: "ceg-ai-provider__mode-badge", children: "Custom" }), _jsx("div", { className: "ceg-ai-provider__mode-title", children: "Bring your own AI" }), _jsx("div", { className: "ceg-ai-provider__mode-desc", children: "Use your OpenAI, Claude, Gemini, or compatible endpoint \u2014 like Cursor custom API keys." })] })] })] }), form.mode === 'byo' ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("h3", { className: "ceg-ai-provider__section-title", children: "Provider" }), _jsx("p", { className: "ceg-ai-provider__hint", style: { margin: '0 0 0.75rem', fontSize: '0.84rem' }, children: "Paste a cloud API key. OpenAI, Claude, Gemini, or any OpenAI-compatible host (Azure, Groq, etc.)." }), _jsx("div", { className: "ceg-ai-provider__providers", children: BYO_PROVIDER_OPTIONS.map((p) => (_jsxs("button", { type: "button", className: `ceg-ai-provider__provider${form.provider === p.id ? ' ceg-ai-provider__provider--active' : ''}`, onClick: () => setProvider(p.id), "aria-pressed": form.provider === p.id, children: [_jsx("span", { className: "ceg-ai-provider__provider-icon", style: { background: PROVIDER_ACCENTS[p.id] }, "aria-hidden": true, children: providerShortLabel(p.id) }), _jsx("span", { className: "ceg-ai-provider__provider-label", children: p.label }), _jsx("span", { className: "ceg-ai-provider__provider-hint", children: p.hint })] }, p.id))) })] }), _jsxs("div", { className: "ceg-ai-provider__panel", children: [_jsx("h3", { className: "ceg-ai-provider__section-title", children: "Models & credentials" }), _jsxs("div", { className: "ceg-ai-provider__grid", children: [_jsx(ModelField, { label: "Primary model", hint: "Used for layout generation, email drafting, and agent replies.", value: form.model ?? '', placeholder: providerMeta.defaultModel, presets: modelPresets, onChange: (model) => setForm((f) => ({ ...f, model })) }), _jsx(ModelField, { label: "Fast model (optional)", hint: "Used for quick suggestions and lightweight tasks.", value: form.model_fast ?? '', placeholder: form.model || providerMeta.defaultModel, presets: modelPresets, onChange: (model_fast) => setForm((f) => ({ ...f, model_fast })) }), form.provider === 'openai_compatible' ? (_jsxs("label", { className: "ceg-ai-provider__field ceg-ai-provider__field--full", children: [_jsx("span", { className: "ceg-ai-provider__label", children: "Base URL" }), _jsx("input", { className: "ceg-ai-provider__input", value: form.base_url ?? '', onChange: (e) => setForm((f) => ({ ...f, base_url: e.target.value })), placeholder: "https://api.groq.com/openai/v1" }), _jsx("span", { className: "ceg-ai-provider__hint", children: "OpenAI-compatible base URL (Azure, Groq, Together, hosted vLLM, etc.)." })] })) : null, providerMeta.needsKey ? (_jsxs("label", { className: "ceg-ai-provider__field ceg-ai-provider__field--full", children: [_jsx("span", { className: "ceg-ai-provider__label", children: "API key" }), _jsx("input", { className: "ceg-ai-provider__input", type: "password", name: "api_key", autoComplete: "new-password", value: form.api_key ?? '', onChange: (e) => setForm((f) => ({ ...f, api_key: e.target.value })), placeholder: settings?.has_api_key
                                                                    ? `Saved (${settings.api_key_hint}) — leave blank to keep`
                                                                    : 'Paste your API key…' }), _jsx("span", { className: "ceg-ai-provider__hint", children: settings?.has_api_key
                                                                    ? `Leave blank to keep the saved key (${settings.api_key_hint}). Keys are encrypted at rest.`
                                                                    : 'Stored encrypted. Never shown again after save.' })] })) : null] })] })] })) : (_jsxs("div", { className: "ceg-ai-provider__panel ceg-ai-provider__panel--muted", children: [_jsx("h3", { className: "ceg-ai-provider__section-title", children: "Platform configuration" }), _jsxs("p", { className: "ceg-ai-provider__hint", style: { margin: 0, fontSize: '0.84rem', lineHeight: 1.55 }, children: [platformDisplayName, " is ready to use. Switch to ", _jsx("strong", { children: "Bring your own AI" }), " only when your organisation needs a separate provider."] })] })), testResult ? (_jsx("div", { className: `ceg-ai-provider__status ${testResult.ok ? 'ceg-ai-provider__status--ok' : 'ceg-ai-provider__status--err'}`, role: "status", children: formatTestStatus(testResult, {
                                    showTechnicalDetails,
                                    platformDisplayName,
                                    mode: form.mode,
                                }) })) : null] }), _jsxs("aside", { className: "ceg-ai-provider__aside", children: [_jsxs("div", { className: "ceg-ai-provider__panel", children: [_jsx("h3", { className: "ceg-ai-provider__section-title", children: "Current selection" }), _jsxs("div", { className: "ceg-ai-provider__stat-row", children: [_jsx("span", { className: "ceg-ai-provider__stat-label", children: "Mode" }), _jsx("span", { className: "ceg-ai-provider__stat-value", children: form.mode === 'platform' ? 'Platform default' : 'Bring your own' })] }), _jsxs("div", { className: "ceg-ai-provider__stat-row", children: [_jsx("span", { className: "ceg-ai-provider__stat-label", children: "Connection" }), _jsx("span", { className: "ceg-ai-provider__stat-value", children: activeProviderLabel })] }), showTechnicalDetails || form.mode === 'byo' ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "ceg-ai-provider__stat-row", children: [_jsx("span", { className: "ceg-ai-provider__stat-label", children: "Primary model" }), _jsx("span", { className: "ceg-ai-provider__stat-value", children: activeModel })] }), _jsxs("div", { className: "ceg-ai-provider__stat-row", children: [_jsx("span", { className: "ceg-ai-provider__stat-label", children: "API key" }), _jsx("span", { className: "ceg-ai-provider__stat-value", children: settings?.has_api_key
                                                            ? `Saved (${settings.api_key_hint})`
                                                            : providerMeta.needsKey
                                                                ? 'Not set'
                                                                : 'Not required' })] })] })) : null] }), showFeatureList ? (_jsxs("div", { className: "ceg-ai-provider__panel ceg-ai-provider__panel--muted", children: [_jsxs("h3", { className: "ceg-ai-provider__section-title", children: ["AI features in ", productName] }), _jsx("ul", { className: "ceg-ai-provider__feature-list", children: aiFeatures.map((feature) => (_jsx("li", { children: feature }, feature))) })] })) : null] })] }), _jsxs("div", { className: "ceg-ai-provider__footer", children: [_jsx("p", { className: "ceg-ai-provider__footer-note", children: "Test the current values before saving them for your organisation." }), _jsxs("div", { className: "ceg-ai-provider__actions", children: [_jsx("button", { type: "button", className: "ceg-ai-provider__btn ceg-ai-provider__btn--secondary", disabled: testing, onClick: runTest, children: testing ? 'Testing…' : 'Test connection' }), _jsx("button", { type: "button", className: "ceg-ai-provider__btn ceg-ai-provider__btn--primary", disabled: saving, onClick: () => void onSave(payload()).catch(() => undefined), children: saving ? 'Saving…' : 'Save settings' })] })] })] }));
}
//# sourceMappingURL=AiProviderSettings.js.map