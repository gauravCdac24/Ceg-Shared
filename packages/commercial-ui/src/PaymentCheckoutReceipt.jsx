import React from 'react';
import { formatInrFromPaise } from './constants.js';
import { ReceiptPrinter } from './ReceiptPrinter.jsx';
import { cn } from './utils/cn.js';

/**
 * Receipt-printer payment checkout UI (screen summary + animated receipt output).
 */
export function PaymentCheckoutReceipt({
  stage = 'processing',
  animate = true,
  feedMotion = 'stepped',
  productLabel,
  productLogoSrc,
  homeHref = '/',
  planName,
  billingCycle,
  amountPaise,
  payMode = 'checkout',
  upiQr,
  error,
  onClose,
  onPayModeChange,
  statusLabels,
  receiptExtra,
  className,
  children,
}) {
  const hasQr = Boolean(upiQr?.image_url);
  const amountLabel = amountPaise != null ? formatInrFromPaise(amountPaise) : null;
  const cycleLabel = billingCycle ? String(billingCycle).replace(/_/g, ' ') : 'monthly';

  const labels = {
    processing: 'Preparing secure checkout',
    printing: payMode === 'qr' ? 'Scan UPI QR to pay' : 'Complete payment in checkout',
    complete: 'Payment confirmed',
    ...statusLabels,
  };

  return (
    <div className={cn('receipt-checkout-shell receipt-checkout-shell--payment', className)}>
      <ReceiptPrinter.Root animate={animate} feedMotion={feedMotion} stage={stage} statusLabels={labels}>
        <ReceiptPrinter.Machine>
          <ReceiptPrinter.Header>
            {productLogoSrc ? (
              <img alt="" className="receipt-printer-brand-logo" src={productLogoSrc} />
            ) : productLabel ? (
              <span className="receipt-printer-brand-text">{productLabel}</span>
            ) : null}
            <div className="receipt-checkout-header-actions">
              {onClose ? (
                <button type="button" className="receipt-checkout-close" onClick={onClose} aria-label="Close">
                  ✕
                </button>
              ) : null}
              <ReceiptPrinter.HomeLink href={homeHref} />
            </div>
          </ReceiptPrinter.Header>

          <ReceiptPrinter.Screen>
            <div className="receipt-checkout-screen-content">
              <div className="receipt-checkout-order-line">
                <div>
                  <p className="receipt-checkout-plan-name">{planName || 'Subscription'}</p>
                  <p className="receipt-checkout-plan-meta">{cycleLabel}</p>
                </div>
                {amountLabel ? <strong className="receipt-checkout-amount">{amountLabel}</strong> : null}
              </div>

              {hasQr && onPayModeChange ? (
                <div className="payment-mode-tabs">
                  <button
                    type="button"
                    className={payMode === 'checkout' ? 'active' : ''}
                    onClick={() => onPayModeChange('checkout')}
                  >
                    UPI / Card checkout
                  </button>
                  <button
                    type="button"
                    className={payMode === 'qr' ? 'active' : ''}
                    onClick={() => onPayModeChange('qr')}
                  >
                    Scan UPI QR
                  </button>
                </div>
              ) : null}

              {payMode === 'qr' && hasQr ? (
                <div className="upi-qr-panel">
                  <img src={upiQr.image_url} alt="NPCI UPI QR code" width={220} height={220} />
                  <p>Scan with any UPI app (BHIM, PhonePe, GPay, Paytm).</p>
                  {upiQr.short_url ? (
                    <a href={upiQr.short_url} target="_blank" rel="noreferrer">
                      Open payment link
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="payment-checkout-hint">
                  UPI, card, and net banking are processed through a PCI-compliant payment gateway.
                </p>
              )}

              {children}

              {error ? <p className="payment-error">{error}</p> : null}
            </div>
            <ReceiptPrinter.Status />
          </ReceiptPrinter.Screen>
        </ReceiptPrinter.Machine>

        <ReceiptPrinter.Output>
          <ReceiptPrinter.Paper>
            <h2 className="receipt-paper-title">Receipt</h2>
            <hr className="receipt-paper-rule" />
            <dl className="receipt-paper-lines">
              <div className="receipt-paper-line">
                <dt>Plan</dt>
                <dd>{planName || 'Subscription'}</dd>
              </div>
              <div className="receipt-paper-line">
                <dt>Cycle</dt>
                <dd>{cycleLabel}</dd>
              </div>
              {amountLabel ? (
                <div className="receipt-paper-line receipt-paper-line--total">
                  <dt>Total paid</dt>
                  <dd>{amountLabel}</dd>
                </div>
              ) : null}
            </dl>
            {receiptExtra}
            <p className="receipt-paper-thanks">
              {stage === 'complete' ? 'Thanks for your order.' : 'Payment processing…'}
            </p>
          </ReceiptPrinter.Paper>
        </ReceiptPrinter.Output>
      </ReceiptPrinter.Root>
    </div>
  );
}
