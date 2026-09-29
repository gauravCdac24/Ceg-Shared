#!/usr/bin/env python3
"""CI routing benchmark — precision/recall/F1 per intent from goldens/*.jsonl."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

# Allow running from repo root without install
_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from agent_core.turn_router import TurnRouter  # noqa: E402
from tests.eval.confusion_matrix import LabeledUtterance, per_intent_metrics  # noqa: E402


def load_goldens(goldens_dir: Path) -> list[LabeledUtterance]:
    rows: list[LabeledUtterance] = []
    for path in sorted(goldens_dir.glob("*.jsonl")):
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            obj = json.loads(line)
            text = obj.get("text") or obj.get("utterance")
            expected_intent = obj.get("expected_intent")
            if not text or not expected_intent:
                # Skip red-team / non-routing corpora (e.g. redteam_corpus.jsonl uses "input").
                continue
            rows.append(
                LabeledUtterance(
                    text=str(text),
                    expected_intent=str(expected_intent),
                    expected_path=obj.get("expected_path"),
                )
            )
    return rows


async def _run(rows: list[LabeledUtterance], min_f1: float) -> int:
    router = TurnRouter(preprocessor=None)
    pairs: list[tuple[str, str]] = []
    for row in rows:
        decision = await router.route(row.text)
        pairs.append((row.expected_intent, decision.intent.value))
    metrics, ok = per_intent_metrics(pairs, min_f1=min_f1)
    for intent, m in sorted(metrics.items()):
        print(
            f"{intent}: precision={m.precision:.3f} recall={m.recall:.3f} "
            f"f1={m.f1:.3f} support={m.support}"
        )
    if not ok:
        print(f"FAIL: at least one intent below F1 {min_f1}", file=sys.stderr)
        return 1
    print(f"PASS: all intents >= F1 {min_f1} ({len(rows)} examples)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--goldens",
        type=Path,
        default=Path(__file__).resolve().parent / "goldens",
    )
    parser.add_argument("--min-f1", type=float, default=0.9)
    args = parser.parse_args()
    rows = load_goldens(args.goldens)
    if not rows:
        print("No golden rows found", file=sys.stderr)
        return 2
    return asyncio.run(_run(rows, args.min_f1))


if __name__ == "__main__":
    raise SystemExit(main())
