"""Razorpay payment integration helpers (NPCI UPI channel).

Razorpay is an NPCI-certified payment aggregator. All UPI collect, UPI intent,
and UPI QR flows in this monorepo route through Razorpay — there is no direct
NPCI switch integration. This is the standard path for India government and
enterprise stacks (PCI-DSS scope stays with Razorpay; we never store card/UPI PIN).

See ``commercial_core/payments/README.md`` for env vars and webhook setup.
"""

from __future__ import annotations

import hashlib
import hmac
import time
from typing import Any, Protocol

from commercial_core.pricing import GST_RATE_PERCENT, compute_gst_amount_paise, get_plan_price_paise


class PaymentSettings(Protocol):
    RAZORPAY_KEY_ID: str
    RAZORPAY_KEY_SECRET: str
    RAZORPAY_WEBHOOK_SECRET: str


# Razorpay Checkout display config — UPI (NPCI) block shown first.
UPI_CHECKOUT_DISPLAY_CONFIG: dict[str, Any] = {
    "display": {
        "blocks": {
            "utib": {"name": "Pay using UPI (NPCI)", "instruments": [{"method": "upi"}]},
            "other": {
                "name": "Other methods",
                "instruments": [
                    {"method": "card"},
                    {"method": "netbanking"},
                    {"method": "wallet", "wallets": ["phonepe", "paytm"]},
                ],
            },
        },
        "sequence": ["block.utib", "block.other"],
        "preferences": {"show_default_blocks": False},
    }
}


class RazorpayPaymentService:
    """Create orders, verify signatures, UPI QR/intent helpers, webhooks."""

    def __init__(self, settings: PaymentSettings) -> None:
        self.settings = settings
        self._client = None

    @property
    def client(self) -> Any:
        if self._client is None:
            import razorpay

            self._client = razorpay.Client(auth=(self.settings.RAZORPAY_KEY_ID, self.settings.RAZORPAY_KEY_SECRET))
        return self._client

    @staticmethod
    def upi_checkout_config() -> dict[str, Any]:
        """Checkout.js config with UPI/NPCI as the primary payment block."""
        return dict(UPI_CHECKOUT_DISPLAY_CONFIG)

    def create_order_payload(
        self,
        *,
        tenant_id: str,
        plan_id: str,
        billing_cycle: str,
        org_type: str,
        product: str,
        tier: str,
        pricing_by_org_type: dict | None = None,
        prefill: dict[str, str] | None = None,
        include_upi_qr: bool = False,
    ) -> dict[str, Any]:
        base = get_plan_price_paise(
            product=product,
            tier=tier,
            org_type=org_type,
            billing_cycle=billing_cycle,
            pricing_by_org_type=pricing_by_org_type,
        )
        gst = compute_gst_amount_paise(base)
        total = base + gst
        receipt = f"sub_{tenant_id[:8]}_{int(time.time())}"
        notes = {
            "tenant_id": tenant_id,
            "plan_id": plan_id,
            "billing_cycle": billing_cycle,
            "org_type": org_type,
            "product": product,
            "base_amount": base,
            "gst_amount": gst,
        }
        order = self.client.order.create(
            {
                "amount": total,
                "currency": "INR",
                "receipt": receipt,
                "notes": notes,
            }
        )
        payload: dict[str, Any] = {
            "order_id": order["id"],
            "amount": total,
            "currency": "INR",
            "key_id": self.settings.RAZORPAY_KEY_ID,
            "gst_rate_percent": GST_RATE_PERCENT,
            "base_amount_paise": base,
            "gst_amount_paise": gst,
            "config": self.upi_checkout_config(),
            "payment_methods": {
                "primary": "upi",
                "npci_channel": "razorpay",
                "supported": ["upi", "upi_qr", "upi_intent", "card", "netbanking", "wallet"],
            },
            "theme": {"color": "#1a1a2e"},
            "prefill": prefill or {},
            "notes": notes,
        }
        if include_upi_qr:
            payload["upi_qr"] = self.create_upi_qr_for_order(
                order_id=order["id"],
                amount_paise=total,
                description=f"{product} {tier} — {billing_cycle}",
                notes=notes,
            )
        return payload

    def create_upi_qr_for_order(
        self,
        *,
        order_id: str,
        amount_paise: int,
        description: str,
        notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Create a single-use NPCI UPI QR via Razorpay QR Codes API."""
        qr = self.client.qrcode.create(
            {
                "type": "upi_qr",
                "name": description[:255],
                "usage": "single_use",
                "fixed_amount": True,
                "payment_amount": amount_paise,
                "description": description[:255],
                "notes": {**(notes or {}), "order_id": order_id},
            }
        )
        return {
            "qr_id": qr.get("id"),
            "image_url": qr.get("image_url"),
            "short_url": qr.get("short_url"),
            "order_id": order_id,
            "amount_paise": amount_paise,
            "flow": "upi_qr",
        }

    def create_upi_intent_link(
        self,
        *,
        amount_paise: int,
        description: str,
        customer: dict[str, str] | None = None,
        notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Payment link with UPI intent — opens UPI apps on mobile."""
        link = self.client.payment_link.create(
            {
                "amount": amount_paise,
                "currency": "INR",
                "description": description[:255],
                "upi_link": True,
                "customer": customer or {},
                "notes": notes or {},
                "options": {"checkout": {"method": {"upi": True}}},
            }
        )
        return {
            "payment_link_id": link.get("id"),
            "short_url": link.get("short_url"),
            "upi_link": link.get("upi_link"),
            "amount_paise": amount_paise,
            "flow": "upi_intent",
        }

    def verify_payment_signature(
        self, *, razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str
    ) -> bool:
        try:
            self.client.utility.verify_payment_signature(
                {
                    "razorpay_order_id": razorpay_order_id,
                    "razorpay_payment_id": razorpay_payment_id,
                    "razorpay_signature": razorpay_signature,
                }
            )
            return True
        except Exception:
            return False

    @staticmethod
    def verify_webhook_signature(body: bytes, signature: str | None, webhook_secret: str) -> bool:
        expected = hmac.new(webhook_secret.encode(), body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature or "")

    @staticmethod
    def parse_upi_payment_details(payment_entity: dict[str, Any]) -> dict[str, Any]:
        """Extract NPCI UPI metadata from Razorpay payment.captured payload."""
        method = payment_entity.get("method", "")
        details: dict[str, Any] = {"method": method, "npci_channel": "razorpay"}
        if method == "upi":
            vpa = payment_entity.get("vpa") or payment_entity.get("upi", {}).get("vpa")
            details["vpa"] = vpa
            details["flow"] = payment_entity.get("upi", {}).get("flow") or "collect"
        return details
