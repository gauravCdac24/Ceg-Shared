import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { HoldToConfirmButton } from './HoldToConfirmButton';
import { UndoNotice } from './UndoNotice';
/**
 * Hold-to-confirm → undo window → commit on expire.
 * Matches the DeleteAction demo pattern (deferred destructive action).
 */
export function HoldDeleteWithUndo({ children, className, compact = false, disabled = false, holdDuration = 1600, noticeMessage = 'Deleted', onCommit, resetAfter = 0, undoDuration = 5000, undoLabel = 'Undo', }) {
    const [stage, setStage] = useState('idle');
    if (stage === 'undo') {
        return (_jsx(UndoNotice, { className: compact ? 'undo-notice--compact' : undefined, duration: undoDuration, message: noticeMessage, undoLabel: undoLabel, onUndo: () => setStage('idle'), onExpire: () => {
                setStage('idle');
                void onCommit();
            } }));
    }
    return (_jsx(HoldToConfirmButton, { compact: compact, className: className, disabled: disabled, duration: holdDuration, resetAfter: resetAfter, onConfirm: () => setStage('undo'), children: children ?? 'Hold to delete' }));
}
//# sourceMappingURL=HoldDeleteWithUndo.js.map