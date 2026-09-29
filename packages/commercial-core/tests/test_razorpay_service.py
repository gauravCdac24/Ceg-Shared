"""Unit tests for Razorpay / NPCI UPI payment helpers (mocked client)."""

from __future__ import annotations

import hashlib
import hmac
from unittest.mock import MagicMock, patch

import pytest

from commercial_core.payments.razorpay_service import RazorpayPaymentService, UPI_CHECKOUT_DISPLAY_CONFIG


class _Settings:
    RAZORPAY_KEY_ID = "rzp_test_key"
    RAZORPAY_KEY_SECRET = "secret"
    RAZORPAY_WEBHOOK_SECRET = "whsec_test"


@pytest.fixture
def svc() -> RazorpayPaymentService:
    service = RazorpayPaymentService(_Settings())
    mock_client = MagicMock()
    mock_client.order.create.return_value = {"id": "order_test123"}
    mock_client.qrcode.create.return_value = {
        "id": "qr_test",
        "image_url": "https://rzp.io/i/test.png",
        "short_url": "https://rzp.io/l/test",
    }
    mock_client.payment_link.create.return_value = {
        "id": "plink_test",
        "short_url": "https://rzp.io/l/intent",
        "upi_link": True,
    }
    mock_client.utility.verify_payment_signature.return_value = None
    service._client = mock_client
    return service


def test_upi_checkout_config_prioritizes_upi() -> None:
    cfg = RazorpayPaymentService.upi_checkout_config()
    assert cfg["display"]["sequence"][0] == "block.utib"
    instruments = cfg["display"]["blocks"]["utib"]["instruments"]
    assert instruments == [{"method": "upi"}]
    assert UPI_CHECKOUT_DISPLAY_CONFIG["display"]["blocks"]["utib"]["name"] == "Pay using UPI (NPCI)"


def test_create_order_payload_includes_upi_config(svc: RazorpayPaymentService) -> None:
    payload = svc.create_order_payload(
        tenant_id="tenant-abc-123",
        plan_id="plan-uuid",
        billing_cycle="monthly",
        org_type="individual",
        product="cert_studio",
        tier="starter",
        prefill={"email": "admin@example.com"},
    )
    assert payload["order_id"] == "order_test123"
    assert payload["key_id"] == "rzp_test_key"
    assert payload["payment_methods"]["primary"] == "upi"
    assert payload["payment_methods"]["npci_channel"] == "razorpay"
    assert "upi" in payload["config"]["display"]["blocks"]["utib"]["instruments"][0]["method"]
    assert payload["notes"]["plan_id"] == "plan-uuid"
    svc.client.order.create.assert_called_once()
    call_args = svc.client.order.create.call_args[0][0]
    assert call_args["currency"] == "INR"
    assert call_args["notes"]["product"] == "cert_studio"


def test_create_order_with_upi_qr(svc: RazorpayPaymentService) -> None:
    payload = svc.create_order_payload(
        tenant_id="tenant-abc",
        plan_id="plan-uuid",
        billing_cycle="annual",
        org_type="startup_dpiit",
        product="quizforge",
        tier="pro",
        include_upi_qr=True,
    )
    assert "upi_qr" in payload
    assert payload["upi_qr"]["flow"] == "upi_qr"
    assert payload["upi_qr"]["image_url"].startswith("https://")
    svc.client.qrcode.create.assert_called_once()
    qr_args = svc.client.qrcode.create.call_args[0][0]
    assert qr_args["type"] == "upi_qr"
    assert qr_args["fixed_amount"] is True


def test_create_upi_intent_link(svc: RazorpayPaymentService) -> None:
    link = svc.create_upi_intent_link(
        amount_paise=118000,
        description="Cert Studio Pro",
        notes={"tenant_id": "t1"},
    )
    assert link["flow"] == "upi_intent"
    assert link["short_url"]
    svc.client.payment_link.create.assert_called_once()
    pl_args = svc.client.payment_link.create.call_args[0][0]
    assert pl_args["upi_link"] is True


def test_verify_payment_signature_success(svc: RazorpayPaymentService) -> None:
    ok = svc.verify_payment_signature(
        razorpay_order_id="order_x",
        razorpay_payment_id="pay_x",
        razorpay_signature="sig_x",
    )
    assert ok is True


def test_verify_payment_signature_failure(svc: RazorpayPaymentService) -> None:
    svc.client.utility.verify_payment_signature.side_effect = Exception("bad sig")
    ok = svc.verify_payment_signature(
        razorpay_order_id="order_x",
        razorpay_payment_id="pay_x",
        razorpay_signature="bad",
    )
    assert ok is False


def test_webhook_signature_helper() -> None:
    secret = "whsec_test"
    body = b'{"event":"payment.captured"}'
    sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    assert RazorpayPaymentService.verify_webhook_signature(body, sig, secret)
    assert not RazorpayPaymentService.verify_webhook_signature(body, "invalid", secret)


def test_parse_upi_payment_details() -> None:
    entity = {
        "method": "upi",
        "vpa": "user@oksbi",
        "upi": {"flow": "intent"},
    }
    details = RazorpayPaymentService.parse_upi_payment_details(entity)
    assert details["method"] == "upi"
    assert details["vpa"] == "user@oksbi"
    assert details["flow"] == "intent"
    assert details["npci_channel"] == "razorpay"


def test_parse_non_upi_payment_details() -> None:
    entity = {"method": "card", "card": {"last4": "1111"}}
    details = RazorpayPaymentService.parse_upi_payment_details(entity)
    assert details["method"] == "card"
    assert "vpa" not in details
