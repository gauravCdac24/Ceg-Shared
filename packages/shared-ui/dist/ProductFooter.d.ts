import * as React from "react";
import { type SocialIconName } from "./footerSocialIcons";
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
export declare const DEFAULT_CEG_SOCIAL_LINKS: ProductFooterSocial[];
export declare function ProductFooter({ logo, sections, description, address, ministryLine, socialLinks, copyright, legalLinks, variant, className, showGovRefs, showBrandLogo, govLogoRefs, internalLinkComponent, compact, }: ProductFooterProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ProductFooter.d.ts.map