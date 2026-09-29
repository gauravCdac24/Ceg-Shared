import { type ReactNode } from "react";
import { type DynamicButtonProps } from "./DynamicButton";
export type CopyDynamicButtonProps = Omit<DynamicButtonProps, "children" | "icon" | "onClick" | "stateKey"> & {
    /** Static text to copy. Ignored when `getText` is set. */
    text?: string;
    /** Resolve text at click time (supports async fetch before copy). */
    getText?: () => string | Promise<string>;
    label?: string;
    copiedLabel?: string;
    copiedDurationMs?: number;
    onCopied?: (value: string) => void;
    onCopyError?: (error: unknown) => void;
    icon?: ReactNode;
    copiedIcon?: ReactNode;
};
export declare function CopyDynamicButton({ text, getText, label, copiedLabel, copiedDurationMs, onCopied, onCopyError, icon, copiedIcon, disabled, ...buttonProps }: CopyDynamicButtonProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=CopyDynamicButton.d.ts.map