"""Unit tests for shared identity credentials store (no live Redis)."""

from __future__ import annotations

from ceg_auth.shared_identity import SharedIdentityStore, normalize_email, verify_password


class _MemRedis:
    def __init__(self) -> None:
        self._d: dict[str, str] = {}

    def get(self, name: str):
        return self._d.get(name)

    def set(self, name: str, value: str):
        self._d[name] = value
        return True


def test_normalize_email() -> None:
    assert normalize_email("  Ada@Example.COM ") == "ada@example.com"


def test_upsert_verify_roundtrip() -> None:
    store = SharedIdentityStore(_MemRedis(), enabled=True)
    store.upsert(
        "ada@example.com",
        "GoodPassw0rd!",
        full_name="Ada",
        source_product="quizforge",
        email_verified=False,
    )
    assert store.verify("ada@example.com", "wrong") is None
    hit = store.verify("ADA@example.com", "GoodPassw0rd!")
    assert hit is not None
    assert hit.full_name == "Ada"
    assert hit.email_verified is False
    assert store.mark_verified("ada@example.com") is True
    assert store.get("ada@example.com").email_verified is True  # type: ignore[union-attr]


def test_disabled_store_is_noop() -> None:
    store = SharedIdentityStore(_MemRedis(), enabled=False)
    assert store.upsert("a@b.com", "GoodPassw0rd!", source_product="x") is None
    assert store.verify("a@b.com", "GoodPassw0rd!") is None


def test_verify_password_helper() -> None:
    from ceg_auth.shared_identity import hash_password

    h = hash_password("GoodPassw0rd!")
    assert verify_password("GoodPassw0rd!", h)
    assert not verify_password("nope", h)
