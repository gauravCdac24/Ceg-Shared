"""OTP Redis key namespaces must never collide (AUTH-001)."""

from __future__ import annotations

import hashlib

import pytest

from ceg_auth.config import AuthProductConfig
from ceg_auth.otp import hash_otp, otp_digest_equal, otp_hashes_equal, otp_key, session_key


def _cfg(**kwargs) -> AuthProductConfig:
    base = dict(
        product_name="workshopos",
        cookie_prefix="workshopos",
        access_ttl=900,
        refresh_ttl=604800,
        secret_key="test-secret",
    )
    base.update(kwargs)
    return AuthProductConfig(**base)


def test_otp_and_session_keys_never_collide() -> None:
    cfg = _cfg()
    sid = "AbC123Session"
    o = otp_key(cfg, "login", sid)
    s = session_key(cfg, "login", sid)
    assert o != s
    assert o == "workshopos:login:otp:abc123session"
    assert s == "workshopos:login:session:abc123session"
    assert ":otp:" in o
    assert ":session:" in s
    assert ":otp:" not in s
    assert ":session:" not in o


def test_otp_key_uses_redis_product_prefix_override() -> None:
    cfg = _cfg(redis_product_prefix="qf")
    assert otp_key(cfg, "reg", "user@x.com") == "qf:reg:otp:user@x.com"
    assert session_key(cfg, "login", "sess1") == "qf:login:session:sess1"


def test_hash_otp_is_sha256_no_plaintext_api() -> None:
    code = "123456"
    digest = hash_otp(code)
    assert digest == hashlib.sha256(b"123456").hexdigest()
    assert digest != code
    assert otp_hashes_equal(digest, code)
    assert not otp_hashes_equal(digest, "000000")
    assert otp_digest_equal(digest, hash_otp(code))


def test_invalid_purpose_rejected() -> None:
    cfg = _cfg()
    with pytest.raises(ValueError):
        otp_key(cfg, "bad purpose", "x")
