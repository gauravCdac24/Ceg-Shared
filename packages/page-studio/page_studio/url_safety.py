"""URL scheme allowlists for Craft.js landing-page props (SEC-OLS)."""
from __future__ import annotations

import re
from urllib.parse import urlparse

_BLOCKED_NAV_PREFIXES = (
    "javascript:",
    "vbscript:",
    "file:",
    "data:",
)

_DATA_IMAGE_PREFIX = "data:image/"


def _lower_stripped(url: str) -> str:
    return (url or "").strip().lower()


def is_safe_nav_url(url: str) -> bool:
    """Hyperlink targets: https/http, mailto, tel, or site-relative /path."""
    raw = (url or "").strip()
    if not raw:
        return True
    lower = raw.lower()
    if any(lower.startswith(p) for p in _BLOCKED_NAV_PREFIXES):
        return False
    if lower.startswith("mailto:") or lower.startswith("tel:"):
        return True
    if raw.startswith("/") and not raw.startswith("//"):
        return True
    parsed = urlparse(raw)
    return parsed.scheme in ("http", "https") and bool(parsed.netloc)


def is_safe_media_url(url: str) -> bool:
    """Image/media src: https/http, relative /path, or data:image/* only."""
    raw = (url or "").strip()
    if not raw:
        return True
    lower = raw.lower()
    if lower.startswith("javascript:") or lower.startswith("vbscript:") or lower.startswith("file:"):
        return False
    if lower.startswith(_DATA_IMAGE_PREFIX):
        return True
    if lower.startswith("data:"):
        return False
    if raw.startswith("/") and not raw.startswith("//"):
        return True
    parsed = urlparse(raw)
    return parsed.scheme in ("http", "https") and bool(parsed.netloc)


def is_safe_video_url(url: str) -> bool:
    """Embed sources: YouTube, Vimeo, or direct https mp4/webm only."""
    raw = (url or "").strip()
    if not raw:
        return True
    lower = raw.lower()
    if any(lower.startswith(p) for p in _BLOCKED_NAV_PREFIXES):
        return False
    if re.search(r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube-nocookie\.com/embed/)", lower):
        return True
    if re.search(r"vimeo\.com/\d+", lower):
        return True
    if re.search(r"player\.vimeo\.com/video/\d+", lower):
        return True
    if re.search(r"\.(mp4|webm)(\?|$)", lower):
        parsed = urlparse(raw)
        return parsed.scheme in ("http", "https") and bool(parsed.netloc)
    return False


def is_safe_open_url(url: str) -> bool:
    """Button open_url: https/http or site-relative /path only."""
    raw = (url or "").strip()
    if not raw:
        return True
    lower = raw.lower()
    if any(lower.startswith(p) for p in _BLOCKED_NAV_PREFIXES):
        return False
    if raw.startswith("/") and not raw.startswith("//"):
        return True
    parsed = urlparse(raw)
    return parsed.scheme in ("http", "https") and bool(parsed.netloc)


def assert_safe_url(url: str, *, field: str, node_id: str, kind: str = "nav") -> None:
    from page_studio.craft import CraftValidationError

    if not (url or "").strip():
        return
    ok = {
        "nav": is_safe_nav_url,
        "media": is_safe_media_url,
        "video": is_safe_video_url,
        "open": is_safe_open_url,
    }.get(kind, is_safe_nav_url)(url)
    if not ok:
        raise CraftValidationError(
            f"Unsafe URL in {field} (node {node_id}): only https, mailto, tel, or /relative paths allowed"
            if kind == "nav"
            else f"Unsafe URL in {field} (node {node_id})"
        )
