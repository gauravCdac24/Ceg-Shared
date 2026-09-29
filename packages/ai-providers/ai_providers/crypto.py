from __future__ import annotations

import base64
import hashlib
import os

from cryptography.fernet import Fernet, InvalidToken


_DEV_FALLBACK_KEY = "ceg-dev-secrets-key-change-in-production"
_LOCAL_ENVS = {"development", "dev", "local", "test"}


def _runtime_environment() -> str:
    for env_var in ("ENVIRONMENT", "CEG_ENV", "FETCHDESK_ENV", "APP_ENV"):
        value = os.environ.get(env_var, "").strip().lower()
        if value:
            return value
    return "development"


def _secrets_key_material() -> str:
    for env_var in ("CEG_SECRETS_KEY", "FETCHDESK_SECRETS_KEY"):
        raw = os.environ.get(env_var, "").strip()
        if raw:
            return raw
    # Backwards-compatible fallback for deployments that currently rotate only one secret.
    captcha = os.environ.get("CAPTCHA_HMAC_SECRET", "").strip()
    if captcha:
        return captcha
    if _runtime_environment() not in _LOCAL_ENVS:
        raise RuntimeError(
            "CEG_SECRETS_KEY or FETCHDESK_SECRETS_KEY must be set outside local/dev/test environments"
        )
    return _DEV_FALLBACK_KEY


def _fernet() -> Fernet:
    raw = _secrets_key_material()
    key = base64.urlsafe_b64encode(hashlib.sha256(raw.encode()).digest())
    return Fernet(key)


def encrypt_secret(plaintext: str) -> str:
    if not plaintext:
        return ""
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt_secret(ciphertext: str) -> str:
    if not ciphertext:
        return ""
    if not ciphertext.startswith("gAAAA"):
        return ciphertext
    try:
        return _fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken:
        return ""


def mask_api_key(key: str) -> str:
    key = (key or "").strip()
    if len(key) <= 8:
        return "••••" if key else ""
    return f"{key[:4]}…{key[-4:]}"
