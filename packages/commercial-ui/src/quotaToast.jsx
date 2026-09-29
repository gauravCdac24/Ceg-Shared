import * as React from 'react';
import { UpgradeBanner } from './UpgradeBanner.jsx';
import {
  isQuotaLimitError,
  markQuotaLimitError,
  isMarkedQuotaLimitError,
  resolveQuotaCopy,
  readMessage,
  readMetric,
} from './quotaErrors.js';
import './commercial.css';

const COOLDOWN_MS = 3500;
let lastShownAt = 0;
let activeToastId = null;

function navigateTo(path, basePath = '') {
  if (typeof window === 'undefined' || !path) return;
  const base = String(basePath || '').replace(/\/$/, '');
  const target = path.startsWith('/') ? `${base}${path}` : path;
  window.location.assign(target);
}

function shouldThrottle() {
  return Date.now() - lastShownAt < COOLDOWN_MS;
}

/**
 * Present the animated upgrade banner through the host app's toast system.
 *
 * @param {object} opts
 * @param {string} opts.product - cert_studio | quizforge | fetchdesk | workshopos | ceg_portal
 * @param {unknown} [opts.error]
 * @param {string} [opts.description]
 * @param {string} [opts.upgradePath]
 * @param {boolean} [opts.paymentsEnabled=true] - when false, banner dismisses (no checkout)
 * @param {(render: () => React.ReactNode) => string|number} opts.present
 * @param {(id?: string|number) => void} opts.dismiss
 */
export function showQuotaLimitToast({
  product,
  error,
  description,
  upgradePath,
  basePath = '',
  paymentsEnabled = true,
  present,
  dismiss,
}) {
  if (shouldThrottle()) return activeToastId;

  const copy = resolveQuotaCopy(product, {
    description,
    message: readMessage(error),
    upgradePath,
    metric: readMetric(error),
  });

  const paymentsOn = paymentsEnabled !== false;

  const handleUpgrade = () => {
    dismiss(activeToastId);
    if (paymentsOn) navigateTo(copy.upgradePath, basePath);
  };

  const handleClose = () => {
    dismiss(activeToastId);
  };

  activeToastId = present(() => (
    <UpgradeBanner
      buttonText={paymentsOn ? copy.buttonText : 'Got it'}
      description={copy.description}
      onClick={handleUpgrade}
      onClose={handleClose}
    />
  ));

  lastShownAt = Date.now();
  if (error) markQuotaLimitError(error);
  return activeToastId;
}

/** Returns true when a quota banner was shown. */
export function maybeShowQuotaLimitToast(options) {
  const { error } = options;
  if (!isQuotaLimitError(error)) return false;
  showQuotaLimitToast(options);
  return true;
}

/** Sonner adapter */
export function showQuotaLimitSonner(toast, options) {
  return showQuotaLimitToast({
    ...options,
    present: (render) =>
      toast.custom(render, {
        duration: 12000,
        className: 'ceg-quota-sonner',
        unstyled: true,
      }),
    dismiss: (id) => toast.dismiss(id),
  });
}

/** react-hot-toast adapter */
export function showQuotaLimitHotToast(toast, options) {
  return showQuotaLimitToast({
    ...options,
    present: (render) =>
      toast.custom(render, {
        duration: 12000,
        className: 'ceg-quota-hot-toast',
      }),
    dismiss: (id) => toast.dismiss(id),
  });
}

/** react-toastify adapter */
export function showQuotaLimitToastify(toast, options) {
  return showQuotaLimitToast({
    ...options,
    present: (render) =>
      toast(render, {
        autoClose: 12000,
        closeButton: false,
        className: 'ceg-quota-toastify',
        icon: false,
        progressClassName: 'ceg-quota-toastify__progress',
      }),
    dismiss: () => toast.dismiss(),
  });
}

export { isQuotaLimitError, isMarkedQuotaLimitError, markQuotaLimitError, resolveQuotaCopy };
