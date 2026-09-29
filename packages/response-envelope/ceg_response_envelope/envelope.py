"""Core error envelope builders and HTTP detail mapping."""

from __future__ import annotations

from typing import Any

STATUS_CODES: dict[int, str] = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    409: "conflict",
    422: "validation_error",
    429: "rate_limited",
    500: "internal_error",
    502: "external_service_error",
    503: "service_unavailable",
}

_DEFAULT_MESSAGES: dict[int, str] = {
    400: "Bad request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not found",
    409: "Conflict",
    422: "Validation failed",
    429: "Too many requests",
    500: "Internal server error",
    502: "Upstream service error",
    503: "Service unavailable",
}


def status_code_name(status_code: int) -> str:
    return STATUS_CODES.get(int(status_code), "http_error")


def default_message(status_code: int) -> str:
    return _DEFAULT_MESSAGES.get(int(status_code), "Request failed")


def error_envelope(
    *,
    code: str,
    message: str,
    details: Any = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Canonical API error body: ``{success: false, error: {code, message, details}}``."""
    body: dict[str, Any] = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details,
        },
    }
    if extra:
        body.update(extra)
    return body


def map_http_exception_detail(detail: Any, status_code: int) -> tuple[str, str, Any]:
    """Map FastAPI/Starlette ``HTTPException.detail`` → (code, message, details)."""
    if isinstance(detail, dict):
        code = detail.get("code") or status_code_name(status_code)
        message = detail.get("message") or detail.get("msg")
        if not isinstance(message, str) or not message.strip():
            message = default_message(status_code)
        details = {k: v for k, v in detail.items() if k not in ("code", "message", "msg")}
        return str(code), message, details or None
    if isinstance(detail, list):
        return "validation_error", "Validation failed", detail
    if detail is None or detail == "":
        return status_code_name(status_code), default_message(status_code), None
    return status_code_name(status_code), str(detail), None
