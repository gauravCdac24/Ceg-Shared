"""Redact common PII patterns from outbound assistant text."""

from __future__ import annotations

import re

# 12-digit Aadhaar-shaped sequences (with optional spaces)
_AADHAAR_RE = re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")
# Indian mobile numbers
_MOBILE_IN_RE = re.compile(r"\b[6-9]\d{9}\b")
_EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
_US_SSN_RE = re.compile(r"\b\d{3}-?\d{2}-?\d{4}\b")
# Passport-like identifiers are only redacted when explicitly labeled.
_PASSPORT_LABEL_RE = re.compile(
    r"\bpassport(?:\s*(?:no|number|num|id|#))?\s*[:#-]?\s*[A-Z0-9]{6,9}\b",
    re.IGNORECASE,
)
_CARD_CANDIDATE_RE = re.compile(r"\b(?:\d[ -]?){13,19}\b")


def _luhn_valid(number: str) -> bool:
    digits = [int(ch) for ch in number if ch.isdigit()]
    if len(digits) < 13 or len(digits) > 19:
        return False
    checksum = 0
    parity = len(digits) % 2
    for idx, digit in enumerate(digits):
        if idx % 2 == parity:
            digit *= 2
            if digit > 9:
                digit -= 9
        checksum += digit
    return checksum % 10 == 0


def _redact_credit_cards(text: str) -> str:
    def _replace(match: re.Match[str]) -> str:
        token = match.group(0)
        digits = "".join(ch for ch in token if ch.isdigit())
        if _luhn_valid(digits):
            return "[card redacted]"
        return token

    return _CARD_CANDIDATE_RE.sub(_replace, text)


def redact_pii_from_output(text: str) -> str:
    cleaned = text or ""
    cleaned = _redact_credit_cards(cleaned)
    cleaned = _AADHAAR_RE.sub("[id redacted]", cleaned)
    cleaned = _MOBILE_IN_RE.sub("[phone redacted]", cleaned)
    cleaned = _EMAIL_RE.sub("[email redacted]", cleaned)
    cleaned = _US_SSN_RE.sub("[ssn redacted]", cleaned)
    cleaned = _PASSPORT_LABEL_RE.sub("[passport redacted]", cleaned)
    return cleaned
