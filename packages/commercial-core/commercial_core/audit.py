"""Commercial audit logging helpers."""

from __future__ import annotations

from typing import Any


AUDIT_ACTIONS = frozenset(
    {
        "plan_updated",
        "plan_features_updated",
        "subscription_override",
        "quota_override",
        "feature_override",
        "subscription_suspend",
        "waiver_approved",
        "waiver_rejected",
        "payment_captured",
        "offline_payment_marked",
    }
)


def audit_entry(
    *,
    action: str,
    admin_user_id: str | None = None,
    tenant_id: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if action not in AUDIT_ACTIONS:
        raise ValueError(f"Unknown audit action: {action}")
    return {
        "admin_user_id": admin_user_id,
        "tenant_id": tenant_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "metadata": metadata or {},
    }
