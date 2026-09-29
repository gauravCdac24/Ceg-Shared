"""Tests for BHASHINI bridge and PDF extract."""

from __future__ import annotations

from agent_core.tools.bhashini_bridge import detect_hindi_query
from agent_core.tools.pdf_extract import extract_pdf_text


def test_detect_hindi_query():
    assert detect_hindi_query("नमस्ते") is True
    assert detect_hindi_query("hello world") is False


def test_extract_pdf_text_empty_without_pypdf():
    assert extract_pdf_text(b"") == ""
