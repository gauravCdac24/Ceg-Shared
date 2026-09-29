"""Per-product quota and feature flag specifications."""

from __future__ import annotations

from commercial_core.enums import PlanTier

_TIERS = [t.value for t in PlanTier]


def _tier_map(**kwargs: bool | int) -> dict[str, bool | int]:
    out: dict[str, bool | int] = {}
    for tier in _TIERS:
        if tier in kwargs:
            out[tier] = kwargs[tier]
    return out


CERT_STUDIO_QUOTA_SPEC: dict[str, dict[str, int | float]] = {
    "cert_generated_monthly": _tier_map(free=50, starter=500, professional=5000, enterprise=50000, government=100000, unlimited=-1),
    "cert_generated_daily": _tier_map(free=10, starter=100, professional=1000, enterprise=10000, government=-1, unlimited=-1),
    "templates_active": _tier_map(free=2, starter=10, professional=50, enterprise=-1, government=-1, unlimited=-1),
    "bulk_job_max_rows": _tier_map(free=50, starter=500, professional=5000, enterprise=100000, government=-1, unlimited=-1),
    "storage_gb": _tier_map(free=0.5, starter=5, professional=50, enterprise=500, government=1000, unlimited=-1),
    "team_members": _tier_map(free=1, starter=3, professional=10, enterprise=-1, government=-1, unlimited=-1),
    "ocr_pages_monthly": _tier_map(free=10, starter=100, professional=1000, enterprise=-1, government=-1, unlimited=-1),
}

CERT_STUDIO_FEATURE_FLAGS: dict[str, dict[str, bool]] = {
    "ai_template_generation": _tier_map(free=False, starter=False, professional=True, enterprise=True, government=True, unlimited=True),
    "ai_design_suggestions": _tier_map(free=False, starter=False, professional=True, enterprise=True, government=True, unlimited=True),
    "ai_bulk_mapping": _tier_map(free=False, starter=True, professional=True, enterprise=True, government=True, unlimited=True),
    "bulk_certs": _tier_map(free=False, starter=True, professional=True, enterprise=True, government=True, unlimited=True),
    "esign_integration": _tier_map(free=False, starter=False, professional=True, enterprise=True, government=True, unlimited=True),
    "mobile_photo_capture": _tier_map(free=False, starter=True, professional=True, enterprise=True, government=True, unlimited=True),
    "webcam_capture": _tier_map(free=True, starter=True, professional=True, enterprise=True, government=True, unlimited=True),
    "white_label": _tier_map(free=False, starter=False, professional=False, enterprise=True, government=True, unlimited=True),
}

QUIZFORGE_QUOTA_SPEC: dict[str, dict[str, int | float]] = {
    "assignments_active": _tier_map(free=2, starter=10, professional=50, enterprise=-1, government=-1, unlimited=-1),
    "questions_in_pool": _tier_map(free=50, starter=500, professional=5000, enterprise=-1, government=-1, unlimited=-1),
    "ai_questions_generated_monthly": _tier_map(free=0, starter=20, professional=200, enterprise=2000, government=-1, unlimited=-1),
    "live_quiz_participants": _tier_map(free=30, starter=100, professional=500, enterprise=5000, government=-1, unlimited=-1),
    "team_members": _tier_map(free=1, starter=3, professional=10, enterprise=-1, government=-1, unlimited=-1),
    "storage_gb": _tier_map(free=0.1, starter=1, professional=10, enterprise=100, government=-1, unlimited=-1),
}

QUIZFORGE_FEATURE_FLAGS: dict[str, dict[str, bool]] = {
    "ai_question_generation": _tier_map(free=False, starter=False, professional=True, enterprise=True, government=True, unlimited=True),
    "live_quiz_mode": _tier_map(free=False, starter=True, professional=True, enterprise=True, government=True, unlimited=True),
    "proctoring": _tier_map(free=False, starter=False, professional=True, enterprise=True, government=True, unlimited=True),
    "face_recognition_attendance": _tier_map(free=False, starter=False, professional=True, enterprise=True, government=True, unlimited=True),
    "embed_mode": _tier_map(free=False, starter=True, professional=True, enterprise=True, government=True, unlimited=True),
    "white_label": _tier_map(free=False, starter=False, professional=False, enterprise=True, government=True, unlimited=True),
}

FETCHDESK_QUOTA_SPEC: dict[str, dict[str, int | float]] = {
    "sources_active": _tier_map(free=3, starter=15, professional=50, enterprise=200, government=-1, unlimited=-1),
    "crawls_per_day": _tier_map(free=10, starter=100, professional=500, enterprise=5000, government=-1, unlimited=-1),
    "items_stored": _tier_map(free=500, starter=5000, professional=50000, enterprise=-1, government=-1, unlimited=-1),
    "image_extractions_monthly": _tier_map(free=10, starter=100, professional=1000, enterprise=-1, government=-1, unlimited=-1),
    "enrichments_per_day": _tier_map(free=5, starter=50, professional=250, enterprise=2500, government=-1, unlimited=-1),
    "storage_gb": _tier_map(free=0.5, starter=5, professional=50, enterprise=500, government=-1, unlimited=-1),
}

FETCHDESK_FEATURE_FLAGS: dict[str, dict[str, bool]] = {
    "ai_editorial_assistant": _tier_map(free=False, starter=False, professional=True, enterprise=True, government=True, unlimited=True),
    "image_scraping": _tier_map(free=False, starter=True, professional=True, enterprise=True, government=True, unlimited=True),
    "playwright_js_rendering": _tier_map(free=False, starter=False, professional=True, enterprise=True, government=True, unlimited=True),
    "webhook_outbound": _tier_map(free=False, starter=False, professional=True, enterprise=True, government=True, unlimited=True),
}

WORKSHOPOS_QUOTA_SPEC: dict[str, dict[str, int | float]] = {
    "events_active": _tier_map(free=2, starter=10, professional=50, enterprise=-1, government=-1, unlimited=-1),
    "registrations_per_event": _tier_map(free=50, starter=200, professional=1000, enterprise=-1, government=-1, unlimited=-1),
    "total_bookings_monthly": _tier_map(free=100, starter=1000, professional=10000, enterprise=-1, government=-1, unlimited=-1),
    "team_members": _tier_map(free=2, starter=5, professional=20, enterprise=-1, government=-1, unlimited=-1),
    "storage_gb": _tier_map(free=0.5, starter=5, professional=50, enterprise=500, government=-1, unlimited=-1),
}

WORKSHOPOS_FEATURE_FLAGS: dict[str, dict[str, bool]] = {
    "public_org_page_builder": _tier_map(free=False, starter=True, professional=True, enterprise=True, government=True, unlimited=True),
    "payment_gateway": _tier_map(free=False, starter=True, professional=True, enterprise=True, government=True, unlimited=True),
    "face_recognition_attendance": _tier_map(free=False, starter=False, professional=True, enterprise=True, government=True, unlimited=True),
    "dynamic_forms_conditional": _tier_map(free=False, starter=False, professional=True, enterprise=True, government=True, unlimited=True),
    "white_label": _tier_map(free=False, starter=False, professional=False, enterprise=True, government=True, unlimited=True),
}

PRODUCT_SPECS: dict[str, tuple[dict, dict]] = {
    "cert_studio": (CERT_STUDIO_QUOTA_SPEC, CERT_STUDIO_FEATURE_FLAGS),
    "quizforge": (QUIZFORGE_QUOTA_SPEC, QUIZFORGE_FEATURE_FLAGS),
    "fetchdesk": (FETCHDESK_QUOTA_SPEC, FETCHDESK_FEATURE_FLAGS),
    "workshopos": (WORKSHOPOS_QUOTA_SPEC, WORKSHOPOS_FEATURE_FLAGS),
}


def get_quota_spec(product: str) -> dict[str, dict[str, int | float]]:
    quotas, _ = PRODUCT_SPECS.get(product, ({}, {}))
    return quotas


def get_feature_spec(product: str) -> dict[str, dict[str, bool]]:
    _, features = PRODUCT_SPECS.get(product, ({}, {}))
    return features


def get_default_free_features(product: str) -> dict[str, bool]:
    features = get_feature_spec(product)
    return {k: bool(v.get("free", False)) for k, v in features.items()}
