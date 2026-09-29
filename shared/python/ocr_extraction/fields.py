"""Structured form-field schema from OCR blocks."""
from __future__ import annotations

import re
from typing import Any

_FIELD_TYPE_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("email", ("email", "e-mail", "e mail")),
    ("phone", ("phone", "mobile", "contact", "tel")),
    ("date", ("date", "dob", "birth")),
    ("number", ("number", "roll", "id no", "amount", "qty", "quantity")),
    ("checkbox", ("checkbox", "agree", "consent", "accept")),
    ("select", ("select", "dropdown", "gender", "category")),
]


def slugify_field_key(text: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", text.strip().lower()).strip("_")
    return slug[:120] or "field"


def infer_field_type(label: str) -> str:
    low = label.lower()
    for field_type, keywords in _FIELD_TYPE_KEYWORDS:
        if any(k in low for k in keywords):
            return field_type
    return "text"


def _bbox_dict(block: dict[str, Any]) -> dict[str, float] | None:
    raw = block.get("bbox")
    if not isinstance(raw, dict):
        return None
    try:
        return {
            "x": float(raw["x"]),
            "y": float(raw["y"]),
            "w": float(raw["w"]),
            "h": float(raw["h"]),
        }
    except (KeyError, TypeError, ValueError):
        return None


def blocks_to_form_fields(blocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Convert OCR blocks into structured registration/certificate field suggestions.

    Each field:
      field_key, field_label, field_type, bbox, table_row, table_col, confidence, source
    """
    fields: list[dict[str, Any]] = []
    seen: set[str] = set()

    def add_field(
        *,
        label: str,
        field_type: str | None = None,
        bbox: dict[str, float] | None = None,
        table_row: int | None = None,
        table_col: int | None = None,
        confidence: float = 0.0,
        source: str = "text",
    ) -> None:
        label = label.strip()
        if not label or len(label) > 120:
            return
        key = slugify_field_key(label)
        if key in seen:
            return
        seen.add(key)
        fields.append(
            {
                "field_key": key,
                "field_label": label,
                "field_type": field_type or infer_field_type(label),
                "bbox": bbox,
                "table_row": table_row,
                "table_col": table_col,
                "confidence": confidence,
                "source": source,
            }
        )

    for block in blocks:
        btype = str(block.get("type") or "text").lower()
        if btype == "table":
            cells = block.get("cells") or []
            if not isinstance(cells, list):
                continue
            header_row: dict[int, str] = {}
            for cell in cells:
                if not isinstance(cell, dict):
                    continue
                text = str(cell.get("text") or "").strip()
                if not text:
                    continue
                try:
                    row = int(cell.get("row", 0))
                    col = int(cell.get("col", 0))
                except (TypeError, ValueError):
                    row, col = 0, 0
                bbox = cell.get("bbox") if isinstance(cell.get("bbox"), dict) else _bbox_dict(block)
                conf = float(cell.get("confidence") or block.get("confidence") or 0.85)
                if row == 0 and text and not text.endswith(":"):
                    header_row[col] = text
                    add_field(
                        label=text,
                        bbox=bbox,
                        table_row=row,
                        table_col=col,
                        confidence=conf,
                        source="table_header",
                    )
                elif row > 0 and col in header_row:
                    label = f"{header_row[col]} (row {row + 1})"
                    add_field(
                        label=label,
                        field_type=infer_field_type(header_row[col]),
                        bbox=bbox,
                        table_row=row,
                        table_col=col,
                        confidence=conf,
                        source="table_cell",
                    )
                elif text.endswith(":"):
                    add_field(
                        label=text.rstrip(":"),
                        bbox=bbox,
                        table_row=row,
                        table_col=col,
                        confidence=conf,
                        source="table_label",
                    )
                elif col == 0 and text:
                    add_field(
                        label=text,
                        bbox=bbox,
                        table_row=row,
                        table_col=col,
                        confidence=conf,
                        source="table_col0",
                    )
            continue

        if btype != "text":
            continue
        text = str(block.get("text") or "").strip()
        if not text:
            continue
        bbox = _bbox_dict(block)
        conf = float(block.get("confidence") or 0.0)
        if ":" in text:
            label = text.split(":", 1)[0].strip()
            if label:
                add_field(label=label, bbox=bbox, confidence=conf, source="label_colon")
            continue
        if len(text) <= 60 and text[0].isupper() and len(text.split()) <= 6:
            add_field(label=text, bbox=bbox, confidence=conf, source="label_heuristic")

    return fields[:80]


def detect_form_fields(blocks: list[dict[str, Any]]) -> list[str]:
    """Heuristic placeholder variables ``{field_key}`` for certificate canvas import."""
    seen: set[str] = set()
    out: list[str] = []
    for field in blocks_to_form_fields(blocks):
        var = f"{{{field['field_key']}}}"
        if var not in seen:
            seen.add(var)
            out.append(var)
    return out[:40]
