"""Aggregate canvas_validity_rate from logged validation fixtures (eval harness)."""

from __future__ import annotations

import json
from pathlib import Path

FIXTURE = Path(__file__).with_name("canvas_validity_fixtures.jsonl")


def score_canvas_validity(fixtures_path: Path | None = None) -> dict[str, float]:
    path = fixtures_path or FIXTURE
    if not path.is_file():
        return {"canvas_validity_rate": 0.0, "cases": 0}
    total = 0
    valid = 0
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        row = json.loads(line)
        total += 1
        if row.get("expected_valid") is True:
            valid += 1
    rate = (valid / total) if total else 0.0
    return {"canvas_validity_rate": rate, "cases": total}


if __name__ == "__main__":
    print(json.dumps(score_canvas_validity(), indent=2))
