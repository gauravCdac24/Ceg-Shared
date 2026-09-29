#!/usr/bin/env python3
"""Regenerate routing goldens from TurnRouter labels (deterministic preprocessor=None)."""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from agent_core.turn_router import TurnRouter  # noqa: E402

_TEMPLATES: dict[str, list[str]] = {
    "greeting": [
        "hi",
        "hello",
        "thanks",
        "thank you",
        "hey",
        "good morning",
        "hi there",
        "hello!",
        "thanks!",
    ],
    "capabilities": [
        "what can you do",
        "what do you do",
        "how do I use this",
        "help me get started",
    ],
    "question": [
        "tell me about certificates",
        "what is a certificate serial number",
        "explain how issuance works",
        "how does bulk issue work",
    ],
    "create": [
        "create certificate",
        "generate certificate for Jane Doe",
        "issue a cert for the workshop",
        "make a certificate for John",
    ],
    "edit": [
        "improve the typography hierarchy",
        "change the hero title font size",
        "update the background color to navy",
        "redesign the layout header",
    ],
    "analyze": [
        "analyze accessibility of this certificate",
        "review the layout contrast",
        "run an accessibility check on the template",
    ],
    "bulk_operation": [
        "generate 500 certificates",
        "issue 200 certs for attendees",
        "bulk create 1000 certificates",
    ],
    "clarification": [
        "improve",
        "fix it",
        "make it better",
        "update this",
        "help",
    ],
}

_TARGET_PER_CATEGORY = 125


async def _label(text: str) -> tuple[str, str | None]:
    decision = await TurnRouter(preprocessor=None).route(text)
    return decision.intent.value, decision.path


async def main() -> int:
    goldens_dir = Path(__file__).resolve().parent / "goldens"
    goldens_dir.mkdir(parents=True, exist_ok=True)
    all_rows: list[dict] = []
    clar_rows: list[dict] = []

    for category, phrases in _TEMPLATES.items():
        for i in range(_TARGET_PER_CATEGORY):
            base = phrases[i % len(phrases)]
            text = base if i < len(phrases) else f"{base} ({i})"
            intent, path = await _label(text)
            row = {
                "text": text,
                "expected_intent": intent,
                "expected_path": path,
                "category": category,
            }
            all_rows.append(row)
            if category == "clarification":
                clar_rows.append(row)

    (goldens_dir / "routing_all.jsonl").write_text(
        "\n".join(json.dumps(r) for r in all_rows) + "\n",
        encoding="utf-8",
    )
    (goldens_dir / "routing_clarification.jsonl").write_text(
        "\n".join(json.dumps(r) for r in clar_rows) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(all_rows)} rows to routing_all.jsonl")
    print(f"Wrote {len(clar_rows)} rows to routing_clarification.jsonl")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
