"""PaddleOCR text recognition and optional PP-Structure table/layout."""
from __future__ import annotations

import logging
import os
import types
from typing import Any

import numpy as np

from .blocks import make_block
from .tables import html_table_to_cells

logger = logging.getLogger("ocr_extraction.paddle")

os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")
os.environ.setdefault("FLAGS_use_mkldnn", "0")

_OCR_INSTANCES: dict[str, Any] = {}
_STRUCTURE_INSTANCES: dict[str, Any] = {}
_PADDLE_OCR_CLS: Any = None
_PADDLE_OCR_MAJOR: int | None = None


def paddle_ocr_major_version() -> int:
    global _PADDLE_OCR_MAJOR
    if _PADDLE_OCR_MAJOR is not None:
        return _PADDLE_OCR_MAJOR
    try:
        import paddleocr as po

        ver = str(getattr(po, "__version__", "2.0.0"))
        _PADDLE_OCR_MAJOR = int(ver.split(".", 1)[0])
    except Exception:
        _PADDLE_OCR_MAJOR = 2
    return _PADDLE_OCR_MAJOR


def _get_paddle_ocr_cls() -> Any:
    global _PADDLE_OCR_CLS
    if _PADDLE_OCR_CLS is not None:
        return _PADDLE_OCR_CLS
    from paddleocr import PaddleOCR

    _PADDLE_OCR_CLS = PaddleOCR
    return _PADDLE_OCR_CLS


def _paddle_ocr_kwargs(ocr_version: str | None = None) -> dict:
    if paddle_ocr_major_version() >= 3:
        kw: dict = {
            "return_word_box": True,
            "use_doc_orientation_classify": False,
            "use_doc_unwarping": False,
            "enable_mkldnn": False,
        }
        if ocr_version is not None:
            kw["ocr_version"] = ocr_version
        return kw
    kw = {"use_angle_cls": True, "use_gpu": False, "show_log": False}
    if ocr_version is not None:
        kw["ocr_version"] = ocr_version
    return kw


def get_paddle_ocr(lang: str) -> Any:
    cached = _OCR_INSTANCES.get(lang)
    if cached:
        return cached
    attempts: list[str | None] = []
    if lang in ("en", "ch"):
        attempts.extend(["PP-OCRv4", "PP-OCRv3"])
    else:
        attempts.append("PP-OCRv3")
    attempts.append(None)
    last_err: Exception | None = None
    PaddleOCR = _get_paddle_ocr_cls()
    for ver in attempts:
        try:
            ocr = PaddleOCR(lang=lang, **_paddle_ocr_kwargs(ver))
            _OCR_INSTANCES[lang] = ocr
            return ocr
        except Exception as exc:
            last_err = exc
            logger.warning("PaddleOCR init failed lang=%s version=%s: %s", lang, ver, exc)
    raise RuntimeError(f"PaddleOCR init failed for lang={lang}: {last_err}")


def get_pp_structure(lang: str) -> Any:
    cached = _STRUCTURE_INSTANCES.get(lang)
    if cached:
        return cached
    from paddleocr import PPStructure

    engine = PPStructure(show_log=False, use_gpu=False, lang=lang, table=True, ocr=True)
    _STRUCTURE_INSTANCES[lang] = engine
    return engine


def _normalize_predict_output(result: object) -> object:
    if isinstance(result, types.GeneratorType):
        return list(result)
    return result


def _poly_like_to_bbox(poly) -> dict[str, float]:
    arr = np.array(poly)
    if arr.ndim == 1 and arr.shape[0] == 4:
        x0, y0, x1, y1 = [float(v) for v in arr.tolist()]
        return {"x": min(x0, x1), "y": min(y0, y1), "w": abs(x1 - x0), "h": abs(y1 - y0)}
    if arr.ndim == 2 and arr.shape[1] >= 2:
        xs = [float(p[0]) for p in arr.tolist()]
        ys = [float(p[1]) for p in arr.tolist()]
        return {"x": min(xs), "y": min(ys), "w": max(xs) - min(xs), "h": max(ys) - min(ys)}
    raise ValueError("unsupported poly")


def _blocks_from_legacy(lines: list, raster_width: int, raster_height: int) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for line in lines:
        if not line or len(line) < 2:
            continue
        box, text_info = line[0], line[1]
        if isinstance(text_info, (list, tuple)):
            text = str(text_info[0] or "").strip()
            conf = float(text_info[1]) if len(text_info) > 1 else 0.0
        else:
            text, conf = str(text_info or "").strip(), 0.0
        if not text:
            continue
        try:
            bbox = _poly_like_to_bbox(box)
        except Exception:
            continue
        blocks.append(
            make_block(
                block_type="text",
                text=text,
                confidence=conf,
                bbox=bbox,
                raster_width=raster_width,
                raster_height=raster_height,
            )
        )
    return blocks


def _blocks_from_rec_dict(ocr_result: object, raster_width: int, raster_height: int) -> list[dict[str, Any]]:
    if isinstance(ocr_result, dict):
        data = ocr_result
    else:
        data = getattr(ocr_result, "__dict__", {})
        for name in ("to_dict", "model_dump"):
            fn = getattr(ocr_result, name, None)
            if callable(fn):
                try:
                    out = fn()
                    if isinstance(out, dict):
                        data = out
                        break
                except Exception:
                    pass
    rec_texts = list(data.get("rec_texts") or getattr(ocr_result, "rec_texts", []) or [])
    rec_scores = list(data.get("rec_scores") or getattr(ocr_result, "rec_scores", []) or [])
    rec_polys = data.get("rec_polys") or getattr(ocr_result, "rec_polys", []) or []
    rec_boxes = data.get("rec_boxes") or getattr(ocr_result, "rec_boxes", []) or []
    blocks: list[dict[str, Any]] = []
    for i, text in enumerate(rec_texts):
        text = str(text or "").strip()
        if not text:
            continue
        conf = float(rec_scores[i]) if i < len(rec_scores) else 0.0
        poly = None
        for seq in (rec_polys, rec_boxes):
            try:
                if seq is not None and len(seq) > i:
                    poly = seq[i]
                    break
            except Exception:
                pass
        if poly is not None:
            try:
                bbox = _poly_like_to_bbox(poly)
            except Exception:
                bbox = {"x": 0.0, "y": float(i * 24), "w": float(raster_width), "h": 24.0}
        else:
            bbox = {"x": 0.0, "y": float(i * 24), "w": float(raster_width), "h": 24.0}
        blocks.append(
            make_block(
                block_type="text",
                text=text,
                confidence=conf,
                bbox=bbox,
                raster_width=raster_width,
                raster_height=raster_height,
            )
        )
    return blocks


def parse_paddle_ocr_result(result: object, raster_width: int, raster_height: int) -> list[dict[str, Any]]:
    result = _normalize_predict_output(result)
    if result is None:
        return []
    if isinstance(result, list) and result:
        first = result[0]
        if hasattr(first, "rec_texts") or (isinstance(first, dict) and "rec_texts" in first):
            merged: list[dict[str, Any]] = []
            for page in result:
                merged.extend(_blocks_from_rec_dict(page, raster_width, raster_height))
            return merged
        if isinstance(first, list) and first and isinstance(first[0], (list, tuple)):
            return _blocks_from_legacy(list(first), raster_width, raster_height)
    if hasattr(result, "rec_texts"):
        return _blocks_from_rec_dict(result, raster_width, raster_height)
    return []


def run_paddle_ocr(img_np: np.ndarray, *, lang: str) -> list[dict[str, Any]]:
    ocr = get_paddle_ocr(lang)
    h, w = img_np.shape[:2]
    predict = getattr(ocr, "predict", None)
    if callable(predict):
        result = predict(img_np)
    else:
        result = ocr.ocr(img_np, cls=True)
    blocks = parse_paddle_ocr_result(_normalize_predict_output(result), w, h)
    if blocks:
        return blocks
    legacy = getattr(ocr, "ocr", None)
    if callable(legacy):
        return parse_paddle_ocr_result(legacy(img_np), w, h)
    return []


def run_pp_structure_tables(
    img_np: np.ndarray,
    *,
    lang: str,
    raster_width: int,
    raster_height: int,
) -> list[dict[str, Any]]:
    try:
        engine = get_pp_structure(lang)
        result = engine(img_np)
    except Exception as exc:
        logger.warning("PP-Structure failed: %s", exc)
        return []

    tables: list[dict[str, Any]] = []
    for item in result or []:
        if str(item.get("type") or "").lower() != "table":
            continue
        res = item.get("res")
        bbox_raw = item.get("bbox")
        if isinstance(bbox_raw, (list, tuple)) and len(bbox_raw) >= 4:
            bbox = {
                "x": float(bbox_raw[0]),
                "y": float(bbox_raw[1]),
                "w": max(1.0, float(bbox_raw[2]) - float(bbox_raw[0])),
                "h": max(1.0, float(bbox_raw[3]) - float(bbox_raw[1])),
            }
        else:
            bbox = {"x": 0.0, "y": 0.0, "w": float(raster_width), "h": float(raster_height)}
        html_content = ""
        if isinstance(res, dict):
            html_content = str(res.get("html") or "")
        cells = html_table_to_cells(html_content, bbox=bbox, raster_width=raster_width, raster_height=raster_height)
        if not cells:
            continue
        tables.append(
            make_block(
                block_type="table",
                text="",
                confidence=0.9,
                bbox=bbox,
                raster_width=raster_width,
                raster_height=raster_height,
                cells=cells,
            )
        )
    return tables
