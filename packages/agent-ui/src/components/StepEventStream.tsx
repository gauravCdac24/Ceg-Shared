import React, { useEffect, useState } from 'react';
import { ExecutionGraph } from './ExecutionGraph';

export interface StepEvent {
  step_id: string;
  step_name: string;
  tool_called?: string;
  status: 'running' | 'done' | 'failed' | 'waiting_approval' | 'pending';
  started_at: string;
  ended_at?: string;
  result_summary?: string;
}

interface StepEventStreamProps {
  jobId: string;
  /** Defaults to /v1/agent/stream/{jobId} */
  streamUrl?: string;
  onComplete?: (artifacts: unknown[]) => void;
  onApprovalRequired?: (jobId: string, payload: unknown) => void;
  /** Show ExecutionGraph instead of flat list. Default: true */
  showGraph?: boolean;
}

const STATUS_ICONS: Record<string, string> = {
  running: '⏳',
  done: '✅',
  failed: '❌',
  waiting_approval: '🔐',
};

const STATUS_COLORS: Record<string, string> = {
  running: '#d69e2e',
  done: '#276749',
  failed: '#c53030',
  waiting_approval: '#6b46c1',
};

export function StepEventStream({
  jobId,
  streamUrl,
  onComplete,
  onApprovalRequired,
  showGraph = true,
}: StepEventStreamProps) {
  const [steps, setSteps] = useState<StepEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const url = streamUrl ?? `/v1/agent/stream/${jobId}`;
    const es = new EventSource(url);
    setConnected(true);

    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.type === 'step_event') {
          const ev: StepEvent = parsed.payload;
          setSteps((prev) => {
            const idx = prev.findIndex((s) => s.step_id === ev.step_id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = ev;
              return next;
            }
            return [...prev, ev];
          });
          if (ev.status === 'waiting_approval') {
            onApprovalRequired?.(jobId, parsed.approval_payload);
          }
        } else if (parsed.type === 'done') {
          onComplete?.(parsed.artifacts ?? []);
          es.close();
          setConnected(false);
        }
      } catch {
        /* ignore non-JSON chunks for backwards compat */
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
    };

    return () => {
      es.close();
    };
  }, [jobId, streamUrl, onApprovalRequired, onComplete]);

  if (steps.length === 0) return null;

  if (showGraph) {
    return <ExecutionGraph steps={steps} currentJobId={jobId} />;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-relevant="additions text"
      style={{ fontFamily: 'system-ui, sans-serif', padding: '12px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        {connected && (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#48bb78',
              display: 'inline-block',
            }}
          />
        )}
        <span style={{ fontSize: '13px', color: '#718096' }}>
          {connected ? 'Running…' : 'Completed'}
        </span>
      </div>
      {steps.map((step) => {
        const elapsed =
          step.ended_at
            ? `${(
                (new Date(step.ended_at).getTime() - new Date(step.started_at).getTime()) /
                1000
              ).toFixed(1)}s`
            : '…';
        return (
          <div
            key={step.step_id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '8px 0',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <span style={{ fontSize: '16px', minWidth: 20 }}>
              {STATUS_ICONS[step.status]}
            </span>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 500,
                  fontSize: '14px',
                  color: STATUS_COLORS[step.status],
                }}
              >
                {step.step_name}
              </div>
              {step.tool_called && (
                <div style={{ fontSize: '12px', color: '#a0aec0' }}>→ {step.tool_called}</div>
              )}
              {step.result_summary && (
                <div style={{ fontSize: '12px', color: '#4a5568', marginTop: 2 }}>
                  {step.result_summary}
                </div>
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#cbd5e0', whiteSpace: 'nowrap' }}>
              {elapsed}
            </div>
          </div>
        );
      })}
    </div>
  );
}
