import React from 'react';
import { Link } from 'react-router-dom';
import { FEATURE_DISPLAY_NAMES } from './constants.js';

export function UpgradeWall({
  feature,
  requiredPlan = 'Professional',
  children,
  fallback,
  hasFeature,
  isLoading,
  isGovernmentOrg = false,
  paymentsEnabled = true,
}) {
  if (isLoading) {
    return <div className="upgrade-gate-loading" aria-busy="true">Loading…</div>;
  }

  if (hasFeature) return children;

  if (fallback) return fallback;

  return (
    <div className="upgrade-gate-card" role="region" aria-label="Upgrade required">
      <div className="upgrade-gate-icon" aria-hidden>
        ✨
      </div>
      <h3>Unlock {FEATURE_DISPLAY_NAMES[feature] || feature}</h3>
      <p>
        {paymentsEnabled
          ? `This feature is available on the ${requiredPlan} plan and above.`
          : 'This feature is limited on this deployment. Usage limits still apply.'}
      </p>
      {paymentsEnabled ? (
        <>
          {isGovernmentOrg ? (
            <Link to="/pricing/waiver" className="btn btn-secondary">
              Apply for government waiver
            </Link>
          ) : (
            <Link to="/billing/upgrade" className="btn btn-primary">
              Upgrade to {requiredPlan}
            </Link>
          )}
          <Link to="/pricing" className="learn-more">
            View all plans →
          </Link>
        </>
      ) : null}
    </div>
  );
}
