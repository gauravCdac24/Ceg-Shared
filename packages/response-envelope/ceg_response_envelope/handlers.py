"""FastAPI exception handlers for the canonical error envelope."""

from __future__ import annotations

import logging
import os
from collections.abc import Callable, Sequence
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from ceg_response_envelope.envelope import error_envelope, map_http_exception_detail, status_code_name

_PROD_LIKE_ENVS = frozenset({"production", "prod", "staging", "uat"})


def is_prod_like() -> bool:
    return str(os.environ.get("ENVIRONMENT", "development")).lower() in _PROD_LIKE_ENVS


def _domain_error_response(exc: Exception) -> JSONResponse:
    status = int(exc.status_code) if hasattr(exc.status_code, "value") else exc.status_code
    code = status_code_name(status)
    message = getattr(exc, "message", str(exc))
    return JSONResponse(
        status_code=status,
        content=error_envelope(code=code, message=message, details=None),
    )


def install_error_handlers(
    app: FastAPI,
    *,
    domain_error_types: Sequence[type[Exception]] = (),
    validation_error_normalizer: Callable[[list[Any]], Any] | None = None,
    logger: logging.Logger | None = None,
    prod_like: Callable[[], bool] | None = None,
    legacy_extras: Callable[[Request, str, int], dict[str, Any]] | None = None,
    app_exception_types: Sequence[type[Exception]] = (),
    app_exception_handler: Callable[[Request, Exception], JSONResponse] | None = None,
) -> None:
    """Register canonical envelope handlers on a FastAPI app.

    Product-specific behavior is injected via optional callbacks and exception types.
    """
    _log = logger or logging.getLogger("ceg.errors")
    _prod_like = prod_like or is_prod_like

    async def _domain_error(_: Request, exc: Exception) -> JSONResponse:
        return _domain_error_response(exc)

    for exc_type in domain_error_types:
        app.add_exception_handler(exc_type, _domain_error)

    if app_exception_handler is not None:
        for exc_type in app_exception_types:
            app.add_exception_handler(exc_type, app_exception_handler)

    async def _http_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        code, message, details = map_http_exception_detail(exc.detail, exc.status_code)
        headers = getattr(exc, "headers", None)
        extra = legacy_extras(request, message, exc.status_code) if legacy_extras else None
        body = error_envelope(code=code, message=message, details=details, extra=extra)
        body["detail"] = exc.detail
        return JSONResponse(status_code=exc.status_code, content=body, headers=headers)

    app.add_exception_handler(StarletteHTTPException, _http_error)
    if HTTPException is not StarletteHTTPException:
        app.add_exception_handler(HTTPException, _http_error)

    @app.exception_handler(RequestValidationError)
    async def _422_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        raw_errors = exc.errors()
        errors = validation_error_normalizer(raw_errors) if validation_error_normalizer else raw_errors
        extra: dict[str, Any] = {
            "errors": errors,
            "ok": False,
            "code": "validation_error",
            "message": "Validation failed",
        }
        if legacy_extras:
            extra = {**legacy_extras(request, "Validation failed", 422), **extra}
        return JSONResponse(
            status_code=422,
            content=error_envelope(
                code="validation_error",
                message="Validation failed",
                details=errors,
                extra=extra,
            ),
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        _log.exception("unhandled_exception: %s", exc)
        details = None if _prod_like() else {"exc_type": type(exc).__name__}
        extra = legacy_extras(request, "Internal server error", 500) if legacy_extras else None
        return JSONResponse(
            status_code=500,
            content=error_envelope(
                code="internal_error",
                message="Internal server error",
                details=details,
                extra=extra,
            ),
        )
