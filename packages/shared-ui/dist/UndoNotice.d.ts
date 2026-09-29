import './UndoNotice.css';
export type UndoInteraction = 'keyboard' | 'pointer';
export type UndoNoticeProps = {
    className?: string;
    duration?: number;
    message?: string;
    onExpire: () => void;
    onUndo: (input: UndoInteraction) => void;
    undoLabel?: string;
};
export declare function UndoNotice({ className, duration, message, onExpire, onUndo, undoLabel, }: UndoNoticeProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=UndoNotice.d.ts.map