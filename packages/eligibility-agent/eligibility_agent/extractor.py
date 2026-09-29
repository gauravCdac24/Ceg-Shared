"""PDF → markdown extraction (pattern from hiring-agent pymupdf_rag, no disk paths)."""

from __future__ import annotations

import io

import pymupdf
import structlog

logger = structlog.get_logger(__name__)


def extract_pdf_to_markdown(pdf_bytes: bytes) -> str:
    """Convert PDF bytes to markdown-like text for LLM extraction."""
    if not pdf_bytes:
        raise ValueError("Empty PDF payload")

    try:
        from pymupdf4llm import to_markdown  # type: ignore[import-untyped]
    except ImportError:
        to_markdown = _fallback_plain_text

    with pymupdf.open(stream=pdf_bytes, filetype="pdf") as doc:
        pages = range(doc.page_count)
        text = to_markdown(doc, pages=pages)
        if not text or not str(text).strip():
            raise ValueError("No extractable text from PDF")
        return str(text).strip()


def _fallback_plain_text(doc: pymupdf.Document, *, pages: range | None = None) -> str:
    """Plain text fallback when pymupdf4llm is not installed."""
    page_range = list(pages) if pages is not None else range(doc.page_count)
    chunks: list[str] = []
    for pno in page_range:
        page = doc[pno]
        chunks.append(page.get_text("text"))
    return "\n\n".join(c for c in chunks if c.strip())
