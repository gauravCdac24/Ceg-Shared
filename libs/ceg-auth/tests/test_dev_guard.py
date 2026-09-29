"""Tests for ceg_auth.dev_guard."""

from __future__ import annotations

import pytest

from ceg_auth.dev_guard import assert_dev_auth_disabled


def test_dev_guard_allows_local() -> None:
    assert_dev_auth_disabled(environment="local", dev_otp_active=True, product="test")


def test_dev_guard_blocks_prod_dev_otp() -> None:
    with pytest.raises(RuntimeError, match="DEV_OTP"):
        assert_dev_auth_disabled(environment="production", dev_otp_active=True, product="ceg")


def test_dev_guard_blocks_staging_bypass() -> None:
    with pytest.raises(RuntimeError, match="BYPASS"):
        assert_dev_auth_disabled(
            environment="staging",
            allow_dev_login_bypass=True,
            product="fetchdesk",
        )
