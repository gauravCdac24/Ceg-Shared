"""CeG platform-owner unlimited access — billing applies to standalone products only."""

from __future__ import annotations

import os
from dataclasses import dataclass, field


def _env_bool(name: str, default: bool = True) -> bool:
    raw = (os.getenv(name) or "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def _split_csv(raw: str) -> frozenset[str]:
    return frozenset(part.strip().lower() for part in raw.split(",") if part.strip())


@dataclass(frozen=True)
class PlatformBypassConfig:
    """When matched, quota and feature gates are bypassed (unlimited tier)."""

    enabled: bool = True
    tenant_slugs: frozenset[str] = field(
        default_factory=lambda: frozenset({"platform", "ceg", "cdac", "bootstrap", "demo"})
    )
    tenant_ids: frozenset[str] = field(default_factory=frozenset)
    superadmin_roles: frozenset[str] = field(
        default_factory=lambda: frozenset({"superadmin", "super_admin"})
    )
    dev_unlimited_emails: frozenset[str] = field(default_factory=frozenset)

    @classmethod
    def from_env(cls) -> PlatformBypassConfig:
        enabled = _env_bool("CEG_PLATFORM_OWNER_UNLIMITED", True)
        slug_csv = (os.getenv("CEG_PLATFORM_OWNER_TENANT_SLUGS") or "").strip()
        if slug_csv:
            slugs = _split_csv(slug_csv)
        else:
            single = (os.getenv("CEG_PLATFORM_OWNER_TENANT_SLUG") or "platform,ceg,cdac,bootstrap,demo").strip()
            slugs = _split_csv(single)
        ids = _split_csv((os.getenv("CEG_PLATFORM_OWNER_TENANT_IDS") or "").strip())
        tid = (os.getenv("CEG_PLATFORM_OWNER_TENANT_ID") or "").strip().lower()
        if tid:
            ids = ids | {tid}
        role_csv = (os.getenv("CEG_PLATFORM_OWNER_SUPERADMIN_ROLES") or "superadmin,super_admin").strip()
        roles = _split_csv(role_csv) or frozenset({"superadmin", "super_admin"})
        email_csv = (os.getenv("CEG_DEV_UNLIMITED_EMAILS") or "dev@ceg.gov.in").strip()
        dev_emails = _split_csv(email_csv)
        return cls(
            enabled=enabled,
            tenant_slugs=slugs,
            tenant_ids=ids,
            superadmin_roles=roles,
            dev_unlimited_emails=dev_emails,
        )

    def is_unlimited(
        self,
        *,
        tenant_id: str | None = None,
        tenant_slug: str | None = None,
        user_role: str | None = None,
        user_email: str | None = None,
    ) -> bool:
        if user_email:
            normalized = user_email.strip().lower()
            if normalized and normalized in self.dev_unlimited_emails:
                return True
        if not self.enabled:
            return False
        if tenant_slug and tenant_slug.strip().lower() in self.tenant_slugs:
            return True
        if tenant_id and tenant_id.strip().lower() in self.tenant_ids:
            return True
        if user_role and user_role.strip().lower() in self.superadmin_roles:
            return True
        return False
