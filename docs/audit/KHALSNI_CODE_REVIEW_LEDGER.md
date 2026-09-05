# KHALSNI — File / Module Review Ledger (Gate 1R)

Date: 2026-09-05 · Method: line-level reading of every first-party area, correlated with the runtime matrix, journey suite, authorization matrix, and contract tests executed this gate. Vendored dirs (`.venv`, `node_modules`, `frontend/dist*`, `staticfiles`) are excluded from line review by rule; their manifests were checked.

**Coverage claim:** all first-party backend apps + shared layers + frontend areas + the mobile app were reviewed this gate. Nothing is silently deferred; anything not fully line-read is marked with the depth actually reached and why.

Status: PASS · PARTIAL (non-blocking issue) · FAIL (defect) · DEAD_CODE · DUPLICATE · BLOCKED · NOT_APPLICABLE

---

## Backend

| Area | Path | Type | Reviewed | Functional role | Requirement | Test evidence | Findings | Status |
|---|---|---|---|---|---|---|---|---|
| Project config | `config/settings.py` | config | deep | env-driven settings, DRF/JWT/throttle/security, DB, storage | NFR3, NFR4, NFR5, FR10 | `accounts/tests_remediation` (D3), `config.tests_authz_matrix`, full suite | D3/D4/D5 fixed in Gate 2; `DJANGO_SQLITE_NAME` harness hook added (inert in prod) | PASS |
| Root URLs | `config/urls.py` | routing | deep | mounts all apps; `public_media_serve` allow-list | NFR6 | `documents/tests_remediation::MediaRouteAuthorizationTests`; runtime probe (D1) | D1 fixed + runtime-verified (404 on `secure_orders/`,`payments/`,`..`) | PASS |
| Permissions library | `config/permissions.py` | authz | deep | ~35 DRF permission classes over B2B2C selectors | FR5–FR7, BR7, BB2 | `config.tests_authz_matrix` (78 role×endpoint + 3 IDOR), journey suite | no bypass found; `CanViewReportsDashboard` admits providers but report views strip revenue + scope orders (see authz matrix) | PASS |
| ASGI/WSGI | `config/asgi.py`,`wsgi.py` | infra | read | servers | NFR5 | — | none | PASS |
| Core mixins | `core/models.py` | model | deep | `SoftDeleteModel` (`soft_delete`/`restore`) | A1 CE7, A2 SD | `core/tests`, J19, soft-delete suite | no default manager — exclusion is per-view (tracked D-DB1, deferred) | PARTIAL |
| Delete guard | `core/delete_guard.py` | service | deep | admin delete-password guard, blocked-delete audit | A2 SD2/SD6 | J19, full suite | sound; `check_password` + audited failures | PASS |
| Choices | `core/choices.py` | enum | deep | `UserRole`/`OrderStatus`×11/`OrderPriority`/`DocumentType`/`NotificationType`/`PaymentStatus` | — | contract test (enum membership) | `DocumentType` mixes cased/lowercase values (cosmetic) | PASS |
| Serializer mixins | `core/serializer_mixins.py` | util | deep | `PkAsIdMixin` | — | contract test (`id` present) | none | PASS |
| Core commands | `core/management/commands/*` | ops | read | `seed_demo`, `check_system_consistency` | — | used by E2E harness | `check_system_consistency` previously flagged 2 live orders missing docs (data) | PASS |
| Workflow rules | `workflow/rules.py` | domain | deep | 26 transition rules → maps | BR2–BR4, FR8 | J11/J15/J17/J18/J20, `orders/tests` | single source of truth; still no dedicated `workflow/tests.py` (covered indirectly + by journeys now) | PASS |
| Workflow permissions | `workflow/transition_permissions.py` | authz | deep | role + actor-match (customer-owns / provider-assigned / employee-assigned) | BR6, BR7 | J12/J18, authz matrix | none | PASS |
| Workflow services | `workflow/services.py` | domain | deep | thin helpers | — | — | none | PASS |
| Accounts models | `accounts/models.py` | model | deep | `CustomUser` (+`token_version`), `CustomerProfile`, `SystemSetting`, `PasswordResetToken` | FR4, FR5, NFR3 | `accounts/tests*`, J06/J07 | D4 `token_version` added + migration `0007` | PASS |
| Accounts auth class | `accounts/authentication.py` | authz | deep | `VersionedJWTAuthentication` (D4) | NFR3 | `accounts/tests_remediation::TokenVersionRevocationTests` | new; baseline (v1/no-claim) tokens still accepted for smooth deploy | PASS |
| Accounts views | `accounts/views.py` | api | deep | register/login/logout(+all_devices)/refresh/me, admin users/profiles/settings, delete-guard | FR4, FR5 | J06/J07, authz matrix, `accounts/tests` | logout hardened (D4); `TokenError` guarded | PASS |
| Accounts serializers | `accounts/serializers.py` | api | deep | `CustomTokenObtainPairSerializer.get_token` stamps `token_version`; admin user serializer | FR4, FR5 | contract test (login shape), `accounts/tests` | none | PASS |
| Accounts password reset | `accounts/password_reset.py` | service | deep | tokenised reset, rate-limit, bumps `token_version` | FR4, D4 | `accounts/tests` | none | PASS |
| Accounts role groups | `accounts/role_groups.py` | authz | deep | role→group→permission map; `admin` = all perms minus contenttypes/sessions | FR5–FR7 | authz matrix, full suite | `admin` group broad but gated by `is_platform_super_admin` downstream | PASS |
| Accounts signals/urls/admin | `accounts/signals.py`,`urls.py`,`admin.py` | misc | read | group sync on save; routes | — | full suite | none | PASS |
| Organizations models | `organizations/models.py` | model | deep | `Organization`/`Branch`/`OrganizationMembership`/`OrganizationBranding`/`PartnerServiceConfig` | BB1, BB3 | `organizations/tests`, full suite | all `SoftDeleteModel` | PASS |
| Organizations selectors | `organizations/selectors.py` | authz | deep | tenant-isolation predicates (used everywhere) | BB2 | authz matrix, journey suite, `organizations/tests` | correctness depends on universal use; no leak found in reviewed + tested paths | PASS |
| Organizations views/serializers/services | `organizations/{views,serializers,services}.py` | api | deep | org CRUD, partner onboarding, `restore` actions | BB1–BB3 | `organizations/tests` | `restore` present on org/branch/membership/config viewsets | PASS |
| Services models | `services/models.py` | model | deep | catalog: category/service/doc-def/relation/assignment/address/required-doc | A1 CE1–CE5, B3, SC/SR | `services/tests*`, `services/tests_remediation`, J02/J03/J19, contract | D2/D7/D-DB2 fixed (migration `0010`); D6 (legacy free-text on `ServiceRequiredDocument`) deferred | PARTIAL |
| Services serializers | `services/serializers.py` | api | deep | public gated pricing + `RelatedServiceSerializer` (D2 fix) + admin serializers | A1 CE5, FR1 | `services/tests_remediation`, contract test, runtime probe (D2) | D2 fixed — related services now carry gated `pricing`, no raw fees | PASS |
| Services views | `services/views.py` | api | deep | public list/detail (`AllowAny`) + admin viewsets + `restore` actions | FR1, A1 CE6, A2 | `services/tests*`, authz matrix, J19 | `restore` on service/category/doc-def/rule; guarded delete | PASS |
| Services support | `services/{order_validation,order_completion,service_relations,service_categories,selectors,catalog_defaults,service_import}.py` | domain | deep | prereq checks, recommendation notifications, cycle detection, `visible_services_queryset`, bulk import | SR1–SR4, B3, B9 | `services/tests*`, J02/J03 | `normalize_required_documents` mgmt command EXISTS (relevant to D6) | PASS |
| Orders models | `orders/models.py` | model | deep | `Order`(11 status, snapshots), logs/notes/issues/rating/missing-doc | BR1, BR8, BB4, CE9 | journey suite, `orders/tests*` | `Order.clean()` requires `organization` — API resolves it | PASS |
| Orders services | `orders/services.py` | domain | deep | all workflow action functions; generic-status whitelist + audited block | BR2–BR4, FR8, CE9/10 | J08–J20, `orders/test_end_to_end`, authz matrix | generic status endpoint locked; `complete_order` final-doc/verify rule enforced | PASS |
| Orders views | `orders/views.py` | api | deep | customer + admin order endpoints; guarded raw-record viewset | FR2–FR6, BR8 | journey suite, authz matrix | `_safe_update` blocks final-state + `DANGEROUS_FIELDS`; `destroy` archives | PASS |
| Orders allowed_actions | `orders/allowed_actions.py` | domain | deep | per-order UI capability map | FR5–FR7 | contract test (`allowed_actions` keys), journey suite | mirrors backend perms; no client trust | PASS |
| Orders selectors/serializers | `orders/{selectors,serializers}.py` | api | deep | scoped querysets; create/detail/list serializers; D5 sniff added to create loop | BB2, BB4, FR10 | journey suite, contract test, `orders/tests*` | D5 wired | PASS |
| Documents models | `documents/models.py` | model | deep | `Document`, `secure_document_upload_path` (uuid), `clean()` ext/size/MIME/dangerous-ext | FR2, FR10, NFR6 | `documents/tests*`, J09/J16 | none | PASS |
| Documents file_validation | `documents/file_validation.py` | util | deep | magic-byte sniff (D5) | FR10 | `documents/tests_remediation::UploadSignatureTests` | new; no external dep | PASS |
| Documents views | `documents/views.py` | api | deep | download (auth / signed-token / order+phone), staff verify, admin viewset | NFR6, BR4 | `documents/tests*`, J16, runtime D1 probe | download view sound; the `/media/` risk was the parallel route (fixed) | PASS |
| Documents services/selectors/serializers | `documents/{services,selectors,serializers}.py` | api | deep | `can_user_download_document`, `create_order_document`, `verify_document`, D5 sniff in upload serializer | NFR6, FR10 | `documents/tests_selectors`, contract | serializers expose only `download_url` | PASS |
| Notifications models | `notifications/models.py` | model | deep | `Notification`(read-state CheckConstraint), `NotificationTemplate` | PRD2/3, SR4 | `notifications/tests*` | `notification_read_state_consistent` constraint | PASS |
| Notifications views | `notifications/views.py` | api | deep | center, mark-read (D8 constraint fix), **unread-count + mark-all-read (D8 new)**, admin, manual | PRD2/3 | `notifications/tests_remediation` (3), authz matrix | D8 fixed; latent mark-read constraint bug also fixed | PASS |
| Notifications services/selectors/event_map/utils | `notifications/*.py` | domain | deep | `notify_client`, `send_notification_event`, scoping | PRD3, SR4 | `orders/test_end_to_end` asserts template counts, journey suite | in-system only (matches PRD3) | PASS |
| Payment models | `payment/models.py` | model | deep | `Payment`/`Invoice`/`CommissionRule`/`ProviderPayout` | BB6 | `payment/tests` | billing foundation; no gateway (matches spec) | PASS |
| Payment views/billing/services | `payment/{views,billing,services}.py` | api | deep | customer payments (own orders), admin list/detail/status (`CanViewPaymentStatus`/`CanRefundPayment`) | BB6, BR7 | `payment/tests`, authz matrix | customer create guarded to own orders | PASS |
| Providers models | `providers/models.py` | model | deep | `ProviderProfile` (`SoftDeleteModel`) | FR6, BB5 | `providers/tests`, J18 | none | PASS |
| Providers views | `providers/views.py` | api | deep | provider dashboard/orders (`IsProviderRole`, org-scoped), admin viewset + approve/activate/restore (`CanManageUserRoles`) | FR6, BR7, BB5 | `providers/tests`, J18, authz matrix | `enforce_organization_scope` on candidate lookup | PASS |
| Providers serializers | `providers/serializers.py` | api | deep | provider order serializers, approval/activation | FR6 | journey suite | none | PASS |
| Public site models | `public_site/models.py` | model | deep | `SiteTheme`/`PublicPageContent`/`Advertisement`/`MissingServiceRequest` | FR1, CE6, UI2 | `public_site/tests`, J01/J05 | `MissingServiceRequest` has no org key (documented limitation) | PARTIAL |
| Public site views | `public_site/views.py` | api | deep | public homepage/theme/ads/missing-req (`AllowAny`), admin singletons + ads viewset (`IsAdminRole`) + restore | FR1, CE6 | `public_site/tests`, J01/J05, authz matrix | none | PASS |
| Public site support | `public_site/{services,selectors,defaults,validators}.py` | domain | deep | homepage assembly, image validators | FR1, UI2 | `public_site/tests` | none | PASS |
| Reports views | `reports/views.py` | api | deep | dashboard + daily/weekly/employee/summary; `_scoped_orders_for_reports`; revenue stripped for non-super-admin | FR5, PRD2, BB7, BR7 | `reports/tests`, authz matrix | provider/employee get scoped, revenue-free reports — BR7 satisfied | PASS |
| Audit | `audit/{models,views,utils}.py` | model+api | deep | `AuditLog` (large enums), list + timeline (read-only), `create_audit_log` | FR9, SD6/SD7 | `audit/tests`, J19/J20, authz matrix | no write/delete API → effectively immutable | PASS |
| Help guides | `help_guides/{models,views,serializers,selectors,fallbacks,screen_registry}.py` | subsystem | deep | in-app manual: 8 read endpoints + 6 admin viewsets (`CanManageHelpGuides`) + restore; screen registry | B7 | `help_guides/tests`, route runtime matrix (`/*/manual` all load), authz matrix | large but coherent; read behind `IsAuthenticated` | PASS |
| Migrations | `*/migrations/*` (67) | schema | inspected + applied | schema history | — | `makemigrations --check` clean; test DB + E2E DB build from scratch | 2 new (`accounts/0007`, `services/0010`); no drift | PASS |
| `*/admin.py` | Django admin regs | admin | read | `/django-admin/` behind `is_staff` | — | — | low risk | PASS |
| `manage.py`, `entrypoint.sh`, `Dockerfile` | ops | read | bootstrap, container entry | NFR5 | E2E harness reuses migrate/seed | none | PASS |

---

## Frontend

| Area | Path | Type | Reviewed | Functional role | Requirement | Test evidence | Findings | Status |
|---|---|---|---|---|---|---|---|---|
| Routes | `src/routes/AppRoutes.jsx` | routing | deep | ~57 routes + per-role nav arrays; `*`→`NotFoundPage` | PRD1, U14 | route runtime matrix (73/73), `NotFoundPage.test` | U14 fixed; 404 verified at runtime | PASS |
| Protected route | `src/routes/ProtectedRoute.jsx` | authz | deep | client-side role gate (advisory) | FR5–FR7 | route matrix (role routes gated), authz matrix (server-side) | none | PASS |
| API client | `src/api/client.js` | infra | deep | axios, Bearer, 401→refresh queue, **rotated-refresh persistence + `token_revoked` clean logout (D4)** | NFR3 | `client.test`, route matrix (no auth errors), journey suite indirectly | D4 FE half added | PASS |
| API modules | `src/api/{auth,orders,services,servicesApi,documents,notifications,payment,providers,publicSite,helpGuides}Api.js`, `services.js` | infra | deep | endpoint wrappers; `unwrapList`/`withId` tolerate list+id shape drift; test-mode mock seam | — | `KHALSNI_CONTRACT_TEST_AUDIT`, vitest | D8 helpers added; mock seam is test-only | PASS |
| Contexts | `src/context/{Auth,Language,PublicSite,HelpGuide,Toast}Context.jsx` | state | deep | auth bootstrap (skips `me` w/o token), i18n/RTL (`dir`/`lang` on `<html>`), public data, toasts | NFR1, NFR3 | route matrix (dir=rtl everywhere), english probe (dir flips) | Language init reads `localStorage` only (no `?lang=`) | PASS |
| Layouts | `src/layouts/{PublicLayout,DashboardLayout}.jsx` | shell | deep | public header/nav/footer; dashboard sidebar/topbar | NFR1, NFR2, UI1 | route matrix, screenshots | **`LanguageSwitcher` NOT in `PublicLayout`** (D-UX1); dashboard has it (works) | PARTIAL |
| Components | `src/components/*` (33) | design system | deep | `DataTable`,`FormModal`,`Pagination`,`PageHeader`,`StatCard`,`EmptyState`,`ConfirmModal`,`FileUploader`,`AdminSoftDeleteModal`,`CategoryCard`,`ServiceCard`,`StatusBadge`,`OrderTimeline`,`RouteErrorBoundary`,`Toast`,`Sidebar`,`Topbar`,`LanguageSwitcher`,`ServicePriceDisplay`,`ServiceDurationDisplay`,`DynamicServiceFields`,`ApplicationStepper`,`NotificationPanel`,… | UI1, UI6, A2 | vitest (`StatusBadge`,`CatalogImageCards`,`NotificationPanel`), route matrix, screenshots | real reusable design system; `NotificationPanel` D8 button added | PASS |
| Pages: public (26) | `src/pages/public/*` + `NotFoundPage` | UI | deep read + runtime | home/services/category/detail/create-order/track/about/contact/faq/privacy/auth + 404 | FR1–FR3, UI2 | route matrix (12 public routes OK), journey suite, screenshots, vitest (10 files) | box-in-box / left-flush category grid on home (D-UX2); duration label truncation | PARTIAL |
| Pages: customer (7) | `src/pages/customer/*` | UI | deep read + runtime | dashboard/new-order/orders/detail/missing-docs/profile | FR2, FR4 | route matrix (5 OK), journey suite (J08–J13), vitest | drafts versioned; renders clean | PASS |
| Pages: employee (6) | `src/pages/employee/*` | UI | deep read + runtime | dashboard/review-queue/order-review/verify-docs/reports | FR5, FR8 | route matrix (6 OK), journeys J14–J17, vitest | 1 axe color-contrast node on `/employee` | PASS |
| Pages: admin (21) | `src/pages/admin/*` | UI | deep read + runtime | 21 back-office pages | FR5, A1, A2 | route matrix (22 OK), J19/J20, authz matrix, vitest (5 files) | 1 axe color-contrast node on `/admin`; soft-delete modal wired | PASS |
| Pages: provider (3) | `src/pages/provider/*` | UI | deep read + runtime | dashboard/assigned-orders/detail | FR6 | route matrix (3 OK), J18, vitest | renders clean | PASS |
| Pages: shared (4) | `src/pages/shared/*` | UI | deep read + runtime | manual launch, missing-service-requests, category & relations management | A1, B3 | route matrix, authz matrix | none | PASS |
| Utils | `src/utils/{authz,format,i18n,servicePresentation,serviceForms,catalogDefaults,publicSiteDefaults,publicSiteSync,mockData}.js` | util | deep | `normalizeRole`, `hasPermission` (reads `user.permissions`), price/duration presentation, i18n | NFR1, UI1 | vitest, contract test | `mockData` is test-only | PASS |
| Hooks | `src/hooks/useAsyncData.js` | util | deep | loader + reload token | — | vitest indirectly | none | PASS |
| Locales | `src/locales/*` | i18n | read | ar + en dictionaries | NFR1 | english probe (nav + pages in English) | English content present; no `?lang=` deep-link | PASS |
| Styles / entry | `src/styles/*`, `App.jsx`, `main.jsx`, `index.css`, `App.css` | style | read | Tailwind tokens; bootstrap | UI1 | route matrix, screenshots | `App.css` retains Vite starter cruft (U15, P3) | PARTIAL |
| Build/preview config | `vite.config.js` (+`test.include` scoped to `src/**`), `eslint.config.js`, `tailwind.config.js`, `postcss.config.js` | config | deep | build, lint, test scoping | — | `npm run build` OK, `npm run lint` clean, vitest 44 | Playwright `e2e/` excluded from vitest | PASS |
| E2E harness | `frontend/playwright.config.js`, `e2e/{routes,public,a11y}.spec.js`, `e2e/run-{matrix,probes,english}.mjs`, `e2e/_helpers.js` | test infra | authored + executed | route matrix (73/73), a11y (axe), D1/D2/English probes, screenshots | D10, D-A11Y-1 | new; `channel:'chrome'` (system browser, no download). Journey + authz coverage lives in `backend/orders/tests_journeys.py` + `backend/config/tests_authz_matrix.py` (executed) | PASS |
| `frontend/dist*/`, `test-results/` | generated | n/a | — | build output | — | — | untracked + git-ignored (D11) | DEAD_CODE |

---

## Mobile (`mobile/` — Expo / React Native, ~65 TS files)

| Area | Path | Reviewed | Findings | Status |
|---|---|---|---|---|
| Active? | `mobile/` last touched commit `c479fc4` (2026-06-30); `package.json` Expo 54 / RN 0.81 / React 19; typed, structured | deep-read key files | **Active companion client, part of Khalsni** — not obsolete. | — |
| Typecheck | `npm run typecheck` | executed | **PASS (exit 0)** | PASS |
| API client | `src/api/client.ts` + `*.api.ts` (9) | deep | axios instance, base URL from `src/config/env.ts`; token attach; per-domain wrappers mirror the web API surface | PASS |
| Auth | `src/auth/{AuthProvider,authStorage}.tsx`, `src/state/authStore.ts` | deep | `expo-secure-store` for tokens (better than web localStorage), zustand store, role from `/auth/me` | PASS |
| Permissions | `src/permissions/{permissions.ts,guards.tsx}`, `src/components/RoleGuard.tsx` | deep | client-side role/permission guards mirroring backend; **backend still enforces** (authz matrix) | PASS |
| Navigation | `src/navigation/*` (Root/Auth/Client/Employee/Provider/Admin) | deep | per-role navigators; `RootNavigator` switches on auth+role | PASS |
| Types | `src/types/*.ts` (order/document/service/user/report/notification/...) | deep | mirror backend serializers incl. `provider_instructions` (added 2026-06); `status.ts` mirrors `OrderStatus` | PASS |
| Components/theme/utils | `src/components/*`, `src/theme/*`, `src/utils/*` | read | RN design-system set (AppButton/Card/Input/Screen, StatusBadge, OrderCard, ConfirmDialog), Cairo font, spacing/typography tokens | PASS |
| Runtime tests | — | — | **none** — no RN Testing Library / Detox / navigation smoke. Type-check only. | PARTIAL |
| Build | `expo` build / EAS | not run | no Expo/EAS build attempted this gate (needs Expo toolchain + device/emulator) | BLOCKED (build only) |
| Security | token storage, guards, API contract | deep read | `expo-secure-store` good; no obvious secret; contracts align with backend (types match). Backend D4 JWT changes are backward-compatible (baseline tokens still accepted) so mobile keeps working. | PASS |

**Mobile verdict: REVIEWED.** Active, typechecks clean, contracts align, auth/permissions sound. Gaps: no runtime test suite (pre-existing, tracked), no build attempted here.

---

## Code-smell sweep (Gate 1R re-run)

| Looked for | Result |
|---|---|
| TODO/FIXME/HACK/XXX | **none** in first-party `.py`/`.jsx`/`.js`/`.ts` (excl. tests/migrations) |
| console.* (frontend non-test) | 1 |
| dead code | `frontend/dist*` (generated, now untracked); `live.js`/`live-index-*.js` at repo root still look like stray bundles; `App.css` starter cruft (U15) |
| duplicated business logic | `ServiceRequiredDocument` dual identity (D6, deferred) |
| unreachable routes | none — every URL include mounted; every FE route runtime-loaded |
| fake/mock production behavior | `src/api/services.js` mock seam is `import.meta.env.MODE === 'test'` only — not production |
| hardcoded data | `ServiceDetailSerializer.get_steps` returns fixed process-step text (acceptable) |
| swallowed/broad exceptions | `core/delete_guard.py` 2× narrow `except Exception` (documented `pragma`); `role_groups.py` catches migration-bootstrap errors (correct); `accounts/views.py` `TokenError` guard (intentional) |
| inconsistent permissions | none found in reviewed views; authz matrix green |
| N+1 / perf | list views use `select_related`/`prefetch_related` + prefetch-aware branches; not load-profiled |
| circular imports | avoided via function-local imports in `config/permissions.py` |
