import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PaymentCheckoutReceipt } from './PaymentCheckoutReceipt.jsx';

const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

function loadRazorpayScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.Razorpay) return Promise.resolve();
  const existing = document.querySelector(`script[src="${CHECKOUT_SCRIPT}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Razorpay script failed')));
      if (window.Razorpay) resolve();
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Razorpay script failed'));
    document.body.appendChild(script);
  });
}

/** Razorpay Checkout with receipt-printer UI and optional UPI QR. */
export function PaymentModal({
  open,
  order,
  planName,
  billingCycle,
  productLabel,
  brandName = 'CeG Platform',
  brandLogoSrc = '/logos/cdac-brand.png',
  homeHref = '/',
  feedMotion = 'stepped',
  animate = true,
  onSuccess,
  onClose,
  onVerify,
  onFailure,
}) {
  const openedRef = useRef(false);
  const [payMode, setPayMode] = useState('checkout');
  const [error, setError] = useState('');
  const [stage, setStage] = useState('processing');

  const handleVerify = useCallback(
    async (response) => {
      if (!onVerify) return;
      await onVerify({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
    },
    [onVerify]
  );

  useEffect(() => {
    if (!open) {
      openedRef.current = false;
      setError('');
      setPayMode('checkout');
      setStage('processing');
    }
  }, [open]);

  useEffect(() => {
    if (!open || !order) return;
    if (payMode === 'qr' && order.upi_qr?.image_url) {
      setStage('printing');
      openedRef.current = false;
      return;
    }
    if (!openedRef.current) {
      setStage('processing');
    }
  }, [open, order, payMode]);

  useEffect(() => {
    if (!open || !order || payMode !== 'checkout') return undefined;
    if (openedRef.current) return undefined;
    openedRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        setStage('processing');
        await loadRazorpayScript();
        if (cancelled || !window.Razorpay) return;
        setStage('printing');

        const rzp = new window.Razorpay({
          key: order.key_id,
          amount: order.amount,
          currency: order.currency || 'INR',
          order_id: order.order_id,
          name: brandName,
          description: planName ? `${planName} — ${billingCycle}` : 'Subscription upgrade',
          image: brandLogoSrc,
          prefill: order.prefill || {},
          config: order.config,
          theme: order.theme || { color: '#1a1a2e' },
          handler: (response) => {
            handleVerify(response)
              .then(() => {
                setStage('complete');
                window.setTimeout(() => onSuccess?.(), 1500);
              })
              .catch((err) => {
                setError(err?.message || 'Payment verification failed');
                setStage('printing');
                openedRef.current = false;
                onFailure?.(err);
              });
          },
          modal: {
            ondismiss: () => {
              openedRef.current = false;
              setStage('processing');
              onClose?.();
            },
            confirm_close: true,
          },
        });

        rzp.on('payment.failed', (resp) => {
          const msg = resp?.error?.description || 'Payment failed';
          setError(msg);
          setStage('printing');
          openedRef.current = false;
          onFailure?.(new Error(msg));
        });

        rzp.open();
      } catch (err) {
        setError(err?.message || 'Could not load payment gateway');
        openedRef.current = false;
        setStage('processing');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    order,
    payMode,
    planName,
    billingCycle,
    brandName,
    brandLogoSrc,
    handleVerify,
    onClose,
    onFailure,
    onSuccess,
  ]);

  if (!open || !order) return null;

  return (
    <div className="receipt-checkout-backdrop" role="dialog" aria-modal="true" aria-label="Payment">
      <PaymentCheckoutReceipt
        animate={animate}
        amountPaise={order.amount}
        billingCycle={billingCycle}
        error={error}
        feedMotion={feedMotion}
        homeHref={homeHref}
        onClose={onClose}
        onPayModeChange={setPayMode}
        payMode={payMode}
        planName={planName}
        productLabel={productLabel}
        productLogoSrc={brandLogoSrc}
        stage={stage}
        upiQr={order.upi_qr}
      />
    </div>
  );
}
