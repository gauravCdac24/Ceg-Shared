import { QUOTA_DISPLAY_NAMES } from './constants.js';

/** Per-product default upgrade banner copy and navigation targets. */
export const PRODUCT_QUOTA_UI = {
  cert_studio: {
    buttonText: 'Upgrade plan',
    description: 'for higher certificate limits and bulk generation',
    upgradePath: '/billing',
  },
  quizforge: {
    buttonText: 'Upgrade plan',
    description: 'for more AI questions and live quiz capacity',
    upgradePath: '/billing',
  },
  fetchdesk: {
    buttonText: 'Upgrade plan',
    description: 'for more daily crawls and active sources',
    upgradePath: '/pricing',
  },
  workshopos: {
    buttonText: 'Upgrade plan',
    description: 'for more events, registrations, and bookings',
    upgradePath: '/pricing',
  },
  ceg_portal: {
    buttonText: 'View plans',
    description: 'to raise organisation limits across CeG products',
    upgradePath: '/billing',
  },
};

function readMessage(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (typeof error.message === 'string') return error.message;

  const detail = error.response?.data?.detail ?? error.detail;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object') {
    if (typeof detail.message === 'string') return detail.message;
    if (typeof detail.msg === 'string') return detail.msg;
  }
  return '';
}

function readStatus(error) {
  if (!error) return undefined;
  if (typeof error.status === 'number') return error.status;
  return error.response?.status;
}

function readCode(error) {
  if (!error) return undefined;
  if (typeof error.code === 'string') return error.code;
  const detail = error.response?.data?.detail ?? error.detail;
  if (detail && typeof detail === 'object' && typeof detail.error === 'string') {
    return detail.error;
  }
  return undefined;
}

function readMetric(error) {
  const detail = error?.response?.data?.detail ?? error?.detail;
  if (detail && typeof detail === 'object' && typeof detail.metric === 'string') {
    return detail.metric;
  }
  return undefined;
}

/** Detect plan quota / rate-limit exhaustion (402, quota_exceeded, quota copy). */
export function isQuotaLimitError(error) {
  if (!error) return false;

  const status = readStatus(error);
  const code = readCode(error);
  const message = readMessage(error).toLowerCase();

  if (status === 402 || code === 'quota_exceeded') return true;

  if (status === 429 && /quota|plan limit|rate.?limit.*plan/.test(message)) return true;

  return (
    /quota.*(exceeded|limit|reached)|plan quota|hit your.*quota|manual crawl limit|crawl limit reached|rate_limited/.test(
      message,
    ) || message.includes('402')
  );
}

/** Mark errors so generic error toasts can be skipped when quota banner already shown. */
export function markQuotaLimitError(error) {
  if (error && typeof error === 'object') {
    error.__cegQuotaLimit = true;
  }
  return error;
}

export function isMarkedQuotaLimitError(error) {
  return Boolean(error && typeof error === 'object' && error.__cegQuotaLimit);
}

export function resolveQuotaCopy(product, { description, message, upgradePath, metric } = {}) {
  const base = PRODUCT_QUOTA_UI[product] || PRODUCT_QUOTA_UI.ceg_portal;
  const metricLabel = metric && QUOTA_DISPLAY_NAMES[metric] ? QUOTA_DISPLAY_NAMES[metric] : null;

  let resolvedDescription = description || base.description;
  if (metricLabel && !description) {
    resolvedDescription = `for higher ${metricLabel.toLowerCase()} on your plan`;
  }
  if (message && !description) {
    const trimmed = message.replace(/^plan quota:\s*/i, '').trim();
    if (trimmed.length <= 120) {
      resolvedDescription = trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed;
    }
  }

  return {
    buttonText: base.buttonText,
    description: resolvedDescription,
    upgradePath: upgradePath || base.upgradePath,
  };
}

export { readMessage, readMetric };
