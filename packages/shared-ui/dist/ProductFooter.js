import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { renderSocialIcon } from "./footerSocialIcons";
const DEFAULT_LEGAL = [
    { name: "Terms and Conditions", href: "https://www.india.gov.in/help/terms_of_use", external: true },
    { name: "Privacy Policy", href: "https://www.meity.gov.in/policies", external: true },
];
const CEG_SOCIAL = [
    { icon: "instagram", href: "https://www.instagram.com/cegmeitydel/", label: "Instagram" },
    { icon: "facebook", href: "https://www.facebook.com/CeGMeitY", label: "Facebook" },
    { icon: "twitter", href: "https://x.com/MeitYCeG", label: "X (Twitter)" },
    { icon: "linkedin", href: "https://www.linkedin.com/in/centre-for-e-governance-380665265/", label: "LinkedIn" },
];
export const DEFAULT_CEG_SOCIAL_LINKS = CEG_SOCIAL;
function FooterAnchor({ link, className, internalLinkComponent: InternalLink, }) {
    const isExternal = link.external ?? (link.href.startsWith("http") || link.href.startsWith("mailto:"));
    if (!isExternal && InternalLink) {
        const Link = InternalLink;
        return (_jsx(Link, { to: link.href, className: `${className} notranslate`.trim(), children: link.name }));
    }
    return (_jsx("a", { href: link.href, className: `${className} notranslate`, translate: "no", ...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {}), children: link.name }));
}
export function ProductFooter({ logo, sections = [], description, address, ministryLine, socialLinks = CEG_SOCIAL, copyright, legalLinks = DEFAULT_LEGAL, variant = "dark", className, showGovRefs = true, showBrandLogo = true, govLogoRefs, internalLinkComponent, compact = false, }) {
    const year = new Date().getFullYear();
    const copy = copyright ?? `© ${year} ${logo.title}. All rights reserved.`;
    const rootClass = [
        "ceg-product-footer",
        `ceg-product-footer--${variant}`,
        compact ? "ceg-product-footer--compact" : "",
        className,
    ]
        .filter(Boolean)
        .join(" ");
    if (compact) {
        return (_jsx("footer", { className: rootClass, role: "contentinfo", "aria-label": "Site footer", children: _jsx("div", { className: "ceg-product-footer__container", children: _jsxs("div", { className: "ceg-product-footer__compact-row", children: [_jsxs("div", { className: "ceg-product-footer__compact-left", children: [_jsx("p", { className: "ceg-product-footer__copy", children: copy }), legalLinks.length ? (_jsx("ul", { className: "ceg-product-footer__legal", children: legalLinks.map((link) => (_jsx("li", { children: _jsx(FooterAnchor, { link: link, className: "ceg-product-footer__legal-link", internalLinkComponent: internalLinkComponent }) }, link.name))) })) : null] }), showGovRefs ? (govLogoRefs?.length ? (_jsx("nav", { className: "ceg-product-footer__gov-logos", "aria-label": "Government partners", children: govLogoRefs.map((govLogo) => (_jsx("a", { href: govLogo.href, target: "_blank", rel: "noopener noreferrer", title: govLogo.alt, children: _jsx("img", { src: govLogo.src, alt: govLogo.alt, loading: "lazy" }) }, govLogo.href))) })) : (_jsx("nav", { className: "ceg-product-footer__gov-refs", "aria-label": "Government references", children: _jsx("a", { href: "https://www.cdac.in/", target: "_blank", rel: "noopener noreferrer", children: "C-DAC" }) }))) : null] }) }) }));
    }
    return (_jsx("footer", { className: rootClass, role: "contentinfo", "aria-label": "Site footer", children: _jsxs("div", { className: "ceg-product-footer__container", children: [_jsxs("div", { className: "ceg-product-footer__main", children: [_jsxs("div", { className: "ceg-product-footer__brand", children: [_jsxs("div", { className: [
                                        "ceg-product-footer__logo-row",
                                        !showBrandLogo ? "ceg-product-footer__logo-row--text-only" : "",
                                    ]
                                        .filter(Boolean)
                                        .join(" "), children: [showBrandLogo ? (_jsx("a", { href: logo.url, className: "ceg-product-footer__logo-link", children: _jsx("img", { src: logo.src, alt: logo.alt, title: logo.title, className: "ceg-product-footer__logo" }) })) : null, _jsx("h2", { className: "ceg-product-footer__title", children: logo.title })] }), description ? _jsx("p", { className: "ceg-product-footer__desc", children: description }) : null, address ? _jsx("p", { className: "ceg-product-footer__address", children: address }) : null, ministryLine ? _jsx("p", { className: "ceg-product-footer__ministry", children: ministryLine }) : null, socialLinks.length ? (_jsx("ul", { className: "ceg-product-footer__social", "aria-label": "Social media", children: socialLinks.map((social) => (_jsx("li", { children: _jsx("a", { href: social.href, "aria-label": social.label, target: "_blank", rel: "noopener noreferrer", children: renderSocialIcon(social.icon, "ceg-product-footer__social-icon") }) }, social.href))) })) : null] }), sections.length ? (_jsx("div", { className: "ceg-product-footer__columns", children: sections.map((section) => (_jsxs("div", { className: "ceg-product-footer__col", children: [_jsx("h3", { className: "ceg-product-footer__col-title", children: section.title }), _jsx("ul", { className: "ceg-product-footer__col-links", children: section.links.map((link) => (_jsx("li", { children: _jsx(FooterAnchor, { link: link, className: "ceg-product-footer__link", internalLinkComponent: internalLinkComponent }) }, `${section.title}-${link.name}`))) })] }, section.title))) })) : null] }), showGovRefs ? (govLogoRefs?.length ? (_jsx("nav", { className: "ceg-product-footer__gov-logos", "aria-label": "Government partners", children: govLogoRefs.map((logo) => (_jsx("a", { href: logo.href, target: "_blank", rel: "noopener noreferrer", title: logo.alt, children: _jsx("img", { src: logo.src, alt: logo.alt, loading: "lazy" }) }, logo.href))) })) : (_jsx("nav", { className: "ceg-product-footer__gov-refs", "aria-label": "Government references", children: _jsx("a", { href: "https://www.cdac.in/", target: "_blank", rel: "noopener noreferrer", children: "C-DAC" }) }))) : null, _jsxs("div", { className: "ceg-product-footer__bar", children: [_jsx("p", { className: "ceg-product-footer__copy", children: copy }), legalLinks.length ? (_jsx("ul", { className: "ceg-product-footer__legal", children: legalLinks.map((link) => (_jsx("li", { children: _jsx(FooterAnchor, { link: link, className: "ceg-product-footer__legal-link", internalLinkComponent: internalLinkComponent }) }, link.name))) })) : null] })] }) }));
}
//# sourceMappingURL=ProductFooter.js.map