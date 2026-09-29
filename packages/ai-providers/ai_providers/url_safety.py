"""SSRF-safe BYO base URL validation (shared across tenant ai-provider routes)."""

from __future__ import annotations

import ipaddress
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


def validate_byo_base_url(base_url: str) -> str:
    """Raise ValueError(url_blocked:reason) when URL is not safe for outbound BYO calls."""
    target = normalize_url(base_url or "").rstrip("/")
    parsed = urlparse(target)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("url_blocked:invalid_scheme")
    host = (parsed.hostname or "").strip().lower()
    if not host:
        raise ValueError("url_blocked:no_host")
    if host in _BLOCKED_HOSTS:
        raise ValueError("url_blocked:blocked_host")
    if _host_bad_ip(host):
        raise ValueError("url_blocked:blocked_ip_literal")
    try:
        for info in socket.getaddrinfo(host, None, type=socket.SOCK_STREAM):
            addr = info[4][0]
            if _host_bad_ip(addr):
                raise ValueError("url_blocked:resolved_private")
    except socket.gaierror:
        raise ValueError("url_blocked:dns_failed") from None
    return target
