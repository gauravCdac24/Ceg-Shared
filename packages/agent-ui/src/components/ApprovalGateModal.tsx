import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

export interface ApprovalRequest {
  job_id: string;
  step_id: string;
  step_name: string;
  capability_name: string;
  preview_data: Record<string, unknown>;
  requested_at: string;
}

interface ApprovalGateModalProps {
  approvalRequest: ApprovalRequest;
  approveUrl?: string;
  onDecision?: (approved: boolean) => void;
}

export function ApprovalGateModal({
  approvalRequest,
  approveUrl,
  onDecision,
}: ApprovalGateModalProps) {
  const [loading, setLoading] = useState(false);
  const [decided, setDecided] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const loadingRef = useRef(loading);
  const decidedRef = useRef(decided);
  loadingRef.current = loading;
  decidedRef.current = decided;

  const submit = useCallback(
    async (approved: boolean) => {
      setLoading(true);
      const url = approveUrl ?? `/v1/agent/approve/${approvalRequest.job_id}`;
      try {
        await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved }),
        });
        setDecided(true);
        onDecision?.(approved);
      } finally {
        setLoading(false);
      }
    },
    [approveUrl, approvalRequest.job_id, onDecision],
  );

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const root = dialogRef.current;
    const focusables = () =>
      root?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) ?? [];

    focusables()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loadingRef.current && !decidedRef.current) {
        e.preventDefault();
        void submit(false);
        return;
      }
      if (e.key !== 'Tab' || !root) return;
      const list = Array.from(focusables());
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [submit]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '28px',
          maxWidth: '480px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div
          id={titleId}
          style={{
            fontSize: '20px',
            fontWeight: 700,
            marginBottom: '6px',
            color: '#1a202c',
          }}
        >
          Action requires approval
        </div>
        <div style={{ color: '#718096', fontSize: '14px', marginBottom: '20px' }}>
          {approvalRequest.step_name}
        </div>

        <div
          style={{
            background: '#f7fafc',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#4a5568',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            What will happen
          </div>
          {Object.entries(approvalRequest.preview_data).map(([k, v]) => (
            <div
              key={k}
              style={{ display: 'flex', gap: '8px', fontSize: '13px', marginBottom: '4px' }}
            >
              <span style={{ color: '#718096', minWidth: '120px' }}>{k}:</span>
              <span style={{ color: '#2d3748', fontWeight: 500 }}>{String(v)}</span>
            </div>
          ))}
        </div>

        {decided ? (
          <div style={{ textAlign: 'center', color: '#718096', fontSize: '14px' }}>
            Decision submitted
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => void submit(false)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                background: '#fff5f5',
                color: '#c53030',
                border: '1px solid #fed7d7',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                opacity: loading ? 0.6 : 1,
              }}
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => void submit(true)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                background: '#2b6cb0',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? '…' : 'Approve'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
