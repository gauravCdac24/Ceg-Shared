import type { CSSProperties } from "react";
import type { EcosystemLink } from "@ceg/shared-validation";
export type EcosystemAppLinksProps = {
    links: EcosystemLink[];
    onNavigate: (href: string) => void;
    title?: string;
    style?: CSSProperties;
    className?: string;
};
export declare function EcosystemAppLinks({ links, onNavigate, title, style, className, }: EcosystemAppLinksProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=EcosystemAppLinks.d.ts.map