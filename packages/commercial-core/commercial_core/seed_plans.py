"""Seed default commercial plans for all products."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from commercial_core.enums import PlanTier
from commercial_core.pricing import BASE_MONTHLY_PAISE, build_pricing_by_org_type
from commercial_core.specs import PRODUCT_SPECS
from commercial_core.tier_copy import TIER_CARD_SUBTITLE, build_tier_description

PRODUCT_IDS = ("cert_studio", "quizforge", "fetchdesk", "workshopos", "bundle_all")

PUBLIC_TIERS = (
    PlanTier.FREE,
    PlanTier.STARTER,
    PlanTier.PROFESSIONAL,
    PlanTier.ENTERPRISE,
    PlanTier.GOVERNMENT,
)

INTERNAL_TIERS = (PlanTier.UNLIMITED,)

TIER_DISPLAY: dict[str, tuple[str, str, int]] = {
    PlanTier.FREE.value: ("Free trial", "", 0),
    PlanTier.STARTER.value: ("Starter", "", 1),
    PlanTier.PROFESSIONAL.value: ("Pro / Public org", "", 2),
    PlanTier.ENTERPRISE.value: ("Enterprise", "Custom limits and dedicated support", 3),
    PlanTier.GOVERNMENT.value: ("Government", "", 4),
    PlanTier.UNLIMITED.value: ("Unlimited", "Internal C-DAC eGSG — no limits", 99),
}


def _plan_description(product: str, tier_val: str) -> str:
    if tier_val in TIER_CARD_SUBTITLE and tier_val in (
        PlanTier.FREE.value,
        PlanTier.PROFESSIONAL.value,
        PlanTier.GOVERNMENT.value,
    ):
        return TIER_CARD_SUBTITLE[tier_val]
    built = build_tier_description(product, tier_val)
    if built:
        return built
    _, fallback_desc, _ = TIER_DISPLAY.get(tier_val, ("", "", 0))
    return fallback_desc or ""


@dataclass
class PlanSeed:
    product: str
    tier: str
    name: str
    description: str
    is_public: bool
    pricing_by_org_type: dict
    default_monthly_price_paise: int
    default_annual_price_paise: int
    trial_days: int
    trial_quota_multiplier: float
    features: dict
    quotas: dict
    display_order: int


def _bundle_quotas() -> dict[str, dict[str, int | float]]:
    merged: dict[str, dict[str, int | float]] = {}
    for product in ("cert_studio", "quizforge", "fetchdesk", "workshopos"):
        quotas, _ = PRODUCT_SPECS[product]
        for metric, limits in quotas.items():
            key = f"{product}_{metric}"
            merged[key] = limits
    return merged


def _bundle_features() -> dict[str, dict[str, bool]]:
    merged: dict[str, dict[str, bool]] = {}
    for product in ("cert_studio", "quizforge", "fetchdesk", "workshopos"):
        _, features = PRODUCT_SPECS[product]
        for flag, limits in features.items():
            key = f"{product}_{flag}"
            merged[key] = limits
    return merged


def seed_plans_for_product(product: str) -> list[PlanSeed]:
    quotas, features = PRODUCT_SPECS.get(product, ({}, {}))
    if product == "bundle_all":
        quotas = _bundle_quotas()
        features = _bundle_features()

    plans: list[PlanSeed] = []
    tiers = list(PUBLIC_TIERS) + (list(INTERNAL_TIERS) if product == "cert_studio" else [])

    for tier in tiers:
        tier_val = tier.value
        label, _static_desc, order = TIER_DISPLAY[tier_val]
        desc = _plan_description(product, tier_val) or _static_desc
        monthly = BASE_MONTHLY_PAISE.get(product, {}).get(tier_val, 0)
        annual = int(monthly * 12 * 0.8) if monthly > 0 else 0
        plans.append(
            PlanSeed(
                product=product,
                tier=tier_val,
                name=f"{product.replace('_', ' ').title()} {label}",
                description=desc,
                is_public=tier_val != PlanTier.UNLIMITED.value,
                pricing_by_org_type=build_pricing_by_org_type(product, tier_val),
                default_monthly_price_paise=monthly,
                default_annual_price_paise=annual,
                trial_days=14,
                trial_quota_multiplier=1.0 if tier_val != PlanTier.FREE.value else 0.5,
                features=features,
                quotas=quotas,
                display_order=order,
            )
        )
    return plans


def seed_all_plans() -> list[PlanSeed]:
    out: list[PlanSeed] = []
    for product in PRODUCT_IDS:
        out.extend(seed_plans_for_product(product))
    return out


def plan_seed_to_dict(seed: PlanSeed) -> dict[str, Any]:
    return {
        "product": seed.product,
        "tier": seed.tier,
        "name": seed.name,
        "description": seed.description,
        "is_active": True,
        "is_public": seed.is_public,
        "pricing_by_org_type": seed.pricing_by_org_type,
        "default_monthly_price_paise": seed.default_monthly_price_paise,
        "default_annual_price_paise": seed.default_annual_price_paise,
        "trial_days": seed.trial_days,
        "trial_quota_multiplier": seed.trial_quota_multiplier,
        "features": seed.features,
        "quotas": seed.quotas,
        "display_order": seed.display_order,
    }
