"""SSRF-safe outbound URL validation for agent internet tools."""

from __future__ import annotations

import ipaddress
import re
import socket
from urllib.parse import urlparse


PRIVATE_NETS = (
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
)

_BLOCKED_HOSTS = frozenset({"localhost", "metadata.google.internal", "metadata.google"})


def normalize_url(url: str) -> str:
    cleaned = (url or "").strip()
    if cleaned.lower().startswith(("http://", "https://")):
        return cleaned
    return "https://" + cleaned


def _host_bad_ip(host: str) -> bool:
    try:
        ip = ipaddress.ip_address(host)
        return any(ip in net for net in PRIVATE_NETS)
    except ValueError:
        return False


def _idna_hostname(host: str) -> str:
    s = (host or "").strip().lower()
    if not s or "*" in s:
        return s
    try:
        return s.encode("idna").decode("ascii")
    except UnicodeError:
        return s


def validate_outbound_url(url: str) -> tuple[bool, str]:
    """Return (ok, reason). Blocks private IPs, metadata endpoints, non-http(s)."""
    parsed = urlparse(normalize_url(url))
    if parsed.scheme not in ("http", "https"):
        return False, "invalid_scheme"
    host = _idna_hostname(parsed.hostname or "")
    if not host:
        return False, "no_host"
    if host in _BLOCKED_HOSTS:
        return False, "blocked_host"
    if _host_bad_ip(host):
        return False, "blocked_ip_literal"
    try:
        infos = socket.getaddrinfo(host, None)
        for _fam, _socktype, _proto, _canonname, sockaddr in infos:
            if _host_bad_ip(sockaddr[0]):
                return False, "resolved_private"
    except OSError:
        return False, "dns_failed"
    return True, "ok"


def is_blocked_domain(url: str, blocked_domains: tuple[str, ...]) -> bool:
    parsed = urlparse(normalize_url(url))
    host = _idna_hostname(parsed.hostname or "")
    if not host:
        return True
    for pattern in blocked_domains:
        pat = pattern.strip().lower()
        if not pat:
            continue
        if pat.startswith("*."):
            suffix = pat[2:]
            if host == suffix or host.endswith("." + suffix):
                return True
        elif host == pat or host.endswith("." + pat):
            return True
    return False


def strip_html_to_text(html: str, *, max_chars: int = 24_000) -> str:
    """Minimal HTML-to-text without extra dependencies."""
    text = re.sub(r"(?is)<(script|style).*?>.*?</\1>", " ", html or "")
    text = re.sub(r"(?is)<br\s*/?>", "\n", text)
    text = re.sub(r"(?is)</p\s*>", "\n\n", text)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" {2,}", " ", text)
    return text.strip()[:max_chars]
