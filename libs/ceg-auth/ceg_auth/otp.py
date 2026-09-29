"""OTP hashing and Redis key namespaces (no plaintext storage API).

AUTH-001: OTP payload keys and session-binding keys MUST stay distinct.
"""

from __future__ import annotations

import hashlib
import hmac
import re

from ceg_auth.config import AuthProductConfig

_SAFE = re.compile(r"[^a-z0-9_.:-]+")


def _norm_id(identifier: str) -> str:
    return identifier.strip().lower()


def _norm_purpose(purpose: str) -> str:
    p = purpose.strip().lower()
    if not p or _SAFE.search(p):
        raise ValueError(f"invalid purpose: {purpose!r}")
    return p


def otp_key(config: AuthProductConfig, purpose: str, identifier: str) -> str:
    """Redis key for hashed OTP JSON blob — never reuse for session bindings.

    Shape: ``{product}:{purpose}:otp:{id}``
    e.g. ``workshopos:login:otp:sess123``
    """
    product = config.redis_prefix()
    return f"{product}:{_norm_purpose(purpose)}:otp:{_norm_id(identifier)}"


def session_key(config: AuthProductConfig, purpose: str, identifier: str) -> str:
    """Redis key for session→user-id binding — distinct namespace from otp_key.

    Shape: ``{product}:{purpose}:session:{id}``
    e.g. ``workshopos:login:session:sess123``
    """
    product = config.redis_prefix()
    return f"{product}:{_norm_purpose(purpose)}:session:{_norm_id(identifier)}"


def hash_otp(code: str) -> str:
    """SHA-256 hex digest of stripped OTP code. Store only the hash in Redis."""
    return hashlib.sha256(code.strip().encode()).hexdigest()


def otp_hashes_equal(stored_hash: str, candidate_code: str) -> bool:
    """Constant-time compare of stored hash vs hash of candidate plaintext."""
    if not stored_hash:
        return False
    return hmac.compare_digest(str(stored_hash), hash_otp(candidate_code))


def otp_digest_equal(stored_hash: str, candidate_hash: str) -> bool:
    """Constant-time compare of two digests (both already hashed)."""
    if not stored_hash or not candidate_hash:
        return False
    return hmac.compare_digest(str(stored_hash), str(candidate_hash))
