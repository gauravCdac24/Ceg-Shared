const STORAGE_KEY = 'ceg_commercial_pricing_intent';
const PENDING_PLAN_KEY = 'ceg_commercial_pending_plan_selection';

/** @typedef {{ product: string, intent: 'free_trial'|'paid', plan_id?: string, billing_cycle?: string, org_type?: string }} PricingIntent */

export function readPricingIntent() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** @param {PricingIntent|null|undefined} intent */
export function savePricingIntent(intent) {
  if (typeof sessionStorage === 'undefined' || !intent) return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
}

export function clearPricingIntent() {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function markPendingPlanSelection(product) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(PENDING_PLAN_KEY, product);
}

export function readPendingPlanSelection() {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem(PENDING_PLAN_KEY);
}

export function clearPendingPlanSelection() {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(PENDING_PLAN_KEY);
}

/**
 * After login, decide where to send the user for commercial onboarding.
 * @returns {string|null} path to navigate, or null for default dashboard flow
 */
export function resolvePostLoginCommercialPath({
  product,
  billingHref = '/billing',
  planSelectionHref = '/register/plan',
}) {
  const intent = readPricingIntent();
  if (intent?.product === product && intent.intent === 'paid' && intent.plan_id) {
    return planSelectionHref;
  }
  if (readPendingPlanSelection() === product) {
    return planSelectionHref;
  }
  return null;
}

/**
 * If user arrived from pricing with a free-trial intent, start trial and return billing href.
 * @returns {Promise<string|null>} billing href when trial started, else null
 */
export async function fulfillFreeTrialIntentOnLogin({
  product,
  orgType = 'individual',
  billingHref = '/billing',
  startTrial,
}) {
  const intent = readPricingIntent();
  if (!intent || intent.product !== product || intent.intent !== 'free_trial' || !intent.plan_id) {
    return null;
  }
  if (!startTrial) {
    clearPricingIntent();
    return billingHref;
  }
  await startTrial({
    product,
    plan_id: intent.plan_id,
    org_type: intent.org_type || orgType,
  });
  clearPricingIntent();
  clearPendingPlanSelection();
  return billingHref;
}

export const PAID_TIERS = ['starter', 'professional', 'enterprise'];
