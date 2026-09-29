"""Bootstrap QuizForge ASGI contract tests without a live HTTP server."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
import pytest_asyncio

_REPO_ROOT = Path(__file__).resolve().parents[4]
_QF_BACKEND = _REPO_ROOT / "QUIZ" / "quizforge" / "backend"

if str(_QF_BACKEND) not in sys.path:
    sys.path.insert(0, str(_QF_BACKEND))

# Required by QuizForge Settings before `app.main` import.
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault(
    "DATABASE_URL",
    os.getenv(
        "QUIZFORGE_CONTRACT_DATABASE_URL",
        "postgresql+asyncpg://ceg:ceg@127.0.0.1:5432/quizforge",
    ),
)
os.environ.setdefault(
    "REDIS_URL",
    os.getenv("QUIZFORGE_CONTRACT_REDIS_URL", "redis://127.0.0.1:6379/3"),
)
os.environ.setdefault(
    "SECRET_KEY",
    os.getenv("QUIZFORGE_CONTRACT_SECRET_KEY", "contract-test-secret-key-32-chars-min"),
)
os.environ.setdefault("CELERY_BROKER_URL", os.environ["REDIS_URL"])
os.environ.setdefault("CELERY_RESULT_BACKEND", os.environ["REDIS_URL"])


@pytest_asyncio.fixture
async def qf_client():
    from httpx import ASGITransport, AsyncClient

    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
