# KHALSNI — Route Runtime Matrix (Gate 1R)

Executed 2026-09-05 against a **real stack**: seeded Django backend (SQLite throwaway DB, `seed_demo`) on `:8009` + production `vite build` + `vite preview` on `:4319`, driven by Playwright with the **system Chrome** (`channel: 'chrome'`, headless). Runner: `frontend/e2e/run-matrix.mjs` (results: `frontend/e2e-results/matrix.json`).

Per-route checks: HTTP status < 400; React `#root` renders > 30 chars of real text and no error-boundary text; `console.error` / `pageerror` / `requestfailed` / HTTP 5xx count = 0 (401 on unauthenticated bootstrap is allow-listed); horizontal overflow ≤ 2px; `<html dir>` recorded; axe (WCAG 2.0/2.1/2.2 A+AA) on primary routes.

## Summary

| Metric | Result |
|---|---|
| Total runtime checks | **73 / 73 passed** |
| Routes loaded (unique) | 57 / 57 (12 public + 5 customer + 6 employee + 22 admin + 3 provider + 404 + special) |
| Console errors / pageerrors | **0** across all routes |
| Failed network requests / HTTP 5xx | **0** |
| Horizontal overflow failures | **0** (at 1440; and 0 in the responsive sub-matrix) |
| `dir` in Arabic (default) | `rtl` on **every** route |
| 404 route | renders `NotFoundPage` (contains "404"), URL preserved — **U14 fix verified at runtime** |
| Responsive sub-matrix | 5 routes × 5 viewports (1440/1280/1024/768/390) = **25 / 25**, 0 overflow, all rendered |
| axe routes scanned | 10 · **6 clean** · 4 with serious `color-contrast` only (0 critical) — see `KHALSNI_ACCESSIBILITY_RUNTIME_AUDIT.md` |

## Public (anon, 1440)

| Route | Loads | API | Console | Layout | RTL | Status |
|---|---|---|---|---|---|---|
| `/` | 200 | ok | clean | ok (overflow 0) | rtl | PASS (axe: 10 contrast nodes) |
| `/services` | 200 | ok | clean | ok | rtl | PASS (axe: 7 contrast nodes) |
| `/services/category/:slug` | 200 | ok | clean | ok | rtl | PASS |
| `/services/:slug` (detail) | 200 | ok | clean | ok | rtl | PASS (via journey J03 + screenshot) |
| `/create-order` | 200 | ok | clean | ok | rtl | PASS |
| `/track-order` | 200 | ok | clean | ok | rtl | PASS (axe clean) |
| `/about` | 200 | ok | clean | ok | rtl | PASS |
| `/contact` | 200 | ok | clean | ok | rtl | PASS |
| `/faq` | 200 | ok | clean | ok | rtl | PASS (axe clean) |
| `/privacy` | 200 | ok | clean | ok | rtl | PASS |
| `/login` | 200 | ok | clean | ok | rtl | PASS (axe clean) |
| `/register` | 200 | ok | clean | ok | rtl | PASS (axe clean) |
| `/forgot-password` | 200 | ok | clean | ok | rtl | PASS |
| `/reset-password/:token` | 200 | ok | clean | ok | rtl | PASS (loads; token invalid path shows message) |
| `*` (unknown) | 200 (SPA) | — | clean | ok | rtl | PASS — 404 page, no redirect |

## Customer (authenticated, 1440)

| Route | Loads | Console | Layout | RTL | Status |
|---|---|---|---|---|---|
| `/customer` | 200 | clean | ok | rtl | PASS |
| `/customer/orders/new` | 200 | clean | ok | rtl | PASS |
| `/customer/orders` | 200 | clean | ok | rtl | PASS |
| `/customer/orders/:id` | 200 | clean | ok | rtl | PASS (journey J10) |
| `/customer/orders/:id/missing-docs` | 200 | clean | ok | rtl | PASS (journey J11) |
| `/customer/profile` | 200 | clean | ok | rtl | PASS |
| `/customer/manual` | 200 | clean | ok | rtl | PASS |

## Employee / Support (authenticated, 1440)

| Route | Loads | Console | Layout | RTL | Status |
|---|---|---|---|---|---|
| `/employee` | 200 | clean | ok | rtl | PASS (axe: 1 contrast node) |
| `/employee/orders` | 200 | clean | ok | rtl | PASS |
| `/employee/orders/:id` | 200 | clean | ok | rtl | PASS (journey J14) |
| `/employee/missing-service-requests` | 200 | clean | ok | rtl | PASS |
| `/employee/documents/verify` | 200 | clean | ok | rtl | PASS |
| `/employee/reports` | 200 | clean | ok | rtl | PASS |
| `/employee/service-categories` (support) | 200 | clean | ok | rtl | PASS (loads under support token via shared shell) |
| `/employee/service-relations` (support) | 200 | clean | ok | rtl | PASS |
| `/employee/manual` | 200 | clean | ok | rtl | PASS |

## Admin (authenticated, 1440) — all 22 PASS

`/admin`, `/admin/orders`, `/admin/orders/:id`, `/admin/rules`, `/admin/cms`, `/admin/service-categories`, `/admin/services`, `/admin/service-relations`, `/admin/public-site`, `/admin/public-site/content`, `/admin/public-site/advertisements`, `/admin/public-site/theme`, `/admin/public-site/preview`, `/admin/missing-service-requests`, `/admin/users`, `/admin/providers`, `/admin/provider-services`, `/admin/payments`, `/admin/reports`, `/admin/notifications`, `/admin/audit`, `/admin/help-guides`, `/admin/manual` — HTTP 200, rendered, clean console, no overflow, `dir=rtl`. `/admin` axe: 1 `color-contrast` node.

## Provider (authenticated, 1440) — all 3 PASS

`/provider`, `/provider/orders`, `/provider/orders/:id` (journey J18), `/provider/manual` — all PASS.

## Responsive sub-matrix

| Route \ viewport | 1440×900 | 1280×800 | 1024×768 | 768×1024 | 390×844 |
|---|---|---|---|---|---|
| `/` | 0px / rendered | 0px | 0px | 0px | 0px |
| `/services` | 0px | 0px | 0px | 0px | 0px |
| `/services/category/:slug` | 0px | 0px | 0px | 0px | 0px |
| `/login` | 0px | 0px | 0px | 0px | 0px |
| `/track-order` | 0px | 0px | 0px | 0px | 0px |

No horizontal overflow at any viewport. (Visual quality — box-in-box density and a left-flush "services by category" grid — is tracked in the UI/UX audit as D-UX2; it is a layout-polish issue, not a runtime failure.)

## Language / direction

- Arabic (default): `dir=rtl`, `lang=ar` on every route (runtime-confirmed).
- English: forcing `localStorage['khalisni-language']='en'` flips `dir=ltr`, `lang=en`, nav + page bodies render in English on all 7 tested public routes with **0 overflow**. Authenticated dashboard exposes a working `LanguageSwitcher` (rtl→ltr confirmed on `/admin`).
- **Finding D-UX1:** the public site (`PublicLayout`) renders **no** `LanguageSwitcher` — a public visitor has no UI to reach English. See UI/UX audit + defect register.

## Not runtime-tested

- `mobile/` screens — RN app has no runtime harness (type-check only; tracked).
- `/reset-password/:token` with a *valid* token (needs a live reset email token) — the route loads and validates; the happy path is covered at the API level by `accounts/tests` + journey-adjacent coverage.
