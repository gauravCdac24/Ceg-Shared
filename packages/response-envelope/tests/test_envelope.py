"""Unit tests for ceg_response_envelope core helpers."""

from __future__ import annotations

from ceg_response_envelope import error_envelope, map_http_exception_detail


def test_error_envelope_shape():
    body = error_envelope(code="not_found", message="gone", details={"id": 1})
    assert body == {
        "success": False,
        "error": {"code": "not_found", "message": "gone", "details": {"id": 1}},
    }


def test_map_http_string_detail():
    code, message, details = map_http_exception_detail("Nope", 403)
    assert code == "forbidden"
    assert message == "Nope"
    assert details is None


def test_map_http_coded_dict():
    code, message, details = map_http_exception_detail(
        {"code": "INVALID_CREDENTIALS", "message": "Incorrect email or password"},
        401,
    )
    assert code == "INVALID_CREDENTIALS"
    assert "Incorrect" in message
    assert details is None


def test_map_http_list_detail():
    code, message, details = map_http_exception_detail([{"loc": ["q"]}], 422)
    assert code == "validation_error"
    assert message == "Validation failed"
    assert details == [{"loc": ["q"]}]
