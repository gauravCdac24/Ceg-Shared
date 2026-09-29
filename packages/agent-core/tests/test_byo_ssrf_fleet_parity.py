"""Fleet BYO SSRF parity matrix — documents shared validation surfaces."""

from __future__ import annotations

from pathlib import Path

from agent_core.agent_routes_shared import validate_byo_base_url
from ai_providers.resolver import merge_save_request


def test_agent_core_test_byo_model_uses_validator() -> None:
    source = Path(__file__).resolve().parents[1].joinpath("agent_core/agent_routes_shared.py").read_text(
        encoding="utf-8"
    )
    assert "validate_byo_base_url" in source


def test_ai_providers_merge_save_request_validates_byo_urls() -> None:
    source = inspect.getsource(merge_save_request)
    assert "validate_byo_base_url" in source


def test_validate_byo_base_url_blocks_loopback() -> None:
    import pytest
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc:
        validate_byo_base_url("http://127.0.0.1:11434")
    assert "url_blocked" in str(exc.value.detail)
