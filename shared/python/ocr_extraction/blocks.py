"""OCR block helpers shared across PDF and raster pipelines."""
from __future__ import annotations

import re
from typing import Any


def make_block(
    *,
    block_type: str,
    text: str,
    confidence: float,
    bbox: dict[str, float],
    raster_width: int,
    raster_height: int,
    font_size: float | None = None,
    font_name: str | None = None,
    font_family: str | None = None,
    bold: bool | None = None,
    italic: bool | None = None,
    color: str | None = None,
    origin_x: float | None = None,
    origin_y: float | None = None,
    page: int = 0,
    cells: list[dict[str, Any]] | None = None,
    asset_url: str | None = None,
) -> dict[str, Any]:
    return {
        "type": block_type,
        "text": text,
        "confidence": confidence,
        "bbox": bbox,
        "raster_width": raster_width,
        "raster_height": raster_height,
        "page": page,
        "cells": cells,
        "asset_url": asset_url,
        "font_size": float(font_size) if font_size is not None else None,
        "font_name": str(font_name) if font_name else None,
        "font_family": str(font_family) if font_family else None,
        "bold": bold,
        "italic": italic,
        "color": color,
        "origin_x": float(origin_x) if origin_x is not None else None,
        "origin_y": float(origin_y) if origin_y is not None else None,
    }


def has_textual_blocks(blocks: list[dict[str, Any]]) -> bool:
    for block in blocks:
        btype = str(block.get("type") or "text").lower()
        if btype == "text" and str(block.get("text") or "").strip():
            return True
        if btype == "table":
            cells = block.get("cells") or []
            if isinstance(cells, list) and any(str(c.get("text") or "").strip() for c in cells if isinstance(c, dict)):
                return True
    return False


def clamp_line_bbox_height(
    bbox: dict[str, float],
    *,
    raster_height: int,
    font_size_pt: float | None = None,
    dpi: int = 200,
    max_frac: float = 0.05,
) -> dict[str, float]:
    rh = max(1, int(raster_height))
    max_h = float(rh) * max_frac
    h = float(bbox.get("h") or 0)
    if h <= max_h:
        return bbox
    zoom = float(dpi) / 72.0
    est_h = max(8.0, float(font_size_pt or 12.0) * zoom * 1.35)
    new_h = min(max_h, est_h)
    y = float(bbox.get("y") or 0)
    return {**bbox, "y": y + (h - new_h), "h": new_h}


def merge_word_boxes(
    words: list[dict[str, Any]],
    raster_width: int,
    raster_height: int,
    *,
    dpi: int = 200,
) -> list[dict[str, Any]]:
    if not words:
        return []
    words = sorted(words, key=lambda w: (w["bbox"]["y"], w["bbox"]["x"]))
    lines: list[list[dict[str, Any]]] = []
    for word in words:
        placed = False
        for line in lines:
            ref = line[-1]
            ref_h = max(ref["bbox"]["h"], 1.0)
            if abs(word["bbox"]["y"] - ref["bbox"]["y"]) <= ref_h * 0.6:
                line.append(word)
                placed = True
                break
        if not placed:
            lines.append([word])

    merged: list[dict[str, Any]] = []
    for line in lines:
        line = sorted(line, key=lambda w: w["bbox"]["x"])
        text = " ".join(str(w["text"]) for w in line if w.get("text")).strip()
        if not text:
            continue
        x0 = min(w["bbox"]["x"] for w in line)
        y0 = min(w["bbox"]["y"] for w in line)
        x1 = max(w["bbox"]["x"] + w["bbox"]["w"] for w in line)
        y1 = max(w["bbox"]["y"] + w["bbox"]["h"] for w in line)
        conf = sum(float(w.get("confidence") or 0) for w in line) / len(line)
        line_bbox = clamp_line_bbox_height(
            {"x": x0, "y": y0, "w": max(1.0, x1 - x0), "h": max(1.0, y1 - y0)},
            raster_height=raster_height,
            font_size_pt=None,
            dpi=dpi,
        )
        line_h = float(line_bbox["h"])
        merged.append(
            make_block(
                block_type="text",
                text=text,
                confidence=conf,
                bbox=line_bbox,
                raster_width=raster_width,
                raster_height=raster_height,
                font_size=line_h * 0.85,
            )
        )
    return merged


def normalize_label_value_rows(blocks: list[dict[str, Any]], raster_width: int) -> list[dict[str, Any]]:
    """
    Pair label/value text blocks on the same row (common 2-column registration forms).
    Converts pairs into synthetic table cells when a grid was not detected.
    """
    texts = [b for b in blocks if str(b.get("type") or "text") == "text" and b.get("text")]
    if len(texts) < 2:
        return blocks

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

    pair_rows: list[list[dict[str, Any]]] = []
    for row in rows:
        if len(row) != 2:
            continue
        left, right = sorted(row, key=lambda b: b["bbox"]["x"])
        left_text = str(left.get("text") or "").strip()
        right_text = str(right.get("text") or "").strip()
        if left_text.endswith(":") and right_text and not right_text.endswith(":"):
            pair_rows.append([left, right])

    if len(pair_rows) < 2:
        return blocks

    used_ids = {id(left) for row in pair_rows for left in row}
    used_ids.update(id(right) for row in pair_rows for _, right in [row])
    remaining = [b for b in blocks if id(b) not in used_ids]

    cells: list[dict[str, Any]] = []
    for ri, (left, right) in enumerate(pair_rows):
        label = str(left.get("text") or "").rstrip(":").strip()
        cells.append(
            {
                "text": label,
                "row": ri,
                "col": 0,
                "bbox": dict(left["bbox"]),
                "font_size": left.get("font_size"),
                "font_name": left.get("font_name"),
            }
        )
        cells.append(
            {
                "text": str(right.get("text") or "").strip(),
                "row": ri,
                "col": 1,
                "bbox": dict(right["bbox"]),
                "font_size": right.get("font_size"),
                "font_name": right.get("font_name"),
            }
        )

    xs = [c["bbox"]["x"] for c in cells]
    ys = [c["bbox"]["y"] for c in cells]
    x2 = [c["bbox"]["x"] + c["bbox"]["w"] for c in cells]
    y2 = [c["bbox"]["y"] + c["bbox"]["h"] for c in cells]
    table_block = make_block(
        block_type="table",
        text="",
        confidence=0.86,
        bbox={
            "x": min(xs),
            "y": min(ys),
            "w": max(1.0, max(x2) - min(xs)),
            "h": max(1.0, max(y2) - min(ys)),
        },
        raster_width=int(texts[0].get("raster_width") or raster_width),
        raster_height=int(texts[0].get("raster_height") or 1),
        cells=cells,
    )
    return [table_block, *remaining]
