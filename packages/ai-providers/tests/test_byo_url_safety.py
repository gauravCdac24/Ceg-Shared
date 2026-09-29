from __future__ import annotations

import pytest

from ai_providers.resolver import AiProviderMode, AiProviderSaveRequest, AiProviderSettingsStored, merge_save_request
from ai_providers.url_safety import validate_byo_base_url


def test_validate_byo_base_url_blocks_localhost() -> None:
    with pytest.raises(ValueError, match="url_blocked"):
        validate_byo_base_url("http://localhost:11434")


def test_merge_save_request_blocks_private_byo_base_url() -> None:
    existing = AiProviderSettingsStored()
    payload = AiProviderSaveRequest(
        mode=AiProviderMode.byo,
        provider="openai_compatible",
        base_url="http://127.0.0.1:11434",
        model="qwen2.5:7b",
    )
    with pytest.raises(ValueError, match="url_blocked"):
        merge_save_request(existing, payload)
