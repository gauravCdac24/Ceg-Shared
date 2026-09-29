from __future__ import annotations

import pytest

from ai_providers import crypto


def _clear_secrets_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in (
        "CEG_SECRETS_KEY",
        "FETCHDESK_SECRETS_KEY",
        "CAPTCHA_HMAC_SECRET",
        "ENVIRONMENT",
        "CEG_ENV",
        "FETCHDESK_ENV",
        "APP_ENV",
    ):
        monkeypatch.delenv(key, raising=False)


def test_encrypt_fails_closed_in_promoted_env_without_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_secrets_env(monkeypatch)
    monkeypatch.setenv("ENVIRONMENT", "production")

    with pytest.raises(RuntimeError):
        crypto.encrypt_secret("super-secret")


def test_encrypt_uses_captcha_fallback_when_present(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_secrets_env(monkeypatch)
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("CAPTCHA_HMAC_SECRET", "captcha-fallback-value")

    ciphertext = crypto.encrypt_secret("secret")
    assert ciphertext.startswith("gAAAA")
    assert crypto.decrypt_secret(ciphertext) == "secret"


def test_primary_secret_key_takes_precedence_over_captcha(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_secrets_env(monkeypatch)
    monkeypatch.setenv("CEG_SECRETS_KEY", "primary-secret")
    monkeypatch.setenv("CAPTCHA_HMAC_SECRET", "captcha-fallback-value")

    assert crypto._secrets_key_material() == "primary-secret"


def test_local_env_uses_dev_fallback_key(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_secrets_env(monkeypatch)
    monkeypatch.setenv("ENVIRONMENT", "local")

    ciphertext = crypto.encrypt_secret("dev-mode-secret")
    assert crypto.decrypt_secret(ciphertext) == "dev-mode-secret"


def test_decrypt_returns_plaintext_for_non_fernet_values() -> None:
    assert crypto.decrypt_secret("plain-text-token") == "plain-text-token"


def test_decrypt_returns_empty_for_invalid_fernet_token(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_secrets_env(monkeypatch)
    monkeypatch.setenv("ENVIRONMENT", "local")
    assert crypto.decrypt_secret("gAAAA-not-a-valid-token") == ""


def test_mask_api_key_handles_short_and_long_values() -> None:
    assert crypto.mask_api_key("") == ""
    assert crypto.mask_api_key("abcd1234") == "••••"
    assert crypto.mask_api_key("abcdefghijklmnop") == "abcd…mnop"
