"""HMAC webhook signature helpers (FetchDesk, Cert Studio, WorkshopOS)."""

from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any


def sign_payload_sha256(secret: str, payload: dict[str, Any], *, sort_keys: bool = True) -> str:
    """Return hex digest for ``sha256={digest}`` header values."""
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=sort_keys).encode("utf-8")
    return hmac.new(secret.encode("utf-8"), raw, hashlib.sha256).hexdigest()


def sign_body_sha256(secret: str, body: bytes) -> str:
    """Sign raw request body bytes (FetchDesk outbound format)."""
    return hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


def verify_header_sha256(secret: str, body: bytes, header_value: str | None) -> bool:
    """Constant-time verify ``X-*-Signature: sha256=<hex>`` or bare hex."""
    if not secret or not header_value:
        return False
    value = header_value.strip()
    if value.lower().startswith("sha256="):
        value = value.split("=", 1)[1].strip()
    expected = sign_body_sha256(secret, body)
    return hmac.compare_digest(expected, value)


def verify_payload_sha256(secret: str, payload: dict[str, Any], header_value: str | None) -> bool:
    if not secret or not header_value:
        return False
    value = header_value.strip()
    if value.lower().startswith("sha256="):
        value = value.split("=", 1)[1].strip()
    expected = sign_payload_sha256(secret, payload)
    return hmac.compare_digest(expected, value)
