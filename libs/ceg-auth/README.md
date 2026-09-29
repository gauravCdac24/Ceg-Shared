# ceg-auth

Shared, config-driven auth helpers for the CEG monorepo (CeG Portal, WorkshopOS, QuizForge, Cert Studio, FetchDesk).

**Sprint 2 rule:** this package ships helpers + unit tests only. Products are **not** migrated yet — see [MIGRATION.md](./MIGRATION.md).

## Install (scratch / local)

```bash
cd libs/ceg-auth
pip install -e ".[dev]"
pytest
```

Optional JWT support (also included under `[dev]`):

```bash
pip install -e ".[jwt]"
```

## Modules

| Module | Role |
|--------|------|
| `config` | `AuthProductConfig` — product name, cookie prefix, TTLs, SameSite, secret |
| `cookies` | Set/clear `{prefix}_access_token` / `{prefix}_refresh_token` |
| `csrf` | Double-submit cookie vs header compare |
| `jwt` | Issue/verify stubs (HS256 via PyJWT when installed; RS256 config accepted) |
| `otp` | `otp_key` / `session_key` namespaces, SHA-256 hash + compare (no plaintext store API) |
| `rate_limit` | Jail/throttle Redis key naming helpers |
| `captcha` | HMAC math captcha (fail-open when `captcha_required=False`) |
| `blacklist` | `jwt_blacklist:{jti}` key helper |
| `totp` | RFC 6238 secret/URI/verify + SHA-256 single-use backup codes (`[totp]` extra) |
| `password_policy` | 12+ upper/lower/digit/special |
| `hibp` | HIBP k-anonymity range query (fail-open on outage) |
| `secrets` | Versioned signing keys (sign newest, verify any; rotation helper) |

## Design notes

- OTP payload keys and session-binding keys use **distinct Redis namespaces** (AUTH-001).
- Captcha mirrors Cert Studio’s HMAC pattern; verification returns `True` when captcha is disabled.
- Cookie helpers take Starlette `Response` — no product FastAPI dependency.
