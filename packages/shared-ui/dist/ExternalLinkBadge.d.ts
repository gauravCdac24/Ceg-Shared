import "./ExternalLinkBadge.css";
export type ExternalLinkBadgeMode = "new-tab" | "inline";
export type ExternalLinkBadgeProps = {
    /** new-tab = opens another app/site; inline = same-shell deep link that feels external. */
    mode?: ExternalLinkBadgeMode;
    className?: string;
    /** Override visible text. */
    label?: string;
};
/**
 * Visual cue for cross-product / external entry points. Does not change navigation —
 * place next to the control that already opens the other product.
 */
export declare function ExternalLinkBadge({ mode, className, label, }: ExternalLinkBadgeProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ExternalLinkBadge.d.ts.map