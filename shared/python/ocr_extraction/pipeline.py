"""Document OCR extraction orchestration."""
from __future__ import annotations

import io
import logging
from dataclasses import dataclass, field
from typing import Any

import fitz
import numpy as np
from PIL import Image

from .blocks import has_textual_blocks
from .fields import blocks_to_form_fields, detect_form_fields
from .pdf_extract import PDF_RENDER_DPI, extract_pdf_blocks
from .paddle_extract import run_paddle_ocr, run_pp_structure_tables
from .raster_extract import autorotate_for_ocr, extract_image_blocks
from .tables import apply_table_postprocess
from .validation import PdfDocumentMeta, validate_pdf_metadata

logger = logging.getLogger("ocr_extraction.pipeline")


@dataclass
class ExtractResult:
    blocks: list[dict[str, Any]]
    raster_width: int
    raster_height: int
    engine: str
    page_size: str = "A4"
    orientation: str = "portrait"
    width_pt: float = 595.0
    height_pt: float = 842.0
    dpi: int = PDF_RENDER_DPI
    pdf_meta: PdfDocumentMeta | None = None
    fields: list[dict[str, Any]] = field(default_factory=list)
    suggested_variables: list[str] = field(default_factory=list)


def classify_page(w_pt: float, h_pt: float) -> tuple[str, str]:
    portrait = h_pt >= w_pt
    short, long = (w_pt, h_pt) if portrait else (h_pt, w_pt)
    sizes = {"A4": (595, 842), "Letter": (612, 792), "Legal": (612, 1008), "A3": (842, 1190)}
    best = min(sizes.items(), key=lambda kv: abs(kv[1][0] - short) + abs(kv[1][1] - long))
    return best[0], "portrait" if portrait else "landscape"


def render_pdf_first_page(raw: bytes, dpi: int = PDF_RENDER_DPI) -> Image.Image:
    try:
        from pdf2image import convert_from_bytes

        images = convert_from_bytes(raw, dpi=dpi, first_page=1, last_page=1)
        if images:
            return images[0].convert("RGB")
    except Exception:
        pass
    doc = fitz.open(stream=raw, filetype="pdf")
    page = doc.load_page(0)
    scale = dpi / 72.0
    matrix = fitz.Matrix(scale, scale)
    pix = page.get_pixmap(matrix=matrix, alpha=False)
    doc.close()
    return Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")


def pil_from_bytes(raw: bytes) -> Image.Image:
    return Image.open(io.BytesIO(raw)).convert("RGB")


def extract_document(
    raw: bytes,
    *,
    detected_mime: str,
    lang: str = "en",
    enable_paddle: bool = True,
    enable_pp_structure: bool = True,
    dpi: int = PDF_RENDER_DPI,
    min_selectable_text_chars: int = 20,
) -> ExtractResult:
    is_pdf = detected_mime == "application/pdf"
    w_pt, h_pt = 595.0, 842.0
    pdf_meta: PdfDocumentMeta | None = None

    if is_pdf:
        pdf_meta = validate_pdf_metadata(raw)
        w_pt, h_pt = pdf_meta.width_pt, pdf_meta.height_pt
        pil = render_pdf_first_page(raw, dpi=dpi)
    else:
        pil = pil_from_bytes(raw)
        rw0, rh0 = pil.size
        w_pt = float(rw0) * 72.0 / float(dpi)
        h_pt = float(rh0) * 72.0 / float(dpi)

    pil = autorotate_for_ocr(pil)
    raster_width, raster_height = pil.size
    page_size, orientation = classify_page(w_pt, h_pt)
    if raster_width > 0 and raster_height > 0:
        orientation = "landscape" if raster_width > raster_height else "portrait"

    blocks: list[dict[str, Any]] = []
    engine = "none"

    if is_pdf and pdf_meta and pdf_meta.selectable_text_chars >= min_selectable_text_chars:
        blocks = extract_pdf_blocks(raw, raster_width, raster_height, dpi=dpi)
        if has_textual_blocks(blocks):
            engine = "pdf_text"

    if not has_textual_blocks(blocks) and enable_paddle:
        try:
            img_np = np.ascontiguousarray(np.asarray(pil, dtype=np.uint8))
            paddle_blocks = run_paddle_ocr(img_np, lang=lang)
            if paddle_blocks:
                blocks = paddle_blocks
                engine = "paddle"
            if enable_pp_structure:
                struct_tables = run_pp_structure_tables(
                    img_np,
                    lang=lang,
                    raster_width=raster_width,
                    raster_height=raster_height,
                )
                if struct_tables:
                    blocks = [*struct_tables, *[b for b in blocks if str(b.get("type")) != "table"]]
                    engine = "paddle_ppstructure" if engine == "paddle" else engine
        except Exception as exc:
            logger.warning("Paddle OCR path failed: %s", exc)

    if not has_textual_blocks(blocks):
        pdf_blocks: list[dict[str, Any]] = []
        if is_pdf:
            pdf_blocks = extract_pdf_blocks(raw, raster_width, raster_height, dpi=dpi, apply_tables=False)
            if has_textual_blocks(pdf_blocks):
                blocks = pdf_blocks
                engine = "fallback_pdf_text"
        if not has_textual_blocks(blocks):
            raster_blocks = extract_image_blocks(pil, raster_width, raster_height, lang=lang)
            if raster_blocks:
                blocks = raster_blocks
                engine = "fallback_tesseract" if engine == "none" else engine
            elif pdf_blocks:
                blocks = pdf_blocks
                engine = "fallback_pdf_images_only"

    if has_textual_blocks(blocks):
        blocks = apply_table_postprocess(blocks, raster_width, raster_height)

    fields = blocks_to_form_fields(blocks)
    suggested = detect_form_fields(blocks)

    return ExtractResult(
        blocks=blocks,
        raster_width=raster_width,
        raster_height=raster_height,
        engine=engine if has_textual_blocks(blocks) else "fallback_none",
        page_size=page_size,
        orientation=orientation,
        width_pt=w_pt,
        height_pt=h_pt,
        dpi=dpi,
        pdf_meta=pdf_meta,
        fields=fields,
        suggested_variables=suggested,
    )
