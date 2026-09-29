"""Magic-byte MIME sniffing and PDF metadata guards for OCR uploads."""
from __future__ import annotations

import io
from dataclasses import dataclass

MAX_OCR_SIZE = 25 * 1024 * 1024
MIN_PDF_RENDER_DPI = 72
MAX_PDF_RENDER_DPI = 400
DEFAULT_OCR_DPI = 200

OCR_ALLOWED_MIMES = frozenset(
    {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
    }
)


def sniff_mime(header: bytes) -> str | None:
    if len(header) < 4:
        return None
    if header.startswith(b"%PDF"):
        return "application/pdf"
    if header[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if header[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "image/webp"
    return None


def detect_mime(header: bytes) -> str | None:
    """Prefer python-magic; fall back to lightweight signature sniffing."""
    try:
        import magic

        detected = magic.from_buffer(header, mime=True)
        if isinstance(detected, str) and detected:
            return detected.split(";")[0].strip().lower()
    except Exception:
        pass
    return sniff_mime(header)


def validate_ocr_upload(header: bytes, total_size: int) -> str:
    if total_size <= 0:
        raise ValueError("empty_file")
    if total_size > MAX_OCR_SIZE:
        raise ValueError("file_too_large")
    detected = detect_mime(header)
    if detected not in OCR_ALLOWED_MIMES:
        raise ValueError("unsupported_type")
    return detected


@dataclass(frozen=True)
class PdfDocumentMeta:
    page_count: int
    width_pt: float
    height_pt: float
    rotation: int
    encrypted: bool
    selectable_text_chars: int
    producer: str | None
    title: str | None


def validate_pdf_metadata(raw: bytes, *, min_selectable_chars: int = 0) -> PdfDocumentMeta:
    """Inspect PDF structure; raise ValueError for unusable documents."""
    try:
        import fitz
    except ImportError as exc:
        raise ValueError("pdf_library_unavailable") from exc

    try:
        doc = fitz.open(stream=raw, filetype="pdf")
    except Exception as exc:
        raise ValueError("invalid_pdf") from exc

    try:
        if doc.is_encrypted or doc.needs_pass:
            raise ValueError("pdf_encrypted")
        if doc.page_count < 1:
            raise ValueError("pdf_empty")
        page = doc.load_page(0)
        rect = page.rect
        rotation = int(getattr(page, "rotation", 0) or 0) % 360
        if rotation % 180 != 0:
            width_pt = float(rect.height)
            height_pt = float(rect.width)
        else:
            width_pt = float(rect.width)
            height_pt = float(rect.height)
        if width_pt < 1 or height_pt < 1:
            raise ValueError("pdf_invalid_page_size")
        text = (page.get_text("text") or "").strip()
        meta = doc.metadata or {}
        return PdfDocumentMeta(
            page_count=int(doc.page_count),
            width_pt=width_pt,
            height_pt=height_pt,
            rotation=rotation,
            encrypted=False,
            selectable_text_chars=len(text),
            producer=(meta.get("producer") or None),
            title=(meta.get("title") or None),
        )
    finally:
        doc.close()


def assert_image_dimensions(width: int, height: int) -> None:
    if width < 8 or height < 8:
        raise ValueError("image_too_small")
    if width * height > 120_000_000:
        raise ValueError("image_too_large")
