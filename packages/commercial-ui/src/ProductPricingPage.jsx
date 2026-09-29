import React, { useCallback, useEffect, useRef, useState } from 'react';

import { commercialNavigate } from './commercialNavigate.js';

import { formatInrFromPaise, ORG_TYPES } from './constants.js';
import { PaymentModal } from './PaymentModal.jsx';
import { PlanCheckoutReceipt } from './PlanCheckoutReceipt.jsx';
import { planComparisonForTier } from './planFeatures.js';
import { PricingFeatureList } from './PricingFeatureList.jsx';
import { planWithSpecs } from './productSpecs.js';
import { markPendingPlanSelection, PAID_TIERS, savePricingIntent } from './pricingIntent.js';

import './commercial.css';

/**
 * Public pricing + upgrade flow for standalone products (Pricing1 layout).
 * Three connected columns: Free trial, Pro/Public org, Government waiver.
 */
export function ProductPricingPage({
  product,
  productLabel,
  orgType = 'individual',
  onOrgTypeChange,
  isAuthenticated = false,
  loginHref = '/login',
  registerHref = '/register',
  registerPlanHref = '/register/plan',
  billingHref = '/billing',
  waiverHref = '/pricing/waiver',
  fetchPublicPlans,
  startTrial,
  createCheckoutOrder,
  verifyCheckoutPayment,
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

  const freePlan = plans.find((p) => {
    const tier = String(p.tier || '').toLowerCase();
    return tier === 'free' || tier === 'trial';
  });
  const paidPlans = plans.filter((p) => PAID_TIERS.includes(String(p.tier || '').toLowerCase()));
  const professionalPlan = paidPlans.find((p) => p.tier === 'professional') || paidPlans[0];
  const govPlan = plans.find((p) => String(p.tier || '').toLowerCase() === 'government');

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

  const goHref = (href) => {
    commercialNavigate(href);
  };

  const goRegister = (intent) => {
    savePricingIntent({ product, org_type: orgType, billing_cycle: billingCycle, ...intent });
    goHref(registerHref);
  };

  const handleFreeTrialStart = async () => {
    if (!freePlan) return;
    if (!isAuthenticated) {
      goRegister({ intent: 'free_trial', plan_id: freePlan.id });
      return;
    }
    if (!startTrial) return;
    try {
      await startTrial({ product, plan_id: freePlan.id, org_type: orgType });
      window.location.href = billingHref;
    } catch (e) {
      setError(e?.message || 'Could not start trial');
    }
  };

  const handleProGetStarted = () => {
    const defaultPaid = professionalPlan || paidPlans[0];
    if (!defaultPaid) return;
    if (!isAuthenticated) {
      markPendingPlanSelection(product);
      goRegister({ intent: 'paid', plan_id: defaultPaid.id });
      return;
    }
    openCheckout(defaultPaid);
  };

  const handleGovGetStarted = () => {
    goHref(waiverHref);
  };

  const proceedCheckout = async () => {
    if (!termsAccepted || !scrolledTerms) {
      setError('Scroll through the terms and accept to continue.');
      return;
    }
    if (!isAuthenticated) {
      markPendingPlanSelection(product);
      savePricingIntent({
        product,
        intent: 'paid',
        plan_id: selectedPlan.id,
        org_type: orgType,
        billing_cycle: billingCycle,
      });
      goHref(registerPlanHref || registerHref);
      return;
    }
    const tier = String(selectedPlan?.tier || '').toLowerCase();
    const price = selectedPlan?.monthly_paise ?? 0;
    if (tier === 'free' || price === 0) {
      if (startTrial) {
        try {
          await startTrial({ product, plan_id: selectedPlan.id, org_type: orgType });
          setCheckoutOpen(false);
          window.location.href = billingHref;
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

  const freeMeta = planWithSpecs(freePlan, product);
  const proMeta = planWithSpecs(professionalPlan || paidPlans[0], product);
  const govMeta = planWithSpecs(govPlan, product);
  const freeComparison = planComparisonForTier(freeMeta, 'free');
  const proComparison = planComparisonForTier(proMeta, 'professional');
  const waiverComparison = planComparisonForTier(govMeta, 'government');

  const proPriceLabel = professionalPlan
    ? formatInrFromPaise(professionalPlan.monthly_paise)
    : paidPlans[0]
      ? formatInrFromPaise(paidPlans[0].monthly_paise)
      : '—';

  return (
    <div className="product-pricing-page">
      <header className="product-pricing-header">
        <h1>Simple and transparent pricing</h1>
        <p>
          {productLabel || product} plans in INR incl. GST. Start with a free trial, upgrade when you are ready, or
          apply for a government waiver.
        </p>
        {onOrgTypeChange ? (
          <label style={{ marginTop: 16, display: 'inline-block', fontSize: '0.875rem' }}>
            Organization type{' '}
            <select value={orgType} onChange={(e) => onOrgTypeChange(e.target.value)}>
              {ORG_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </header>

      {loading ? <p style={{ textAlign: 'center' }}>Loading plans…</p> : null}
      {error && !checkoutOpen ? <p className="payment-error" style={{ textAlign: 'center' }}>{error}</p> : null}

      <div className="product-pricing-grid pricing1-grid">
        <article className="pricing-tier-card">
          <h2>{freePlan?.name || 'Free trial'}</h2>
          <p className="plan-desc">
            {freePlan?.description ||
              '14-day trial on free quotas. Every feature and limit for this product is listed below with ✓ or ✗.'}
          </p>
          <p className="price-row">
            <span className="price">Free</span>
          </p>
          <hr />
          <PricingFeatureList items={freeComparison} />
          <hr />
          <button type="button" className="btn btn-primary" onClick={() => void handleFreeTrialStart()} disabled={!freePlan}>
            Get started
          </button>
        </article>

        <article className="pricing-tier-card pricing-tier-card--featured">
          <h2>
            {professionalPlan?.name || paidPlans[0]?.name || 'Pro / Public org'}
            <span className="popular-badge"> · most popular</span>
          </h2>
          <p className="plan-desc">
            {professionalPlan?.description ||
              paidPlans[0]?.description ||
              'Starter and Professional tiers at checkout. Full ✓/✗ comparison vs Free below (Professional limits shown).'}
          </p>
          {paidPlans.some((p) => p.tier === 'starter') ? (
            <p className="plan-desc plan-desc--hint">Also available: Starter plan with lower limits — select at checkout.</p>
          ) : null}
          <p className="price-row">
            <span className="price">{proPriceLabel}</span>
            {proPriceLabel !== '—' ? ' / month' : null}
          </p>
          <hr />
          <PricingFeatureList items={proComparison} />
          <hr />
          <button type="button" className="btn btn-primary" onClick={handleProGetStarted} disabled={!paidPlans.length}>
            Get started
          </button>
        </article>

        <article className="pricing-tier-card pricing-tier-card--waiver">
          <h2>{govPlan?.name || 'Government waiver'}</h2>
          <p className="plan-desc">
            {govPlan?.description || 'Central/State government and public-sector orgs may apply for subsidised access.'}
          </p>
          <p className="price-row">
            <span className="price">Subsidised</span>
          </p>
          <hr />
          {waiverComparison.length ? (
            <PricingFeatureList items={waiverComparison} />
          ) : (
            <ul>
              <li>
                <CheckIcon />
                <span>Subsidised or waived pricing after review</span>
              </li>
              <li>
                <CheckIcon />
                <span>Organisation details verified during onboarding</span>
              </li>
            </ul>
          )}
          <hr />
          <button type="button" className="btn btn-secondary" onClick={handleGovGetStarted}>
            Get started
          </button>
        </article>
      </div>

      <PlanCheckoutReceipt
        open={checkoutOpen && Boolean(selectedPlan)}
        onClose={() => setCheckoutOpen(false)}
        product={product}
        productLabel={productLabel}
        heading="Choose a plan"
        description="Select Starter, Professional, or Enterprise. Prices are monthly in INR incl. GST. Each plan’s full feature list is shown after you pick a tier."
        planPicker={
          <div className="plan-picker-row">
            {paidPlans.map((plan) => {
              const active = selectedPlan?.id === plan.id;
              const price = plan.monthly_paise;
              return (
                <button
                  key={plan.id || plan.tier}
                  type="button"
                  className={`plan-picker-option${active ? ' active' : ''}`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <strong>{plan.name || plan.tier}</strong>
                  <span>{price < 0 ? 'Contact sales' : `${formatInrFromPaise(price)} / mo`}</span>
                </button>
              );
            })}
          </div>
        }
        features={
          selectedPlan ? (
            <div className="plan-checkout-features">
              <p>Plan includes:</p>
              <PricingFeatureList
                items={planComparisonForTier(planWithSpecs(selectedPlan, product), selectedPlan.tier)}
                compact
              />
            </div>
          ) : null
        }
        priceLine={
          selectedPlan
            ? `${formatInrFromPaise(selectedPlan.monthly_paise)} / month — ${selectedPlan.name || selectedPlan.tier}`
            : undefined
        }
        scrollRef={scrollRef}
        onTermsScroll={handleTermsScroll}
        scrolledTerms={scrolledTerms}
        termsAccepted={termsAccepted}
        onTermsAcceptedChange={setTermsAccepted}
        error={error}
        primaryLabel={
          selectedPlan?.monthly_paise < 0
            ? 'Contact sales'
            : isAuthenticated
              ? 'Continue to payment'
              : 'Continue to register'
        }
        primaryDisabled={selectedPlan?.monthly_paise < 0}
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
        onSuccess={() => {
          window.location.href = billingHref;
        }}
      />
    </div>
  );
}

