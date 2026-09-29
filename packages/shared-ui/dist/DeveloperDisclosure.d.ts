import * as React from "react";
import "./DeveloperDisclosure.css";
export type DeveloperDisclosureProps = {
    /** Toggle button primary label. Default: "For developers". */
    label?: string;
    /** Secondary hint when collapsed. */
    hint?: string;
    /** Secondary hint when expanded. */
    hideHint?: string;
    defaultOpen?: boolean;
    /** Fires when expand/collapse changes (e.g. sync JSON from form before show). */
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
    className?: string;
};
/**
 * Only sanctioned way to show JSON / curl / job ids / env vars to operator-facing admin roles.
 * Pattern extracted from IntegrationHubDocs operator audience toggle.
 */
export declare function DeveloperDisclosure({ label, hint, hideHint, defaultOpen, onOpenChange, children, className, }: DeveloperDisclosureProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=DeveloperDisclosure.d.ts.map