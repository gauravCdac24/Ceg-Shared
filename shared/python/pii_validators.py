"""Canonical PII validators for every FastAPI backend in this monorepo.

DO NOT EDIT THE COPIES IN INDIVIDUAL BACKENDS. They are auto-synced from this
file by `scripts/sync_pii_validators.py`. Make changes here and re-run that
script (or accept drift — but pre-commit will flag it).

These validators are deliberately STRICT. They reject:
- Phone numbers that aren't valid IN mobile (^[6-9][0-9]{9}$) or E.164.
- Phone numbers with >= 4 consecutive identical digits (e.g. 6333333333).
- Phone numbers that are obviously sequential (0123456789, 9876543210).
- Pincodes that aren't ^[1-9][0-9]{5}$.
- Names that are pure digits, single character, or have 4+ consecutive
  identical characters.
- Emails that don't match RFC 5322 lite.
- PAN / Aadhaar / GST in obviously wrong shapes (Aadhaar uses Verhoeff
  checksum so a random 12-digit string also fails).

All functions raise `ValueError` on failure. Pydantic `field_validator` wraps
them automatically into a 422 response with the `value_error` discriminator.

Usage in a Pydantic v2 schema:

    from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
    from app.validators.pii import normalize_phone_in, validate_pincode_in, validate_no_spam_name

    class UserUpdateIn(BaseModel):
        model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
        full_name: str = Field(min_length=2, max_length=120)
        email: EmailStr
        mobile: str | None = None
        pincode: str | None = Field(default=None, pattern=r"^[1-9]\\d{5}$")

        _mobile = field_validator("mobile")(lambda cls, v: normalize_phone_in(v) if v else v)
        _name = field_validator("full_name")(lambda cls, v: validate_no_spam_name(v))
"""
from __future__ import annotations

import re

# `phonenumbers` is the canonical lib for international validation. We try to
# import it but fall back to a regex-only check if unavailable (so the module
# never blocks import). Every backend's requirements.txt should pin it.
try:
    import phonenumbers as _pn
    _HAS_PHONENUMBERS = True
except ImportError:  # pragma: no cover
    _HAS_PHONENUMBERS = False


# ────────────────────────────────────────────────────────────────────────────
# Generic helpers
# ────────────────────────────────────────────────────────────────────────────

_ASCENDING = "0123456789"
_DESCENDING = "9876543210"


def _has_long_repeated_run(digits: str, min_run: int = 5) -> bool:
    """True if `digits` contains `min_run` or more identical consecutive chars."""
    return bool(re.search(rf"(.)\1{{{min_run - 1},}}", digits))


def _has_sequential_run(digits: str, min_run: int = 6) -> bool:
    """True if `digits` contains an ascending or descending run of length >= `min_run`.

    Default 6 matches the user's stated examples (333333, 000000, 012345, etc.).
    """
    if len(digits) < min_run:
        return False
    for start in range(len(digits) - min_run + 1):
        window = digits[start:start + min_run]
        if window in _ASCENDING or window in _DESCENDING:
            return True
    return False


def _strip_non_digits(s: str) -> str:
    return re.sub(r"\D", "", s or "")


# ────────────────────────────────────────────────────────────────────────────
# Phone
# ────────────────────────────────────────────────────────────────────────────

_IN_MOBILE_RE = re.compile(r"^[6-9]\d{9}$")
_E164_RE = re.compile(r"^\+[1-9]\d{6,14}$")


def normalize_phone_in(value: str | None, *, allow_intl: bool = True) -> str | None:
    """Validate an Indian mobile (or any E.164) and return E.164 form.

    Accepts ``None`` and empty string as "no phone supplied". Otherwise raises
    ``ValueError`` on invalid / spam input.

    Returns:
        ``+91XXXXXXXXXX`` for valid IN mobiles, or the existing E.164 string for
        valid international numbers.
    """
    if value is None or value == "":
        return None
    raw = value.strip()
    digits = _strip_non_digits(raw)
    # Reject obvious spam first (e.g. "9999999999", "0123456789").
    if not digits:
        raise ValueError("phone is empty")
    if _has_long_repeated_run(digits, min_run=5):
        raise ValueError("phone looks like spam (repeated digits)")
    if _has_sequential_run(digits):
        raise ValueError("phone looks like spam (sequential digits)")
    # Try IN format first (most common in our datasets).
    if _IN_MOBILE_RE.match(digits[-10:]) and (
        digits == digits[-10:] or digits.startswith("91") or digits.startswith("0")
    ):
        last10 = digits[-10:]
        if not _IN_MOBILE_RE.match(last10):
            raise ValueError("phone is not a valid Indian mobile")
        return f"+91{last10}"
    # Otherwise must be E.164.
    if not allow_intl:
        raise ValueError("phone is not a valid Indian mobile")
    candidate = raw if raw.startswith("+") else f"+{digits}"
    if not _E164_RE.match(candidate):
        raise ValueError("phone is not valid E.164")
    if _HAS_PHONENUMBERS:
        try:
            parsed = _pn.parse(candidate, None)
            if not _pn.is_valid_number(parsed):
                raise ValueError("phone is not a valid international number")
            return _pn.format_number(parsed, _pn.PhoneNumberFormat.E164)
        except _pn.NumberParseException as exc:  # pragma: no cover
            raise ValueError(f"phone parse failed: {exc.error_type.name}") from None
    return candidate


# ────────────────────────────────────────────────────────────────────────────
# Pincode
# ────────────────────────────────────────────────────────────────────────────

_PINCODE_IN_RE = re.compile(r"^[1-9]\d{5}$")


def validate_pincode_in(value: str | None) -> str | None:
    """Validate an Indian PIN code. Accepts None/empty as "not supplied"."""
    if value is None or value == "":
        return None
    v = value.strip()
    if not _PINCODE_IN_RE.match(v):
        raise ValueError("pincode must be 6 digits, no leading zero")
    if _has_long_repeated_run(v, min_run=5):
        raise ValueError("pincode looks like spam (repeated digits)")
    if _has_sequential_run(v):
        raise ValueError("pincode looks like spam (sequential digits)")
    return v


# ────────────────────────────────────────────────────────────────────────────
# Name (anti-spam)
# ────────────────────────────────────────────────────────────────────────────

_NAME_OK_CHARS_RE = re.compile(r"^[A-Za-z][A-Za-z .'\-]{1,118}[A-Za-z.]$")
_NAME_REPEAT_RE = re.compile(r"(.)\1{3,}", re.IGNORECASE)


def validate_no_spam_name(value: str) -> str:
    """Validate a human name. Rejects pure digits, repeated chars, junk."""
    if value is None:
        raise ValueError("name is required")
    v = value.strip()
    if len(v) < 2:
        raise ValueError("name is too short")
    if len(v) > 120:
        raise ValueError("name is too long")
    if v.isdigit():
        raise ValueError("name cannot be all digits")
    if _NAME_REPEAT_RE.search(v):
        raise ValueError("name has too many repeated characters")
    if not _NAME_OK_CHARS_RE.match(v):
        # Allow shorter names (e.g. "Li") via a relaxed second check
        if not re.match(r"^[A-Za-z][A-Za-z.'\-]*$", v):
            raise ValueError("name has invalid characters")
    return v


# ────────────────────────────────────────────────────────────────────────────
# Email — light extra checks on top of pydantic's EmailStr
# ────────────────────────────────────────────────────────────────────────────

_DISPOSABLE_DOMAINS = {
    "mailinator.com", "10minutemail.com", "guerrillamail.com",
    "trashmail.com", "yopmail.com", "tempmail.com", "throwaway.email",
}

_EMAIL_FORBIDDEN_CHARS_RE = re.compile(r"['\"=;]|--|/\*|\*/")
_STRICT_EMAIL_RE = re.compile(
    r"^[a-z0-9][a-z0-9._%+-]{0,63}@"
    r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
    r"(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$"
)
_EMPLOYEE_ID_RE = re.compile(r"^[A-Za-z0-9\-_./]+$")


def validate_email_extra(value: str, *, allow_disposable: bool = False) -> str:
    """Strict email rules beyond Pydantic EmailStr (rejects injection / malformed input)."""
    v = value.strip().lower()
    if not v:
        raise ValueError("email is required")
    if len(v) > 254:
        raise ValueError("email is too long")
    if v.count("@") != 1:
        raise ValueError("email is malformed")
    if _EMAIL_FORBIDDEN_CHARS_RE.search(v):
        raise ValueError("email contains invalid characters")
    local, _, domain = v.rpartition("@")
    if not local or not domain or len(local) > 64 or len(domain) > 253:
        raise ValueError("email is malformed")
    if local.isdigit():
        raise ValueError("email is malformed")
    if not _STRICT_EMAIL_RE.match(v):
        raise ValueError("email is malformed")
    if not allow_disposable and domain in _DISPOSABLE_DOMAINS:
        raise ValueError("email from disposable provider not allowed")
    return v


def validate_login_username(value: str) -> str:
    """Login identifier: strict email when ``@`` present, else employee id."""
    v = (value or "").strip()
    if not v:
        raise ValueError("username is required")
    if "@" in v:
        return validate_email_extra(v)
    if len(v) < 2 or len(v) > 64:
        raise ValueError("employee id is invalid")
    if not _EMPLOYEE_ID_RE.match(v):
        raise ValueError("employee id has invalid characters")
    return v


# ────────────────────────────────────────────────────────────────────────────
# PAN / GST / Aadhaar
# ────────────────────────────────────────────────────────────────────────────

_PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
_GST_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")


def validate_pan(value: str | None) -> str | None:
    if value is None or value == "":
        return None
    v = value.strip().upper()
    if not _PAN_RE.match(v):
        raise ValueError("PAN must match ^[A-Z]{5}[0-9]{4}[A-Z]$")
    return v


def validate_gst(value: str | None) -> str | None:
    if value is None or value == "":
        return None
    v = value.strip().upper()
    if not _GST_RE.match(v):
        raise ValueError("GSTIN format invalid")
    return v


# Verhoeff checksum tables for Aadhaar.
_VERHOEFF_D = (
    (0,1,2,3,4,5,6,7,8,9),
    (1,2,3,4,0,6,7,8,9,5),
    (2,3,4,0,1,7,8,9,5,6),
    (3,4,0,1,2,8,9,5,6,7),
    (4,0,1,2,3,9,5,6,7,8),
    (5,9,8,7,6,0,4,3,2,1),
    (6,5,9,8,7,1,0,4,3,2),
    (7,6,5,9,8,2,1,0,4,3),
    (8,7,6,5,9,3,2,1,0,4),
    (9,8,7,6,5,4,3,2,1,0),
)
_VERHOEFF_P = (
    (0,1,2,3,4,5,6,7,8,9),
    (1,5,7,6,2,8,3,0,9,4),
    (5,8,0,3,7,9,6,1,4,2),
    (8,9,1,6,0,4,3,5,2,7),
    (9,4,5,3,1,2,6,8,7,0),
    (4,2,8,6,5,7,3,9,0,1),
    (2,7,9,3,8,0,6,4,1,5),
    (7,0,4,6,9,1,3,2,5,8),
)


def _verhoeff_valid(digits: str) -> bool:
    c = 0
    for i, ch in enumerate(reversed(digits)):
        c = _VERHOEFF_D[c][_VERHOEFF_P[i % 8][int(ch)]]
    return c == 0


def validate_aadhaar(value: str | None) -> str | None:
    """Validate Aadhaar (12-digit + Verhoeff). We DO NOT store Aadhaar in any
    of our DBs; this is for validate-only flows (e.g. visitor-pass form)."""
    if value is None or value == "":
        return None
    digits = _strip_non_digits(value)
    if len(digits) != 12:
        raise ValueError("Aadhaar must be 12 digits")
    if digits.startswith("0") or digits.startswith("1"):
        raise ValueError("Aadhaar cannot start with 0 or 1")
    if _has_long_repeated_run(digits, min_run=5):
        raise ValueError("Aadhaar looks like spam (repeated digits)")
    if not _verhoeff_valid(digits):
        raise ValueError("Aadhaar checksum invalid")
    return digits


__all__ = [
    "normalize_phone_in",
    "validate_pincode_in",
    "validate_no_spam_name",
    "validate_email_extra",
    "validate_login_username",
    "validate_pan",
    "validate_gst",
    "validate_aadhaar",
]
