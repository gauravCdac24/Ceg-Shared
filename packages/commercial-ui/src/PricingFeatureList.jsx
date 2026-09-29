import React from 'react';

export function PricingFeatureList({ items, compact = false }) {
  if (!items?.length) {
    return <p className="plan-desc">Loading plan features…</p>;
  }

  return (
    <ul className={compact ? 'pricing-feature-list pricing-feature-list--compact' : undefined}>
      {items.map((item) => (
        <li key={item.key}>
          {item.included ? <CheckIcon /> : <CrossIcon />}
          <span className={item.included ? undefined : 'pricing-feature-label--excluded'}>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

function CheckIcon() {
  return (
    <span className="check" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}

function CrossIcon() {
  return (
    <span className="cross" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </span>
  );
}
