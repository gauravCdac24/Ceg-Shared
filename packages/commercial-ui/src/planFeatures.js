import { FEATURE_DISPLAY_NAMES, QUOTA_DISPLAY_NAMES } from './constants.js';

const BUNDLE_PREFIXES = [
  ['cert_studio', 'Cert Studio'],
  ['quizforge', 'QuizForge'],
  ['fetchdesk', 'FetchDesk'],
  ['workshopos', 'WorkshopOS'],
];

function humanizeKey(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveFeatureLabel(flag) {
  if (FEATURE_DISPLAY_NAMES[flag]) return FEATURE_DISPLAY_NAMES[flag];
  for (const [prefix, productLabel] of BUNDLE_PREFIXES) {
    const p = `${prefix}_`;
    if (flag.startsWith(p)) {
      const base = flag.slice(p.length);
      return `${productLabel}: ${FEATURE_DISPLAY_NAMES[base] || humanizeKey(base)}`;
    }
  }
  return humanizeKey(flag);
}

function resolveQuotaLabel(metric) {
  if (QUOTA_DISPLAY_NAMES[metric]) return QUOTA_DISPLAY_NAMES[metric];
  for (const [prefix, productLabel] of BUNDLE_PREFIXES) {
    const p = `${prefix}_`;
    if (metric.startsWith(p)) {
      const base = metric.slice(p.length);
      return `${productLabel}: ${QUOTA_DISPLAY_NAMES[base] || humanizeKey(base)}`;
    }
  }
  return humanizeKey(metric);
}

function formatQuotaValue(metric, value) {
  if (value === -1) return 'Unlimited';
  if (metric.includes('gb')) return `${value} GB`;
  if (metric.includes('daily')) return `${Number(value).toLocaleString('en-IN')} / day`;
  if (metric.includes('monthly')) return `${Number(value).toLocaleString('en-IN')} / month`;
  return Number(value).toLocaleString('en-IN');
}

/**
 * @typedef {{ key: string, label: string, included: boolean, kind: 'feature' | 'quota' }} PlanComparisonItem
 */

/**
 * All feature flags and quotas for a tier with included/excluded state (for pricing grids).
 * @param {object|null|undefined} plan
 * @param {string} [tierOverride]
 * @returns {PlanComparisonItem[]}
 */
export function planComparisonForTier(plan, tierOverride) {
  if (!plan) return [];
  const tier = String(tierOverride || plan.tier || 'free').toLowerCase();
  /** @type {PlanComparisonItem[]} */
  const items = [];

  const features = plan.features || {};
  for (const [flag, tierMap] of Object.entries(features)) {
    if (!tierMap || typeof tierMap !== 'object') continue;
    items.push({
      key: `f:${flag}`,
      label: resolveFeatureLabel(flag),
      included: Boolean(tierMap[tier]),
      kind: 'feature',
    });
  }

  const quotas = plan.quotas || {};
  for (const [metric, tierMap] of Object.entries(quotas)) {
    if (!tierMap || typeof tierMap !== 'object' || !(tier in tierMap)) continue;
    const val = tierMap[tier];
    const label = resolveQuotaLabel(metric);
    const hasAccess = val === -1 || (typeof val === 'number' && val > 0);
    items.push({
      key: `q:${metric}`,
      label: hasAccess ? `${label}: ${formatQuotaValue(metric, val)}` : label,
      included: hasAccess,
      kind: 'quota',
    });
  }

  items.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'feature' ? -1 : 1;
    if (a.included !== b.included) return a.included ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

  return items;
}


/**
 * Build human-readable feature + quota lines for a plan tier from API plan metadata.
 * @param {object|null|undefined} plan
 * @param {string} [tierOverride]
 * @returns {string[]}
 */
export function planFeaturesForTier(plan, tierOverride) {
  return planComparisonForTier(plan, tierOverride)
    .filter((item) => item.included)
    .map((item) => item.label);
}

/** @deprecated use planFeaturesForTier */
export function featureListFromPlan(plan, tierOverride) {
  return planFeaturesForTier(plan, tierOverride);
}
