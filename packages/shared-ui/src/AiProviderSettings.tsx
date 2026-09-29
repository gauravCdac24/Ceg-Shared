import { useEffect, useMemo, useState } from 'react';
import {
  AI_PROVIDER_OPTIONS,
  type AiProviderKind,
  type AiProviderMode,
  type AiProviderPublicSettings,
  type AiProviderSaveRequest,
  type AiProviderTestResult,
} from '@ceg/shared-validation';
import './AiProviderSettings.css';

export type AiProviderSettingsProps = {
  settings: AiProviderPublicSettings | null;
  loading?: boolean;
  saving?: boolean;
  testing?: boolean;
  onSave: (payload: AiProviderSaveRequest) => Promise<void>;
  onTest: (payload: AiProviderSaveRequest) => Promise<AiProviderTestResult>;
  className?: string;
  productName?: string;
  /** Short list of product features that use AI (shown in sidebar). */
  aiFeatures?: string[];
  showFeatureList?: boolean;
  platformDisplayName?: string;
  showTechnicalDetails?: boolean;
};

type CloudProviderKind = Exclude<AiProviderKind, 'ollama'>;

const MODEL_PRESETS: Record<CloudProviderKind, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'o3-mini', 'gpt-4.1-mini'],
  anthropic: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
  google: ['gemini-2.0-flash', 'gemini-2.5-flash-preview-05-20', 'gemini-1.5-pro'],
  openai_compatible: ['gpt-4o-mini', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
};

const PROVIDER_ACCENTS: Record<CloudProviderKind, string> = {
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

function emptyForm(settings: AiProviderPublicSettings | null): AiProviderSaveRequest {
  const openai = AI_PROVIDER_OPTIONS.find((p) => p.id === 'openai');
  const mode = settings?.mode ?? 'platform';
  let provider = settings?.provider ?? 'openai';
  // BYO no longer offers Ollama (hosted backends can't reach laptop localhost).
  if (mode === 'byo' && provider === 'ollama') {
    provider = 'openai';
  }
  const meta =
    AI_PROVIDER_OPTIONS.find((p) => p.id === provider) ??
    (mode === 'platform' ? undefined : openai);
  return {
    mode,
    provider: (provider === 'ollama' ? 'ollama' : meta?.id ?? provider) as AiProviderSaveRequest['provider'],
    model:
      mode === 'byo'
        ? settings?.provider !== 'ollama'
          ? settings?.model ?? meta?.defaultModel ?? ''
          : meta?.defaultModel ?? ''
        : settings?.model ?? '',
    model_fast:
      mode === 'byo'
        ? settings?.provider !== 'ollama'
          ? settings?.model_fast ?? meta?.defaultModel ?? ''
          : meta?.defaultModel ?? ''
        : settings?.model_fast ?? '',
    base_url: provider === 'openai_compatible' ? settings?.base_url ?? '' : settings?.base_url ?? '',
    api_key: '',
  };
}

function formatTestStatus(
  result: AiProviderTestResult,
  opts: { showTechnicalDetails: boolean; platformDisplayName: string; mode: AiProviderMode },
): string {
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
  if (result.latency_ms != null) msg += ` · ${result.latency_ms} ms`;
  if (result.model_used) msg += ` · model: ${result.model_used}`;
  return msg;
}

function providerShortLabel(id: CloudProviderKind): string {
  if (id === 'openai_compatible') return 'Compat';
  if (id === 'anthropic') return 'Cl';
  if (id === 'google') return 'Gm';
  return 'AI';
}

function ModelField({
  label,
  hint,
  value,
  placeholder,
  presets,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  placeholder: string;
  presets: string[];
  onChange: (next: string) => void;
}) {
  return (
    <label className="ceg-ai-provider__field">
      <span className="ceg-ai-provider__label">{label}</span>
      <input
        className="ceg-ai-provider__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint ? <span className="ceg-ai-provider__hint">{hint}</span> : null}
      <div className="ceg-ai-provider__chips">
        {presets.map((model) => (
          <button
            key={model}
            type="button"
            className={`ceg-ai-provider__chip${value === model ? ' ceg-ai-provider__chip--active' : ''}`}
            onClick={() => onChange(model)}
          >
            {model}
          </button>
        ))}
      </div>
    </label>
  );
}

/**
 * Cursor-style BYO AI settings — platform default vs bring-your-own API keys.
 */
export function AiProviderSettings({
  settings,
  loading = false,
  saving = false,
  testing = false,
  onSave,
  onTest,
  className = '',
  productName = 'this app',
  aiFeatures = DEFAULT_AI_FEATURES,
  showFeatureList = true,
  platformDisplayName = 'Platform AI',
  showTechnicalDetails = true,
}: AiProviderSettingsProps) {
  const [form, setForm] = useState<AiProviderSaveRequest>(() => emptyForm(settings));
  const [testResult, setTestResult] = useState<AiProviderTestResult | null>(null);

  useEffect(() => {
    setForm(emptyForm(settings));
    setTestResult(null);
  }, [settings]);

  const providerMeta = useMemo(
    () =>
      AI_PROVIDER_OPTIONS.find((p: (typeof AI_PROVIDER_OPTIONS)[number]) => p.id === form.provider) ??
      AI_PROVIDER_OPTIONS[0]!,
    [form.provider],
  );

  const modelPresets =
    form.provider !== 'ollama' && form.provider in MODEL_PRESETS
      ? MODEL_PRESETS[form.provider as CloudProviderKind]
      : [providerMeta.defaultModel];

  const payload = (): AiProviderSaveRequest => {
    const provider =
      form.mode === 'byo' && (form.provider === 'ollama' || !AI_PROVIDER_OPTIONS.some((p) => p.id === form.provider))
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

  const setMode = (mode: AiProviderMode) => {
    setForm((f: AiProviderSaveRequest) => {
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

  const setProvider = (provider: (typeof AI_PROVIDER_OPTIONS)[number]['id']) => {
    const meta = AI_PROVIDER_OPTIONS.find((p: (typeof AI_PROVIDER_OPTIONS)[number]) => p.id === provider);
    setForm((f: AiProviderSaveRequest) => ({
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
      .catch((e: Error) => setTestResult({ ok: false, message: e.message || 'Test failed' }));
  };

  if (loading) {
    return (
      <div className={["ceg-ai-provider", className].filter(Boolean).join(" ")}>
        <div className="ceg-ai-provider__loading" aria-busy="true" aria-label="Loading AI settings">
          <div className="ceg-ai-provider__skeleton" />
          <div className="ceg-ai-provider__skeleton" style={{ height: 220 }} />
          <div className="ceg-ai-provider__skeleton" style={{ height: 56 }} />
        </div>
      </div>
    );
  }

  const activeProviderLabel =
    form.mode === 'platform'
      ? platformDisplayName
      : providerMeta.label;
  const activeModel =
    form.mode === 'platform' && !showTechnicalDetails
      ? platformDisplayName
      : form.mode === 'platform'
        ? settings?.platform_default_model || 'configured model'
        : form.model?.trim() || providerMeta.defaultModel;

  return (
    <div className={["ceg-ai-provider", className].filter(Boolean).join(" ")}>
      <div className="ceg-ai-provider__layout">
        <form
          className="ceg-ai-provider__main"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <div>
            <h3 className="ceg-ai-provider__section-title">Connection mode</h3>
            <div className="ceg-ai-provider__modes">
              <button
                type="button"
                className={`ceg-ai-provider__mode${form.mode === 'platform' ? ' ceg-ai-provider__mode--active' : ''}`}
                onClick={() => setMode('platform')}
                aria-pressed={form.mode === 'platform'}
              >
                <span className="ceg-ai-provider__mode-badge">Recommended</span>
                <div className="ceg-ai-provider__mode-title">Platform default</div>
                <div className="ceg-ai-provider__mode-desc">
                  {showTechnicalDetails
                    ? `Managed on this deployment (${settings?.platform_default_model || 'configured model'}). No API key required.`
                    : `${platformDisplayName} is managed by your organisation. No API key required.`}
                </div>
              </button>
              <button
                type="button"
                className={`ceg-ai-provider__mode${form.mode === 'byo' ? ' ceg-ai-provider__mode--active' : ''}`}
                onClick={() => setMode('byo')}
                aria-pressed={form.mode === 'byo'}
              >
                <span className="ceg-ai-provider__mode-badge">Custom</span>
                <div className="ceg-ai-provider__mode-title">Bring your own AI</div>
                <div className="ceg-ai-provider__mode-desc">
                  Use your OpenAI, Claude, Gemini, or compatible endpoint — like Cursor custom API keys.
                </div>
              </button>
            </div>
          </div>

          {form.mode === 'byo' ? (
            <>
              <div>
                <h3 className="ceg-ai-provider__section-title">Provider</h3>
                <p className="ceg-ai-provider__hint" style={{ margin: '0 0 0.75rem', fontSize: '0.84rem' }}>
                  Paste a cloud API key. OpenAI, Claude, Gemini, or any OpenAI-compatible host (Azure, Groq, etc.).
                </p>
                <div className="ceg-ai-provider__providers">
                  {BYO_PROVIDER_OPTIONS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`ceg-ai-provider__provider${
                        form.provider === p.id ? ' ceg-ai-provider__provider--active' : ''
                      }`}
                      onClick={() => setProvider(p.id)}
                      aria-pressed={form.provider === p.id}
                    >
                      <span
                        className="ceg-ai-provider__provider-icon"
                        style={{ background: PROVIDER_ACCENTS[p.id] }}
                        aria-hidden
                      >
                        {providerShortLabel(p.id)}
                      </span>
                      <span className="ceg-ai-provider__provider-label">{p.label}</span>
                      <span className="ceg-ai-provider__provider-hint">{p.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="ceg-ai-provider__panel">
                <h3 className="ceg-ai-provider__section-title">Models & credentials</h3>
                <div className="ceg-ai-provider__grid">
                  <ModelField
                    label="Primary model"
                    hint="Used for layout generation, email drafting, and agent replies."
                    value={form.model ?? ''}
                    placeholder={providerMeta.defaultModel}
                    presets={modelPresets}
                    onChange={(model) => setForm((f) => ({ ...f, model }))}
                  />
                  <ModelField
                    label="Fast model (optional)"
                    hint="Used for quick suggestions and lightweight tasks."
                    value={form.model_fast ?? ''}
                    placeholder={form.model || providerMeta.defaultModel}
                    presets={modelPresets}
                    onChange={(model_fast) => setForm((f) => ({ ...f, model_fast }))}
                  />

                  {form.provider === 'openai_compatible' ? (
                    <label className="ceg-ai-provider__field ceg-ai-provider__field--full">
                      <span className="ceg-ai-provider__label">Base URL</span>
                      <input
                        className="ceg-ai-provider__input"
                        value={form.base_url ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, base_url: e.target.value }))}
                        placeholder="https://api.groq.com/openai/v1"
                      />
                      <span className="ceg-ai-provider__hint">
                        OpenAI-compatible base URL (Azure, Groq, Together, hosted vLLM, etc.).
                      </span>
                    </label>
                  ) : null}

                  {providerMeta.needsKey ? (
                    <label className="ceg-ai-provider__field ceg-ai-provider__field--full">
                      <span className="ceg-ai-provider__label">API key</span>
                      <input
                        className="ceg-ai-provider__input"
                        type="password"
                        name="api_key"
                        autoComplete="new-password"
                        value={form.api_key ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
                        placeholder={
                          settings?.has_api_key
                            ? `Saved (${settings.api_key_hint}) — leave blank to keep`
                            : 'Paste your API key…'
                        }
                      />
                      <span className="ceg-ai-provider__hint">
                        {settings?.has_api_key
                          ? `Leave blank to keep the saved key (${settings.api_key_hint}). Keys are encrypted at rest.`
                          : 'Stored encrypted. Never shown again after save.'}
                      </span>
                    </label>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <div className="ceg-ai-provider__panel ceg-ai-provider__panel--muted">
              <h3 className="ceg-ai-provider__section-title">Platform configuration</h3>
              <p className="ceg-ai-provider__hint" style={{ margin: 0, fontSize: '0.84rem', lineHeight: 1.55 }}>
                {platformDisplayName} is ready to use. Switch to <strong>Bring your own AI</strong> only when your
                organisation needs a separate provider.
              </p>
            </div>
          )}

          {testResult ? (
            <div
              className={`ceg-ai-provider__status ${
                testResult.ok ? 'ceg-ai-provider__status--ok' : 'ceg-ai-provider__status--err'
              }`}
              role="status"
            >
              {formatTestStatus(testResult, {
                showTechnicalDetails,
                platformDisplayName,
                mode: form.mode,
              })}
            </div>
          ) : null}
        </form>

        <aside className="ceg-ai-provider__aside">
          <div className="ceg-ai-provider__panel">
            <h3 className="ceg-ai-provider__section-title">Current selection</h3>
            <div className="ceg-ai-provider__stat-row">
              <span className="ceg-ai-provider__stat-label">Mode</span>
              <span className="ceg-ai-provider__stat-value">
                {form.mode === 'platform' ? 'Platform default' : 'Bring your own'}
              </span>
            </div>
            <div className="ceg-ai-provider__stat-row">
              <span className="ceg-ai-provider__stat-label">Connection</span>
              <span className="ceg-ai-provider__stat-value">{activeProviderLabel}</span>
            </div>
            {showTechnicalDetails || form.mode === 'byo' ? (
              <>
                <div className="ceg-ai-provider__stat-row">
                  <span className="ceg-ai-provider__stat-label">Primary model</span>
                  <span className="ceg-ai-provider__stat-value">{activeModel}</span>
                </div>
                <div className="ceg-ai-provider__stat-row">
                  <span className="ceg-ai-provider__stat-label">API key</span>
                  <span className="ceg-ai-provider__stat-value">
                    {settings?.has_api_key
                      ? `Saved (${settings.api_key_hint})`
                      : providerMeta.needsKey
                        ? 'Not set'
                        : 'Not required'}
                  </span>
                </div>
              </>
            ) : null}
          </div>

          {showFeatureList ? (
            <div className="ceg-ai-provider__panel ceg-ai-provider__panel--muted">
              <h3 className="ceg-ai-provider__section-title">AI features in {productName}</h3>
              <ul className="ceg-ai-provider__feature-list">
                {aiFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      <div className="ceg-ai-provider__footer">
        <p className="ceg-ai-provider__footer-note">
          Test the current values before saving them for your organisation.
        </p>
        <div className="ceg-ai-provider__actions">
          <button
            type="button"
            className="ceg-ai-provider__btn ceg-ai-provider__btn--secondary"
            disabled={testing}
            onClick={runTest}
          >
            {testing ? 'Testing…' : 'Test connection'}
          </button>
          <button
            type="button"
            className="ceg-ai-provider__btn ceg-ai-provider__btn--primary"
            disabled={saving}
            onClick={() => void onSave(payload()).catch(() => undefined)}
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
