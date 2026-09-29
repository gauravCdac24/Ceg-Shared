import React, { useMemo, useState } from 'react';

import { Link as RouterLink } from 'react-router-dom';

import { formatInrFromPaise } from './constants.js';

import { planComparisonForTier } from './planFeatures.js';

import { PricingFeatureList } from './PricingFeatureList.jsx';

import { planWithSpecs } from './productSpecs.js';



const TOP_FEATURES = 5;



function UsageBar({ label, used, limit, unlimited }) {

  const isUnlimited = unlimited || limit < 0;

  const pct = !isUnlimited && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  const variant = isUnlimited ? 'ok' : pct >= 100 ? 'error' : pct >= 90 ? 'warning' : pct >= 70 ? 'caution' : 'ok';

  return (

    <div className={`usage-row usage-${variant}`}>

      <span className="usage-label">{label}</span>

      <div className="usage-track" aria-hidden>

        <div className="usage-fill" style={{ width: isUnlimited ? '0%' : `${pct}%` }} />

      </div>

      <span className="usage-stat">

        {used} / {isUnlimited ? '∞' : limit}

        {!isUnlimited ? ` (${pct}%)` : ''}

      </span>

    </div>

  );

}



function humanMetric(key) {

  return String(key)

    .replace(/_/g, ' ')

    .replace(/\b\w/g, (c) => c.toUpperCase());

}



function DisconnectedIcon() {

  return (

    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>

      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" />

      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" />

      <line x1="2" y1="2" x2="22" y2="22" strokeLinecap="round" />

    </svg>

  );

}



export function BillingDashboard({

  subscription,

  usage = {},

  invoices = [],

  plans = [],

  product,

  onUpgrade,

  platformOwnerUnlimited = false,

  commercialConnected = true,

  embedded = false,

  pricingHref = '/pricing',

  waiverHref = '/pricing/waiver',

  /** Pass app Router Link when monorepo dedupe is insufficient */
  LinkComponent,

}) {

  const Link = LinkComponent || RouterLink;

  const [entitlementsExpanded, setEntitlementsExpanded] = useState(false);

  const sub = subscription || {};

  const unlimited = platformOwnerUnlimited || sub.plan_tier === 'unlimited' || sub.platform_owner_unlimited;

  const tier = String(unlimited ? 'unlimited' : sub.tier || 'free').toLowerCase();

  const tierLabel = unlimited ? 'Full access' : sub.name || sub.tier || 'Free';

  const productLabel = String(product || 'app').replace(/_/g, ' ');



  const currentPlan = useMemo(

    () => planWithSpecs(plans.find((p) => String(p.tier || '').toLowerCase() === tier) || { tier }, product),

    [plans, tier, product],

  );



  const featureComparison = useMemo(() => planComparisonForTier(currentPlan, tier), [currentPlan, tier]);

  const includedFeatures = featureComparison.filter((i) => i.included);

  const visibleFeatures = entitlementsExpanded ? includedFeatures : includedFeatures.slice(0, TOP_FEATURES);

  const hiddenCount = Math.max(0, includedFeatures.length - TOP_FEATURES);



  const usageEntries = Object.entries(usage || {});



  return (

    <div className={`billing-dashboard${embedded ? ' billing-dashboard--embedded' : ''}`}>

      <article className="billing-glass-shell">

        {!embedded ? (
        <header className="billing-glass-header">

          <div className="billing-glass-header__copy">

            <h2 className="billing-title">Current plan</h2>

            <p className="billing-subtitle">

              Track usage against plan limits and review what&apos;s included.

            </p>

          </div>

          <div className="billing-glass-header__badges">

            <span className={`billing-tier-pill billing-tier-pill--${tier}`}>{tierLabel}</span>

          </div>

        </header>
        ) : (
        <div className="billing-glass-header billing-glass-header--embedded">
          <div className="billing-glass-header__badges">
            <span className={`billing-tier-pill billing-tier-pill--${tier}`}>{tierLabel}</span>
          </div>
        </div>
        )}



        {!commercialConnected ? (

          <div className="billing-disconnected-notice" role="status">

            <DisconnectedIcon />

            <div>

              <strong>Commercial billing not connected</strong>

              <p>

                Checkout and live invoices require a CeG Portal commercial backend. Your local plan, usage, and

                entitlements below still reflect this deployment.

              </p>

            </div>

          </div>

        ) : null}



        {unlimited ? (

          <div className="billing-platform-inline" role="status">

            <strong>Full quotas</strong>

            <p>Your organisation has no usage caps on this deployment.</p>

          </div>

        ) : null}



        <div className="billing-glass-grid">

          <section className="billing-glass-panel">

            <h2 className="billing-panel-title">Usage this month</h2>

            {usageEntries.length === 0 ? (

              <p className="billing-empty">No metered usage recorded yet for this billing period.</p>

            ) : (

              usageEntries.map(([metric, row]) => (

                <UsageBar

                  key={metric}

                  label={humanMetric(metric)}

                  used={row.used_monthly ?? 0}

                  limit={row.limit ?? 0}

                  unlimited={unlimited || row.unlimited}

                />

              ))

            )}



            {includedFeatures.length > 0 ? (

              <div className="billing-entitlements-block">

                <div className="billing-card-head">

                  <h3>Included features</h3>

                  <span className="billing-meta">{includedFeatures.length} active</span>

                </div>

                <PricingFeatureList items={visibleFeatures} compact />

                {hiddenCount > 0 ? (

                  <button

                    type="button"

                    className="btn btn-ghost btn-sm billing-expand-btn"

                    onClick={() => setEntitlementsExpanded((v) => !v)}

                    aria-expanded={entitlementsExpanded}

                  >

                    {entitlementsExpanded ? 'Show fewer' : `Show ${hiddenCount} more`}

                  </button>

                ) : null}

              </div>

            ) : null}

          </section>



          <section className="billing-glass-panel billing-glass-panel--plan">

            <div className="billing-card-head">

              <h2 className="billing-panel-title">Current plan</h2>

            </div>

            <p className="billing-plan-price">

              {sub.monthly_paise != null && sub.monthly_paise > 0

                ? `${formatInrFromPaise(sub.monthly_paise)} / month`

                : tier === 'free' || tier === 'trial'

                  ? 'Free tier'

                  : 'Included in your organisation'}

            </p>

            {sub.trial_end ? <p className="billing-meta">Trial ends {sub.trial_end}</p> : null}



            {includedFeatures.length > 0 ? (

              <ul className="billing-plan-highlights">

                {includedFeatures.slice(0, 4).map((item) => (

                  <li key={item.key}>{item.label}</li>

                ))}

              </ul>

            ) : null}



            <div className="billing-card-actions">

              {!unlimited && commercialConnected ? (

                <>

                  <button type="button" className="btn btn-primary" onClick={onUpgrade}>

                    Upgrade plan

                  </button>

                  <Link to={pricingHref} className="btn btn-secondary">

                    Compare plans

                  </Link>

                </>

              ) : !unlimited ? (

                <Link to={pricingHref} className="btn btn-secondary">

                  View plan options

                </Link>

              ) : null}

            </div>



            <div className="billing-invoices-block">

              <h3>Invoice history</h3>

              {invoices.length === 0 ? (

                <p className="billing-empty">

                  {commercialConnected

                    ? 'No invoices yet. Paid subscriptions will appear here after checkout.'

                    : 'Invoices will appear here once commercial billing is connected.'}

                </p>

              ) : (

                <ul className="billing-invoice-list">

                  {invoices.map((inv) => (

                    <li key={inv.id}>

                      <span>{inv.invoice_number || inv.id}</span>

                      <span>{formatInrFromPaise(inv.amount_paise)}</span>

                      {inv.invoice_url ? (

                        <a href={inv.invoice_url} target="_blank" rel="noreferrer">

                          Download

                        </a>

                      ) : null}

                    </li>

                  ))}

                </ul>

              )}

            </div>



            <div className="billing-waiver-inline">

              <div>

                <h3>Government organisation?</h3>

                <p className="billing-meta">Apply for subsidised or waived pricing for public-sector teams.</p>

              </div>

              <Link to={waiverHref} className="btn btn-outline">

                Apply for waiver

              </Link>

            </div>

          </section>

        </div>

      </article>

    </div>

  );

}


