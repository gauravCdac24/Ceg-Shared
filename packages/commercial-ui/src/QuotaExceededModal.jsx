import React from 'react';
import { Link } from 'react-router-dom';

export function QuotaExceededModal({ open, metric, onClose, resetsAt, paymentsEnabled = true }) {
  if (!open) return null;
  return (
    <div className="quota-modal-backdrop" role="dialog" aria-modal="true">
      <div className="quota-modal">
        <h2>Quota exceeded</h2>
        <p>You have reached your {metric?.replace(/_/g, ' ')} limit for this period.</p>
        {resetsAt ? <p>Resets on {resetsAt}</p> : null}
        <div className="quota-modal-actions">
          {paymentsEnabled ? (
            <Link to="/billing/upgrade" className="btn btn-primary">
              Upgrade plan
            </Link>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
