import React from 'react';
import { Navigate } from 'react-router-dom';

import { useCommercialBillingEnabled } from './useCommercialBilling.js';

/**
 * Gate for pricing/billing/checkout routes.
 *
 * `whenDisabled="redirect"` (default) — hide payment surfaces when billing is off or unreachable.
 * `whenDisabled="render"` — still mount the page (stub/disconnected UI); use only for dev demos.
 */
export function CommercialBillingGate({
  children,
  redirectTo = '/',
  fetchPublicConfig,
  whenDisabled = 'redirect',
}) {
  const { connected, configError, loading } = useCommercialBillingEnabled({ fetchPublicConfig });

  if (loading) {
    return <p style={{ textAlign: 'center', padding: '2rem' }}>Loading…</p>;
  }

  if (whenDisabled === 'redirect' && configError) {
    return <Navigate to={redirectTo} replace />;
  }

  if (whenDisabled === 'redirect' && !connected) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
