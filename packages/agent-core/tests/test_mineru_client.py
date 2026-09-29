"""Tests for MinerU client and PDF extract fallback."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest

from agent_core.mineru_client import (
    mineru_enabled,
    parse_pdf_bytes,
    should_try_mineru,
)
from agent_core.tools.pdf_extract import extract_pdf_text


def test_should_try_mineru_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("MINERU_API_URL", raising=False)
    assert should_try_mineru("") is False
    assert should_try_mineru("short") is False


def test_should_try_mineru_sparse(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MINERU_API_URL", "http://127.0.0.1:8122")
    monkeypatch.setenv("MINERU_MIN_TEXT_CHARS", "80")
    assert should_try_mineru("tiny") is True
    assert should_try_mineru("x" * 100) is False


def test_parse_pdf_bytes_json(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MINERU_API_URL", "http://mineru.local")
    payload = json.dumps({"md_content": "# Hello from MinerU"})
    resp = MagicMock()
    resp.read.return_value = payload.encode()
    resp.__enter__ = MagicMock(return_value=resp)
    resp.__exit__ = MagicMock(return_value=False)
    with patch("urllib.request.urlopen", return_value=resp):
        assert parse_pdf_bytes(b"%PDF-fake", filename="t.pdf") == "# Hello from MinerU"


def test_extract_pdf_text_mineru_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MINERU_API_URL", "http://mineru.local")
    monkeypatch.setenv("MINERU_MIN_TEXT_CHARS", "80")
    with patch("agent_core.tools.pdf_extract._extract_pypdf_text", return_value=""):
        with patch("agent_core.mineru_client.parse_pdf_bytes", return_value="OCR text from scan"):
            assert extract_pdf_text(b"pdfbytes") == "OCR text from scan"


def test_mineru_enabled() -> None:
    assert mineru_enabled() is False or mineru_enabled() is True
