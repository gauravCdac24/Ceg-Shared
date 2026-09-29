"""Raster OCR fallbacks: Tesseract and EasyOCR."""
from __future__ import annotations

import logging
from typing import Any

import numpy as np
from PIL import Image

from .blocks import clamp_line_bbox_height, make_block, merge_word_boxes

logger = logging.getLogger("ocr_extraction.raster")


def autorotate_for_ocr(pil: Image.Image) -> Image.Image:
    try:
        import pytesseract

        osd = pytesseract.image_to_osd(pil.convert("RGB"))
        rotate = 0
        for line in str(osd).splitlines():
            if line.lower().startswith("rotate:"):
                try:
                    rotate = int(line.split(":", 1)[1].strip())
                except Exception:
                    rotate = 0
                break
        if rotate % 360 == 0:
            return pil
        return pil.rotate(rotate, expand=True)
    except Exception:
        return pil


def extract_tesseract_blocks(pil: Image.Image, raster_width: int, raster_height: int) -> list[dict[str, Any]]:
    try:
        import pytesseract
        from pytesseract import Output
    except ImportError:
        return []

    pil = autorotate_for_ocr(pil)
    raster_width, raster_height = pil.size
    try:
        data = pytesseract.image_to_data(pil.convert("RGB"), output_type=Output.DICT, config="--psm 1")
    except Exception as exc:
        logger.warning("pytesseract failed: %s", exc)
        return []

    words: list[dict[str, Any]] = []
    n = len(data.get("text") or [])
    for i in range(n):
        text = str(data["text"][i] or "").strip()
        if not text:
            continue
        try:
            conf = float(data["conf"][i])
        except Exception:
            conf = 0.0
        if conf < 0:
            continue
        words.append(
            {
                "text": text,
                "confidence": min(1.0, max(0.0, conf / 100.0)),
                "bbox": {
                    "x": float(data["left"][i]),
                    "y": float(data["top"][i]),
                    "w": max(1.0, float(data["width"][i])),
                    "h": max(1.0, float(data["height"][i])),
                },
            }
        )
    return merge_word_boxes(words, raster_width, raster_height)


def extract_easyocr_blocks(
    pil: Image.Image,
    raster_width: int,
    raster_height: int,
    *,
    lang: str = "en",
) -> list[dict[str, Any]]:
    try:
        import easyocr
    except ImportError:
        return []

    try:
        langs = ["en"] if lang in ("en", "") else [lang, "en"]
        reader = easyocr.Reader(langs, gpu=False, verbose=False)
        arr = np.asarray(pil.convert("RGB"))
        results = reader.readtext(arr)
    except Exception as exc:
        logger.warning("EasyOCR failed: %s", exc)
        return []

    blocks: list[dict[str, Any]] = []
    for poly, text, conf in results:
        text = str(text or "").strip()
        if not text:
            continue
        try:
            xs = [float(p[0]) for p in poly]
            ys = [float(p[1]) for p in poly]
            x0, y0 = min(xs), min(ys)
            x1, y1 = max(xs), max(ys)
        except Exception:
            continue
        line_bbox = clamp_line_bbox_height(
            {"x": x0, "y": y0, "w": max(1.0, x1 - x0), "h": max(1.0, y1 - y0)},
            raster_height=raster_height,
        )
        blocks.append(
            make_block(
                block_type="text",
                text=text,
                confidence=float(conf) if conf is not None else 0.5,
                bbox=line_bbox,
                raster_width=raster_width,
                raster_height=raster_height,
                font_size=float(line_bbox["h"]) * 0.85,
            )
        )
    return blocks


def extract_image_blocks(
    pil: Image.Image,
    raster_width: int,
    raster_height: int,
    *,
    lang: str = "en",
) -> list[dict[str, Any]]:
    blocks = extract_tesseract_blocks(pil, raster_width, raster_height)
    if blocks:
        return blocks
    return extract_easyocr_blocks(pil, raster_width, raster_height, lang=lang)
