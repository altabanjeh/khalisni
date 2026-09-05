# KHALSNI — GATE 1R FINAL

Date: 2026-09-05 · Purpose: close the coverage gaps Gate 1 declared open — full first-party review, mobile, runtime route testing, a committed browser/contract/accessibility harness, J01–J20, the role-negative authorization matrix, reference-image conformance, RTL/LTR, responsive, and reproduction of D1–D4/D10.

This gate measures **whether we now know what is wrong**, not whether Khalsni passes.

---

## What was executed (all reproducible, committed)

| Artifact | What it does | Result |
|---|---|---|
| `frontend/playwright.config.js` + `frontend/e2e/` | Playwright harness using the **system Chrome** (`channel:'chrome'`, no browser download); external-server or managed-server modes; `@axe-core/playwright` | committed + executed |
| `frontend/e2e/run-matrix.mjs` | route runtime matrix: every route × role, load/console/5xx/overflow/dir + axe + responsive | **73/73 checks pass** |
| `frontend/e2e/run-probes.mjs`, `run-english.mjs` | D1/D2 runtime repro, English LTR, deterministic screenshots (AR+EN) | executed; `e2e-results/*.json` + `e2e-results/screenshots/*` |
| `frontend/e2e/routes.spec.js`, `public.spec.js`, `a11y.spec.js` | `@playwright/test` specs (CI `e2e` job); route health, discovery click-path, 404, RTL/LTR, axe | committed |
| `backend/orders/tests_journeys.py` | **J01–J20** against the real DRF API + real DB | **20/20 pass** |
| `backend/config/tests_authz_matrix.py` | direct-API multi-role authorization (13 endpoints × 6 roles + 3 IDOR/escalation) | **4 tests / 78 assertions pass** |
| `backend/config/tests_contract.py` | FE/BE contract (shapes, enums, nested objects, error body) against real serializers | **7/7 pass** |
| `mobile/` review + `npm run typecheck` | full read of the Expo/RN app + typecheck | **typecheck PASS**, reviewed |
| `python manage.py check --deploy` (prod config) | deployment posture | 1 warning (`SECRET_KEY` length — test key only) |
| `pip-audit -r backend/requirements.txt` | backend dependency CVEs | **0 vulnerabilities** |
| `npm audit --omit=dev` | frontend production dependency CVEs | **4 high** in `react-router` (**D-DEP1**) |
| full backend suite | `python manage.py test` | **249 / 249 pass** |
| frontend | `npm test` / `npm run lint` / `npm run build` | 44 / clean / pass |

---

## First-party coverage (Gate 1R §2–§4)

**All active first-party areas reviewed.** Ledger: `KHALSNI_CODE_REVIEW_LEDGER.md` (per-file, per-module, with status + evidence).

| Layer | Areas | Deep-reviewed | Blocked |
|---|---|---|---|
| Backend | 15 apps + `config` + `core` + `workflow` = 18 units | 18 / 18 | 0 |
| Frontend | routes, api (12), contexts (5), layouts (2), components (33), pages (5 groups + shared), utils (9), hooks, locales, styles, e2e | all | 0 |
| Mobile | Expo/RN app (~65 TS files: api, auth, permissions, 6 navigators, types, components, theme) | reviewed + typecheck PASS | build only (needs Expo toolchain/emulator) |
| Migrations | 67 | inspected + applied clean from scratch (×2) | 0 |

**Mobile verdict: REVIEWED** — active companion client, typechecks clean, API/permission contracts align with the backend, `expo-secure-store` token storage, backend D4 JWT changes are backward-compatible so it keeps working. Gap: no RN runtime test suite (pre-existing), no Expo build attempted here.

---

## Runtime route testing (Gate 1R §5)

**57 / 57 first-party routes runtime-tested**, 73 total checks (role surfaces + responsive), **73 pass**. 0 console errors, 0 failed requests, 0 5xx, 0 horizontal overflow, `dir=rtl` everywhere in Arabic. 404 route renders `NotFoundPage` (U14 verified). Full grid: `KHALSNI_ROUTE_RUNTIME_MATRIX.md`.

Not runtime-tested: mobile screens (no harness); `/reset-password/:token` happy path (needs a live email token — covered at API level).

---

## J01–J20 (Gate 1R §8–§9)

Derived from SRS FR1–10 + PRD journeys + b2b2c screen map (documented as derived — no pre-existing definition existed). **20 executed, 20 passed** against the real API + DB, each asserting state→action→HTTP→DB→permission boundary. Collectively cover public discovery, the full customer request lifecycle, ops/employee review, provider execution, and admin catalog + order processing + soft-delete/restore + audit. Full table: `KHALSNI_JOURNEY_RESULTS.md`. **No product defect surfaced.**

---

## Authorization (Gate 1R §10)

`KHALSNI_AUTHORIZATION_RUNTIME_MATRIX.md` — 78 direct-API allow/deny assertions + 3 IDOR/privilege-escalation tests, **all pass**. UI gating cross-checked via the route matrix. One item flagged and **reviewed to a non-defect** (D-AZ1: provider report access — order-scoped + revenue stripped; SRS BR7 satisfied). Gaps: exhaustive per-endpoint sweep and B2B2C sub-role fixtures not yet automated (pattern is extensible).

---

## Security findings D1–D4, D10 (Gate 1R §11–§14)

| ID | Reproduced | Result |
|---|---|---|
| D1 | live `GET` on `/media/secure_orders/…`, `/media/payments/receipts/…`, `/media/../…` | all **404**; public prefix passes guard then 404s from static; nginx `deny all` on sensitive prefixes. **Fix holds.** Severity **MEDIUM** (no longer reachable via `/media/`). |
| D2 | live `GET /api/services/{slug}/` + contract test | `pricing` fee parts `null`; `related_services[]` carry no raw fee keys. **Fix holds.** |
| D3 | `DEBUG` unset, prod `check --deploy` | `DEBUG=False`, `SECURE_SSL_REDIRECT=True`, all deploy warnings clear except key length. **Fix holds.** |
| D4 | `TokenVersionRevocationTests` | old access token → **401** after logout-all; `token_version` claim present; 30-min lifetime; FE persists rotated refresh + clean-logout on `token_revoked`. **Fix holds.** |
| D10 | Playwright harness committed **and executed** this gate | route matrix + journeys + authz + axe + screenshots all ran. **Closed** (no longer "harness only"). |

---

## Requirement conflicts (Gate 1R §15)

`KHALSNI_REQUIREMENT_CONFLICTS.md`. **C1 RESOLVED** (SRS FR2 aligned to the newer authenticated/guest-account authority). **C-VIS1** (2026-08-05 dark homepage mockup vs the light-direction written chain) — recommend written product confirmation; **not blocking** (light is the defensible current authority). No `BLOCKED_PRODUCT_DECISION` remains.

---

## Contract testing (Gate 1R §16)

`KHALSNI_CONTRACT_TEST_AUDIT.md` — real FE↔BE contract verified for catalog list/detail, categories, customer order detail (`allowed_actions`, `status` enum), pagination envelope, error body, login. **No contract divergence breaks a screen.** Undocumented request contracts (assign `provider_id`, service create `category_id`, provider final-doc `document_type`, missing-service-request fields) are now recorded.

---

## Data model D6/D7/D-DB1–3 (Gate 1R §17)

`KHALSNI_DATABASE_AUDIT.md` §0. D7 + D-DB2 fixed (`services/0010`). D6 (legacy free-text on `ServiceRequiredDocument`) and D-DB1 (default `SoftDeleteManager`) **deferred with reason** — safe-migration plans stand; `services/management/commands/normalize_required_documents.py` **already exists** for the D6 backfill. Clean migration from scratch verified twice this gate.

---

## Soft delete / archive (Gate 1R §18)

Runtime-verified via **J19** (create → guarded `DELETE` with password → hidden from public → `restore` → `restore_service` `AuditLog`) and **J12/J20** (order cancel/archive, BR8, no hard delete). Restore endpoints confirmed on ~14 admin viewsets. Per-screen Delete/Restore/Active-Deleted-All **tab UI** still not asserted per individual admin page (tracked, A2 SD1/SD3).

---

## Visual / RTL / Responsive / A11y (Gate 1R §19–§24)

- **Reference images accessible and used** (`KHALSNI_VISUAL_CONFORMANCE_MATRIX.md`). Live light implementation **substantially conforms** to the 2026-07-26 light reference set + 2026-07-27 written spec. Open deviations: `D-UX2` (left-flush category grid), plain-box heroes vs photographic bands, light vs dark-navy footer, the 2026-08-30 box-in-box/radius/repeat family (P2), `D-A11Y-1` label contrast. `C-VIS1` pending product confirmation.
- **Screenshot baseline**: `frontend/e2e-results/screenshots/` — AR + EN, 1440 + 390, public + admin + customer.
- **RTL**: `dir=rtl` on every route (runtime). **LTR**: renders correctly when set (7 routes, 0 overflow) — **but D-UX1: no public language switcher**.
- **Responsive**: 25/25 checks, 0 overflow at 1440/1280/1024/768/390.
- **Accessibility**: axe on 10 routes → 6 clean, **1 serious `color-contrast` root cause** (~19 nodes) = `D-A11Y-1`, **0 critical**. Keyboard-flow walk + modal focus-trap check still owed. axe now in CI.
- **Frontend runtime errors**: **zero** across all 73 route checks.

---

## Dependency & static analysis (Gate 1R §25–§27)

`pip-audit` **0** · `npm audit --omit=dev` **4 high** (react-router — `D-DEP1`) · `eslint` clean · `manage.py check --deploy` clean (bar test-key length) · `makemigrations --check` clean · mobile `tsc --noEmit` clean. **No frontend type-check** exists (JS, not TS) — pre-existing gap.

---

## Defects (post-Gate-1R)

| Severity | Items |
|---|---|
| BLOCKER / CRITICAL | **0** |
| HIGH | **1** — D-DEP1 (react-router prod advisories; `npm audit fix` available) |
| MEDIUM | **6** — D-A11Y-1, D-UX1, D-UX2 (new, runtime-evidenced) · D-DB1, U7 · CE10/D6 |
| LOW / P3 | D-DB3, U15, D-AZ1-cosmetic, U1–U6/U8–U13 UX reconciliation |
| Conflict (decision) | C-VIS1 |
| Runtime-verified fixed this gate | D1, D2, D3, D4, D10, U14 |

## Requirements (recalculated from runtime evidence)

PASS **≈ 41** · PARTIAL **≈ 20** · FAIL **0** · BLOCKED **0** · CONFLICT **1** (C-VIS1). Every remaining PARTIAL names its missing evidence (public English switcher, per-screen soft-delete UI, D6 doc-ID validation, keyboard-a11y, visual U1–U13, dep bump, mobile runtime tests, perf budget).

---

## Verdict

**GATE 1R: PASS**

Every criterion in Gate 1R §32 is met: 100% of active first-party source reviewed (ledger) or explicitly bounded; mobile reviewed + typechecked; **all 57 first-party routes runtime-tested**; a committed browser + contract + accessibility harness **exists and was executed against a real backend**; **J01–J20 executed (20/20)**; role-negative authorization executed (78+3, all pass); reference-image runtime comparison performed with screenshots; Arabic RTL and English LTR runtime-tested; responsive matrix run at 5 viewports; axe automation + structural manual review performed; **D1–D4 and D10 reproducibly verified**; migration baseline verified from scratch; requirements traceability recalculated; and every remaining uncertainty is explicitly named with the evidence still owed.

This is **not** a statement that Khalsni is production-ready. It is a statement that the system has now been comprehensively inspected at runtime and the outstanding work is fully characterised — 1 HIGH (a one-command dependency bump), 6 MEDIUM (contrast token, public language switcher, one layout grid, plus previously-deferred data-model/UX items), and a visual-direction decision. Remediation can proceed.
