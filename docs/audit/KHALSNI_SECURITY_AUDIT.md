# KHALSNI — Security Audit

Gate 1 · 2026-09-05 · HEAD `574753e`
Baseline: OWASP ASVS L1/L2 checklist headings. Method: source review of auth, permission classes, tenant selectors, file handling, settings, and the URL surface. **No dynamic testing, no dependency CVE scan, no fuzzing** was performed (none is configured in the repo — see D9/D10).

Verdict: **PARTIAL**. No authorization bypass found in reviewed code paths. Four issues at MEDIUM, two at LOW. No CRITICAL/BLOCKER.

> **Gate 1R runtime addendum (2026-09-05):** D1, D2, D3, D4 **reproduced and re-verified at runtime** against a live seeded stack.
> - **D1**: `GET /media/secure_orders/1/documents/deadbeef.pdf` → **404**; `GET /media/payments/receipts/x.pdf` → **404**; `GET /media/../config/settings.py` → **404**; `GET /media/services/images/nope.png` → **404** (public prefix passes the guard, then 404s from static serve — proves the allow-list works both ways). `frontend/nginx.conf` also `deny all` on `secure_orders|payments`. **D1 fix holds at runtime.**
> - **D2**: live `GET /api/services/{slug}/` returns `pricing:{total_price:44, government_fee:null, company_fee:null}`; `config/tests_contract.py` asserts `related_services[]` carry no `service_fee`/`government_fee` keys. **D2 fix holds.**
> - **D3**: with `DJANGO_DEBUG` unset, `settings.DEBUG is False` and `SECURE_SSL_REDIRECT is True` (executed, not inferred). Cookie-secure/HSTS all key off `not DEBUG`.
> - **D4**: `accounts/tests_remediation::TokenVersionRevocationTests` — after `logout {all_devices:true}` the previously-valid access token returns **401** (`token_revoked`); access token carries `token_version` claim; plain logout does not bump it. 30-min access lifetime, rotating refresh, FE persists the rotated refresh token + clean-logout on `token_revoked`.
> - **Authorization matrix (new):** `config/tests_authz_matrix.py` — 78 role×endpoint + 3 IDOR/escalation assertions, all pass. Finding **D-AZ1** (provider reaches `/api/admin/dashboard`) reviewed → **not a defect** (order-scoped + revenue stripped for non-super-admin; SRS BR7 satisfied).
> - **`python manage.py check --deploy`**: run under production-like config — see "Deployment check" below.
>
> **Gate 2 update (2026-09-05):** D1, D2, D3, D4, D5 are **fixed and regression-tested** — see `KHALSNI_DEFECT_REGISTER.md` "GATE 2 — remediation status". `/media/` now serves only an allow-list of public prefixes; related-service fees are visibility-gated; `DEBUG` defaults False; access tokens are 30 min with refresh rotation + a `token_version` revocation path; uploads are magic-byte validated. Residual items: dependency CVE scan now runs in CI (`pip-audit`/`npm audit`) but has not executed in this session; a dedicated `login` brute-force throttle scope is still recommended (P2).

---

## 1. Findings

### D1 — Unauthenticated `/media/` route bypasses document access control — MEDIUM (P1)
`config/urls.py`:
```python
re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
```
- Uploaded order documents are stored at `MEDIA_ROOT/secure_orders/<order_number>/documents/<uuid4>.<ext>` (`documents/models.secure_document_upload_path`).
- The dedicated `DocumentDownloadAPIView` correctly enforces `can_user_download_document` / signed token / order-number+phone. This route does **not** — it serves any file under `MEDIA_ROOT` to anyone.
- Mitigations already in place: filename is a 128-bit `uuid4().hex` (not enumerable); API serializers expose only `download_url` (the guarded endpoint), never the raw `/media/` path; with `AWS_STORAGE_BUCKET_NAME` set, storage moves to private S3 and this route is inert.
- Residual risk: in the **documented non-S3 Docker deployment**, Django serves `/media/` directly. Any leak of a document URL (proxy/CDN cache, server access log, browser history, referrer header, backup listing) grants permanent unauthenticated access to that customer's ID/passport/authorization documents. This is an ASVS V8 (data protection) / broken-object-level-authorization defense-in-depth failure.
- Fix: serve `secure_orders/**` only through the authenticated view; in nginx use `internal;` + `X-Accel-Redirect`; restrict the catch-all `serve` to public catalog media prefixes (`service_categories/`, `services/`, public-site assets) or drop it entirely and require object storage in production.

### D2 — Public price-visibility leak on related services — MEDIUM (P1)
`services/serializers.py::RelatedServiceSerializer` (`fields = (…, "service_fee", "government_fee")`) is embedded in `ServiceDetailSerializer.get_related_services` and returned by the `AllowAny` endpoint `GET /api/services/<slug>/`. It emits raw `government_fee` and `service_fee` for up to 4 same-category services **regardless of each service's `show_government_fee_public` / `show_company_fee_public` flags**. Violates A1/CE5 and acceptance criterion #9 ("Public APIs/pages expose only the selected price fields"). Information-disclosure of pricing structure.
- Fix: route those fields through `_public_pricing_payload` (or drop `service_fee`/`government_fee` from the related-service card, which only needs name/slug/image/duration).

### D3 — `DEBUG` defaults to `True` — MEDIUM (P1)
`config/settings.py`: `_debug = _get_bool_env("DJANGO_DEBUG", True)`. A deployment that omits `DJANGO_DEBUG` runs with `DEBUG=True`: stack-trace disclosure on 500s, `ALLOWED_HOSTS` effectively unenforced by Django's debug behaviour, all `SECURE_*` / cookie-secure / HSTS / SSL-redirect settings (which key off `not DEBUG`) disabled. Production is partly protected because a missing `DJANGO_SECRET_KEY` raises `ImproperlyConfigured` only when `DEBUG` is false — so "forgot the secret key" is caught but "forgot `DJANGO_DEBUG=False`" is not.
- Fix: default to `False`; require an explicit `DJANGO_DEBUG=True` for local dev only.

### D4 — Long-lived JWT access token, no rotation, no access-token revocation — MEDIUM (P1)
`SIMPLE_JWT`: `ACCESS_TOKEN_LIFETIME = 8h`, `REFRESH_TOKEN_LIFETIME = 7d`, `ROTATE_REFRESH_TOKENS = False`. `LogoutAPIView` blacklists the refresh token only. A stolen/leaked access token is valid for up to 8 hours with **no** server-side revocation path (logout, password reset, and role change do not invalidate outstanding access tokens). `docs/current_status_2026-06-16.md` already lists "confirm JWT lifetime choices match security policy" as an open production-readiness item.
- Fix: reduce access lifetime to ≤30–60 min; enable `ROTATE_REFRESH_TOKENS=True` with blacklist; consider a token version / `jti` deny-list checked on each request for logout & credential-change events.

### D5 — File-type validation trusts client-declared MIME — LOW (P2)
`documents/serializers.py::validate_file` and `Document.clean()` check: extension ∈ allowlist, size ≤ max, and `getattr(value, "content_type", "")` ∈ MIME allowlist. `content_type` is set by the browser/client and is trivially spoofable. No server-side content sniffing (`python-magic` / libmagic absent from `requirements.txt`).
- Mitigations: extension allowlist is the real gate; files are stored with randomized names and served `as_attachment=True` (no inline execution); a dangerous-extension blocklist exists in `Document.clean()`.
- Fix: add magic-byte validation for the 6 allowed types; reject on mismatch between sniffed type, extension, and declared MIME.

### D8 — Missing notification endpoints — LOW (P3)
No `unread-count` / `mark-all-read` (carried from 2026-06-16). Not a security issue; listed for completeness.

---

## 2. ASVS-style checklist results

| Area | Observation | Status |
|---|---|---|
| Authentication | `simplejwt` + Django password hashers (PBKDF2 default); `AUTH_PASSWORD_VALIDATORS` = UserAttributeSimilarity + MinimumLength + CommonPassword + NumericPassword (full standard set); email-based login; `set_unusable_password()` for guest accounts | OK |
| Session / token security | JWT in `localStorage`/`sessionStorage` (standard SPA XSS exposure — accepted tradeoff, documented); refresh single-flight queue in `client.js`; **D4** on lifetime/rotation | PARTIAL |
| Password reset | `PasswordResetToken` model + `auth/reset-password/<token>/`; throttled `auth_password_reset 5/hour`; tokens time-boxed | OK |
| Access control (function level) | ~35 explicit DRF permission classes; every admin viewset carries `permission_classes`; DRF default `IsAuthenticatedOrReadOnly` | OK |
| Access control (object level) | `can_view_order`, `get_orders_for_user`, `get_documents_for_user`, `visible_services_queryset`, `assert_order_transition_allowed` (customer-owns / provider-assigned / employee-assigned) | OK in reviewed paths |
| Broken object-level auth | **D1** (`/media/`); otherwise download/timeline/order endpoints re-fetch through scoped querysets | PARTIAL |
| Tenant isolation | `organizations/selectors.py` consumed by permissions + selectors; 2026-06 pass fixed provider/customer/category leaks; no full negative matrix this gate | PARTIAL |
| CSRF | `SessionAuthentication` active → CSRF enforced for session-cookie unsafe requests; API clients use `Bearer` (CSRF-exempt by design); `CSRF_TRUSTED_ORIGINS` env-driven; `CSRF_COOKIE_SECURE`/`SAMESITE` gated on `not DEBUG` (**D3**) | OK (contingent on D3) |
| XSS | React auto-escaping; 1 non-test `console.*`; no `dangerouslySetInnerHTML` observed in reviewed files (not exhaustively swept — recommend a grep in the UI gate) | Likely OK |
| SQL / ORM injection | Django ORM throughout; no raw SQL observed in reviewed modules | OK |
| File upload | ext + size + declared MIME + dangerous-ext blocklist + randomized names + `as_attachment` (**D5** on MIME trust) | PARTIAL |
| Filename / path handling | `secure_document_upload_path` ignores user filename, uses `uuid4`; `get_valid_filename` on original | OK |
| SSRF | No outbound-URL-fetch feature observed (no webhook/image-proxy). S3 endpoint is config, not user input | N/A / OK |
| Mass assignment | DRF `ModelSerializer` with explicit `fields`; `OrderAdminSerializer.DANGEROUS_FIELDS` blocklist on the raw record endpoint; admin serializers scoped | OK |
| CORS | `CORS_ALLOWED_ORIGINS` env-driven, defaults to localhost:5173/4173; `corsheaders` inserted only when installed | OK (verify prod env) |
| Secrets | `.env` git-ignored (`.gitignore` lines 21-24); only `.env.example` committed; `SECRET_KEY` required in prod | OK |
| Sensitive logs | `last_login_ip` stored; audit `old_value`/`new_value` may capture PII — acceptable for an audit log; no password/token logging observed | OK |
| Security headers | HSTS (1y, subdomains, preload), `SECURE_SSL_REDIRECT`, `SECURE_CONTENT_TYPE_NOSNIFF=True` always, `X_FRAME_OPTIONS=DENY`, `SECURE_REFERRER_POLICY=strict-origin-when-cross-origin`, `SECURE_PROXY_SSL_HEADER` — all correct **but the SSL/HSTS/cookie ones key off `not DEBUG`** (**D3**) | PARTIAL |
| Rate limiting | DRF throttles: anon 120/min, user 600/min, order-tracking 10/min, missing-service 5/h, password-reset 5/h | OK (tune for prod) |
| Brute-force protection | login not separately throttled beyond `anon`/`user` scope; no lockout | PARTIAL — consider a `login` scope |
| Dependency vulnerabilities | **not scanned** — no `pip-audit`/`npm audit`/Dependabot config beyond none | UNKNOWN (D9/D10) |
| Insecure configuration | **D3** (`DEBUG`); `/media/` serve (**D1**) | PARTIAL |
| Error-information leakage | DRF returns structured validation errors; debug pages only if **D3** triggers | PARTIAL |

---

## 3. Positives worth recording

- Workflow transitions cannot be bypassed via the generic status endpoint — `update_order_status` only dispatches whitelisted `generic_status_update` rules and audits every blocked attempt.
- The previously-flagged raw `AdminOrderRecordViewSet` is now guarded (`_safe_update` blocks final-state edits + a `DANGEROUS_FIELDS` set; `destroy` archives through the workflow).
- Delete actions require a re-entered admin password (`enforce_admin_delete_guard`) and every blocked delete is audited.
- Audit logs have no create/update/delete API surface — effectively immutable (satisfies A2 SD7).
- Order documents use unguessable storage names and attachment-only responses.
- No secrets, keys, or `.env` committed.
