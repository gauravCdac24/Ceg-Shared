import React, { useCallback, useEffect, useRef, useState } from 'react';
import { formatInrFromPaise } from './constants.js';
import { planComparisonForTier } from './planFeatures.js';
import { PaymentModal } from './PaymentModal.jsx';
import { PlanCheckoutReceipt } from './PlanCheckoutReceipt.jsx';
import { PricingFeatureList } from './PricingFeatureList.jsx';
import { planWithSpecs } from './productSpecs.js';
import {
  clearPendingPlanSelection,
  clearPricingIntent,
  PAID_TIERS,
  readPricingIntent,
} from './pricingIntent.js';
import './commercial.css';

/**
 * Skippable plan selection after direct registration (no pricing intent).
 * Paid pricing intent continues to checkout automatically.
 */
export function PostRegistrationPlanStep({
  product,
  productLabel,
  orgType = 'individual',
  billingHref = '/billing',
  dashboardHref = '/dashboard',
  fetchPublicPlans,
  startTrial,
  createCheckoutOrder,
  verifyCheckoutPayment,
  onComplete,
}) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [scrolledTerms, setScrolledTerms] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [error, setError] = useState('');
  const [skipping, setSkipping] = useState(false);
  const scrollRef = useRef(null);
  const billingCycle = 'monthly';

  const loadPlans = useCallback(async () => {
    if (!fetchPublicPlans) return;
    setLoading(true);
    try {
      const res = await fetchPublicPlans(product, orgType);
      setPlans(res?.data?.plans || res?.plans || []);
    } finally {
      setLoading(false);
    }
  }, [fetchPublicPlans, product, orgType]);

  useEffect(() => {
    loadPlans().catch(() => setLoading(false));
  }, [loadPlans]);

  const freePlan = plans.find((p) => p.tier === 'free' || p.tier === 'trial');
  const paidPlans = plans.filter((p) => PAID_TIERS.includes(String(p.tier || '').toLowerCase()));

  const finish = (href) => {
    clearPendingPlanSelection();
    clearPricingIntent();
    if (onComplete) onComplete(href);
    else window.location.href = href;
  };

  const handleSkip = async () => {
    if (!freePlan || !startTrial) {
      finish(dashboardHref);
      return;
    }
    setSkipping(true);
    setError('');
    try {
      await startTrial({ product, plan_id: freePlan.id, org_type: orgType });
      finish(billingHref);
    } catch (e) {
      setError(e?.message || 'Could not start free trial');
    } finally {
      setSkipping(false);
    }
  };

  const openCheckout = (plan) => {
    setSelectedPlan(plan);
    setCheckoutOpen(true);
    setTermsAccepted(false);
    setScrolledTerms(false);
    setError('');
  };

  const handleTermsScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      setScrolledTerms(true);
    }
  };

  const proceedCheckout = async () => {
    if (!termsAccepted || !scrolledTerms) {
      setError('Scroll through the terms and accept to continue.');
      return;
    }
    const tier = String(selectedPlan?.tier || '').toLowerCase();
    const price = selectedPlan?.monthly_paise ?? 0;
    if (tier === 'free' || price === 0) {
      if (startTrial) {
        try {
          await startTrial({ product, plan_id: selectedPlan.id, org_type: orgType });
          setCheckoutOpen(false);
          finish(billingHref);
        } catch (e) {
          setError(e?.message || 'Could not start trial');
        }
      }
      return;
    }
    if (price < 0) {
      setError('Contact sales for Enterprise pricing.');
      return;
    }
    if (!createCheckoutOrder) {
      setError('Payment is not configured for this deployment.');
      return;
    }
    try {
      const res = await createCheckoutOrder({
        plan_id: selectedPlan.id,
        billing_cycle: billingCycle,
        org_type: orgType,
        include_upi_qr: true,
      });
      const order = res?.data || res;
      setPaymentOrder(order);
      setPaymentOpen(true);
      setCheckoutOpen(false);
    } catch (e) {
      setError(e?.message || 'Checkout unavailable');
    }
  };

  useEffect(() => {
    const intent = readPricingIntent();
    if (!intent || intent.product !== product || intent.intent !== 'paid' || !intent.plan_id) return;
    if (!plans.length) return;
    const plan = plans.find((p) => p.id === intent.plan_id);
    if (plan) openCheckout(plan);
  }, [plans, product]);

  return (
    <div className="product-pricing-page post-registration-plan-step">
      <header className="product-pricing-header">
        <h1>Choose your plan</h1>
        <p>
          Select a paid plan for {productLabel || product}, or skip to start on the free trial with core quotas.
        </p>
      </header>

      {loading ? <p style={{ textAlign: 'center' }}>Loading plans…</p> : null}

      <div className="product-pricing-grid plan-selection-grid">
        {paidPlans.map((plan) => {
          const popular = plan.tier === 'professional';
          const price = plan.monthly_paise;
          const comparison = planComparisonForTier(planWithSpecs(plan, product), plan.tier);
          const priceLabel = price < 0 ? 'Custom' : formatInrFromPaise(price);

          return (
            <article key={plan.id || plan.tier} className={popular ? 'pricing-tier-card popular' : 'pricing-tier-card'}>
              <h2>
                {plan.name || plan.tier}
                {popular ? <span className="popular-badge"> · most popular</span> : null}
              </h2>
              <p className="plan-desc">
                {plan.description ||
                  'Full feature and quota list for this tier — ✓ included, ✗ not included vs higher tiers.'}
              </p>
              <p className="price-row">
                <span className="price">{priceLabel}</span>
                {price >= 0 ? ' / month' : null}
              </p>
              <hr />
              <PricingFeatureList items={comparison} />
              <hr />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openCheckout(plan)}
                disabled={price < 0}
              >
                {price < 0 ? 'Contact sales' : 'Continue to payment'}
              </button>
            </article>
          );
        })}
      </div>

      <div className="plan-selection-skip">
        <button type="button" className="btn btn-secondary" onClick={() => void handleSkip()} disabled={skipping}>
          {skipping ? 'Starting free trial…' : 'Skip — use free trial'}
        </button>
        {error ? <p className="payment-error">{error}</p> : null}
      </div>

      <PlanCheckoutReceipt
        open={checkoutOpen && Boolean(selectedPlan)}
        onClose={() => setCheckoutOpen(false)}
        product={product}
        productLabel={productLabel}
        heading={selectedPlan?.name || selectedPlan?.tier}
        priceLine={
          selectedPlan
            ? `${formatInrFromPaise(selectedPlan.monthly_paise)} / month`
            : undefined
        }
        scrollRef={scrollRef}
        onTermsScroll={handleTermsScroll}
        scrolledTerms={scrolledTerms}
        termsAccepted={termsAccepted}
        onTermsAcceptedChange={setTermsAccepted}
        error={error}
        onPrimary={() => void proceedCheckout()}
      />

      <PaymentModal
        open={paymentOpen}
        order={paymentOrder}
        planName={selectedPlan?.name}
        billingCycle={billingCycle}
        productLabel={productLabel}
        onClose={() => {
          setPaymentOpen(false);
          setPaymentOrder(null);
        }}
        onVerify={
          verifyCheckoutPayment
            ? async (payload) => {
                await verifyCheckoutPayment({
                  ...payload,
                  plan_id: selectedPlan.id,
                  billing_cycle: billingCycle,
                });
              }
            : undefined
        }
        onSuccess={() => finish(billingHref)}
      />
    </div>
  );
}
