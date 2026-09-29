"""Human-readable plan tier descriptions derived from PRODUCT_SPECS (pricing UI + seed)."""

from __future__ import annotations

from commercial_core.specs import PRODUCT_SPECS

_PRODUCT_LABELS = {
    "cert_studio": "Cert Studio",
    "quizforge": "QuizForge",
    "fetchdesk": "FetchDesk",
    "workshopos": "WorkshopOS",
    "bundle_all": "All products bundle",
}

_FEATURE_LABELS = {
    "ai_template_generation": "AI template generation",
    "ai_design_suggestions": "AI design suggestions",
    "ai_bulk_mapping": "AI bulk field mapping",
    "bulk_certs": "Bulk certificate generation",
    "esign_integration": "E-sign integration",
    "mobile_photo_capture": "Mobile photo capture",
    "webcam_capture": "Webcam capture",
    "white_label": "White-label branding",
    "ai_question_generation": "AI question generation",
    "live_quiz_mode": "Live quiz mode",
    "proctoring": "Proctoring",
    "face_recognition_attendance": "Face recognition attendance",
    "embed_mode": "Embed mode",
    "ai_editorial_assistant": "AI editorial assistant",
    "image_scraping": "Image scraping",
    "playwright_js_rendering": "JavaScript rendering (Playwright)",
    "webhook_outbound": "Outbound webhooks",
    "public_org_page_builder": "Public org page builder",
    "payment_gateway": "Payment gateway",
    "dynamic_forms_conditional": "Conditional dynamic forms",
}

_QUOTA_LABELS = {
    "cert_generated_monthly": "Certificates / month",
    "cert_generated_daily": "Certificates / day",
    "templates_active": "Active templates",
    "bulk_job_max_rows": "Max bulk job rows",
    "storage_gb": "Storage",
    "team_members": "Team members",
    "ocr_pages_monthly": "OCR pages / month",
    "assignments_active": "Active assignments",
    "questions_in_pool": "Question pool size",
    "ai_questions_generated_monthly": "AI questions / month",
    "live_quiz_participants": "Live quiz participants",
    "sources_active": "Active sources",
    "crawls_per_day": "Crawls / day",
    "items_stored": "Stored items",
    "image_extractions_monthly": "Image extractions / month",
    "events_active": "Active events",
    "registrations_per_event": "Registrations per event",
    "total_bookings_monthly": "Bookings / month",
}


def _format_quota(metric: str, value: int | float) -> str:
    if value == -1:
        return "Unlimited"
    if "gb" in metric:
        return f"{value} GB"
    if "daily" in metric:
        return f"{int(value):,} / day"
    if "monthly" in metric:
        return f"{int(value):,} / month"
    if isinstance(value, float) and value < 1:
        return str(value)
    return f"{int(value):,}"


def _flag_label(product: str, flag: str) -> str:
    if product == "bundle_all" and "_" in flag:
        for pid in ("cert_studio", "quizforge", "fetchdesk", "workshopos"):
            prefix = f"{pid}_"
            if flag.startswith(prefix):
                base = flag[len(prefix) :]
                plabel = _PRODUCT_LABELS.get(pid, pid)
                blabel = _FEATURE_LABELS.get(base, base.replace("_", " ").title())
                return f"{plabel}: {blabel}"
    return _FEATURE_LABELS.get(flag, flag.replace("_", " ").title())


def _quota_label(product: str, metric: str) -> str:
    if product == "bundle_all" and "_" in metric:
        for pid in ("cert_studio", "quizforge", "fetchdesk", "workshopos"):
            prefix = f"{pid}_"
            if metric.startswith(prefix):
                base = metric[len(prefix) :]
                plabel = _PRODUCT_LABELS.get(pid, pid)
                blabel = _QUOTA_LABELS.get(base, base.replace("_", " ").title())
                return f"{plabel}: {blabel}"
    return _QUOTA_LABELS.get(metric, metric.replace("_", " ").title())


def tier_feature_lines(product: str, tier: str) -> tuple[list[str], list[str]]:
    """Return (included_lines, excluded_feature_lines) for a product tier."""
    quotas, features = PRODUCT_SPECS.get(product, ({}, {}))
    tier = tier.lower()
    included: list[str] = []
    excluded: list[str] = []

    for flag, tier_map in features.items():
        if not isinstance(tier_map, dict) or tier not in tier_map:
            continue
        label = _flag_label(product, flag)
        if tier_map[tier]:
            included.append(label)
        else:
            excluded.append(label)

    for metric, tier_map in quotas.items():
        if not isinstance(tier_map, dict) or tier not in tier_map:
            continue
        val = tier_map[tier]
        label = _quota_label(product, metric)
        if val == -1 or (isinstance(val, (int, float)) and val > 0):
            included.append(f"{label}: {_format_quota(metric, val)}")
        else:
            excluded.append(label)

    return included, excluded


def build_tier_description(product: str, tier: str) -> str:
    """One-paragraph summary for plan.description in seed + pricing cards."""
    tier = tier.lower()
    plabel = _PRODUCT_LABELS.get(product, product.replace("_", " ").title())
    included, _ = tier_feature_lines(product, tier)

    if tier == "free":
        lead = f"{plabel} free trial — full comparison below. Includes:"
    elif tier == "starter":
        lead = f"{plabel} Starter — includes:"
    elif tier == "professional":
        lead = f"{plabel} Pro / Public org (Professional tier) — includes:"
    elif tier == "enterprise":
        lead = f"{plabel} Enterprise — custom limits; includes:"
    elif tier == "government":
        lead = f"{plabel} Government — subsidised access after waiver; includes:"
    else:
        lead = f"{plabel} {tier} — includes:"

    if not included:
        return lead + " see feature list on this page."
    preview = "; ".join(included[:6])
    if len(included) > 6:
        preview += f"; +{len(included) - 6} more (see full list)."
    return f"{lead} {preview}"


# Short card subtitles (pricing column headers)
TIER_CARD_SUBTITLE: dict[str, str] = {
    "free": "14-day trial on free quotas. Every feature and limit shown with ✓ or ✗ below.",
    "professional": "Starter and Professional plans at checkout. Every feature and limit vs Free shown below.",
    "government": "Subsidised or waived fees after verification. Highest quotas and features below.",
}
