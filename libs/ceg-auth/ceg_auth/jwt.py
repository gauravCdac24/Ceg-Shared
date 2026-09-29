"""JWT issue/verify stubs — HS256 via PyJWT when installed; RS256 keys accepted in config."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from ceg_auth.config import AuthProductConfig

PURPOSE_ACCESS = "access"
PURPOSE_REFRESH = "refresh"


def _require_jwt():
    try:
        import jwt  # PyJWT
    except ImportError as exc:  # pragma: no cover
        raise ImportError(
            "PyJWT is required for ceg_auth.jwt. Install with: pip install 'ceg-auth[jwt]'"
        ) from exc
    return jwt


def _signing_key(config: AuthProductConfig) -> str:
    algo = (config.jwt_algorithm or "HS256").upper()
    if algo == "RS256":
        if not config.jwt_private_key:
            raise ValueError("AuthProductConfig.jwt_private_key required for RS256")
        return config.jwt_private_key
    if not config.secret_key:
        raise ValueError("AuthProductConfig.secret_key required for HS256")
    return config.secret_key


def _verify_key(config: AuthProductConfig) -> str:
    algo = (config.jwt_algorithm or "HS256").upper()
    if algo == "RS256":
        if not config.jwt_public_key:
            raise ValueError("AuthProductConfig.jwt_public_key required for RS256")
        return config.jwt_public_key
    if not config.secret_key:
        raise ValueError("AuthProductConfig.secret_key required for HS256")
    return config.secret_key


def issue_access_token(
    config: AuthProductConfig,
    data: dict[str, Any],
    *,
    expires_delta: timedelta | None = None,
) -> str:
    """Issue an access JWT (HS256 working path; RS256 when keys configured)."""
    jwt = _require_jwt()
    to_encode = dict(data)
    now = datetime.now(UTC)
    expire = now + (expires_delta if expires_delta is not None else timedelta(seconds=int(config.access_ttl)))
    to_encode.update(
        {
            "exp": expire,
            "iat": now,
            "purpose": PURPOSE_ACCESS,
            "jti": str(uuid.uuid4()),
        }
    )
    return jwt.encode(to_encode, _signing_key(config), algorithm=(config.jwt_algorithm or "HS256").upper())


def issue_refresh_token(config: AuthProductConfig, data: dict[str, Any]) -> str:
    jwt = _require_jwt()
    to_encode = dict(data)
    now = datetime.now(UTC)
    expire = now + timedelta(seconds=int(config.refresh_ttl))
    to_encode.update(
        {
            "exp": expire,
            "iat": now,
            "purpose": PURPOSE_REFRESH,
            "jti": str(uuid.uuid4()),
        }
    )
    return jwt.encode(to_encode, _signing_key(config), algorithm=(config.jwt_algorithm or "HS256").upper())


def verify_token(
    config: AuthProductConfig,
    token: str,
    *,
    required_purpose: str = PURPOSE_ACCESS,
) -> dict[str, Any] | None:
    """Verify JWT; return claims or None. Enforces purpose when claim present."""
    jwt = _require_jwt()
    algo = (config.jwt_algorithm or "HS256").upper()
    try:
        payload = jwt.decode(token, _verify_key(config), algorithms=[algo])
    except Exception:
        return None
    purpose = payload.get("purpose")
    if purpose is not None and purpose != required_purpose:
        return None
    return payload
