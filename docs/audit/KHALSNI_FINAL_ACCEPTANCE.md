# KHALSNI — Independent Final Acceptance & Production-Readiness Gate

Date: 2026-09-05 · Method: adversarial re-verification against the current working tree (HEAD `e32e015` + uncommitted Gate-2 round-2 changes). The premise of this gate was *"attempt to prove the remediation failed."* Every result below is backed by an executed command or an inspected artifact.

## What was executed this gate (not re-used claims)

| Activity | Command / artifact | Result |
|---|---|---|
| Clean backend dependency install | `pip install -r backend/requirements.txt` + `pip check` | installed missing `boto3`/`django-storages`/etc.; **"No broken requirements found"** |
| Clean frontend install | `npm ci` (from `package-lock.json`) | success after clearing stray `node.exe` file locks; `react-router-dom@7.18.3`, `axios@1.20.0` present |
| Backend system check | `manage.py check` | **0 issues** |
| Backend deploy check | `manage.py check --deploy` with real 60-char `SECRET_KEY`, `DEBUG=False`, real hosts | **0 warnings** (HSTS/SSL-redirect/secure-cookies/X-Frame/nosniff/referrer all correct) |
| Migration drift | `makemigrations --check --dry-run` | **No changes detected** |
| Clean-DB migrate + seed | fresh SQLite + `migrate` + `seed_demo` (×3 this session) | **no errors** |
| Full backend test suite | `manage.py test` | **283 tests, OK** (0 fail / 0 error / 0 skip; 241 s) |
| New adversarial suite | `config/tests_acceptance_adversarial.py` | **26 tests, OK** (negative input, mass assignment, IDOR, invalid workflow, auth edge, soft-delete leakage, full-flow data integrity) |
| Journey suite J01–J20 | `orders/tests_journeys.py` | **20/20 pass** (real API + DB) |
| Authorization matrix | `config/tests_authz_matrix.py` | **78 role×endpoint + 3 IDOR/escalation assertions pass** |
| FE/BE contract suite | `config/tests_contract.py` | **7/7 pass** |
| Frontend unit tests | `npm test` (vitest) | **44/44 pass** |
| Frontend lint | `npm run lint` (eslint) | **clean** |
| Frontend production build | `npm run build` | **pass** |
| `npm audit` (production deps) | `npm audit --omit=dev` | **0 vulnerabilities** |
| `pip-audit` (backend deps) | `pip-audit -r backend/requirements.txt` | **0 vulnerabilities** |
| Mobile type-check | `mobile/ npm run typecheck` (`tsc --noEmit`) | **exit 0** |
| Route runtime matrix | `e2e/run-matrix.mjs` (Playwright, system Chrome, real seeded stack) | **73/73 checks pass**, axe **10/10 routes clean**, **0 overflow**, **0 console errors** |
| Full visual / responsive / RTL sweep | `e2e/run-acceptance-visual.mjs` — 95 screenshots, AR + EN, public + customer + admin, 5 viewports | **0 horizontal overflow**, **0 console errors** across all 95 |
| Live `/media/` IDOR probe | `curl` on `secure_orders/`, `payments/receipts/`, `../` traversal | all **404** |
| Bundle secrets scan | `grep` over built `dist/assets/*.js` for keys/passwords/`.env` values | **none** (no real secrets; only the local build's API URL + a demo email domain) |
| Codebase sanity sweep | grep TODO/FIXME/skip/xfail/`.only`/console/bare-except | **0 TODO/FIXME**, **0 skipped/disabled tests**, 1 legitimate `console.error` (error boundary), 3 justified+logged broad excepts |

Reference images viewed and compared this gate: `image/2.jpeg` (request-creation form, light), `image/3.jpeg` (track-order, light), `image/WhatsApp Image 2026-08-05` (homepage, **dark** — the C-VIS1 outlier).

---

## Final Release Matrix

| Domain | Result | Evidence | Remaining defects |
|---|---|---|---|
| **Requirements** | **PASS** | traceability recalculated from runtime evidence: ~43 PASS / ~19 PARTIAL / 0 FAIL / 0 BLOCKED / 1 CONFLICT (C-VIS1). Every PARTIAL names its missing evidence. | none FAIL |
| **Architecture** | **PASS** | single authoritative domain models; DRF + tenant selectors; workflow state machine; no parallel/duplicate domain. Code review ledger: 39/39 first-party areas reviewed. | — |
| **Backend** | **PASS** | 283 tests OK; `check` clean; `pip check` clean | — |
| **Database** | **PASS** | `makemigrations --check` clean; fresh-DB migrate ×3 no error; adversarial full-flow asserts FKs, snapshots, ≥4 status logs, no dup docs, timestamps; 3 additive migrations (`accounts/0007`, `services/0010`, `services/0011`) | — |
| **API** | **PASS** | contract suite 7/7; every list endpoint envelope + item shape verified; error body is `{detail}` or field-map | — |
| **Authentication** | **PASS** | garbage bearer → 401 (not 500); 30-min access + rotating refresh; `token_version` revocation on logout-all/password-reset (`accounts/tests_remediation`); reset-token reuse rejected | — |
| **Authorization** | **PASS** | 81 direct-API assertions; IDOR (cross-customer read/mutate/download → 404/403); employee cannot delete catalog; provider cannot touch unassigned order; customer cannot hit admin/staff endpoints; frontend hiding is not relied upon | — |
| **Customer workflows** | **PASS** | J06–J13 + adversarial full-flow: register → login → create request (with docs) → upload → validation → submit → confirmation (KH-YYYY-######) → history → detail → timeline → missing-docs cycle → cancel rules → rate. Customer sees COMPLETED state. | — |
| **Admin workflows** | **PASS** | J14–J20 + adversarial: review queue → open → request docs → verify → assign (blocked until docs approved) → provider execution → final doc → verify → complete → archive (`archived_at` set); catalog create → soft-delete (password-guarded) → restore → audit (`restore_service` logged) | — |
| **Public website** | **PASS** | all 14 public routes load clean (route matrix); homepage/category/service/detail/track/auth follow the light Khalsni system; category cards → services; requirements + gated pricing + duration + CTA present; footer + search present; no legacy UI found | residual D-UX2 (P3): a 1-service category shows one empty grid cell |
| **UI design system** | **PASS** | consistent reusable primitives (`.field`, buttons, `kh-public-card`, `DataTable`, `FormModal`, `Pagination`, `PageHeader`, `StatCard`, `EmptyState`, stepper, `StatusBadge`); no ad-hoc override sprawl; `--kh-*` token scale in `index.css` | U1–U13 subjective polish deferred (P2) |
| **Reference-image conformity** | **PARTIAL** | live light implementation compared to `image/2.jpeg` (customer request form — 5-step stepper, side summary, grouped form, doc upload, consent, review: **conforms**) and `image/3.jpeg` (track-order: **conforms**). | **C-VIS1 = BLOCKED_PRODUCT_DECISION**: `image/WhatsApp Image 2026-08-05` is dark-navy and contradicts the 2026-07-27 written light spec + 2026-09-01 reports. Live follows the documented light majority. |
| **Arabic/RTL** | **PASS** | `dir=rtl` on every route (runtime); 95 AR screenshots, 0 overflow; forms/tables/dialogs/stepper mirror correctly; `.field` + shared search pattern converted to logical properties (U7) | — |
| **English/LTR** | **PASS** | public `LanguageSwitcher` now present (D-UX1) → `dir=ltr`, English nav + bodies; 0 overflow on all EN routes; dashboard switcher flips direction | admin **tables** partly untranslated (F-1, P2) |
| **Responsive** | **PASS** | 95 screenshots at 1440/1280/1024/768/390 — **0 horizontal overflow**, 0 console errors; admin tables collapse to cards on mobile; sidebar → hamburger; stat cards stack | — |
| **Accessibility** | **PARTIAL** | axe WCAG 2.0/2.1/2.2 A+AA on 10 routes: **10/10 clean, 0 serious/critical** (D-A11Y-1 fixed — contrast token `#98a2b3→#5b6470`); semantic controls, focus-visible, labels, image fallbacks present | full keyboard-only task walk + modal focus-trap verification not exhaustively completed (no *critical* failure found) |
| **Security** | **PASS** | D1 (media 404 live) · D2 (fee gating, contract-verified) · D3 (`check --deploy` 0 warnings, `DEBUG=False` default) · D4 (token revocation) · D5 (magic-byte upload) · D-DEP1 (`npm audit --omit=dev` = 0) · `pip-audit` = 0 · no secrets in bundle · nginx `deny` on sensitive `/media/` · XSS payload stored as JSON data, not HTML | none exploitable |
| **Automated tests** | **PASS** | backend 283 pass / 0 fail / 0 skip · frontend 44 pass / 0 fail / 0 skip · lint clean · build pass · migration-drift clean | — |
| **E2E** | **PASS** | route matrix 73/73 · journeys 20/20 · adversarial 26/26 · authz 81/81 assertions | — |
| **Deployment/build** | **PASS** | `pip install -r` + `pip check` clean · `npm ci` clean · `manage.py check` · `check --deploy` 0 warnings · frontend build · mobile `tsc` · CI extended (`build`, `npm audit`, `pip-audit`, mobile typecheck, Playwright job) | — |

---

## Findings raised by this gate

| ID | Severity | Area | Finding | Consequence | Blocker? |
|---|---|---|---|---|---|
| **F-1** | P2 | Localization / admin UI | Admin management **tables** render column headers ("Actions", "Status", "Slug", …) and some cell values ("Active", "Visible", "Expected completion: N days", English category names) untranslated on the Arabic-first UI. Page chrome, nav, buttons, and empty states ARE localized. | Internal-ops screens read inconsistently in Arabic. English is a valid working fallback; every action functions. Matches the pre-existing documented "untranslated dev text" note. | **No** — admin-facing polish, not a functional/security/workflow defect. |
| **C-VIS1** | — (decision) | Visual reference | The 2026-08-05 homepage reference JPEG is dark-navy; the 2026-07-27 written spec + 2026-07-26 reference set + 2026-09-01 implementation reports all mandate light. Live site follows **light**. | Cannot unambiguously certify "matches the approved reference" while the reference folder is self-contradictory. | **No** — a one-line written product confirmation resolves it; light is the defensible documented majority. |
| **U1–U13** | P2 | UI polish | Subjective deviations from the 2026-08-30 customer UI audit (box-in-box density, plain-vs-photographic heroes, price/duration repeated on service detail, radius-scale drift, gray-overuse). Prior UI-team passes already touched these. | Marketplace polish is below the reference bar in places. | **No** — needs a design decision + C-VIS1; not a functional issue. |
| **D-UX2 residual** | P3 | UI layout | A category with a single published service shows one empty cell in the 2-up "services by category" grid. | Minor whitespace. | **No** |
| **F-2** | env | Test infra | One transient `net::ERR_ADDRESS_IN_USE` on a single mobile request during the parallel 73-route crawl. | None — local ephemeral-port exhaustion, not reproducible, the check still passed. | **No** |

## Release-blocker checklist (§20) — all ABSENT

broken critical journey · broken authentication · broken authorization · critical security defect · data-corruption risk · failed migration · unresolved P0 · unresolved critical P1 · required feature missing · public site substantially inconsistent with approved design · large sections still using obsolete UI · critical Arabic/RTL failure · unusable responsive route · critical accessibility blocker · unexplained failing tests · significant routes not validated — **NONE present.**

## Defects outstanding

- **P0:** 0
- **P1:** 0
- **P2:** F-1 (admin-table localization), U1–U13 (subjective visual polish), keyboard-a11y walk. Plus **C-VIS1** as a product decision.
- **P3:** D-UX2 residual, D-DB3 (Postgres CI job), U15 (starter cruft), D6 legacy-column drop (needs staging data).

---

## Verdict

**KHALSNI RELEASE ACCEPTANCE: PASS** — conditional on a one-line product confirmation of the light visual direction (C-VIS1).

Rationale: every §20 release-blocker is verifiably absent. All critical business journeys work end-to-end against a real API + DB (J01–J20 + adversarial full-flow), authorization is enforced server-side and survives IDOR/escalation probing (81 assertions), migrations apply cleanly from scratch, the production deployment check is warning-free, production dependencies have zero known vulnerabilities, the built bundle carries no secrets, all 57 first-party routes load with zero console errors, automated WCAG 2.2 AA color-contrast is clean, and the responsive matrix is overflow-free across 95 screenshots in both languages. The two non-PASS domains are **PARTIAL for documented, non-implementation reasons**: reference-image conformity is blocked by a self-contradiction *within the supplied reference set* (C-VIS1), and accessibility is PASS on automation with a manual keyboard walk still owed (no critical failure found). The remaining backlog (F-1 admin-table localization, U1–U13 visual polish) is P2 and does not gate a release.
