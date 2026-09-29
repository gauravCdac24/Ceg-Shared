"""Canonical 422 error-shape normalizer for every FastAPI backend in this monorepo.

DO NOT EDIT THE COPIES IN INDIVIDUAL BACKENDS. They are auto-synced from this
file by `scripts/sync_pii_validators.py`. Make changes here and re-run that
script.

Usage:

    from fastapi import FastAPI, Request
    from fastapi.exceptions import RequestValidationError
    from fastapi.responses import JSONResponse
    from app.validators.validation_errors import normalize_validation_errors

    app = FastAPI()

    @app.exception_handler(RequestValidationError)
    async def _422(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "ok": False,
                "code": "validation_error",
                "message": "Validation failed",
                "errors": normalize_validation_errors(exc.errors()),
            },
        )
"""
from __future__ import annotations

from typing import Any, Iterable


def normalize_validation_errors(raw: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """Convert FastAPI's verbose 422 payload into a UI-friendly shape.

    Each output item is ``{"field": str, "code": str, "message": str, "input"?: str}``.
    The ``input`` value is dropped for password fields to avoid leaking the
    submitted password into logs / browser devtools.
    """
    normalized: list[dict[str, Any]] = []
    for err in raw:
        loc = err.get("loc") or []
        field = ".".join(str(x) for x in loc) if loc else "(root)"
        is_password = any("password" in str(x).lower() for x in loc)
        item: dict[str, Any] = {
            "field": field,
            "code": err.get("type", "value_error"),
            "message": err.get("msg", "Invalid value"),
        }
        if not is_password and "input" in err:
            try:
                item["input"] = str(err["input"])[:200]
            except Exception:
                pass
        normalized.append(item)
    return normalized


__all__ = ["normalize_validation_errors"]
