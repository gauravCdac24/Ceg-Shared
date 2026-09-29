# Migrating products onto `ceg-auth`

**Status:** Sprint 2 skeleton only — do **not** swap product imports until a later sprint explicitly schedules that product.

Shared package path: `libs/ceg-auth` (`pip install -e libs/ceg-auth` or workspace dep).

Each product constructs an `AuthProductConfig` and replaces local helpers with `ceg_auth.*` equivalents. Cookie names stay `{cookie_prefix}_access_token` / `{cookie_prefix}_refresh_token`.

---

## Cert Studio (reference / first migrate)

Cookie prefix: `certstudio` · Suggested sprint: 3

- [ ] Add `ceg-auth` dependency to `cert-studio-backend`
- [ ] Build `AuthProductConfig(product_name="certstudio", cookie_prefix="certstudio", …)` from existing settings
- [ ] Replace `app.security.auth_cookies` with `ceg_auth.cookies`
- [ ] Replace captcha helpers with `ceg_auth.captcha` (pass `secret_key`; `captcha_required` from settings)
- [ ] Point OTP Redis keys at `ceg_auth.otp.otp_key` / `session_key` (keep `certstudio:` product prefix)
- [ ] Use `ceg_auth.blacklist.blacklist_key` for `jwt_blacklist:{jti}`
- [ ] Wire CSRF double-submit via `ceg_auth.csrf.tokens_match` if middleware stays custom
- [ ] Keep contract tests green (`test_auth_cookie_paths`, captcha, OTP)
- [ ] Remove duplicated local modules only after tests pass

---

## CeG Portal (`ceg-core-api`)

Cookie prefix: `ceg` (confirm against live cookie name before cutover) · Suggested sprint: 4

- [ ] Add `ceg-auth` dependency to `ceg-core-api`
- [ ] Map settings → `AuthProductConfig` (`cookie_prefix`, TTLs, `AUTH_COOKIE_SAMESITE`, `SECRET_KEY`)
- [ ] Swap cookie set/clear helpers for `ceg_auth.cookies`
- [ ] Adopt `otp_key` / `session_key` for any email/login OTP Redis usage
- [ ] Replace login_jail key construction with `ceg_auth.rate_limit` helpers where applicable
- [ ] Captcha: use `ceg_auth.captcha` with fail-open when disabled
- [ ] JWT issue/verify: migrate gradually to `ceg_auth.jwt` once RS256/HS256 config is agreed
- [ ] Regression: HttpOnly cookies, `withCredentials`, tenant isolation auth tests

---

## WorkshopOS

Cookie prefix: `workshopos` · Suggested sprint: 4–5

- [ ] Add `ceg-auth` dependency to `workshopos-backend`
- [ ] Keep AUTH-001 split: `otp_key("login", id)` vs `session_key("login", id)` via package (product_prefix=`workshopos`)
- [ ] Replace local `password_otp` hash helpers with `ceg_auth.otp.hash_otp` / `otp_hashes_equal`
- [ ] Cookie helpers → `ceg_auth.cookies` (`workshopos_access_token`; add refresh when AUTH-004 lands)
- [ ] Login jail / throttle keys → `ceg_auth.rate_limit`
- [ ] Captcha parity with CeG/Cert Studio via `ceg_auth.captcha`
- [ ] Re-run `tests/test_login_otp_key_namespaces.py` after cutover

---

## QuizForge

Cookie prefix: `quizforge` · Suggested sprint: 5

- [ ] Add `ceg-auth` dependency to QuizForge backend
- [ ] Config: `cookie_prefix="quizforge"`, product OTP prefix consistent with existing `qf:` keys or migrate with dual-read
- [ ] Cookies: access + refresh via `ceg_auth.cookies`
- [ ] OTP: register/login/reset/candidate purposes via `otp_key` / `session_key` (no shared namespace collision)
- [ ] CSRF: double-submit compare via `ceg_auth.csrf`
- [ ] Captcha on register → `ceg_auth.captcha`
- [ ] Blacklist: `ceg_auth.blacklist.blacklist_key(jti)`
- [ ] Integration contract tests with CeG `QuizForgeClient` still pass (X-Api-Key paths unchanged)

---

## FetchDesk

Cookie prefix: `fetchdesk` · Suggested sprint: 5–6

- [ ] Add `ceg-auth` dependency to FetchDesk backend
- [ ] **AUTH-003:** stop plaintext OTP — use `hash_otp` only; Redis stores hash blob
- [ ] Map `fd:otp:*` keys through `otp_key` with `product_prefix` (sequence migrate carefully)
- [ ] Cookies: `fetchdesk_access_token` / `fetchdesk_refresh_token` via package helpers
- [ ] CSRF cookie/header compare via `ceg_auth.csrf`
- [ ] Captcha if/when enabled — fail-open with `captcha_required=False`
- [ ] Confirm CSRF cookie name (`fd_csrf_token` vs product convention) in product config notes

---

## Cutover checklist (any product)

- [ ] Editable install in CI: `pip install -e libs/ceg-auth`
- [ ] No new `localStorage` tokens — HttpOnly cookies only
- [ ] Product FastAPI app does not vendor copy of `ceg_auth` modules
- [ ] Rollback plan: keep old helpers behind a flag for one release if dual-running keys
