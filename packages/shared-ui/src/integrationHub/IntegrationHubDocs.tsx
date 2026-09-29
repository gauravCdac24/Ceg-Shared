import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  ECOSYSTEM_PRODUCTS,
  getProductDoc,
  interpolateDocText,
  type DocEndpoint,
  type IntegrationProductId,
} from './content';
import './IntegrationHubDocs.css';

type SnippetLang = 'curl' | 'javascript' | 'python';

function endpointKey(ep: DocEndpoint): string {
  return `${ep.method} ${ep.path}`;
}

function buildEndpointSnippets(ep: DocEndpoint, base: string, authHeader: string): Record<SnippetLang, string> {
  const url = `${base}${ep.path.startsWith('/') ? ep.path : `/${ep.path}`}`;
  const authLine = `-H "${authHeader}: YOUR_API_KEY"`;
  const hasBody = ep.method === 'POST' || ep.method === 'PUT' || ep.method === 'PATCH';
  const sampleBody = hasBody ? '{\n  "example": true\n}' : '';
  const curl = hasBody
    ? `curl -s -X ${ep.method} "${url}" \\\n  ${authLine} \\\n  -H "Content-Type: application/json" \\\n  -d '${sampleBody.replace(/\n/g, '')}'`
    : `curl -s -X ${ep.method} "${url}" \\\n  ${authLine}`;
  const javascript = hasBody
    ? `const res = await fetch("${url}", {\n  method: "${ep.method}",\n  headers: {\n    "${authHeader}": process.env.CERT_STUDIO_API_KEY,\n    "Content-Type": "application/json",\n  },\n  body: JSON.stringify({ example: true }),\n});\nconst data = await res.json();`
    : `const res = await fetch("${url}", {\n  method: "${ep.method}",\n  headers: { "${authHeader}": process.env.CERT_STUDIO_API_KEY },\n});\nconst data = await res.json();`;
  const python = hasBody
    ? `import os, requests\n\nr = requests.${ep.method.toLowerCase()}(\n    "${url}",\n    headers={"${authHeader}": os.environ["CERT_STUDIO_API_KEY"], "Content-Type": "application/json"},\n    json={"example": True},\n    timeout=60,\n)\nr.raise_for_status()\ndata = r.json()`
    : `import os, requests\n\nr = requests.${ep.method.toLowerCase()}(\n    "${url}",\n    headers={"${authHeader}": os.environ["CERT_STUDIO_API_KEY"]},\n    timeout=60,\n)\nr.raise_for_status()\ndata = r.json()`;
  return { curl, javascript, python };
}

/** Platform-operator products — hidden from tenant-facing integration docs. */
const PLATFORM_ONLY_PRODUCTS: IntegrationProductId[] = ['ceg_portal', 'fetchdesk'];

export type IntegrationHubDocsProps = {
  product: IntegrationProductId;
  /** Full API prefix, e.g. https://host/api/v1 or https://host/quiz/v1 */
  apiBaseUrl: string;
  /** Site origin without API path — used in SDK examples */
  siteOrigin?: string;
  openApiUrl?: string;
  /** Render API key UI above docs (IntegrationKeysPanel, ApiKeys, etc.) */
  keyManagementSlot?: ReactNode;
  /** Links to sibling product docs in other apps */
  siblingLinks?: { label: string; href: string }[];
  /** When true (default for tenant products), hide platform-operator integrations from the ecosystem section. */
  tenantView?: boolean;
  /**
   * operator — plain-language who-connects-to-whom; curl/JWT/env behind "For developers".
   * developer — full technical reference (default for non-CeG embeds).
   */
  audience?: 'operator' | 'developer';
  className?: string;
};

function methodTone(method: string): string {
  return method;
}

export function IntegrationHubDocs({
  product,
  apiBaseUrl,
  siteOrigin,
  openApiUrl,
  keyManagementSlot,
  siblingLinks,
  tenantView,
  audience = 'developer',
  className = '',
}: IntegrationHubDocsProps) {
  const doc = getProductDoc(product);
  const isOperator = audience === 'operator';
  const hidePlatformProducts = tenantView ?? product !== 'ceg_portal';
  const base = apiBaseUrl.replace(/\/+$/, '');
  const integrationBase = `${base}${doc.integrationPrefix.startsWith('/') ? '' : '/'}${doc.integrationPrefix.replace(/^\//, '')}`;
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [openGroup, setOpenGroup] = useState<string | null>(doc.endpointGroups?.[0]?.id ?? null);
  const [openEndpoint, setOpenEndpoint] = useState<string | null>(null);
  const [snippetLang, setSnippetLang] = useState<SnippetLang>('curl');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [devOpen, setDevOpen] = useState(!isOperator);

  const origin = siteOrigin || base.replace(/\/api\/v1$/i, '').replace(/\/v1$/i, '');
  const displayTitle = isOperator && doc.operatorTitle ? doc.operatorTitle : doc.title;
  const displayTagline = isOperator && doc.operatorTagline ? doc.operatorTagline : doc.tagline;
  const displayOverview = isOperator && doc.operatorOverview ? doc.operatorOverview : doc.overview;
  const displaySteps =
    isOperator && doc.operatorSetupSteps?.length ? doc.operatorSetupSteps : doc.setupSteps;

  const copyText = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* clipboard blocked */
    }
  }, []);

  const ecosystem = useMemo(
    () =>
      ECOSYSTEM_PRODUCTS.filter((p) => {
        if (p.id === product) return false;
        if (hidePlatformProducts && PLATFORM_ONLY_PRODUCTS.includes(p.id)) return false;
        return true;
      }),
    [product, hidePlatformProducts],
  );

  const groupedEndpoints = useMemo(() => {
    const groups = doc.endpointGroups ?? [];
    if (!groups.length) {
      return [{ id: '_all', label: 'Endpoints', description: '', items: doc.endpoints }];
    }
    return groups.map((g) => ({
      ...g,
      items: doc.endpoints.filter((ep) => (ep.group || 'settings') === g.id),
    }));
  }, [doc.endpointGroups, doc.endpoints]);

  const connectedProducts = useMemo(() => {
    const allowed = doc.connectsTo ?? [];
    return ecosystem.filter(
      (p) =>
        allowed.includes(p.id) &&
        (!hidePlatformProducts || !PLATFORM_ONLY_PRODUCTS.includes(p.id)),
    );
  }, [doc.connectsTo, ecosystem, hidePlatformProducts]);

  return (
    <div className={`ceg-integration-docs ${className}`.trim()}>
      <div className="ceg-integration-docs__hero">
        <h2>{displayTitle}</h2>
        <p>{displayTagline}</p>
        {!isOperator ? (
          <div className="ceg-integration-docs__meta">
            <span className="ceg-integration-docs__pill">
              Base: {integrationBase}
            </span>
            <span className="ceg-integration-docs__pill">
              {doc.authHeader}: YOUR_API_KEY
            </span>
            {openApiUrl ? (
              <a className="ceg-integration-docs__link" href={openApiUrl} target="_blank" rel="noreferrer">
                OpenAPI / Swagger
              </a>
            ) : doc.openApiPath ? (
              <span className="ceg-integration-docs__pill">OpenAPI: {doc.openApiPath}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      {displayOverview ? (
        <section className="ceg-integration-docs__section">
          <h3>Overview</h3>
          <p style={{ margin: 0, color: 'var(--ih-secondary)', lineHeight: 1.65, maxWidth: '52rem' }}>
            {displayOverview}
          </p>
        </section>
      ) : null}

      {keyManagementSlot ? (
        <div className="ceg-integration-docs__slot">
          <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem' }}>
            {isOperator ? 'Connection keys' : 'API keys'}
          </h3>
          {keyManagementSlot}
        </div>
      ) : null}

      <section className="ceg-integration-docs__section">
        <h3>{isOperator ? 'What to do' : 'Get started'}</h3>
        <ol className="ceg-integration-docs__steps">
          {displaySteps.map((step, i) => (
            <li key={step.title} className="ceg-integration-docs__step">
              <span className="ceg-integration-docs__step-num" aria-hidden>
                {i + 1}
              </span>
              <div>
                <div className="ceg-integration-docs__step-title">{step.title}</div>
                <div className="ceg-integration-docs__step-body">{step.body}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {connectedProducts.length ? (
        <section className="ceg-integration-docs__section">
          <h3>{isOperator ? 'Products in this programme' : 'Related integrations'}</h3>
          <p style={{ margin: '0 0 0.75rem', color: 'var(--ih-secondary)', fontSize: 13 }}>
            {isOperator
              ? 'Each product does one job. Platform operations connect them; you run day-to-day work in CeG menus.'
              : hidePlatformProducts
                ? 'Optional products your organisation may connect alongside this application. Each integration uses its own API keys on your backend — never in browser code.'
                : 'Platform products in the multi-tenant hub. Configure each product\u2019s keys separately; correlate visits with external_visit_id where supported.'}
          </p>
          <div className="ceg-integration-docs__ecosystem">
            {connectedProducts.map((p) => (
                <div key={p.id} className="ceg-integration-docs__eco-card">
                  <strong>{isOperator && p.operatorLabel ? p.operatorLabel : p.label}</strong>
                  <span>{isOperator && p.operatorRole ? p.operatorRole : p.role}</span>
                </div>
              ))}
          </div>
          {siblingLinks?.length ? (
            <div className="ceg-integration-docs__links">
              {siblingLinks.map((l) => (
                <a key={l.href} className="ceg-integration-docs__link" href={l.href}>
                  {l.label}
                </a>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {isOperator ? (
        <section className="ceg-integration-docs__section">
          <button
            type="button"
            className="ceg-integration-docs__dev-toggle"
            aria-expanded={devOpen}
            onClick={() => setDevOpen((v) => !v)}
          >
            <strong>For developers</strong>
            <span>{devOpen ? 'Hide API reference' : 'Show API reference (curl, keys, env)'}</span>
          </button>
        </section>
      ) : null}

      {!isOperator || devOpen ? (
        <>
      <section className="ceg-integration-docs__section">
        <h3>Authentication</h3>
        <p style={{ margin: '0 0 0.5rem', color: 'var(--ih-secondary)' }}>{doc.authNote}</p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ih-muted)' }}>
          Send <code>{doc.authHeader}</code> on every request. Use HTTPS in production. Rate limits apply on public verify
          routes; integration routes are keyed per tenant.
        </p>
        {isOperator && openApiUrl ? (
          <p style={{ margin: '0.75rem 0 0', fontSize: 13 }}>
            <a className="ceg-integration-docs__link" href={openApiUrl} target="_blank" rel="noreferrer">
              OpenAPI / Swagger
            </a>
            <span className="ceg-integration-docs__pill" style={{ marginLeft: 8 }}>
              Base: {integrationBase}
            </span>
          </p>
        ) : null}
      </section>

      <section className="ceg-integration-docs__section">
        <h3>Endpoint reference</h3>
        <p style={{ margin: '0 0 1rem', color: 'var(--ih-secondary)', fontSize: 13 }}>
          Expand a domain to see routes and copy curl, JavaScript (fetch), or Python (requests) snippets per endpoint.
        </p>
        {groupedEndpoints.map((group) => {
          const expanded = openGroup === group.id;
          return (
            <div key={group.id} className="ceg-integration-docs__group">
              <button
                type="button"
                className="ceg-integration-docs__group-head"
                aria-expanded={expanded}
                onClick={() => setOpenGroup(expanded ? null : group.id)}
              >
                <span>
                  <strong>{group.label}</strong>
                  <span className="ceg-integration-docs__group-count">{group.items.length} routes</span>
                </span>
                <span aria-hidden>{expanded ? '−' : '+'}</span>
              </button>
              {expanded ? (
                <div className="ceg-integration-docs__group-body">
                  {group.description ? (
                    <p className="ceg-integration-docs__group-desc">{group.description}</p>
                  ) : null}
                  {group.items.map((ep) => {
                    const key = endpointKey(ep);
                    const epOpen = openEndpoint === key;
                    const snippets = buildEndpointSnippets(ep, base, doc.authHeader);
                    const code = interpolateDocText(snippets[snippetLang], base, origin);
                    const copyId = `ep-${key}-${snippetLang}`;
                    return (
                      <div key={key} className="ceg-integration-docs__endpoint">
                        <button
                          type="button"
                          className="ceg-integration-docs__endpoint-head"
                          aria-expanded={epOpen}
                          onClick={() => setOpenEndpoint(epOpen ? null : key)}
                        >
                          <span className="ceg-integration-docs__method">{methodTone(ep.method)}</span>
                          <code className="ceg-integration-docs__path">{ep.path}</code>
                          <span className="ceg-integration-docs__endpoint-summary">{ep.summary}</span>
                          <span aria-hidden>{epOpen ? '−' : '+'}</span>
                        </button>
                        {epOpen ? (
                          <div className="ceg-integration-docs__endpoint-body">
                            <div className="ceg-integration-docs__snippet-tabs" role="tablist">
                              {(['curl', 'javascript', 'python'] as SnippetLang[]).map((lang) => (
                                <button
                                  key={lang}
                                  type="button"
                                  role="tab"
                                  aria-selected={snippetLang === lang}
                                  className={`ceg-integration-docs__snippet-tab${snippetLang === lang ? ' ceg-integration-docs__snippet-tab--active' : ''}`}
                                  onClick={() => setSnippetLang(lang)}
                                >
                                  {lang === 'curl' ? 'curl' : lang === 'javascript' ? 'JavaScript' : 'Python'}
                                </button>
                              ))}
                            </div>
                            <div className="ceg-integration-docs__example">
                              <div className="ceg-integration-docs__example-head">
                                <span>{ep.summary}</span>
                                <button
                                  type="button"
                                  className="ceg-integration-docs__copy"
                                  onClick={() => void copyText(copyId, code)}
                                >
                                  {copiedId === copyId ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                              <pre>{code}</pre>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      <section className="ceg-integration-docs__section">
        <h3>Examples</h3>
        {doc.examples.map((ex, idx) => {
          const code = interpolateDocText(ex.code, base, origin);
          const copyId = `ex-${idx}`;
          return (
            <div key={ex.title} className="ceg-integration-docs__example">
              <div className="ceg-integration-docs__example-head">
                <span>{ex.title}</span>
                <button
                  type="button"
                  className="ceg-integration-docs__copy"
                  onClick={() => void copyText(copyId, code)}
                >
                  {copiedId === copyId ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre>{code}</pre>
            </div>
          );
        })}
      </section>

      {doc.webhooks ? (
        <section className="ceg-integration-docs__section">
          <h3>Webhooks</h3>
          <p style={{ margin: '0 0 0.5rem', color: 'var(--ih-secondary)' }}>{doc.webhooks.note}</p>
          <p style={{ margin: 0, fontSize: 13 }}>
            Events:{' '}
            {doc.webhooks.events.map((e) => (
              <code key={e} style={{ marginRight: 6 }}>
                {e}
              </code>
            ))}
          </p>
        </section>
      ) : null}

      {doc.envVars?.length ? (
        <section className="ceg-integration-docs__section">
          <h3>Server environment variables</h3>
          <div className="ceg-integration-docs__table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                {doc.envVars.map((v) => (
                  <tr key={v.name}>
                    <td className="ceg-integration-docs__path">{v.name}</td>
                    <td>{v.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
        </>
      ) : null}

      <section className="ceg-integration-docs__section">
        <h3>FAQ</h3>
        {doc.faq.map((item, i) => {
          const open = openFaq === i;
          return (
            <div key={item.q} className="ceg-integration-docs__faq-item">
              <button
                type="button"
                className="ceg-integration-docs__faq-q"
                aria-expanded={open}
                onClick={() => setOpenFaq(open ? null : i)}
              >
                {item.q}
                <span aria-hidden>{open ? '−' : '+'}</span>
              </button>
              {open ? <div className="ceg-integration-docs__faq-a">{item.a}</div> : null}
            </div>
          );
        })}
      </section>
    </div>
  );
}

export type { IntegrationProductId } from './content';
export { ECOSYSTEM_PRODUCTS, getProductDoc, PRODUCT_DOCS } from './content';
