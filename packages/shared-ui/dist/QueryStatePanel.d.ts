import * as React from "react";
import "./QueryStatePanel.css";
export type QueryStatePanelProps = {
    loading?: boolean;
    error?: boolean;
    empty?: boolean;
    useCard?: boolean;
    loadingText?: string;
    errorText?: string;
    /** Optional support reference (e.g. request id) shown under the error message. */
    errorDetail?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyIcon?: React.ReactNode;
    emptyActionLabel?: string;
    onEmptyAction?: () => void;
    onRetry?: () => void;
    /** table = list bones; page = KPI + panels; inline = compact */
    loadingVariant?: "table" | "page" | "inline";
    children?: React.ReactNode;
};
/**
 * Unified loading / error / empty wrapper for admin list queries (PS-DS-002).
 * Promoted from QuizForge — use instead of toast-only error flashes.
 */
export declare function QueryStatePanel({ loading, error, empty, useCard, loadingText, errorText, errorDetail, emptyTitle, emptyDescription, emptyIcon, emptyActionLabel, onEmptyAction, onRetry, loadingVariant, children, }: QueryStatePanelProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=QueryStatePanel.d.ts.map