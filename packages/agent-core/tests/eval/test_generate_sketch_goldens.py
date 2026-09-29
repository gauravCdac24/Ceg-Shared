"""Golden checks for generate/sketch prompt classes (Sprint-3 #17)."""

from __future__ import annotations

import json
from pathlib import Path

from agent_core.prompt_loader import load_prompt

GOLDENS = Path(__file__).resolve().parent / "goldens" / "generate_sketch.jsonl"

CLASS_TO_PROMPT = {
    "canvas_generate": "certstudio/canvas_generation_v1.md",
    "sketch_stabilize": "certstudio/sketch_stabilize_v1.md",
    "write_text": "certstudio/write_text_v1.md",
}


def test_generate_sketch_goldens_cover_prompt_classes():
    rows = [json.loads(line) for line in GOLDENS.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert len(rows) >= 4
    classes = {r["expected_class"] for r in rows}
    assert "canvas_generate" in classes
    assert "sketch_stabilize" in classes
    assert "write_text" in classes


def test_generate_sketch_prompt_files_match_must_contain():
    for line in GOLDENS.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if row.get("must_block"):
            continue
        cls = row["expected_class"]
        prompt_name = CLASS_TO_PROMPT[cls]
        text = load_prompt(prompt_name)
        for needle in row.get("must_contain") or []:
            assert needle.lower() in text.lower(), f"{prompt_name} missing {needle!r}"


def test_injection_golden_flagged():
    rows = [json.loads(line) for line in GOLDENS.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert any(r.get("must_block") for r in rows)
