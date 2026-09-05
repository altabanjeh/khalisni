# KHALSNI — No-Skipped-Code Audit (Coverage Matrix)

Gate 1 · 2026-09-05 · HEAD `574753e`

## Method & honesty statement

- **Mapped + assessed** (URL surface, model list, permission wiring, test presence read): all 15 backend apps + `config`/`core`/`workflow`; frontend `routes`, `api`, `layouts`, `components`, all `pages/*` groups (inventoried).
- **Deep / line-level review this gate**: `config/settings.py`, `config/urls.py`, `config/permissions.py`, `core/models.py`, `core/delete_guard.py`, `core/choices.py`, `core/serializer_mixins.py`, `services/models.py` (full), `services/serializers.py` (pricing/related/detail paths), `services/views.py` (public + permission lines), `orders/views.py` (raw-record + admin action lines), `orders/services.py` (`update_order_status`, `complete_order` region, head), `workflow/rules.py` (full), `workflow/transition_permissions.py` (full), `orders/allowed_actions.py` (full), `documents/models.py` (upload path + `clean`), `documents/views.py` (download), `documents/serializers.py` (head), `accounts/models.py` (`CustomUser`), `accounts/role_groups.py` (full), `audit/models.py` (head), `frontend/src/routes/*` (full), `frontend/src/api/client.js` (auth/refresh).
- **Not line-reviewed** (mapped only): `help_guides/*`, `reports/views.py`, `payment/*`, `organizations/views.py`, `public_site/views.py`, `notifications/views.py`, `providers/views.py`, most `*/serializers.py` bodies, all `*/migrations/*`, most frontend page component bodies, all `mobile/` code.
- **Coverage claim**: this is **not** a line-by-line review of the entire repository. It is a structural review with targeted deep dives on the highest-risk paths (auth, workflow, catalog pricing, file access, soft delete). Modules below are marked with the confidence actually achieved.

Legend: **PASS** = reviewed, no issue found. **PARTIAL** = reviewed, non-blocking issue(s) found. **FAIL** = defect that breaks a requirement. **MAPPED** = surface & wiring understood, body not line-reviewed, no red flag in what was seen. **BLOCKED** = not reviewable this gate.

---

## 1. Backend

| Path / Module | Purpose | Reviewed | Tests | Problems | Requirement | Status |
|---|---|---|---|---|---|---|
| `config/settings.py` | Project config, DRF/JWT/throttle/security | Deep | via suite | `DEBUG` env-default `True` (D3); JWT access 8h + no rotation (D4); MIME allowlist trusts declared type (D5) | NFR3, FR10 | **PARTIAL** |
| `config/urls.py` | Root routing + media serve | Deep | — | Unauthenticated `re_path("^media/…", serve)` serves uploaded order documents (D1) | NFR6 | **FAIL** |
| `config/permissions.py` | ~35 DRF permission classes | Deep | via suite | Broad but coherent; every class layers B2B2C selector checks; no bypass found | FR5–FR7, BB2 | **PASS** |
| `config/asgi.py` `wsgi.py` | servers | Skim | — | none | NFR5 | **MAPPED** |
| `core/models.py` | `SoftDeleteModel` mixin | Deep | `core/tests.py` | No default manager → deleted-row exclusion is per-view responsibility (D-note, see DB audit) | A1 CE7, A2 SD | **PARTIAL** |
| `core/delete_guard.py` | Admin delete-password guard, blocked-delete audit | Deep | via suite | Sound; password checked with `check_password`; failures audited | A2 SD2/SD6 | **PASS** |
| `core/choices.py` | enums | Deep | — | none | — | **PASS** |
| `core/serializer_mixins.py` | `PkAsIdMixin` | Deep | — | none | — | **PASS** |
| `core/management/*` | `check_system_consistency` etc. | Skim | — | 2026-06 run reported 2 live orders missing approved docs (data, not code) | — | **MAPPED** |
| `accounts/models.py` | `CustomUser`, `CustomerProfile`, `SystemSetting`, `PasswordResetToken` | Deep (CustomUser) | `accounts/tests.py` | `full_clean()` in `save()` (good); dual role authority with membership | FR4, FR5, NFR3 | **PASS** |
| `accounts/role_groups.py` | role→group→permission map | Deep | via suite | `admin` group = all perms minus contenttypes/sessions (broad; gated downstream) | FR5–FR7 | **PARTIAL** |
| `accounts/views.py` `serializers.py` `password_reset.py` `signals.py` | auth + admin user APIs | Skim | `accounts/tests.py` | 2026-06 hardening scoped customer-profile admin queries; not re-verified line-by-line | FR4, FR5 | **MAPPED** |
| `organizations/models.py` | tenancy models | Read (class list + Meta) | `organizations/tests.py` | none in what was seen | BB1, BB3 | **MAPPED** |
| `organizations/selectors.py` | tenant-isolation predicates | Deep (call sites) | via suite | central to AuthZ; correctness depends on universal use by list views | BB2 | **PARTIAL** |
| `organizations/views.py` `serializers.py` `services.py` | org CRUD, partner onboarding | Skim | `organizations/tests.py` | not line-reviewed | BB1–BB3 | **MAPPED** |
| `services/models.py` | catalog: category/service/doc-def/relation/assignment/address/required-doc | Deep (full) | `services/tests.py` (31 catalog) | `ServiceRequiredDocument.document_definition` nullable + legacy `document_type`/`name_ar` retained (D6); `RequiredDocumentDefinition.code` not globally unique (D7) | A1 CE1–CE5, B3 | **PARTIAL** |
| `services/serializers.py` | public + admin catalog serializers | Deep (pricing/related/detail) | `services/tests.py` | `RelatedServiceSerializer` leaks raw `government_fee`+`service_fee` on public `AllowAny` detail endpoint (D2) | A1 CE5, acceptance #9 | **FAIL** |
| `services/views.py` | public list/detail + admin viewsets | Deep (public + perms) | `services/tests.py` | public views correct; admin viewsets use `AdminDeleteGuardMixin` | FR1, A1 CE6 | **PASS** |
| `services/order_validation.py` `order_completion.py` `service_relations.py` `service_categories.py` | relation/prereq logic | Skim | `services/tests.py` | matches `docs/service_dependency_rules.md`; cycle detection present | SR1–SR4, B3 | **MAPPED** |
| `services/service_import.py` + `tests_service_import.py` | bulk catalog import | Skim | `services/tests_service_import.py` | `docs/service-import/` records known duplicate-Arabic-name data conflicts | B9 | **MAPPED** |
| `services/selectors.py` `catalog_defaults.py` | `visible_services_queryset` | Deep (usage) | via suite | correctly filters `is_deleted`/`is_active`/`show_on_public_site` | A1 CE7, SC2 | **PASS** |
| `orders/models.py` | `Order` + logs/notes/issues/rating/missing-doc | Deep (Order region) | `orders/tests.py`, `test_end_to_end.py` | snapshots present; `is_final_state`/`is_active` props | BR1, BR8, BB4, CE9 | **PASS** |
| `orders/services.py` | workflow action functions | Deep (`update_order_status`, `complete_order`, head) | `orders/tests.py` | generic-status endpoint locked to whitelist + audited block; `complete_order` enforces final-doc-or-admin-confirm + verified rule | BR2–BR4, BR6, FR8 | **PASS** |
| `orders/views.py` | customer + admin order APIs | Deep (raw-record + admin actions) | `orders/tests.py` | `AdminOrderRecordViewSet._safe_update` blocks final-state + `DANGEROUS_FIELDS`; `destroy` archives via workflow (2026-06 risk remediated) | FR5, BR8 | **PASS** |
| `orders/allowed_actions.py` | per-order UI capability map | Deep (full) | via suite | mirrors backend permission checks; no client-trust | FR5–FR7 | **PASS** |
| `orders/selectors.py` | order visibility querysets | Deep (usage) | via suite | scoped by role/org | BB2, BB4 | **PASS** |
| `workflow/rules.py` | 26 transition rules | Deep (full) | via `orders/tests.py` | single source of transition truth; no `workflow/tests.py` (indirect only) | BR2–BR4, FR8 | **PASS** |
| `workflow/transition_permissions.py` | role + actor-match assertions | Deep (full) | via suite | customer-owns / provider-assigned / employee-assigned checks present | BR6, BR7 | **PASS** |
| `workflow/services.py` | thin helpers | Skim | — | none | — | **MAPPED** |
| `documents/models.py` | `Document`, `secure_document_upload_path` | Deep (upload path + `clean`) | `documents/tests.py`, `tests_selectors.py` | uuid filename (good); `clean()` validates ext+size+declared MIME + dangerous-ext blocklist | FR2, FR10, NFR6 | **PASS** |
| `documents/views.py` | download (+token), staff verify, admin viewset | Deep (download) | `documents/tests.py` | layered auth in the **view** is sound; risk is the parallel `/media/` route (D1, tracked under config) | NFR6, BR4 | **PASS** |
| `documents/services.py` `selectors.py` `serializers.py` | `can_user_download_document`, `create_order_document`, `verify_document` | Deep (head) + skim | `documents/tests_selectors.py` | serializers expose only `download_url`, not raw path (good) | NFR6 | **PASS** |
| `notifications/*` | in-system notifications + templates | Mapped | `notifications/tests.py` | no `unread-count` / `mark-all-read` endpoint (D8) | PRD2, PRD3, SR4 | **PARTIAL** |
| `payment/*` | billing-foundation models + helpers | Mapped | `payment/tests.py` | data model + service layer only; no gateway (matches spec) | BB6 | **PASS** (scope-limited) |
| `providers/*` | provider dashboard + admin | Mapped | `providers/tests.py` | org-scoped per 2026-06 hardening; not line-reviewed | FR6, BR7, BB5 | **MAPPED** |
| `public_site/*` | homepage/theme/ads/missing-service CMS | Mapped | `public_site/tests.py` | `MissingServiceRequest` has no org key (documented limitation) | FR1, CE6, UI2 | **MAPPED** |
| `reports/views.py` | dashboard + daily/weekly/summary | Mapped | `reports/tests.py` | function-based; scoped-report permission class present | FR5, PRD2, BB7 | **MAPPED** |
| `audit/*` | `AuditLog` + `create_audit_log` + read APIs | Deep (model head) | `audit/tests.py` | no model-level immutability guard, but **no write/delete API** → effectively immutable | FR9, SD6/SD7 | **PASS** |
| `help_guides/*` | in-app manual subsystem | Mapped | `help_guides/tests.py` | large; not line-reviewed | B7 | **MAPPED** |
| `*/migrations/*` (65 files) | schema history | Not reviewed | `makemigrations --check` clean | migration-drift check passes; clean-DB migrate exercised by test-DB creation | — | **MAPPED** |
| `*/admin.py` | Django admin registrations | Not reviewed | — | low risk (`/django-admin/` behind `is_staff`) | — | **MAPPED** |

**No results found for**: `TODO`, `FIXME`, `HACK`, `XXX` in `backend/**/*.py` (excluding migrations/tests). No `print(` debug statements observed in reviewed files. No obviously dead app or unreachable URL include found.

---

## 2. Frontend

| Path / Module | Purpose | Reviewed | Tests | Problems | Requirement | Status |
|---|---|---|---|---|---|---|
| `src/routes/AppRoutes.jsx` | all routes + per-role nav arrays | Deep (full) | route-render tests | ~57 routes; `roles:['support']` filter on 2 employee links; catch-all `*` → `/` | PRD1 | **PASS** |
| `src/routes/ProtectedRoute.jsx` | client-side role gate | Deep (full) | via login tests | advisory only (backend enforces); redirects unauth→`/login?next=`, wrong-role→`/` | FR5–FR7 | **PASS** |
| `src/api/client.js` | axios client, JWT inject, 401→refresh queue, storage-mode | Deep (auth/refresh) | `src/api/client.test.js` | JWT in `localStorage`/`sessionStorage` (standard SPA XSS tradeoff); refresh single-flight queue OK | NFR3 | **PARTIAL** |
| `src/api/{authApi,ordersApi,servicesApi,services,documentsApi,notificationsApi,paymentApi,providersApi,publicSiteApi,helpGuidesApi}.js` | endpoint wrappers | Skim | partial | not line-reviewed; naming aligns with backend URLs | — | **MAPPED** |
| `src/context/{AuthContext,LanguageContext,PublicSiteContext}.jsx` | auth state, i18n/RTL, public data | Skim | via page tests | `auth/me` skipped when no token (A6 fix) | NFR1, NFR3 | **MAPPED** |
| `src/layouts/{PublicLayout,DashboardLayout}` + `Sidebar/Topbar/LanguageSwitcher` | shells | Skim | via page tests | responsive nav per A6 | NFR1, NFR2, UI1 | **MAPPED** |
| `src/components/AdminSoftDeleteModal.jsx` | A2 delete-confirmation modal | Not line-reviewed (exists) | none found | presence confirmed; per-screen adoption & Active/Deleted/All tabs unverified | A2 SD1–SD4 | **PARTIAL** |
| `src/components/{CategoryCard,ServiceCard,CatalogImageCards,StatusBadge,RouteErrorBoundary,LoadingSpinner}` | shared UI | Skim | `StatusBadge.test.jsx`, `CatalogImageCards.test.jsx` | image fallback per A6 | UI2, UI6 | **MAPPED** |
| `src/pages/public/*` (25) | catalog + auth entry | Inventoried; tests reviewed | 10 test files | Home/Track/Services/ServiceCategory/ServiceDetails/Login/Register/CreateOrder covered by vitest | FR1–FR3, UI2 | **MAPPED** |
| `src/pages/customer/*` (7) | order lifecycle | Inventoried | `MyOrders`, `MissingDocumentsResponse`, `orderDrafts` tests | draft storage versioned/expiring (A6) | FR2, FR4 | **MAPPED** |
| `src/pages/employee/*` (6) | internal review | Inventoried | `EmployeeOrderReview`, `EmployeeReports` tests | — | FR5, FR8 | **MAPPED** |
| `src/pages/admin/*` (21) | back office | Inventoried | `AdminUsersRoles`, `Providers`, `Services`, `ServiceProviderAssignments`, `AdminRuleManagement` tests | Delete/Restore UX completeness (A2) not test-covered across all screens | FR5, A1, A2 | **PARTIAL** |
| `src/pages/provider/*` (3) | execution | Inventoried | `ProviderOrderDetails` test | provider_instructions rendered (2026-06 fix, mobile) | FR6 | **MAPPED** |
| `src/pages/shared/*` (4) | reused admin/support | Inventoried | none dedicated | ServiceCategory/ServiceRelations management | A1, B3 | **MAPPED** |
| `src/hooks/`, `src/utils/`, `src/locales/`, `src/styles/`, `src/help/` | helpers, i18n dicts, tokens | Skim | `utils` covered indirectly | `normalizeRole` in `utils/format` | NFR1, UI1 | **MAPPED** |
| `src/App.jsx` `main.jsx` `index.css` `App.css` | bootstrap | Skim | — | none | — | **MAPPED** |
| `frontend/dist/`, `frontend/dist-acceptance/` | build outputs present in tree | n/a | n/a | committed build artefacts (hygiene D11) | — | **DEAD_CODE** (generated) |

**No results found for**: `TODO`/`FIXME`/`HACK`/`XXX` in `src/**` (excluding tests). Exactly **1** `console.*` call in non-test `src/**`.

---

## 3. Mobile

| Path | Purpose | Status |
|---|---|---|
| `mobile/` (Expo / React Native, `app/`, `App.tsx`, `eas.json`) | Companion mobile client sharing the public/service/order APIs | **BLOCKED** — out of scope for this gate; `docs/current_system_full_analysis_2026-06-16.md` records it has type-check validation only, no runtime tests, and admin tools in a "compact shell". Contract-compatibility with backend changes is a standing risk. |

---

## 4. Code-smell sweep (explicit results)

| Looked for | Result |
|---|---|
| dead code / unused components | `frontend/dist*` committed build output; no dead backend app found; `live.js` + `live-index-*.js` at repo root appear to be stray bundle copies |
| duplicated business logic | `ServiceRequiredDocument` carries both a definition FK and legacy free-text fields (D6) — intentional back-compat but is duplication |
| unreachable routes | none found; all app URL includes are mounted |
| fake/mock production behavior | none found in reviewed backend paths |
| hardcoded data | `get_steps`/`get_steps_en` in `ServiceDetailSerializer` return hardcoded Arabic/English step lists (acceptable — generic process steps, not business data) |
| temporary hacks / feature flags | `HAS_CORSHEADERS`/`HAS_WHITENOISE`/`HAS_DRF` capability flags in settings (defensive, not stale) |
| TODO/FIXME | **none** in first-party `.py`/`.jsx`/`.js` (excl. tests/migrations) |
| debug routes | `/api/health/` only; `/django-admin/` behind `is_staff` |
| console logging | 1 non-test `console.*` in frontend `src` |
| swallowed / broad exceptions | `core/delete_guard.py` has 2 `except Exception` around `request.data.get` (documented `pragma: no cover`, narrow intent); `role_groups.py` catches `OperationalError/ProgrammingError` during migration bootstrap (correct) |
| unsafe defaults | `DEBUG=True` default (D3) |
| inconsistent validation | order-create doc validation matches on `document_type` strings, not definition IDs (D6/C3) |
| broken imports / circular deps | none observed; `config/permissions.py` uses function-local imports to avoid cycles with `orders`/`documents` |
| N+1 queries | `AdminOrderRecordViewSet` and `allowed_actions.py` use `select_related`/`prefetch_related` + prefetch-aware branches; not exhaustively profiled |
| missing DB constraints | see DB audit — partial unique indexes used well; `RequiredDocumentDefinition.code` lacks a global unique index (D7) |
| IDOR | `/media/` serve route (D1) |
| inconsistent permissions | none found in reviewed views; all admin viewsets carry explicit `permission_classes` |
| unhandled loading/error/empty states (FE) | not verified per-component this gate — deferred to UI gate; A5/A6 report empty-state handling added |
