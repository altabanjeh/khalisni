# KHALSNI — Remediation Plan

Gate 1 · 2026-09-05 · HEAD `574753e`

This gate is discovery only. **No broad remediation was performed.** No repository change was needed to make the codebase inspectable or executable (backend + frontend build, lint, and full test suites already run green). This plan sequences the work for later gates.

---

## GATE 1R OUTCOME (updated 2026-09-05)

Discovery is now backed by **executed runtime evidence** (not source inspection): a committed Playwright + axe harness (`frontend/e2e/`, system Chrome) drove a live seeded stack; 20 J01–J20 journeys + a 78-cell authorization matrix + a 7-case FE/BE contract suite run against the real API. Backend suite **249/249**; `pip-audit` clean; `check --deploy` clean (bar SECRET_KEY length under a test key).

**New backlog from Gate 1R (add to the queue below, in priority order):**

1. **D-DEP1 (HIGH/P1)** — `npm audit fix` / pin `react-router-dom` to a patched 7.x; keep `npm audit --omit=dev --audit-level=high` green in CI. Backend `pip-audit` already clean.
2. **D-A11Y-1 (MEDIUM/P2)** — darken the secondary-label colour token (`#98a2b3` → ≥ `#667085`) so `ServiceCard`/stat `<dt>` labels hit 4.5:1. One token; propagate via the design system. Then extend `e2e/a11y.spec.js` to more routes + add a keyboard-flow walk.
3. **D-UX1 (MEDIUM/P2)** — render `LanguageSwitcher` in `PublicLayout` (header + mobile drawer); optionally honour `?lang=`. Add an e2e assertion that a public visitor can switch to English.
4. **D-UX2 (MEDIUM/P2)** — fix the "services by category" section to a responsive `grid`/`auto-fill` so cards fill the row; cap section width to content.
5. **C-VIS1 (P2, decision)** — obtain written product confirmation of the light visual direction (vs the 2026-08-05 dark mockup); reconcile `image/`.
6. Then continue with the existing Gate 2 backlog (D6, D-DB1, U7, U1–U13, D-DB3, U15).

**Not new defects (resolved by Gate 1R review):** D-AZ1 (provider report access — revenue stripped + order-scoped, BR7 satisfied; cosmetic `/api/admin/` prefix only, P3).

---

## GATE 2 EXECUTION STATUS (updated 2026-09-05)

**Completed & regression-tested this gate** (see `KHALSNI_DEFECT_REGISTER.md` "GATE 2 — remediation status"):

- Security: **D1** (media-route allow-list), **D3** (`DEBUG` default False), **D4** (30-min access token + refresh rotation + `token_version` revocation + FE rotated-token persistence + revoked-token clean logout), **D5** (magic-byte upload validation).
- Catalog / data: **D2** (related-service fee-visibility leak closed), **D7** (`code` uniqueness constraint), **D-DB2** (FK `CASCADE`→`PROTECT`).
- API / FE: **D8** (`unread-count` + `mark-all-read` endpoints + FE wiring; latent mark-read constraint bug fixed), **U14** (real 404 page).
- Process: **D9** (CI: build, `npm audit`, `pip-audit`, mobile typecheck, Playwright job), **D10 harness** (`frontend/playwright.config.js` + `e2e/public.spec.js` + `e2e/a11y.spec.js`), **C1** (SRS FR2 aligned), **D11** (build outputs untracked + git-ignored).
- New regression tests: 21 backend (`*/tests_remediation.py`) + 2 frontend (`NotFoundPage.test.jsx`, `NotificationPanel.test.jsx`). Backend suite 197→**218**, frontend 42→**44**.

**Deferred with documented reason** — see the register: **D6** (destructive column drop needs staging-data backfill), **D-DB1** (default `SoftDeleteManager` = 20+ model regression surface), **D-DB3** (Postgres CI job), **U7 full RTL migration**, **U15 starter-cruft**, and the **U1–U13 design-system/visual-conformance/full-a11y/full-responsive reconciliation across all ~57 routes** (needs a browser-capable runtime + a token-scale decision + authenticated E2E fixtures).

The steps below are the remaining backlog.

---

## 1. Priority classification (task §20)

- **P0** — critical workflow broken, security failure, data-corruption risk, broken authorization, broken deployment, or severe production defect. **None found.**
- **P1** — required functionality missing/incorrect, or a real security weakness with a plausible path, or a major UX failure.
- **P2** — important quality / maintainability / accessibility / responsiveness / consistency problem.
- **P3** — polish, hygiene, low-risk improvement.

---

## 2. P0

**None.** The system's critical workflows (public discovery, order creation, document cycle, internal review, provider execution, delivery, archive) are implemented, transition-guarded, and covered by 197 passing backend tests. No authorization bypass, data-corruption path, or broken build was found.

---

## 3. P1 — do first (security, correctness, process)

| Order | ID | Action | Est. size | Verification |
|---|---|---|---|---|
| 1 | **D1** | Stop `django.views.static.serve` from exposing `secure_orders/**`. Scope the `re_path` in `config/urls.py` to public catalog/CMS media prefixes only, or delete it and require private object storage in prod; add the nginx `internal` + `X-Accel-Redirect` pattern to `docs/DEPLOYMENT.md`. | S | New test: anon `GET /media/secure_orders/...` → 403/404; `GET /media/services/images/...` → 200. Re-run `documents/tests.py`. |
| 2 | **D2** | Remove `service_fee`/`government_fee` from `RelatedServiceSerializer` (or gate them through `_public_pricing_payload`). Check `CustomerServiceRelationSerializer` and any other embedded catalog serializer for the same pattern. | S | New serializer test: related services with `show_*_public=False` expose no fee components. |
| 3 | **D3** | `DEBUG` default → `False`; document the local-dev opt-in; add a prod smoke assertion. | S | Test: env unset ⇒ `DEBUG is False`, `SECURE_SSL_REDIRECT is True`. |
| 4 | **D4** | Access token ≤30 min; `ROTATE_REFRESH_TOKENS=True`; add `CustomUser.token_version` checked by a custom auth class, bumped on logout-all / password reset / role change. | M | Tests: post-logout old access token rejected; post-password-reset all prior tokens rejected. |
| 5 | **C1** | Product owner confirms the order-creation actor rule; update `docs/SRS.md` FR2 + traceability. | XS | Doc review. |
| 6 | **D10** | Stand up `@playwright/test` + `@axe-core/playwright`; author J01–J20 journeys and a per-role negative-authorization matrix; add a DRF `APITestCase` contract layer that does **not** use the frontend mock seam. | L | Suite green locally + in CI; covers J01–J20 + forbidden route/API per role. |
| 7 | **D9** | Extend `.github/workflows/ci.yml`: `npm run build`, mobile `npm run typecheck`, `pip-audit`, `npm audit --production`, Playwright smoke; enable Dependabot. | M | CI green with new steps; no High/Critical CVEs unacknowledged. |
| 8 | **U7** | Migrate forced physical alignment/icon positions to CSS logical properties across public + customer components; add Playwright RTL/LTR snapshots for key routes. | M–L | RTL snapshot tests; manual Arabic walkthrough. |

---

## 4. P2 — quality, a11y, consistency

| ID | Action | Size |
|---|---|---|
| **A11Y-1** | Run axe on every route class; fix violations; add keyboard-flow + modal focus-trap tests. Any *confirmed* use-blocking failure is re-tagged **P0**. | M–L |
| **D-DB1** | Add `SoftDeleteManager`/`SoftDeleteQuerySet` to `core.SoftDeleteModel` (`objects` excludes deleted, `all_objects` includes); audit every `.objects` call that must see deleted rows (admin trash, restore, audit). | M |
| **D5** | Add `python-magic`/`filetype` byte-signature validation for the 6 allowed upload types. | S |
| **D6** | Backfill `ServiceRequiredDocument.document_definition`; make FK non-nullable; retire legacy free-text columns; re-point `orders/serializers.py` doc validation to the definition ID/code. | M |
| **D7** | Decide `RequiredDocumentDefinition.code` uniqueness policy; add a DB-level guard (global unique index or unique-suffix-on-delete). | S |
| **D-DB3** | Add a Postgres service to the CI backend job; git-ignore `backend/db.sqlite3`. | S |
| **U14** | Add a `NotFoundPage`; route `*` to it instead of redirecting home. | XS |
| **U1–U6, U8–U13** | Runtime reconciliation pass against `docs/ui/KHALSNI_CUSTOMER_UI_AUDIT.md` (2026-08-30): confirm which box-in-box / radius / gray-overuse / card-height / search-split / button-duplication items A6 actually fixed; close or re-open each with a screenshot. Unify the token scale (radius, spacing, surface colour) across public + the 4 authenticated portals. | L |
| Brute-force | Add a dedicated DRF `login` throttle scope + optional lockout. | S |

---

## 5. P3 — polish / hygiene

| ID | Action |
|---|---|
| **D8** | Add `notifications` `unread-count` + `mark-all-read` endpoints + bell badge. |
| **D-DB2** | Change `ServiceRelation` / `ServiceProviderAssignment` FKs to `Service` from `CASCADE` to `PROTECT`. |
| **D11** | Move root spec/design artefacts into `docs/assets/`; git-ignore `frontend/dist*/`; remove `live.js` / `live-index-*.js` if unused; delete the `~$…docx` lock file. |
| **U15** | Remove `App.css` starter CSS, `assets/vite.svg` + `react.svg`; rewrite `frontend/README.md`; move stray hardcoded labels into `src/locales/`. |
| Perf | Profile the ~229 s backend suite; convert repeated per-test seed setup into class-level fixtures/factories (noted in `docs/current_system_full_analysis_2026-06-16.md`). |
| Docs | Mark `docs/API_SPEC.md`, `docs/DATABASE_SCHEMA.md`, `docs/frontend_backend_mapping.md` as superseded or regenerate them from code (drf-spectacular). |

---

## 6. Recommended execution order (single track)

1. **D1** (media access) — highest-risk, smallest fix.
2. **D2** (fee leak) — small, same domain as ongoing catalog work.
3. **D3** (`DEBUG` default) — trivial, removes a whole class of prod risk.
4. **D4** (token lifetime/rotation) — contained, well-understood.
5. **C1** (SRS reconciliation) — unblocks accurate traceability.
6. **D-DB1** (soft-delete manager) — do before D6/D7 so their tests rest on a solid base.
7. **D6 + D7** (finish document-definition normalisation) — one coordinated migration.
8. **D10 + D9** (E2E/contract suite + CI wiring) — the biggest investment; everything after this is verifiable.
9. **A11Y-1 + U7** (accessibility + RTL) — needs the Playwright harness from step 8.
10. **D5, U14, brute-force throttle, D-DB3** — small hardening/quality items.
11. **U1–U6/U8–U13** UX reconciliation — after the design-token unification decision.
12. **P3 batch** (D8, D-DB2, D11, U15, perf, docs).

Do **not** proceed to a release-readiness gate until step 8 exists — per `docs/khalsni-final-acceptance/13_FINAL_RELEASE_ASSESSMENT.md`, missing runtime verification is exactly why the 2026-09-04 gate returned FAIL, and this gate confirms that runner still does not exist.

---

## 7. Explicitly out of scope for the fix phase (no change intended)

- The B2B2C tenancy model, the workflow state machine, and the soft-delete/delete-guard architecture are sound — **improve, do not replace** (task ROLE constraint).
- Orders remain archive-only (SRS BR8) — do not add hard delete.
- Audit logs remain write-once with no mutation API.
- Payment module stays a data-model + service-layer foundation (no gateway) until a separate billing gate.
- Mobile app changes only as needed to keep API contracts aligned after D6.
