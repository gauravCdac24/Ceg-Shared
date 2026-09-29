"""Extract plain text from PDF bytes (pypdf fast path + optional MinerU fallback)."""

from __future__ import annotations

import io


def extract_pdf_text(data: bytes, *, max_chars: int = 12000) -> str:
    if not data:
        return ""
    text = _extract_pypdf_text(data, max_chars=max_chars)
    try:
        from agent_core.mineru_client import parse_pdf_bytes, should_try_mineru

        if should_try_mineru(text):
            mineru_text = parse_pdf_bytes(data, filename="attachment.pdf")
            if mineru_text.strip():
                return mineru_text[:max_chars]
    except Exception:
        pass
    return text


def _extract_pypdf_text(data: bytes, *, max_chars: int = 12000) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        return ""
    try:
        reader = PdfReader(io.BytesIO(data))
        parts: list[str] = []
        for page in reader.pages[:40]:
            page_text = page.extract_text() or ""
            if page_text.strip():
                parts.append(page_text.strip())
            if sum(len(p) for p in parts) >= max_chars:
                break
        return "\n\n".join(parts)[:max_chars]
    except Exception:
        return ""
