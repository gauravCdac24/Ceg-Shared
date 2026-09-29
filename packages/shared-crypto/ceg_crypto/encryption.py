"""Field-level AES-256-GCM helpers for tenant-scoped secrets (SEC-002)."""

from __future__ import annotations

import base64
import json
import os
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def encrypt_answer_key(data: dict[str, Any], tenant_key: bytes) -> str:
    """Encrypt a JSON-serializable answer key; returns base64(nonce || ciphertext)."""
    nonce = os.urandom(12)
    ct = AESGCM(tenant_key).encrypt(nonce, json.dumps(data, separators=(",", ":"), sort_keys=True).encode(), None)
    return base64.b64encode(nonce + ct).decode("ascii")


def decrypt_answer_key(blob: str, tenant_key: bytes) -> dict[str, Any]:
    """Decrypt base64(nonce || ciphertext) back to a dict."""
    raw = base64.b64decode(blob)
    nonce, ct = raw[:12], raw[12:]
    parsed = json.loads(AESGCM(tenant_key).decrypt(nonce, ct, None).decode("utf-8"))
    if not isinstance(parsed, dict):
        raise ValueError("Decrypted answer key must be a JSON object")
    return parsed
