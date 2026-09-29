import React from 'react';
import { Link } from 'react-router-dom';
import { formatInrFromPaise } from './constants.js';

export function PlanComparisonDrawer({ open, onClose, plans = [], currentTier, billingCycle, onSelectPlan }) {
  if (!open) return null;
  return (
    <aside className="plan-drawer" aria-label="Plan comparison">
      <header>
        <h2>Choose your plan</h2>
        <button type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>
      <div className="plan-drawer-grid">
        {plans.map((plan) => {
          const price = billingCycle === 'annual' ? plan.annual_paise : plan.monthly_paise;
          const isCurrent = plan.tier === currentTier;
          return (
            <article key={plan.id || plan.tier} className={isCurrent ? 'plan-card current' : 'plan-card'}>
              <h3>{plan.name || plan.tier}</h3>
              <p className="plan-price">{formatInrFromPaise(price)}</p>
              <button
                type="button"
                disabled={isCurrent || price < 0}
                onClick={() => onSelectPlan?.(plan)}
              >
                {isCurrent ? 'Current' : price < 0 ? 'Contact sales' : 'Upgrade'}
              </button>
            </article>
          );
        })}
      </div>
    </aside>
  );
}
