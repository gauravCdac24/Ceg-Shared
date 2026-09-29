import React from 'react';
import { formatInrFromPaise } from './constants.js';
import { ReceiptPrinter } from './ReceiptPrinter.jsx';
import { cn } from './utils/cn.js';

/**
 * Receipt-printer shell for plan selection + terms gate before payment.
 */
export function PlanCheckoutReceipt({
  open,
  onClose,
  productLabel,
  product,
  productLogoSrc,
  homeHref = '/',
  heading,
  description,
  priceLine,
  planPicker,
  features,
  scrollRef,
  onTermsScroll,
  scrolledTerms,
  termsAccepted,
  onTermsAcceptedChange,
  error,
  primaryLabel = 'Continue to payment',
  onPrimary,
  primaryDisabled = false,
  secondaryLabel = 'Cancel',
  onSecondary,
  statusLabel = 'Review terms to continue',
  animate = true,
  feedMotion = 'stepped',
  className,
}) {
  if (!open) return null;

  const handleSecondary = onSecondary ?? onClose;

  return (
    <div className="receipt-checkout-backdrop" role="dialog" aria-modal="true" aria-label="Plan checkout">
      <div className={cn('receipt-checkout-shell receipt-checkout-shell--terms', className)}>
        <ReceiptPrinter.Root
          animate={animate}
          feedMotion={feedMotion}
          stage="processing"
          statusLabels={{
            processing: statusLabel,
            printing: statusLabel,
            complete: statusLabel,
          }}
        >
          <ReceiptPrinter.Machine>
            <ReceiptPrinter.Header>
              {productLogoSrc ? (
                <img alt="" className="receipt-printer-brand-logo" src={productLogoSrc} />
              ) : (
                <span className="receipt-printer-brand-text">{productLabel || product}</span>
              )}
              <ReceiptPrinter.HomeLink href={homeHref} />
            </ReceiptPrinter.Header>

            <ReceiptPrinter.Screen>
              <div className="receipt-checkout-screen-content">
                {heading ? <h3 className="receipt-checkout-heading">{heading}</h3> : null}
                {description ? <p className="receipt-checkout-lead">{description}</p> : null}
                {priceLine ? <p className="receipt-checkout-price">{priceLine}</p> : null}
                {planPicker}
                {features}
                <div
                  ref={scrollRef}
                  className={cn('plan-checkout-scroll-gate', scrolledTerms && 'scrolled')}
                  onScroll={onTermsScroll}
                >
                  <p>
                    By proceeding you agree to the CeG platform Terms of Service, Acceptable Use Policy, and data
                    processing terms for {productLabel || product}. Subscriptions renew monthly unless cancelled.
                    Government waiver applications are reviewed separately and do not require payment.
                  </p>
                  <p>Scroll to the end to enable checkout.</p>
                </div>
                <label className="plan-checkout-terms">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => onTermsAcceptedChange?.(e.target.checked)}
                    disabled={!scrolledTerms}
                  />
                  <span>
                    I accept the{' '}
                    <a href="/terms" target="_blank" rel="noreferrer">
                      terms
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" target="_blank" rel="noreferrer">
                      privacy policy
                    </a>
                  </span>
                </label>
                {error ? <p className="payment-error">{error}</p> : null}
                <div className="receipt-checkout-actions">
                  <button type="button" className="btn btn-secondary" onClick={handleSecondary}>
                    {secondaryLabel}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onPrimary}
                    disabled={primaryDisabled || !termsAccepted}
                  >
                    {primaryLabel}
                  </button>
                </div>
              </div>
              <ReceiptPrinter.Status />
            </ReceiptPrinter.Screen>
          </ReceiptPrinter.Machine>
        </ReceiptPrinter.Root>
      </div>
    </div>
  );
}
