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
/**
 * Government-style site footer: ministry references, NIC/C-DAC, policy links.
 * Requires `@ceg/design-tokens/styles.css` for `.ceg-gov-footer` styles.
 */
export declare function GovFooter({ productName, orgLine, ministryLine, copyrightHolder, links, nicHref, meityHref, cdacHref, className, variant, }: GovFooterProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=GovFooter.d.ts.map