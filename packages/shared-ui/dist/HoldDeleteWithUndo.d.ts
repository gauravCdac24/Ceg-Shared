import { type ReactNode } from 'react';
export type HoldDeleteWithUndoProps = {
    children?: ReactNode;
    className?: string;
    compact?: boolean;
    disabled?: boolean;
    holdDuration?: number;
    noticeMessage?: string;
    onCommit: () => void | Promise<void>;
    resetAfter?: number;
    undoDuration?: number;
    undoLabel?: string;
};
/**
 * Hold-to-confirm → undo window → commit on expire.
 * Matches the DeleteAction demo pattern (deferred destructive action).
 */
export declare function HoldDeleteWithUndo({ children, className, compact, disabled, holdDuration, noticeMessage, onCommit, resetAfter, undoDuration, undoLabel, }: HoldDeleteWithUndoProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=HoldDeleteWithUndo.d.ts.map