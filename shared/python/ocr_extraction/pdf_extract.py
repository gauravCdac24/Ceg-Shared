"""Born-digital PDF extraction via PyMuPDF (text, tables, images)."""
from __future__ import annotations

import base64
import logging
from typing import Any

import fitz

from .blocks import clamp_line_bbox_height, make_block
from .tables import apply_table_postprocess

logger = logging.getLogger("ocr_extraction.pdf")
PDF_RENDER_DPI = 200


def _pdf_page_raster_matrix(page: fitz.Page, dpi: int = PDF_RENDER_DPI) -> tuple[fitz.Matrix, int, int]:
    zoom = float(dpi) / 72.0
    scale = fitz.Matrix(zoom, zoom)
    try:
        rot_mat = page.rotation_matrix
    except Exception:
        rot_mat = fitz.Identity
    mat = rot_mat * scale
    try:
        pix = page.get_pixmap(matrix=scale, alpha=False)
        return mat, int(pix.width), int(pix.height)
    except Exception:
        rect = page.rect
        rot = int(getattr(page, "rotation", 0) or 0) % 360
        rw = rect.width * zoom
        rh = rect.height * zoom
        if rot in (90, 270):
            rw, rh = rh, rw
        return mat, max(1, int(rw)), max(1, int(rh))


def _span_text(span: dict[str, Any]) -> str:
    """PyMuPDF rawdict spans may store glyphs in ``chars`` instead of ``text``."""
    raw = span.get("text")
    if raw is not None and str(raw).strip():
        return str(raw).strip()
    chars = span.get("chars") or []
    if chars:
        return "".join(str(c.get("c") or "") for c in chars).strip()
    return ""


def _rect_to_bbox(rect: fitz.Rect) -> dict[str, float]:
    return {
        "x": float(rect.x0),
        "y": float(rect.y0),
        "w": max(1.0, float(rect.width)),
        "h": max(1.0, float(rect.height)),
    }


def extract_pdf_blocks(
    raw: bytes,
    raster_width: int | None = None,
    raster_height: int | None = None,
    *,
    dpi: int = PDF_RENDER_DPI,
    apply_tables: bool = True,
) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    try:
        doc = fitz.open(stream=raw, filetype="pdf")
        page = doc.load_page(0)
        mat, rw, rh = _pdf_page_raster_matrix(page, dpi=dpi)
        if raster_width and raster_height:
            sx = float(raster_width) / max(float(rw), 1.0)
            sy = float(raster_height) / max(float(rh), 1.0)
            if abs(sx - sy) < 0.02 and abs(sx - 1.0) > 0.02:
                mat = fitz.Matrix(mat.a * sx, mat.d * sy)
            rw, rh = int(raster_width), int(raster_height)
        else:
            raster_width, raster_height = rw, rh

        zoom = float(dpi) / 72.0
        scale_mat = fitz.Matrix(zoom, zoom)

        table_bboxes_raw: list[tuple[float, float, float, float]] = []
        table_blocks: list[dict[str, Any]] = []
        try:
            finder = page.find_tables()
            table_list = list(getattr(finder, "tables", finder))
            for table in table_list:
                try:
                    tb = table.bbox
                    tx0, ty0, tx1, ty1 = float(tb[0]), float(tb[1]), float(tb[2]), float(tb[3])
                    table_bboxes_raw.append((tx0, ty0, tx1, ty1))
                    cells: list[dict[str, Any]] = []
                    extracted = table.extract() or []
                    raw_cells = getattr(table, "cells", None) or []
                    n_rows = max(len(extracted), 1)
                    n_cols = max((len(r or []) for r in extracted), default=1) or 1
                    for ri, row in enumerate(extracted):
                        for ci, cell_text in enumerate(row or []):
                            cell_text = str(cell_text or "").strip()
                            try:
                                cr = raw_cells[ri][ci]
                                if cr is None:
                                    cy0c = ty0 + (ty1 - ty0) * ri / n_rows
                                    cy1c = ty0 + (ty1 - ty0) * (ri + 1) / n_rows
                                    cx0c = tx0 + (tx1 - tx0) * ci / n_cols
                                    cx1c = tx0 + (tx1 - tx0) * (ci + 1) / n_cols
                                else:
                                    cx0c, cy0c, cx1c, cy1c = float(cr[0]), float(cr[1]), float(cr[2]), float(cr[3])
                            except Exception:
                                cx0c = tx0 + (tx1 - tx0) * ci / n_cols
                                cy0c = ty0 + (ty1 - ty0) * ri / n_rows
                                cx1c = tx0 + (tx1 - tx0) * (ci + 1) / n_cols
                                cy1c = ty0 + (ty1 - ty0) * (ri + 1) / n_rows
                            tr_cell = fitz.Rect(cx0c, cy0c, cx1c, cy1c) * mat
                            cells.append(
                                {
                                    "text": cell_text,
                                    "row": ri,
                                    "col": ci,
                                    "bbox": _rect_to_bbox(tr_cell),
                                    "font_size": None,
                                    "font_name": None,
                                }
                            )
                    tr_table = fitz.Rect(tx0, ty0, tx1, ty1) * mat
                    table_blocks.append(
                        make_block(
                            block_type="table",
                            text="",
                            confidence=0.92,
                            bbox=_rect_to_bbox(tr_table),
                            raster_width=raster_width,
                            raster_height=raster_height,
                            cells=cells,
                        )
                    )
                except Exception:
                    pass
        except Exception:
            pass

        def _span_in_table(x0: float, y0: float, x1: float, y1: float) -> bool:
            for tx0, ty0, tx1, ty1 in table_bboxes_raw:
                if x0 >= tx0 - 1 and y0 >= ty0 - 1 and x1 <= tx1 + 1 and y1 <= ty1 + 1:
                    return True
            return False

        span_blocks: list[dict[str, Any]] = []
        data = page.get_text("rawdict")
        for pdf_block in data.get("blocks") or []:
            if int(pdf_block.get("type", -1)) != 0:
                continue
            for line in pdf_block.get("lines") or []:
                for span in line.get("spans") or []:
                    text = _span_text(span)
                    if not text:
                        continue
                    sbbox = span.get("bbox") or [0, 0, 0, 0]
                    if len(sbbox) < 4:
                        continue
                    x0s, y0s, x1s, y1s = [float(v) for v in sbbox[:4]]
                    if _span_in_table(x0s, y0s, x1s, y1s):
                        continue
                    font_size = float(span.get("size") or 12.0)
                    flags = int(span.get("flags") or 0)
                    raw_font = str(span.get("font") or "")
                    font_family = raw_font.split("+")[-1] if "+" in raw_font else raw_font
                    color_int = span.get("color") or 0
                    color_hex = None
                    if isinstance(color_int, int):
                        color_hex = f"#{(color_int >> 16) & 0xFF:02x}{(color_int >> 8) & 0xFF:02x}{color_int & 0xFF:02x}"
                    origin = span.get("origin")
                    if origin and len(origin) >= 2:
                        pt_ox = fitz.Point(float(origin[0]), float(origin[1])) * mat
                        ox, oy = float(pt_ox.x), float(pt_ox.y)
                    else:
                        tr_span = fitz.Rect(x0s, y0s, x1s, y1s) * mat
                        ox, oy = float(tr_span.x0), float(tr_span.y1)
                    tr_span = fitz.Rect(x0s, y0s, x1s, y1s) * mat
                    span_bbox = clamp_line_bbox_height(
                        _rect_to_bbox(tr_span),
                        raster_height=int(raster_height),
                        font_size_pt=font_size,
                        dpi=dpi,
                    )
                    span_blocks.append(
                        make_block(
                            block_type="text",
                            text=text,
                            confidence=0.95,
                            bbox=span_bbox,
                            raster_width=raster_width,
                            raster_height=raster_height,
                            font_size=font_size,
                            font_name=raw_font,
                            font_family=font_family,
                            bold=bool(flags & 16),
                            italic=bool(flags & 2),
                            color=color_hex,
                            origin_x=ox,
                            origin_y=oy,
                        )
                    )

        for pdf_block in data.get("blocks") or []:
            if int(pdf_block.get("type", -1)) != 1:
                continue
            ibbox = pdf_block.get("bbox") or [0, 0, 0, 0]
            if len(ibbox) < 4:
                continue
            ix0, iy0, ix1, iy1 = [float(v) for v in ibbox[:4]]
            rect = fitz.Rect(ix0, iy0, ix1, iy1)
            try:
                pix = page.get_pixmap(matrix=scale_mat, clip=rect, alpha=False)
                asset_url = "data:image/png;base64," + base64.b64encode(pix.tobytes("png")).decode("ascii")
            except Exception:
                asset_url = None
            blocks.append(
                make_block(
                    block_type="image",
                    text="",
                    confidence=0.85,
                    bbox=_rect_to_bbox(rect * mat),
                    raster_width=raster_width,
                    raster_height=raster_height,
                    asset_url=asset_url,
                )
            )

        doc.close()
    except Exception as exc:
        logger.warning("PDF extraction failed: %s", exc)
        return []

    blocks.extend(table_blocks)
    blocks.extend(span_blocks)
    if apply_tables:
        blocks = apply_table_postprocess(blocks, int(raster_width or 1), int(raster_height or 1))
    return blocks
