"""Sprint-7 capacity gate tests."""

import pytest

from agent_core.capacity_gate import CapacityGateError, assert_heavy_agent_capacity


def test_tiny_langgraph_refused():
    with pytest.raises(CapacityGateError, match="tiny"):
        assert_heavy_agent_capacity(
            use_langgraph=True,
            enable_multi_agent=False,
            profile="tiny",
        )


def test_small_multi_agent_refused():
    with pytest.raises(CapacityGateError, match="small"):
        assert_heavy_agent_capacity(
            use_langgraph=False,
            enable_multi_agent=True,
            profile="small",
        )


def test_standard_allows_heavy_flags():
    assert_heavy_agent_capacity(
        use_langgraph=True,
        enable_multi_agent=True,
        profile="standard",
    )


def test_flags_off_any_profile_ok():
    assert_heavy_agent_capacity(
        use_langgraph=False,
        enable_multi_agent=False,
        profile="tiny",
    )
