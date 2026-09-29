"""Canonical API error envelope shared across CEG fleet backends."""

from ceg_response_envelope.envelope import error_envelope, map_http_exception_detail
from ceg_response_envelope.handlers import install_error_handlers

__all__ = [
    "error_envelope",
    "install_error_handlers",
    "map_http_exception_detail",
]
