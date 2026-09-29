import { type ElementType, type ReactNode } from "react";
import "./HintTooltip.css";
export type HintTooltipProps = {
    hint: string;
    label?: string;
};
/** Instructional copy as a hover/focus tooltip — not a visible paragraph. */
export declare function HintTooltip({ hint, label }: HintTooltipProps): import("react/jsx-runtime").JSX.Element | null;
export type HeadingWithHintProps = {
    title: ReactNode;
    hint?: string | null;
    as?: ElementType;
    className?: string;
};
export declare function HeadingWithHint({ title, hint, as: Tag, className }: HeadingWithHintProps): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
/** Long / sentence-like supporting copy belongs in a tooltip, not under the title. */
export declare function looksLikeHint(text: string): boolean;
//# sourceMappingURL=HintTooltip.d.ts.map