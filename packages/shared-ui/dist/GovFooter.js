import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
const DEFAULT_LINKS = [
    { label: "Privacy Policy", href: "https://www.meity.gov.in/policies", external: true },
    { label: "Terms of Use", href: "https://www.india.gov.in/help/terms_of_use", external: true },
    { label: "Accessibility", href: "https://www.meity.gov.in/", external: true },
    { label: "Contact", href: "mailto:contact@cdac.in", external: true },
];
/**
 * Government-style site footer: ministry references, NIC/C-DAC, policy links.
 * Requires `@ceg/design-tokens/styles.css` for `.ceg-gov-footer` styles.
 */
export function GovFooter({ productName, orgLine, ministryLine = "Ministry of Electronics and Information Technology (MeitY), Government of India", copyrightHolder = "Centre for e-Governance, Government of India", links = DEFAULT_LINKS, nicHref = "https://www.nic.in/", meityHref = "https://www.meity.gov.in/", cdacHref = "https://www.cdac.in/", className, variant = "dark", }) {
    const year = new Date().getFullYear();
    const rootClass = ["ceg-gov-footer", `ceg-gov-footer--${variant}`, className].filter(Boolean).join(" ");
    return (_jsx("footer", { className: rootClass, role: "contentinfo", "aria-label": "Site footer", children: _jsxs("div", { className: "ceg-gov-footer__inner", children: [_jsxs("div", { className: "ceg-gov-footer__brand", children: [_jsx("p", { className: "ceg-gov-footer__product", children: productName }), orgLine ? _jsx("p", { className: "ceg-gov-footer__org", children: orgLine }) : null, _jsx("p", { className: "ceg-gov-footer__ministry", children: ministryLine })] }), _jsxs("nav", { className: "ceg-gov-footer__refs", "aria-label": "Government references", children: [_jsx("a", { href: nicHref, target: "_blank", rel: "noopener noreferrer", children: "NIC" }), _jsx("a", { href: meityHref, target: "_blank", rel: "noopener noreferrer", children: "MeitY" }), _jsx("a", { href: cdacHref, target: "_blank", rel: "noopener noreferrer", children: "C-DAC" })] }), _jsx("nav", { className: "ceg-gov-footer__links", "aria-label": "Legal and support", children: links.map((link, i) => (_jsxs(React.Fragment, { children: [i > 0 ? _jsx("span", { "aria-hidden": "true", children: "\u00B7" }) : null, _jsx("a", { href: link.href, ...(link.external !== false && link.href.startsWith("http")
                                    ? { target: "_blank", rel: "noopener noreferrer" }
                                    : {}), children: link.label })] }, link.href + link.label))) }), _jsxs("p", { className: "ceg-gov-footer__copy", children: ["\u00A9 ", year, " ", copyrightHolder, ". All rights reserved."] })] }) }));
}
//# sourceMappingURL=GovFooter.js.map