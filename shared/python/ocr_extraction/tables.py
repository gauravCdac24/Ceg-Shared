"""Table detection: PyMuPDF structure, spatial clustering, PP-Structure HTML."""
from __future__ import annotations

import html
import re
from html.parser import HTMLParser
from typing import Any

from .blocks import make_block, normalize_label_value_rows


class _SimpleTableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.rows: list[list[str]] = []
        self._current_row: list[str] = []
        self._cell_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "tr":
            self._current_row = []
        elif tag in ("td", "th"):
            self._cell_parts = []

    def handle_endtag(self, tag: str) -> None:
        if tag in ("td", "th"):
            text = html.unescape("".join(self._cell_parts)).strip()
            self._current_row.append(text)
            self._cell_parts = []
        elif tag == "tr" and self._current_row:
            self.rows.append(self._current_row)
            self._current_row = []

    def handle_data(self, data: str) -> None:
        self._cell_parts.append(data)


def html_table_to_cells(table_html: str, *, bbox: dict[str, float], raster_width: int, raster_height: int) -> list[dict[str, Any]]:
    parser = _SimpleTableParser()
    try:
        parser.feed(table_html)
    except Exception:
        return []
    if not parser.rows:
        return []

    n_rows = len(parser.rows)
    n_cols = max(len(r) for r in parser.rows) or 1
    x0, y0 = float(bbox["x"]), float(bbox["y"])
    w, h = float(bbox["w"]), float(bbox["h"])
    cells: list[dict[str, Any]] = []
    for ri, row in enumerate(parser.rows):
        for ci, text in enumerate(row):
            if not text:
                continue
            cx0 = x0 + (w * ci / n_cols)
            cx1 = x0 + (w * (ci + 1) / n_cols)
            cy0 = y0 + (h * ri / n_rows)
            cy1 = y0 + (h * (ri + 1) / n_rows)
            cells.append(
                {
                    "text": text,
                    "row": ri,
                    "col": ci,
                    "bbox": {
                        "x": cx0,
                        "y": cy0,
                        "w": max(1.0, cx1 - cx0),
                        "h": max(1.0, cy1 - cy0),
                    },
                    "font_size": None,
                    "font_name": None,
                }
            )
    return cells


def detect_tables_from_line_blocks(
    line_blocks: list[dict[str, Any]],
    raster_width: int,
    raster_height: int,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Cluster aligned text lines into a grid table (scanned / OCR output)."""
    if len(line_blocks) < 4:
        return [], line_blocks

    texts = [b for b in line_blocks if str(b.get("type") or "text") == "text" and b.get("text")]
    if len(texts) < 4:
        return [], line_blocks

    avg_h = sum(b["bbox"]["h"] for b in texts) / len(texts)
    row_thresh = max(4.0, avg_h * 0.55)
    sorted_blocks = sorted(texts, key=lambda b: (b["bbox"]["y"], b["bbox"]["x"]))
    rows: list[list[dict[str, Any]]] = []
    for block in sorted_blocks:
        placed = False
        for row in rows:
            if abs(block["bbox"]["y"] - row[0]["bbox"]["y"]) <= row_thresh:
                row.append(block)
                placed = True
                break
        if not placed:
            rows.append([block])

    if len(rows) < 2:
        return [], line_blocks

    def row_cols(row: list[dict[str, Any]]) -> list[float]:
        return sorted(b["bbox"]["x"] for b in sorted(row, key=lambda x: x["bbox"]["x"]))

    col_counts: dict[int, int] = {}
    for row in rows:
        col_counts[len(row)] = col_counts.get(len(row), 0) + 1
    best_cols, best_n = max(col_counts.items(), key=lambda kv: kv[1])
    if best_cols < 2 or best_n < 2:
        return [], line_blocks

    grid_rows = [r for r in rows if len(r) >= best_cols]
    if len(grid_rows) < 2:
        return [], line_blocks

    ref_cols = row_cols(grid_rows[0])
    tol = max(12.0, raster_width * 0.02)
    for row in grid_rows[1:]:
        xs = row_cols(row)
        if len(xs) < best_cols:
            return [], line_blocks
        for i in range(best_cols):
            if abs(xs[i] - ref_cols[i]) > tol:
                return [], line_blocks

    used_ids = {id(b) for row in grid_rows for b in row}
    remaining = [b for b in line_blocks if id(b) not in used_ids]

    cells: list[dict[str, Any]] = []
    for ri, row in enumerate(sorted(grid_rows, key=lambda r: r[0]["bbox"]["y"])):
        row_sorted = sorted(row, key=lambda b: b["bbox"]["x"])[:best_cols]
        for ci, cell in enumerate(row_sorted):
            cells.append(
                {
                    "text": str(cell.get("text") or ""),
                    "row": ri,
                    "col": ci,
                    "bbox": dict(cell["bbox"]),
                    "font_size": cell.get("font_size"),
                    "font_name": cell.get("font_name"),
                    "confidence": float(cell.get("confidence") or 0.0),
                }
            )

    xs = [c["bbox"]["x"] for c in cells]
    ys = [c["bbox"]["y"] for c in cells]
    x2 = [c["bbox"]["x"] + c["bbox"]["w"] for c in cells]
    y2 = [c["bbox"]["y"] + c["bbox"]["h"] for c in cells]
    table_block = make_block(
        block_type="table",
        text="",
        confidence=0.88,
        bbox={
            "x": min(xs),
            "y": min(ys),
            "w": max(1.0, max(x2) - min(xs)),
            "h": max(1.0, max(y2) - min(ys)),
        },
        raster_width=raster_width,
        raster_height=raster_height,
        cells=cells,
    )
    return [table_block], remaining


def apply_table_postprocess(blocks: list[dict[str, Any]], raster_width: int, raster_height: int) -> list[dict[str, Any]]:
    """Run spatial table detection and label/value pairing on text blocks."""
    if any(str(b.get("type") or "") == "table" for b in blocks):
        return blocks
    text_only = [b for b in blocks if str(b.get("type") or "text") == "text"]
    other = [b for b in blocks if str(b.get("type") or "text") != "text"]
    tables, remaining = detect_tables_from_line_blocks(text_only, raster_width, raster_height)
    if tables:
        return [*other, *tables, *remaining]
    return normalize_label_value_rows(blocks, raster_width)
