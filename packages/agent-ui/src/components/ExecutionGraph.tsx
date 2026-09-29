import React from 'react';
import { StepEvent } from './StepEventStream';

export interface ExecutionGraphProps {
  steps: StepEvent[];
  currentJobId?: string;
}

const NODE_STATUS_STYLE: Record<string, React.CSSProperties> = {
  running:          { background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e' },
  done:             { background: '#d1fae5', borderColor: '#10b981', color: '#065f46' },
  failed:           { background: '#fee2e2', borderColor: '#ef4444', color: '#991b1b' },
  waiting_approval: { background: '#ede9fe', borderColor: 'var(--accent-violet)', color: '#4c1d95' },
  pending:          { background: '#f1f5f9', borderColor: '#cbd5e1', color: '#475569' },
};

const STATUS_LABEL: Record<string, string> = {
  running: '⏳ Running',
  done: '✅ Done',
  failed: '❌ Failed',
  waiting_approval: '🔐 Approval',
  pending: '○ Queued',
};

function elapsed(step: StepEvent): string {
  if (!step.started_at) return '';
  const end = step.ended_at ? new Date(step.ended_at) : new Date();
  const ms = end.getTime() - new Date(step.started_at).getTime();
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function ExecutionGraph({ steps, currentJobId: _currentJobId }: ExecutionGraphProps) {
  if (steps.length === 0) return null;

  return (
    <div style={{ padding: '16px', fontFamily: 'system-ui, sans-serif' }}>
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#64748b',
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        Execution Plan
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {steps.map((step, i) => {
          const style = NODE_STATUS_STYLE[step.status] ?? NODE_STATUS_STYLE.pending;
          const isLast = i === steps.length - 1;
          return (
            <div key={step.step_id} style={{ display: 'flex', alignItems: 'stretch', gap: '0' }}>
              {/* Connector line */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '24px',
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    marginTop: '14px',
                    flexShrink: 0,
                    border: `2px solid ${style.borderColor}`,
                    background: style.background,
                  }}
                />
                {!isLast && (
                  <div
                    style={{
                      width: '2px',
                      flex: 1,
                      background: '#e2e8f0',
                      marginTop: '2px',
                    }}
                  />
                )}
              </div>
              {/* Node content */}
              <div
                style={{
                  flex: 1,
                  margin: '8px 0 8px 8px',
                  padding: '10px 14px',
                  border: `1px solid ${style.borderColor}`,
                  borderRadius: '8px',
                  background: style.background,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '14px', color: style.color }}>
                    {step.step_name}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: style.color }}>{elapsed(step)}</span>
                    <span style={{ fontSize: '11px', fontWeight: 500, color: style.color }}>
                      {STATUS_LABEL[step.status] ?? step.status}
                    </span>
                  </div>
                </div>
                {step.tool_called && (
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    → {step.tool_called}
                  </div>
                )}
                {step.result_summary && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#475569',
                      marginTop: '4px',
                      fontStyle: 'italic',
                      borderTop: `1px solid ${style.borderColor}`,
                      paddingTop: '4px',
                    }}
                  >
                    {step.result_summary}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
