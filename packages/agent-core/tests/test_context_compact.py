"""Tests for prompt context compaction."""

from __future__ import annotations

import json

from agent_core.context_compact import (
    compact_canvas_summary,
    compact_context_for_prompt,
    compact_context_for_prompt_with_stats,
    estimate_tokens,
)


def test_strips_canvas_json_and_summarizes_objects() -> None:
    huge_objects = [{"type": f"textbox-{i}", "id": i, "left": i * 10, "top": 20} for i in range(100)]
    ctx = {
        "surface": "certificate",
        "canvas_json": {"objects": huge_objects, "placeholderFields": ["name", "date"]},
        "craft_state": '{"blocks": ["x" * 5000]}',
    }
    out = compact_context_for_prompt(ctx)
    assert "canvas_json" not in out
    assert "craft_state" not in out
    assert out["canvas_element_count"] == 100
    assert "canvas_summary" in out
    assert "25 elements" not in out["canvas_summary"]  # 100 elements
    assert "100 elements" in out["canvas_summary"]
    assert out["placeholder_fields"] == ["name", "date"]
    assert out.get("craft_state_summary")
    assert len(json.dumps(out)) < 5000


def test_chat_path_skips_canvas_entirely() -> None:
    ctx = {
        "surface": "certificate",
        "canvas_json": {"objects": [{"type": "textbox", "text": "Hello", "left": 1, "top": 2}]},
        "canvas_element_count": 1,
        "current_canvas_code": "x" * 2000,
    }
    out, stats = compact_context_for_prompt_with_stats(ctx, routing_path="chat")
    assert stats["canvas_skipped_for_chat"] is True
    assert stats["raw_canvas_tokens"] > 0
    assert "canvas_json" not in out
    assert "canvas_element_count" not in out
    assert "canvas_summary" not in out
    assert "current_canvas_code" not in out
    assert out.get("surface") == "certificate"


def test_compact_canvas_lists_positions_for_small_canvases() -> None:
    objects = [
        {"type": "textbox", "text": "Title", "left": 10, "top": 20, "width": 200, "height": 40, "fill": "#fff"},
        {"type": "rect", "left": 0, "top": 0, "width": 100, "height": 50, "strokeWidth": 9},
    ]
    summary = compact_canvas_summary({"objects": objects})
    assert summary["canvas_element_count"] == 2
    elements = summary["canvas_elements"]
    assert len(elements) == 2
    assert elements[0]["text"] == "Title"
    assert "fill" not in elements[0]
    assert "strokeWidth" not in elements[1]


def test_empty_context_returns_empty_dict() -> None:
    assert compact_context_for_prompt(None) == {}
    assert compact_context_for_prompt({}) == {}


def test_ask_path_uses_summary_only() -> None:
    objects = [{"type": "textbox", "text": f"T{i}", "left": i, "top": i} for i in range(12)]
    ctx = {"canvas_json": {"objects": objects, "placeholderFields": ["name"]}}
    out, _stats = compact_context_for_prompt_with_stats(ctx, routing_path="ask")
    assert out["canvas_element_count"] == 12
    assert "canvas_summary" in out
    assert "canvas_elements" not in out
    assert "placeholder_fields" not in out


def test_estimate_tokens() -> None:
    assert estimate_tokens("abcd") == 1
    assert estimate_tokens("") == 0
