"""Unit tests for password_policy, hibp, secrets."""

from __future__ import annotations

import hashlib

import pytest

from ceg_auth.hibp import assert_password_not_pwned, is_password_pwned
from ceg_auth.password_policy import PasswordPolicyError, password_ok, validate_password
from ceg_auth.secrets import (
    parse_secrets,
    rotate_secrets,
    secrets_env_value,
    signing_secret,
    verification_secrets,
)


def test_password_policy_rejects_short_and_weak() -> None:
    with pytest.raises(PasswordPolicyError):
        validate_password("Short1!")
    with pytest.raises(PasswordPolicyError):
        validate_password("nouppercase1!")
    with pytest.raises(PasswordPolicyError):
        validate_password("NOLOWERCASE1!")
    with pytest.raises(PasswordPolicyError):
        validate_password("NoDigitsHere!")
    with pytest.raises(PasswordPolicyError):
        validate_password("NoSpecialChar1")
    validate_password("GoodPassw0rd!")
    assert password_ok("GoodPassw0rd!")
    assert not password_ok("weak")


def test_hibp_rejects_on_suffix_match() -> None:
    password = "PwnedExample1!"
    digest = hashlib.sha1(password.encode()).hexdigest().upper()
    suffix = digest[5:]

    def fake_fetch(url: str, timeout: float) -> str:
        assert digest[:5] in url
        return f"{suffix}:12345\nABCDEF0123456789ABCDEF01234567:1\n"

    assert is_password_pwned(password, fetch=fake_fetch) is True
    with pytest.raises(ValueError, match="breach"):
        assert_password_not_pwned(password, fetch=fake_fetch)


def test_hibp_allows_when_not_listed() -> None:
    password = "SafeEnoughPass1!"

    def fake_fetch(url: str, timeout: float) -> str:
        return "DEADBEEFDEADBEEFDEADBEEFDEADBE:2\n"

    assert is_password_pwned(password, fetch=fake_fetch) is False
    assert_password_not_pwned(password, fetch=fake_fetch)  # no raise


def test_hibp_fail_open_on_network_error() -> None:
    def boom(url: str, timeout: float) -> str:
        raise TimeoutError("hibp down")

    assert is_password_pwned("WhateverPass1!", fetch=boom) is False
    assert_password_not_pwned("WhateverPass1!", fetch=boom)  # no raise


def test_secrets_sign_newest_verify_any() -> None:
    secrets = parse_secrets("new-key,old-key,ancient")
    assert signing_secret(secrets) == "new-key"
    assert verification_secrets(secrets) == ["new-key", "old-key", "ancient"]
    rotated = rotate_secrets(secrets, "brand-new", keep=2)
    assert rotated == ["brand-new", "new-key"]
    assert secrets_env_value(rotated) == "brand-new,new-key"
    with pytest.raises(ValueError):
        signing_secret([])
