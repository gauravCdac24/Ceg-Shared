"""Unit tests for ceg_auth.totp."""

from __future__ import annotations

import hashlib

import pytest

from ceg_auth.totp import (
    generate_backup_codes,
    generate_secret,
    hash_backup_code,
    hash_backup_codes,
    provisioning_uri,
    verify_backup_code,
    verify_code,
)

pyotp = pytest.importorskip("pyotp")


def test_generate_secret_and_provisioning_uri() -> None:
    secret = generate_secret()
    assert len(secret) >= 16
    uri = provisioning_uri(secret=secret, account_name="user@example.gov", issuer="FetchDesk")
    assert uri.startswith("otpauth://totp/")
    assert "FetchDesk" in uri
    assert "user%40example.gov" in uri or "user@example.gov" in uri


def test_verify_code_accepts_current_totp() -> None:
    secret = generate_secret()
    code = pyotp.TOTP(secret).now()
    assert verify_code(secret=secret, code=code) is True
    assert verify_code(secret=secret, code="000000") is False
    assert verify_code(secret=secret, code="abc") is False
    assert verify_code(secret=secret, code="") is False


def test_backup_codes_hash_and_single_use() -> None:
    plain, hashed = generate_backup_codes(count=3)
    assert len(plain) == 3
    assert len(hashed) == 3
    assert hashed == hash_backup_codes(plain)
    # first code consumes
    ok, remaining = verify_backup_code(code=plain[0], stored_hashes=hashed)
    assert ok is True
    assert hash_backup_code(plain[0]) not in remaining
    assert len(remaining) == 2
    # reuse fails
    ok2, remaining2 = verify_backup_code(code=plain[0], stored_hashes=remaining)
    assert ok2 is False
    assert remaining2 == remaining
    # wrong code
    ok3, _ = verify_backup_code(code="DEAD-BEEF", stored_hashes=hashed)
    assert ok3 is False


def test_hash_backup_code_is_sha256_upper() -> None:
    assert hash_backup_code("ab-cd") == hashlib.sha256(b"AB-CD").hexdigest()
