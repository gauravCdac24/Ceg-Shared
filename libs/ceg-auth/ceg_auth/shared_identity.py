"""Shared credentials plane for integrated programme apps (council 2026-07-24).

Owns email + password hash only. Product sessions and tenants stay local.
CeG Portal is intentionally out of scope as a user destination.

Redis key: ceg:shared_identity:v1:{normalized_email}
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Protocol

logger = logging.getLogger("ceg_auth.shared_identity")

KEY_PREFIX = "ceg:shared_identity:v1"
# bcrypt via passlib — common across QuizForge / WorkshopOS / FetchDesk;
# Cert Studio can verify bcrypt for legacy and will upsert bcrypt here.
_pwd_ctx = None


def _ctx():
    global _pwd_ctx
    if _pwd_ctx is None:
        from passlib.context import CryptContext

        _pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return _pwd_ctx


class RedisLike(Protocol):
    def get(self, name: str) -> Any: ...
    def set(self, name: str, value: str) -> Any: ...


def normalize_email(email: str) -> str:
    return str(email or "").strip().lower()


def identity_key(email: str) -> str:
    return f"{KEY_PREFIX}:{normalize_email(email)}"


@dataclass(frozen=True)
class SharedIdentity:
    email: str
    password_hash: str
    full_name: str
    source_product: str
    email_verified: bool
    updated_at: str

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> SharedIdentity:
        return cls(
            email=str(data.get("email") or ""),
            password_hash=str(data.get("password_hash") or ""),
            full_name=str(data.get("full_name") or ""),
            source_product=str(data.get("source_product") or ""),
            email_verified=bool(data.get("email_verified")),
            updated_at=str(data.get("updated_at") or ""),
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "email": self.email,
            "password_hash": self.password_hash,
            "full_name": self.full_name,
            "source_product": self.source_product,
            "email_verified": self.email_verified,
            "updated_at": self.updated_at,
        }


def hash_password(password: str) -> str:
    return _ctx().hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    if not plain or not hashed:
        return False
    try:
        return bool(_ctx().verify(plain, hashed))
    except Exception:
        return False


class SharedIdentityStore:
    """Thin Redis credentials store. No-ops when disabled or redis missing."""

    def __init__(self, redis_client: RedisLike | None, *, enabled: bool = False) -> None:
        self._r = redis_client
        self.enabled = bool(enabled and redis_client is not None)

    def get(self, email: str) -> SharedIdentity | None:
        if not self.enabled:
            return None
        try:
            raw = self._r.get(identity_key(email))  # type: ignore[union-attr]
            if not raw:
                return None
            if isinstance(raw, bytes):
                raw = raw.decode("utf-8")
            data = json.loads(raw)
            if not isinstance(data, dict):
                return None
            return SharedIdentity.from_dict(data)
        except Exception as exc:
            logger.warning("shared_identity_get_failed err=%s", exc)
            return None

    def upsert(
        self,
        email: str,
        password: str,
        *,
        full_name: str = "",
        source_product: str = "",
        email_verified: bool | None = None,
    ) -> SharedIdentity | None:
        if not self.enabled:
            return None
        norm = normalize_email(email)
        if not norm or not password:
            return None
        existing = self.get(norm)
        verified = (
            bool(email_verified)
            if email_verified is not None
            else bool(existing.email_verified if existing else False)
        )
        record = SharedIdentity(
            email=norm,
            password_hash=hash_password(password),
            full_name=(full_name or (existing.full_name if existing else ""))[:200],
            source_product=(source_product or (existing.source_product if existing else ""))[:64],
            email_verified=verified,
            updated_at=datetime.now(timezone.utc).isoformat(),
        )
        try:
            self._r.set(identity_key(norm), json.dumps(record.to_dict()))  # type: ignore[union-attr]
            return record
        except Exception as exc:
            logger.warning("shared_identity_upsert_failed err=%s", exc)
            return None

    def mark_verified(self, email: str) -> bool:
        if not self.enabled:
            return False
        existing = self.get(email)
        if not existing:
            return False
        record = SharedIdentity(
            email=existing.email,
            password_hash=existing.password_hash,
            full_name=existing.full_name,
            source_product=existing.source_product,
            email_verified=True,
            updated_at=datetime.now(timezone.utc).isoformat(),
        )
        try:
            self._r.set(identity_key(email), json.dumps(record.to_dict()))  # type: ignore[union-attr]
            return True
        except Exception as exc:
            logger.warning("shared_identity_mark_verified_failed err=%s", exc)
            return False

    def verify(self, email: str, password: str) -> SharedIdentity | None:
        """Return identity when password matches. Does not require email_verified
        (caller decides whether to require verification for product login)."""
        if not self.enabled:
            return None
        existing = self.get(email)
        if not existing or not verify_password(password, existing.password_hash):
            return None
        return existing
