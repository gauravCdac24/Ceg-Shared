"""Canonical OCR / form-field extraction for monorepo FastAPI backends.

Sync copies into product backends via scripts/sync_ocr_extraction.py when needed.
Prefer importing from this package in dev by adding ``shared/python`` to PYTHONPATH.
"""

from .fields import blocks_to_form_fields, detect_form_fields, infer_field_type, slugify_field_key
from .pipeline import ExtractResult, extract_document
from .validation import (
    MAX_OCR_SIZE,
    OCR_ALLOWED_MIMES,
    PdfDocumentMeta,
    validate_ocr_upload,
    validate_pdf_metadata,
)

__all__ = [
    "ExtractResult",
    "MAX_OCR_SIZE",
    "OCR_ALLOWED_MIMES",
    "PdfDocumentMeta",
    "blocks_to_form_fields",
    "detect_form_fields",
    "extract_document",
    "infer_field_type",
    "slugify_field_key",
    "validate_ocr_upload",
    "validate_pdf_metadata",
]
