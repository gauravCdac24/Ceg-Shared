"""Government pricing matrix and plan price helpers."""

from __future__ import annotations

from commercial_core.enums import GOVERNMENT_ORG_TYPES, OrgType

GST_RATE_PERCENT = 18
BUNDLE_DISCOUNT_PERCENT = 30
ANNUAL_DISCOUNT_PERCENT = 20
GRACE_PERIOD_DAYS = 7

# Base monthly prices in paise per product/tier (non-government defaults)
BASE_MONTHLY_PAISE: dict[str, dict[str, int]] = {
    "cert_studio": {
        "free": 0,
        "starter": 29900,
        "professional": 99900,
        "enterprise": -1,
        "government": 0,
        "unlimited": 0,
    },
    "quizforge": {
        "free": 0,
        "starter": 19900,
        "professional": 79900,
        "enterprise": -1,
        "government": 0,
        "unlimited": 0,
    },
    "fetchdesk": {
        "free": 0,
        "starter": 24900,
        "professional": 89900,
        "enterprise": -1,
        "government": 0,
        "unlimited": 0,
    },
    "workshopos": {
        "free": 0,
        "starter": 19900,
        "professional": 69900,
        "enterprise": -1,
        "government": 0,
        "unlimited": 0,
    },
    "bundle_all": {
        "free": 0,
        "starter": 59900,
        "professional": 199900,
        "enterprise": -1,
        "government": 0,
        "unlimited": 0,
    },
}


def build_pricing_by_org_type(product: str, tier: str) -> dict:
    """Build pricing_by_org_type JSON for a plan."""
    base = BASE_MONTHLY_PAISE.get(product, {}).get(tier, 0)
    annual = int(base * 12 * (100 - ANNUAL_DISCOUNT_PERCENT) / 100) if base > 0 else 0
    matrix: dict[str, dict] = {}

    for org in OrgType:
        entry: dict = {"monthly_paise": base, "annual_paise": annual, "waiver": False}
        if org in GOVERNMENT_ORG_TYPES and tier in {"starter", "professional", "government"}:
            entry["monthly_paise"] = 0
            entry["annual_paise"] = 0
            entry["waiver"] = True
            if org == OrgType.GOVERNMENT_CENTRAL:
                entry["waiver_reason"] = "Central Government Mandate — MeitY Digital India"
        elif org == OrgType.GOVERNMENT_STATE and tier == "professional":
            entry["waiver_eligible"] = True
        matrix[org.value] = entry

    return matrix


def get_plan_price_paise(
    *,
    product: str,
    tier: str,
    org_type: str,
    billing_cycle: str,
    pricing_by_org_type: dict | None = None,
) -> int:
    """Resolve price in paise for checkout."""
    pricing = pricing_by_org_type or build_pricing_by_org_type(product, tier)
    org_pricing = pricing.get(org_type) or pricing.get("all") or {}
    if org_pricing.get("waiver"):
        return 0
    if org_pricing.get("contact_sales"):
        return -1
    if billing_cycle == "annual":
        return int(org_pricing.get("annual_paise", 0))
    return int(org_pricing.get("monthly_paise", BASE_MONTHLY_PAISE.get(product, {}).get(tier, 0)))


def compute_gst_amount_paise(base_paise: int) -> int:
    if base_paise <= 0:
        return 0
    return int(base_paise * GST_RATE_PERCENT / 100)
