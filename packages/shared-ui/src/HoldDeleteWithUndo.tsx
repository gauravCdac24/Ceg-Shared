import { useState, type ReactNode } from 'react';
import { HoldToConfirmButton } from './HoldToConfirmButton';
import { UndoNotice } from './UndoNotice';

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
export function HoldDeleteWithUndo({
  children,
  className,
  compact = false,
  disabled = false,
  holdDuration = 1600,
  noticeMessage = 'Deleted',
  onCommit,
  resetAfter = 0,
  undoDuration = 5000,
  undoLabel = 'Undo',
}: HoldDeleteWithUndoProps) {
  const [stage, setStage] = useState<'idle' | 'undo'>('idle');

  if (stage === 'undo') {
    return (
      <UndoNotice
        className={compact ? 'undo-notice--compact' : undefined}
        duration={undoDuration}
        message={noticeMessage}
        undoLabel={undoLabel}
        onUndo={() => setStage('idle')}
        onExpire={() => {
          setStage('idle');
          void onCommit();
        }}
      />
    );
  }

  return (
    <HoldToConfirmButton
      compact={compact}
      className={className}
      disabled={disabled}
      duration={holdDuration}
      resetAfter={resetAfter}
      onConfirm={() => setStage('undo')}
    >
      {children ?? 'Hold to delete'}
    </HoldToConfirmButton>
  );
}
