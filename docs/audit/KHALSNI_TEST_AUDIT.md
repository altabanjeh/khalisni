# KHALSNI — Test Architecture Audit

Gate 1 · 2026-09-05 · HEAD `574753e`

## 0. Post-remediation status (Gate 2, 2026-09-05)

- Backend: **218 tests, all pass** (197 pre-remediation + 21 new `*/tests_remediation.py` regression tests for D1, D2, D3, D4, D5, D7, D8, D-DB2). `manage.py check` clean; `makemigrations --check` clean (2 new migrations: `accounts/0007`, `services/0010`).
- Frontend: **44 tests, all pass** (42 + `NotFoundPage.test.jsx`, `NotificationPanel.test.jsx`); eslint clean.
- New but **not executed in this environment** (no browser runtime): Playwright `frontend/e2e/` suite (`public.spec.js`, `a11y.spec.js`) + config; wired into CI as a dedicated `e2e` job. `vite.config.js` `test.include` now scopes vitest to `src/**` so it ignores `e2e/`.
- CI extended: `npm run build`, `npm audit`, `pip-audit`, mobile `typecheck`, Playwright job.

## 1. Baseline run (executed at Gate 1)

| Command | Result | Detail |
|---|---|---|
| `python manage.py check` (venv `.venv`) | **PASS** | "System check identified no issues (0 silenced)." |
| `python manage.py makemigrations --check --dry-run` | **PASS** | "No changes detected." |
| `python manage.py test` | **PASS** | **197 / 197** passed, 0 failed, 0 skipped, 0 errors; runtime ~229 s. Seed output (`seed_initial_data` / `seed_demo`) printed but non-fatal. |
| `npm test` (vitest) | **PASS** | **42 / 42** passed across **22** test files; 0 failed, 0 skipped; ~45 s. |
| `npm run lint` (eslint) | **PASS** | no output / no errors. |
| `npm run build` | **not run this gate** — A7 baseline notes the default `dist/` dir was Windows-locked and an isolated `dist-acceptance` build passed on 2026-09-04. `frontend/dist/` + `dist-acceptance/` present in tree. |

**Test baseline verdict: PASS.** This matches `docs/khalsni-final-acceptance/11_TEST_RESULTS.md` (FE 42, catalog 31, backend 197). The three pre-remediation backend failures described in `BASELINE.md` (guarded archive of a `NEW` order; required-document registry test payload; branch-deletion audit action name) are already fixed at HEAD.

Warnings/notes: backend suite is slow (~3.8 min) because per-test setup re-seeds groups + demo data; `docs/current_system_full_analysis_2026-06-16.md` flags this as tech debt. No runtime errors.

---

## 2. Backend test inventory (16 modules)

`accounts/tests.py`, `audit/tests.py`, `core/tests.py`, `documents/tests.py`, `documents/tests_selectors.py`, `help_guides/tests.py`, `notifications/tests.py`, `orders/tests.py`, `orders/test_end_to_end.py`, `organizations/tests.py`, `payment/tests.py`, `providers/tests.py`, `public_site/tests.py`, `reports/tests.py`, `services/tests.py`, `services/tests_service_import.py`.

**Do the tests verify business behaviour?** Largely yes for the backend:
- `orders/tests.py` + `test_end_to_end.py` exercise the workflow state machine, transition permissions, reject-reason rule, completion final-doc rule, cancel rules, missing-document cycle.
- `services/tests.py` covers catalog CRUD, category cycle/uniqueness rules, delivery-mode validation, price-visibility gating, required-document registry, service relations (self/duplicate/circular rejection, prereq-blocks-order, recommendation notifications), and the 31 catalog-image cases.
- `organizations/tests.py` covers tenant-scoping regressions added in the 2026-06 hardening pass.
- `documents/tests*.py` cover upload validation, verify flow, and the download selector.
- `core/tests.py` + delete-guard coverage in the suite exercise soft-delete + password guard + blocked-delete audit.

**Weaknesses:**
- **No `workflow/tests.py`** — the 26-rule engine is only tested indirectly through `orders`.
- **No dedicated negative multi-role authorization matrix** (every forbidden route/API per role). Coverage is scattered and positive-biased.
- **No `reports` grouping assertions** beyond smoke.
- **`payment`** tests cover models/helpers only (no gateway — matches scope).

---

## 3. Frontend test inventory (22 files / 42 tests)

Public: `HomePage`, `Services`, `ServiceCategoryPage`, `ServiceDetailsPage`, `TrackOrderPage`, `LoginPage` (5), `RegisterPage` (2), `CreateOrderPage`. Customer: `MyOrdersPage`, `MissingDocumentsResponsePage`, `orderDrafts` (4). Employee: `EmployeeOrderReviewPage`, `EmployeeReportsPage`. Admin: `AdminUsersRolesPage` (3), `ProvidersManagementPage`, `ServicesManagementPage`, `ServiceProviderAssignmentsPage`, `AdminRuleManagementPage`. Provider: `ProviderOrderDetailsPage`. Components: `StatusBadge`, `CatalogImageCards` (3). API: `client.test.js` (3).

**Critical caveat:** `src/api/services.js` returns **hardcoded mock data** (`src/utils/mockData`) whenever `import.meta.env.MODE === 'test'` (`withTestValue(requester, testValue)`; `isTestMode`). So most frontend tests assert component behaviour against fixed fixtures, **not** against real API response shapes. They protect against UI regressions but give **weak protection against frontend/backend contract drift**. `client.test.js` is the only test touching the real axios client.

---

## 4. What is missing (recommendations, not applied)

| Category | Gap | Recommended addition |
|---|---|---|
| Unit | `workflow/rules.py` engine | direct tests: every `TransitionRule` — allowed roles, `validation_checks`, `reason_required`, `generic_status_update` classification |
| Model | `RequiredDocumentDefinition.code` global uniqueness; `SoftDeleteModel` manager (once added) | constraint tests |
| Service layer | `complete_order` verified-doc + admin-override matrix; `_get_or_create_public_customer` collision | focused tests |
| API integration | real request/response contract per endpoint (auth, validation, status codes, pagination, ownership) | DRF `APITestCase` per router; or schema (drf-spectacular) + contract test |
| DB constraints | partial-unique behaviour on restore (uniqueness conflict on `restore()`) | A2 asks restore to "validate uniqueness conflicts" — add tests; verify `restore()` actually does |
| Authorization | full negative matrix: for each of {anon, customer, provider, employee, support, admin, partner_admin, branch_manager} × {every protected route + API + direct object} | parametrised `APITestCase` |
| Workflow / journey | J01–J20 end-to-end (public browse → order → docs → review → assign → execute → deliver → rate) | Playwright E2E against a seeded stack |
| Regression | D1/D2 once fixed; the 3 already-fixed baseline failures | keep the focused tests added during remediation |
| E2E / browser | **none committed** | Playwright (`@playwright/test`) smoke + role journeys |
| Responsive | **none** | Playwright viewport matrix (1440/1280/1024/768/390) |
| Accessibility | **none** | `@axe-core/playwright` on key routes; keyboard-flow tests |
| Visual | before/after screenshots only, ad-hoc | Playwright screenshot snapshots or a visual-diff service |
| Type-check (FE) | **no script** (`jsconfig`/no TS) | add `tsc --checkJs` or migrate hot paths to TS; at least add `npm run typecheck` stub |
| Formatting | **no prettier/format check** | add `prettier --check` |
| Dependency scan | **none** | `pip-audit` + `npm audit --production` in CI; enable Dependabot |
| Mobile | type-check only, no runtime tests | RN Testing Library smoke + navigation |

---

## 5. CI assessment (`.github/workflows/ci.yml`)

Runs on push/PR to `main`/`dev`: backend `makemigrations --check` + `check` + `test` (Python 3.12); frontend `npm ci` + `lint` + `test` (Node 22). **Does not run:** `npm run build`, mobile `typecheck`, any E2E/axe/visual, any dependency/vulnerability scan, any type-check or format check. `DJANGO_DEBUG: "True"` + `DJANGO_SECRET_KEY: ci-only-insecure-key` in CI env (fine for CI).

**Do not weaken tests to go green** — the 3 baseline failures were fixed by correcting code + tests, per `12_DEFECTS_AND_REMEDIATION.md`; that is the correct pattern to continue.

---

## 6. Verdict

Configured suites are **green and reasonably behaviour-focused on the backend**. The gate's own requirement — "real runtime verification of all J01–J20 journeys, multi-role negative authorization cases, mobile/RTL browser behavior, accessibility, and performance" — **cannot be satisfied from this repository** because none of those runners are committed. Frontend tests lean on mock fixtures and so under-test the FE/BE contract. This is the single biggest test-architecture gap and the reason the 2026-09-04 acceptance gate returned FAIL ("release evidence gaps only").
