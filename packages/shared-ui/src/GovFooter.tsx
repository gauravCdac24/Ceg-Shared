import * as React from "react";

export type GovFooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type GovFooterProps = {
  /** Product name shown in copyright line, e.g. "CeG Portal". */
  productName: string;
  /** Optional org line under ministry reference. */
  orgLine?: string;
  ministryLine?: string;
  copyrightHolder?: string;
  links?: GovFooterLink[];
  nicHref?: string;
  meityHref?: string;
  cdacHref?: string;
  className?: string;
  variant?: "dark" | "light";
};

const DEFAULT_LINKS: GovFooterLink[] = [
  { label: "Privacy Policy", href: "https://www.meity.gov.in/policies", external: true },
  { label: "Terms of Use", href: "https://www.india.gov.in/help/terms_of_use", external: true },
  { label: "Accessibility", href: "https://www.meity.gov.in/", external: true },
  { label: "Contact", href: "mailto:contact@cdac.in", external: true },
];

/**
 * Government-style site footer: ministry references, NIC/C-DAC, policy links.
 * Requires `@ceg/design-tokens/styles.css` for `.ceg-gov-footer` styles.
 */
export function GovFooter({
  productName,
  orgLine,
  ministryLine = "Ministry of Electronics and Information Technology (MeitY), Government of India",
  copyrightHolder = "Centre for e-Governance, Government of India",
  links = DEFAULT_LINKS,
  nicHref = "https://www.nic.in/",
  meityHref = "https://www.meity.gov.in/",
  cdacHref = "https://www.cdac.in/",
  className,
  variant = "dark",
}: GovFooterProps) {
  const year = new Date().getFullYear();
  const rootClass = ["ceg-gov-footer", `ceg-gov-footer--${variant}`, className].filter(Boolean).join(" ");

  return (
    <footer className={rootClass} role="contentinfo" aria-label="Site footer">
      <div className="ceg-gov-footer__inner">
        <div className="ceg-gov-footer__brand">
          <p className="ceg-gov-footer__product">{productName}</p>
          {orgLine ? <p className="ceg-gov-footer__org">{orgLine}</p> : null}
          <p className="ceg-gov-footer__ministry">{ministryLine}</p>
        </div>

        <nav className="ceg-gov-footer__refs" aria-label="Government references">
          <a href={nicHref} target="_blank" rel="noopener noreferrer">
            NIC
          </a>
          <a href={meityHref} target="_blank" rel="noopener noreferrer">
            MeitY
          </a>
          <a href={cdacHref} target="_blank" rel="noopener noreferrer">
            C-DAC
          </a>
        </nav>

        <nav className="ceg-gov-footer__links" aria-label="Legal and support">
          {links.map((link, i) => (
            <React.Fragment key={link.href + link.label}>
              {i > 0 ? <span aria-hidden="true">·</span> : null}
              <a
                href={link.href}
                {...(link.external !== false && link.href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {link.label}
              </a>
            </React.Fragment>
          ))}
        </nav>

        <p className="ceg-gov-footer__copy">
          © {year} {copyrightHolder}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
