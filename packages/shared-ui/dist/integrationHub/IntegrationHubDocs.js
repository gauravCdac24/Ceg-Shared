import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useMemo, useState } from 'react';
import { ECOSYSTEM_PRODUCTS, getProductDoc, interpolateDocText, } from './content';
import './IntegrationHubDocs.css';
function endpointKey(ep) {
    return `${ep.method} ${ep.path}`;
}
function buildEndpointSnippets(ep, base, authHeader) {
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
const PLATFORM_ONLY_PRODUCTS = ['ceg_portal', 'fetchdesk'];
function methodTone(method) {
    return method;
}
export function IntegrationHubDocs({ product, apiBaseUrl, siteOrigin, openApiUrl, keyManagementSlot, siblingLinks, tenantView, audience = 'developer', className = '', }) {
    const doc = getProductDoc(product);
    const isOperator = audience === 'operator';
    const hidePlatformProducts = tenantView ?? product !== 'ceg_portal';
    const base = apiBaseUrl.replace(/\/+$/, '');
    const integrationBase = `${base}${doc.integrationPrefix.startsWith('/') ? '' : '/'}${doc.integrationPrefix.replace(/^\//, '')}`;
    const [openFaq, setOpenFaq] = useState(0);
    const [openGroup, setOpenGroup] = useState(doc.endpointGroups?.[0]?.id ?? null);
    const [openEndpoint, setOpenEndpoint] = useState(null);
    const [snippetLang, setSnippetLang] = useState('curl');
    const [copiedId, setCopiedId] = useState(null);
    const [devOpen, setDevOpen] = useState(!isOperator);
    const origin = siteOrigin || base.replace(/\/api\/v1$/i, '').replace(/\/v1$/i, '');
    const displayTitle = isOperator && doc.operatorTitle ? doc.operatorTitle : doc.title;
    const displayTagline = isOperator && doc.operatorTagline ? doc.operatorTagline : doc.tagline;
    const displayOverview = isOperator && doc.operatorOverview ? doc.operatorOverview : doc.overview;
    const displaySteps = isOperator && doc.operatorSetupSteps?.length ? doc.operatorSetupSteps : doc.setupSteps;
    const copyText = useCallback(async (id, text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            window.setTimeout(() => setCopiedId(null), 2000);
        }
        catch {
            /* clipboard blocked */
        }
    }, []);
    const ecosystem = useMemo(() => ECOSYSTEM_PRODUCTS.filter((p) => {
        if (p.id === product)
            return false;
        if (hidePlatformProducts && PLATFORM_ONLY_PRODUCTS.includes(p.id))
            return false;
        return true;
    }), [product, hidePlatformProducts]);
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
        return ecosystem.filter((p) => allowed.includes(p.id) &&
            (!hidePlatformProducts || !PLATFORM_ONLY_PRODUCTS.includes(p.id)));
    }, [doc.connectsTo, ecosystem, hidePlatformProducts]);
    return (_jsxs("div", { className: `ceg-integration-docs ${className}`.trim(), children: [_jsxs("div", { className: "ceg-integration-docs__hero", children: [_jsx("h2", { children: displayTitle }), _jsx("p", { children: displayTagline }), !isOperator ? (_jsxs("div", { className: "ceg-integration-docs__meta", children: [_jsxs("span", { className: "ceg-integration-docs__pill", children: ["Base: ", integrationBase] }), _jsxs("span", { className: "ceg-integration-docs__pill", children: [doc.authHeader, ": YOUR_API_KEY"] }), openApiUrl ? (_jsx("a", { className: "ceg-integration-docs__link", href: openApiUrl, target: "_blank", rel: "noreferrer", children: "OpenAPI / Swagger" })) : doc.openApiPath ? (_jsxs("span", { className: "ceg-integration-docs__pill", children: ["OpenAPI: ", doc.openApiPath] })) : null] })) : null] }), displayOverview ? (_jsxs("section", { className: "ceg-integration-docs__section", children: [_jsx("h3", { children: "Overview" }), _jsx("p", { style: { margin: 0, color: 'var(--ih-secondary)', lineHeight: 1.65, maxWidth: '52rem' }, children: displayOverview })] })) : null, keyManagementSlot ? (_jsxs("div", { className: "ceg-integration-docs__slot", children: [_jsx("h3", { style: { marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem' }, children: isOperator ? 'Connection keys' : 'API keys' }), keyManagementSlot] })) : null, _jsxs("section", { className: "ceg-integration-docs__section", children: [_jsx("h3", { children: isOperator ? 'What to do' : 'Get started' }), _jsx("ol", { className: "ceg-integration-docs__steps", children: displaySteps.map((step, i) => (_jsxs("li", { className: "ceg-integration-docs__step", children: [_jsx("span", { className: "ceg-integration-docs__step-num", "aria-hidden": true, children: i + 1 }), _jsxs("div", { children: [_jsx("div", { className: "ceg-integration-docs__step-title", children: step.title }), _jsx("div", { className: "ceg-integration-docs__step-body", children: step.body })] })] }, step.title))) })] }), connectedProducts.length ? (_jsxs("section", { className: "ceg-integration-docs__section", children: [_jsx("h3", { children: isOperator ? 'Products in this programme' : 'Related integrations' }), _jsx("p", { style: { margin: '0 0 0.75rem', color: 'var(--ih-secondary)', fontSize: 13 }, children: isOperator
                            ? 'Each product does one job. Platform operations connect them; you run day-to-day work in CeG menus.'
                            : hidePlatformProducts
                                ? 'Optional products your organisation may connect alongside this application. Each integration uses its own API keys on your backend — never in browser code.'
                                : 'Platform products in the multi-tenant hub. Configure each product\u2019s keys separately; correlate visits with external_visit_id where supported.' }), _jsx("div", { className: "ceg-integration-docs__ecosystem", children: connectedProducts.map((p) => (_jsxs("div", { className: "ceg-integration-docs__eco-card", children: [_jsx("strong", { children: isOperator && p.operatorLabel ? p.operatorLabel : p.label }), _jsx("span", { children: isOperator && p.operatorRole ? p.operatorRole : p.role })] }, p.id))) }), siblingLinks?.length ? (_jsx("div", { className: "ceg-integration-docs__links", children: siblingLinks.map((l) => (_jsx("a", { className: "ceg-integration-docs__link", href: l.href, children: l.label }, l.href))) })) : null] })) : null, isOperator ? (_jsx("section", { className: "ceg-integration-docs__section", children: _jsxs("button", { type: "button", className: "ceg-integration-docs__dev-toggle", "aria-expanded": devOpen, onClick: () => setDevOpen((v) => !v), children: [_jsx("strong", { children: "For developers" }), _jsx("span", { children: devOpen ? 'Hide API reference' : 'Show API reference (curl, keys, env)' })] }) })) : null, !isOperator || devOpen ? (_jsxs(_Fragment, { children: [_jsxs("section", { className: "ceg-integration-docs__section", children: [_jsx("h3", { children: "Authentication" }), _jsx("p", { style: { margin: '0 0 0.5rem', color: 'var(--ih-secondary)' }, children: doc.authNote }), _jsxs("p", { style: { margin: 0, fontSize: 13, color: 'var(--ih-muted)' }, children: ["Send ", _jsx("code", { children: doc.authHeader }), " on every request. Use HTTPS in production. Rate limits apply on public verify routes; integration routes are keyed per tenant."] }), isOperator && openApiUrl ? (_jsxs("p", { style: { margin: '0.75rem 0 0', fontSize: 13 }, children: [_jsx("a", { className: "ceg-integration-docs__link", href: openApiUrl, target: "_blank", rel: "noreferrer", children: "OpenAPI / Swagger" }), _jsxs("span", { className: "ceg-integration-docs__pill", style: { marginLeft: 8 }, children: ["Base: ", integrationBase] })] })) : null] }), _jsxs("section", { className: "ceg-integration-docs__section", children: [_jsx("h3", { children: "Endpoint reference" }), _jsx("p", { style: { margin: '0 0 1rem', color: 'var(--ih-secondary)', fontSize: 13 }, children: "Expand a domain to see routes and copy curl, JavaScript (fetch), or Python (requests) snippets per endpoint." }), groupedEndpoints.map((group) => {
                                const expanded = openGroup === group.id;
                                return (_jsxs("div", { className: "ceg-integration-docs__group", children: [_jsxs("button", { type: "button", className: "ceg-integration-docs__group-head", "aria-expanded": expanded, onClick: () => setOpenGroup(expanded ? null : group.id), children: [_jsxs("span", { children: [_jsx("strong", { children: group.label }), _jsxs("span", { className: "ceg-integration-docs__group-count", children: [group.items.length, " routes"] })] }), _jsx("span", { "aria-hidden": true, children: expanded ? '−' : '+' })] }), expanded ? (_jsxs("div", { className: "ceg-integration-docs__group-body", children: [group.description ? (_jsx("p", { className: "ceg-integration-docs__group-desc", children: group.description })) : null, group.items.map((ep) => {
                                                    const key = endpointKey(ep);
                                                    const epOpen = openEndpoint === key;
                                                    const snippets = buildEndpointSnippets(ep, base, doc.authHeader);
                                                    const code = interpolateDocText(snippets[snippetLang], base, origin);
                                                    const copyId = `ep-${key}-${snippetLang}`;
                                                    return (_jsxs("div", { className: "ceg-integration-docs__endpoint", children: [_jsxs("button", { type: "button", className: "ceg-integration-docs__endpoint-head", "aria-expanded": epOpen, onClick: () => setOpenEndpoint(epOpen ? null : key), children: [_jsx("span", { className: "ceg-integration-docs__method", children: methodTone(ep.method) }), _jsx("code", { className: "ceg-integration-docs__path", children: ep.path }), _jsx("span", { className: "ceg-integration-docs__endpoint-summary", children: ep.summary }), _jsx("span", { "aria-hidden": true, children: epOpen ? '−' : '+' })] }), epOpen ? (_jsxs("div", { className: "ceg-integration-docs__endpoint-body", children: [_jsx("div", { className: "ceg-integration-docs__snippet-tabs", role: "tablist", children: ['curl', 'javascript', 'python'].map((lang) => (_jsx("button", { type: "button", role: "tab", "aria-selected": snippetLang === lang, className: `ceg-integration-docs__snippet-tab${snippetLang === lang ? ' ceg-integration-docs__snippet-tab--active' : ''}`, onClick: () => setSnippetLang(lang), children: lang === 'curl' ? 'curl' : lang === 'javascript' ? 'JavaScript' : 'Python' }, lang))) }), _jsxs("div", { className: "ceg-integration-docs__example", children: [_jsxs("div", { className: "ceg-integration-docs__example-head", children: [_jsx("span", { children: ep.summary }), _jsx("button", { type: "button", className: "ceg-integration-docs__copy", onClick: () => void copyText(copyId, code), children: copiedId === copyId ? 'Copied' : 'Copy' })] }), _jsx("pre", { children: code })] })] })) : null] }, key));
                                                })] })) : null] }, group.id));
                            })] }), _jsxs("section", { className: "ceg-integration-docs__section", children: [_jsx("h3", { children: "Examples" }), doc.examples.map((ex, idx) => {
                                const code = interpolateDocText(ex.code, base, origin);
                                const copyId = `ex-${idx}`;
                                return (_jsxs("div", { className: "ceg-integration-docs__example", children: [_jsxs("div", { className: "ceg-integration-docs__example-head", children: [_jsx("span", { children: ex.title }), _jsx("button", { type: "button", className: "ceg-integration-docs__copy", onClick: () => void copyText(copyId, code), children: copiedId === copyId ? 'Copied' : 'Copy' })] }), _jsx("pre", { children: code })] }, ex.title));
                            })] }), doc.webhooks ? (_jsxs("section", { className: "ceg-integration-docs__section", children: [_jsx("h3", { children: "Webhooks" }), _jsx("p", { style: { margin: '0 0 0.5rem', color: 'var(--ih-secondary)' }, children: doc.webhooks.note }), _jsxs("p", { style: { margin: 0, fontSize: 13 }, children: ["Events:", ' ', doc.webhooks.events.map((e) => (_jsx("code", { style: { marginRight: 6 }, children: e }, e)))] })] })) : null, doc.envVars?.length ? (_jsxs("section", { className: "ceg-integration-docs__section", children: [_jsx("h3", { children: "Server environment variables" }), _jsx("div", { className: "ceg-integration-docs__table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Variable" }), _jsx("th", { children: "Purpose" })] }) }), _jsx("tbody", { children: doc.envVars.map((v) => (_jsxs("tr", { children: [_jsx("td", { className: "ceg-integration-docs__path", children: v.name }), _jsx("td", { children: v.description })] }, v.name))) })] }) })] })) : null] })) : null, _jsxs("section", { className: "ceg-integration-docs__section", children: [_jsx("h3", { children: "FAQ" }), doc.faq.map((item, i) => {
                        const open = openFaq === i;
                        return (_jsxs("div", { className: "ceg-integration-docs__faq-item", children: [_jsxs("button", { type: "button", className: "ceg-integration-docs__faq-q", "aria-expanded": open, onClick: () => setOpenFaq(open ? null : i), children: [item.q, _jsx("span", { "aria-hidden": true, children: open ? '−' : '+' })] }), open ? _jsx("div", { className: "ceg-integration-docs__faq-a", children: item.a }) : null] }, item.q));
                    })] })] }));
}
export { ECOSYSTEM_PRODUCTS, getProductDoc, PRODUCT_DOCS } from './content';
//# sourceMappingURL=IntegrationHubDocs.js.map