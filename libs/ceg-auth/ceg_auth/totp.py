"""RFC 6238 TOTP helpers + hashed backup codes (Cert Studio pattern).

Backup codes are single-use: store only SHA-256 hex digests; on match remove
that digest from the list and persist the updated list.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import secrets
from typing import Any

_log = logging.getLogger("ceg_auth.totp")

BACKUP_CODE_COUNT = 8
DEFAULT_ISSUER = "CEG"


def generate_secret() -> str:
    """Base32 TOTP secret. Requires ``pyotp``; raises ImportError if missing."""
    try:
        import pyotp
    except ImportError as exc:  # pragma: no cover
        raise ImportError(
            "pyotp is required for ceg_auth.totp.generate_secret. "
            "Install with: pip install 'ceg-auth[totp]' or pip install pyotp"
        ) from exc
    return pyotp.random_base32()


def provisioning_uri(
    *,
    secret: str,
    account_name: str,
    issuer: str = DEFAULT_ISSUER,
) -> str:
    """otpauth:// URI for authenticator apps. Requires ``pyotp``."""
    try:
        import pyotp
    except ImportError as exc:  # pragma: no cover
        raise ImportError(
            "pyotp is required for ceg_auth.totp.provisioning_uri. "
            "Install with: pip install 'ceg-auth[totp]' or pip install pyotp"
        ) from exc
    return pyotp.TOTP(secret).provisioning_uri(
        name=account_name,
        issuer_name=issuer or DEFAULT_ISSUER,
    )


def verify_code(*, secret: str, code: str, valid_window: int = 1) -> bool:
    """Verify a 6-digit TOTP. If pyotp is unavailable, logs and returns False (fail-closed)."""
    normalized = str(code or "").strip().replace(" ", "")
    if not normalized.isdigit() or len(normalized) != 6:
        return False
    try:
        import pyotp
    except ImportError:
        _log.warning("totp_verify_skipped_pyotp_unavailable")
        return False
    return bool(pyotp.TOTP(secret).verify(normalized, valid_window=valid_window))


def hash_backup_code(code: str) -> str:
    """SHA-256 hex of normalized backup code (uppercase, stripped)."""
    return hashlib.sha256(code.strip().upper().encode()).hexdigest()


def hash_backup_codes(codes: list[str]) -> list[str]:
    """Hash a list of plaintext backup codes for DB storage."""
    return [hash_backup_code(c) for c in codes]


def generate_backup_codes(count: int = BACKUP_CODE_COUNT) -> tuple[list[str], list[str]]:
    """Return (plaintext codes for one-time display, hashed codes for DB)."""
    plain: list[str] = []
    hashed: list[str] = []
    for _ in range(count):
        code = f"{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}"
        plain.append(code)
        hashed.append(hash_backup_code(code))
    return plain, hashed


def verify_backup_code(
    *,
    code: str,
    stored_hashes: list[Any],
) -> tuple[bool, list[str]]:
    """Single-use verify: return (matched, updated_hashes_with_used_code_removed)."""
    target = hash_backup_code(code)
    hashes = [str(h) for h in (stored_hashes or [])]
    # Constant-time membership via hmac.compare_digest over each slot
    match_idx = -1
    for i, h in enumerate(hashes):
        if hmac.compare_digest(h, target):
            match_idx = i
            break
    if match_idx < 0:
        return False, hashes
    updated = hashes[:match_idx] + hashes[match_idx + 1 :]
    return True, updated
