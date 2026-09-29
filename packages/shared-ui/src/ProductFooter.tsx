import * as React from "react";
import { renderSocialIcon, type SocialIconName } from "./footerSocialIcons";

export type ProductFooterLink = {
  name: string;
  href: string;
  external?: boolean;
};

export type ProductFooterSection = {
  title: string;
  links: ProductFooterLink[];
};

export type ProductFooterSocial = {
  icon: SocialIconName;
  href: string;
  label: string;
};

export type ProductFooterLogo = {
  url: string;
  src: string;
  alt: string;
  title: string;
};

export type ProductFooterGovLogo = {
  href: string;
  src: string;
  alt: string;
};

export type ProductFooterProps = {
  logo: ProductFooterLogo;
  sections?: ProductFooterSection[];
  description?: string;
  address?: string;
  ministryLine?: string;
  socialLinks?: ProductFooterSocial[];
  copyright?: string;
  legalLinks?: ProductFooterLink[];
  variant?: "dark" | "light";
  className?: string;
  showGovRefs?: boolean;
  /** When false, brand column shows product title only (Cert Studio auth pattern). */
  showBrandLogo?: boolean;
  /** Image-based government partner links (replaces text refs when provided). */
  govLogoRefs?: ProductFooterGovLogo[];
  /** Optional React Router `Link` (or compatible) for same-origin paths */
  internalLinkComponent?: React.ElementType;
  /** Slim single-row footer: copyright + legal left, partner logos right (skips brand/columns). */
  compact?: boolean;
};

const DEFAULT_LEGAL: ProductFooterLink[] = [
  { name: "Terms and Conditions", href: "https://www.india.gov.in/help/terms_of_use", external: true },
  { name: "Privacy Policy", href: "https://www.meity.gov.in/policies", external: true },
];

const CEG_SOCIAL: ProductFooterSocial[] = [
  { icon: "instagram", href: "https://www.instagram.com/cegmeitydel/", label: "Instagram" },
  { icon: "facebook", href: "https://www.facebook.com/CeGMeitY", label: "Facebook" },
  { icon: "twitter", href: "https://x.com/MeitYCeG", label: "X (Twitter)" },
  { icon: "linkedin", href: "https://www.linkedin.com/in/centre-for-e-governance-380665265/", label: "LinkedIn" },
];

export const DEFAULT_CEG_SOCIAL_LINKS = CEG_SOCIAL;

function FooterAnchor({
  link,
  className,
  internalLinkComponent: InternalLink,
}: {
  link: ProductFooterLink;
  className: string;
  internalLinkComponent?: ProductFooterProps["internalLinkComponent"];
}) {
  const isExternal =
    link.external ?? (link.href.startsWith("http") || link.href.startsWith("mailto:"));
  if (!isExternal && InternalLink) {
    const Link = InternalLink as React.ComponentType<{
      to: string;
      className: string;
      children: React.ReactNode;
    }>;
    return (
      <Link to={link.href} className={`${className} notranslate`.trim()}>
        {link.name}
      </Link>
    );
  }
  return (
    <a
      href={link.href}
      className={`${className} notranslate`}
      translate="no"
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {link.name}
    </a>
  );
}

export function ProductFooter({
  logo,
  sections = [],
  description,
  address,
  ministryLine,
  socialLinks = CEG_SOCIAL,
  copyright,
  legalLinks = DEFAULT_LEGAL,
  variant = "dark",
  className,
  showGovRefs = true,
  showBrandLogo = true,
  govLogoRefs,
  internalLinkComponent,
  compact = false,
}: ProductFooterProps) {
  const year = new Date().getFullYear();
  const copy =
    copyright ?? `© ${year} ${logo.title}. All rights reserved.`;
  const rootClass = [
    "ceg-product-footer",
    `ceg-product-footer--${variant}`,
    compact ? "ceg-product-footer--compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (compact) {
    return (
      <footer className={rootClass} role="contentinfo" aria-label="Site footer">
        <div className="ceg-product-footer__container">
          <div className="ceg-product-footer__compact-row">
            <div className="ceg-product-footer__compact-left">
              <p className="ceg-product-footer__copy">{copy}</p>
              {legalLinks.length ? (
                <ul className="ceg-product-footer__legal">
                  {legalLinks.map((link) => (
                    <li key={link.name}>
                      <FooterAnchor
                        link={link}
                        className="ceg-product-footer__legal-link"
                        internalLinkComponent={internalLinkComponent}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {showGovRefs ? (
              govLogoRefs?.length ? (
                <nav className="ceg-product-footer__gov-logos" aria-label="Government partners">
                  {govLogoRefs.map((govLogo) => (
                    <a
                      key={govLogo.href}
                      href={govLogo.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={govLogo.alt}
                    >
                      <img src={govLogo.src} alt={govLogo.alt} loading="lazy" />
                    </a>
                  ))}
                </nav>
              ) : (
                <nav className="ceg-product-footer__gov-refs" aria-label="Government references">
                  <a href="https://www.cdac.in/" target="_blank" rel="noopener noreferrer">
                    C-DAC
                  </a>
                </nav>
              )
            ) : null}
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className={rootClass} role="contentinfo" aria-label="Site footer">
      <div className="ceg-product-footer__container">
        <div className="ceg-product-footer__main">
          <div className="ceg-product-footer__brand">
            <div
              className={[
                "ceg-product-footer__logo-row",
                !showBrandLogo ? "ceg-product-footer__logo-row--text-only" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {showBrandLogo ? (
                <a href={logo.url} className="ceg-product-footer__logo-link">
                  <img src={logo.src} alt={logo.alt} title={logo.title} className="ceg-product-footer__logo" />
                </a>
              ) : null}
              <h2 className="ceg-product-footer__title">{logo.title}</h2>
            </div>
            {description ? <p className="ceg-product-footer__desc">{description}</p> : null}
            {address ? <p className="ceg-product-footer__address">{address}</p> : null}
            {ministryLine ? <p className="ceg-product-footer__ministry">{ministryLine}</p> : null}
            {socialLinks.length ? (
              <ul className="ceg-product-footer__social" aria-label="Social media">
                {socialLinks.map((social) => (
                  <li key={social.href}>
                    <a href={social.href} aria-label={social.label} target="_blank" rel="noopener noreferrer">
                      {renderSocialIcon(social.icon, "ceg-product-footer__social-icon")}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {sections.length ? (
            <div className="ceg-product-footer__columns">
              {sections.map((section) => (
                <div key={section.title} className="ceg-product-footer__col">
                  <h3 className="ceg-product-footer__col-title">{section.title}</h3>
                  <ul className="ceg-product-footer__col-links">
                    {section.links.map((link) => (
                      <li key={`${section.title}-${link.name}`}>
                        <FooterAnchor
                          link={link}
                          className="ceg-product-footer__link"
                          internalLinkComponent={internalLinkComponent}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {showGovRefs ? (
          govLogoRefs?.length ? (
            <nav className="ceg-product-footer__gov-logos" aria-label="Government partners">
              {govLogoRefs.map((logo) => (
                <a
                  key={logo.href}
                  href={logo.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={logo.alt}
                >
                  <img src={logo.src} alt={logo.alt} loading="lazy" />
                </a>
              ))}
            </nav>
          ) : (
            <nav className="ceg-product-footer__gov-refs" aria-label="Government references">
              <a href="https://www.cdac.in/" target="_blank" rel="noopener noreferrer">
                C-DAC
              </a>
            </nav>
          )
        ) : null}

        <div className="ceg-product-footer__bar">
          <p className="ceg-product-footer__copy">{copy}</p>
          {legalLinks.length ? (
            <ul className="ceg-product-footer__legal">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <FooterAnchor
                    link={link}
                    className="ceg-product-footer__legal-link"
                    internalLinkComponent={internalLinkComponent}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
