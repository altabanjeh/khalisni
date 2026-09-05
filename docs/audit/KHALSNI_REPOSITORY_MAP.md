# KHALSNI — Repository Map

Gate 1 · 2026-09-05 · HEAD `574753e` (branch `main`, clean)

Totals: 2 383 git-tracked files. Backend: 15 Django apps, 65 migration files, 16 test modules. Frontend: ~70 page components (+22 test files), 12 API modules. Mobile: Expo/React Native app (not reviewed in this gate). Vendored dirs excluded from line review: `.venv/`, `frontend/node_modules/`, `mobile/node_modules/`, `frontend/.npm-cache/`, `frontend/dist*/`, `backend/staticfiles/`.

---

## 1. Top-level layout

| Path | Purpose |
|---|---|
| `backend/` | Django 5 + DRF API, `manage.py`, `config/` project, 15 domain apps, `Dockerfile`, `entrypoint.sh`, `requirements.txt`, dev `db.sqlite3`, `media/`, `static/`, `staticfiles/` |
| `frontend/` | React 19 + Vite 8 + Tailwind 3 SPA (`src/`), `dist/` + `dist-acceptance/` build outputs, `public/`, `test-results/`, `docs/` |
| `mobile/` | Expo / React Native app (`app/`, `App.tsx`, `eas.json`, `app.json`) — **not audited this gate** |
| `docs/` | Specs, design prompts, prior audit/enhancement/validation passes, help guides, service-import reports; **this report → `docs/audit/`** |
| `scripts/`, `data/` | Ops scripts; `data/service-import/` source data |
| `docker-compose.yml`, `docker-compose.override.yml` | Postgres + backend + frontend orchestration |
| `.github/workflows/ci.yml` | CI: backend `check` + migration-check + `test`; frontend `lint` + `test` |
| repo root loose files | `*.pdf`, `*.docx`, `*.xlsx`, `*.jpeg/png`, `live.js`, `live-index-*.js`, `generate_manual.py`, `generate_arabic_pdf.py`, `~$…docx` — spec/design/manual artefacts (hygiene item D11) |

---

## 2. Backend subsystems

Legend for "Tests": module name(s) under the app; the full suite is **197 tests, all passing** (2026-09-05 local run, ~229 s).

### 2.1 `config/` — project core
- **Purpose**: settings, root URL conf, DRF/JWT/throttle/CORS/security config, the shared permission-class library.
- **Entry points**: `config/settings.py`, `config/urls.py` (mounts every app under `/api/`, plus `/django-admin/`, `/api/health/`, and an **unauthenticated** `re_path(r"^media/(?P<path>.*)$", serve, …)`).
- **Key file**: `config/permissions.py` — ~35 permission classes (`IsAdminRole`, `IsSupportRole`, `IsProviderRole`, `IsCustomerRole`, `CanReviewOrders`, `CanAssignOrders`, `CanManageOrderWorkflow`, `CanVerifyDocuments`, `CanManageServicePrices`, `CanViewOrManageServiceCatalog`, `CanManageOrganizations`, `CanManagePartnerCatalog`, …), each layering Django model perms on top of B2B2C selector checks.
- **Config of note**: `DEBUG` env-default **`True`**; JWT access `8h` / refresh `7d`, `ROTATE_REFRESH_TOKENS=False`, `BLACKLIST_AFTER_ROTATION=True`; DRF default perm `IsAuthenticatedOrReadOnly`; pagination `PAGE_SIZE=20`; throttles anon `120/min`, user `600/min`, `order_tracking 10/min`, `missing_service_request 5/h`, `auth_password_reset 5/h`; upload allowlist `.pdf/.jpg/.jpeg/.png/.doc/.docx`, MIME allowlist matching, `FILE_UPLOAD_MAX_SIZE 10 MiB`; security headers gated on `not DEBUG` (HSTS, SSL redirect, secure cookies), `X_FRAME_OPTIONS=DENY`, nosniff on; `SECURE_PROXY_SSL_HEADER` for Traefik/Coolify; optional S3 (`AWS_DEFAULT_ACL=private`) and Redis.
- **Risks**: unsafe `DEBUG` default (D3); `/media/` catch-all serves uploaded documents without authorization (D1); long access-token lifetime + no rotation (D4).

### 2.2 `core/` — shared model & serializer primitives
- **Purpose**: `SoftDeleteModel` abstract mixin (`is_deleted`, `deleted_at`, `deleted_by`, `delete_reason`, `soft_delete()`, `restore()`); `delete_guard.py` (`AdminDeleteGuardMixin`, `enforce_admin_delete_guard`, delete-password + reason extraction, blocked-delete audit, `?include_deleted=` gate); `choices.py` (`UserRole`, `OrderStatus`×11, `OrderPriority`, `DocumentType`, `NotificationType`, `PaymentStatus`); `serializer_mixins.PkAsIdMixin`.
- **Entry**: imported by every domain app.
- **Tests**: `core/tests.py`.
- **Risk**: `SoftDeleteModel` has no custom manager — deleted-row exclusion is per-queryset/per-view, so any view that forgets `.filter(is_deleted=False)` can leak deleted rows (mitigated in reviewed catalog/public querysets via `visible_services_queryset` etc.).

### 2.3 `accounts/` — identity, auth, users, settings
- **Models**: `CustomUser` (`SoftDeleteModel` + `AbstractBaseUser` + `PermissionsMixin`, email login, `role` enum, unique non-empty `phone`/`national_id`, `manage_user_roles` perm), `CustomerProfile`, `SystemSetting` (K/V JSON — also backs the delete-guard password), `PasswordResetToken`.
- **APIs** (`accounts/urls.py`): `auth/register|login|logout|forgot-password|reset-password/<token>|token/refresh|me`; `customer/profile/`; admin routers `admin/users`, `admin/customer-profiles`, `admin/system-settings`; `admin/available-permissions/`, `admin/delete-guard/`.
- **Support files**: `role_groups.py` (`ROLE_TO_GROUP_NAME`, `GROUP_PERMISSION_MAP` for client/employee/provider; `admin` group = all perms except contenttypes/sessions; `sync_user_role_group`), `password_reset.py`, `signals.py`.
- **Tests**: `accounts/tests.py`.
- **Related reqs**: FR4, FR5, NFR3, BB1/BB2.
- **Risks**: dual authority (`CustomUser.role` legacy + membership role) must stay in sync; `admin` group is very broad (mitigated by `is_platform_super_admin` checks in permission classes).

### 2.4 `organizations/` — B2B2C tenancy
- **Models**: `Organization` (types `platform`/`partner`/`provider`/`customer_company`), `Branch`, `OrganizationMembership` (authoritative B2B2C role), `OrganizationBranding`, `PartnerServiceConfig` (per-partner enable/disable + custom price + visibility of global services).
- **APIs**: routers `organizations`, `branches`, `organization-memberships`, `organization-branding`, `partner-service-configs`; `platform/partner-onboarding/`, `me/memberships/`.
- **Key file**: `organizations/selectors.py` — the tenant-isolation core (`is_platform_super_admin`, `is_platform_support`, `is_partner_admin`, `is_partner_operational_user`, `is_provider_user`, `is_customer_user`, `active_memberships_for_user`, `is_branch_manager`). Used by `config/permissions.py`, `orders/selectors.py`, `services/*`, `providers/views.py`, `payment/views.py`.
- **Tests**: `organizations/tests.py`.
- **Related reqs**: BB1–BB7. **Risks**: correctness of scoping depends entirely on every list view calling the right selector; `public_site.MissingServiceRequest` has no org key (global internal queue — documented limitation).

### 2.5 `services/` — catalog
- **Models** (`services/models.py`, 860 lines): `ServiceCategory` (hierarchy via `parent` PROTECT, `slug` unique, `show_on_public_site`, image, `clean()` enforces unique-name-under-parent + no cycles + block-deactivate-with-active-services), `Service` (`scope`, `organization`, `price_type`, `base_price`/`government_fee`/`service_fee` + `show_total_price_public`/`show_government_fee_public`/`show_company_fee_public` + `public_price_note_*`, three delivery modes `duration`/`duration_range`/`date_range` with `clean()` validation + `save()` normalisation, `required_information_schema` JSON, `requires_manual_review`, `provider_required`, auto `SRV-000000` number, `manage_service_prices` perm), `RequiredDocumentDefinition` (master doc table: `code` slug + `name_ar/en` + `allowed_extensions`/`allowed_mime_types`/`max_file_size`, partial unique indexes for active+non-deleted), `ServiceRelation` (4 types, partial-unique `(source,target,type)`, cycle check), `ServiceProviderAssignment`, `Address`, `ServiceRequiredDocument` (links `service`→`document_definition` **nullable** + retains legacy `document_type`/`name_ar` strings; two partial-unique constraints).
- **APIs** (`services/urls.py`): public `services/`, `services/categories/`, `public-site/service-categories/`, `public-site/service-categories/<slug>/services/`, `services/<slug>/`; admin routers `admin/services`, `admin/categories`, `admin/required-document-definitions`, `admin/service-documents`, `admin/service-relations`, `admin/service-provider-assignments`, `admin/addresses`.
- **Serializers** (`services/serializers.py`, 892 lines): `_public_pricing_payload` gates fees on visibility flags; `ServiceListSerializer`/`ServiceDetailSerializer` public; `RelatedServiceSerializer` **exposes raw `government_fee`+`service_fee`** (D2); admin serializers full internal config.
- **Support**: `catalog_defaults.py`, `service_categories.py` (cycle guard), `service_relations.py` (prereq cycle detection), `order_validation.py` (prereq checks pre-create), `order_completion.py` (recommendation notifications), `service_import.py` + `tests_service_import.py`, `selectors.py` (`visible_services_queryset`), management commands.
- **Tests**: `services/tests.py`, `services/tests_service_import.py` (catalog subset = 31 tests, all pass).
- **Related reqs**: FR1, A1 (CE1–CE10), B3 (SC/SR), BB3, UI6.

### 2.6 `orders/` — request lifecycle
- **Models** (`orders/models.py`, 917 lines): `Order` (11-status enum, `order_number` `KH-YYYY-######`, customer/service/provider/employee FKs, org+branch+snapshot fields `service_name_snapshot`/`service_category_name_snapshot`/`organization_name_snapshot`, delivery snapshot fields, `is_final_state`/`is_active` props), `OrderStatusLog`, `OrderNote` (`SoftDeleteModel`, visibility internal/customer), `OrderAssignmentHistory`, `OrderIssue`, `Rating`, `MissingDocumentRequest`.
- **APIs** (`orders/urls.py`): public `orders/` (create — auth customer), `orders/track/` (AllowAny, throttled); customer `customer/orders/…` (list/detail/documents/cancel/rating); admin dashboard list + per-order `status`/`assign`/`request-documents`/`notes`/`final-document`/`complete`/`reject`/`cancel` + `admin/workflow-rules/`; routers `admin/order-records` (guarded raw record), `admin/order-notes`, `admin/order-issues`, `admin/ratings`.
- **Logic**: `orders/services.py` (`update_order_status` — **only routes whitelisted `generic_status_update` transitions**, else audited-block; `submit_order`, `review_order`, `assign_provider`, `request_missing_documents`, `upload_final_document`, `complete_order` [final-doc-or-admin-confirm + verified-doc rule], `reject_order`, `archive_order`, provider flows, `resume_review`, `return_to_*`, `reopen_order`), `orders/selectors.py` (`can_view_order`, `get_orders_for_user`, `get_reviewable_orders_for_user`), `orders/allowed_actions.py` (per-order capability map for the UI), `orders/service-import-source/`.
- **Guarded raw endpoint**: `AdminOrderRecordViewSet._safe_update` blocks final-state edits and a `DANGEROUS_FIELDS` set; `destroy` archives via workflow.
- **Tests**: `orders/tests.py`, `orders/test_end_to_end.py`.
- **Related reqs**: FR2, FR3, FR6, FR8, BR1–BR8, A1 (CE9/CE10), BB4/BB5, SR3.

### 2.7 `workflow/` — order state machine
- **Purpose**: single source of transition truth. `rules.py` = 26 `TransitionRule` dataclasses (`from_status`, `to_status`, `action`, `allowed_roles`, `validation_checks`, `reason_required`, `notification_trigger`, `generic_status_update`) → `TRANSITION_RULE_MAP`, `ALLOWED_ORDER_TRANSITIONS`, `get_generic_status_update_targets`. `transition_permissions.py` = `assert_order_transition_allowed` (role ∈ allowed_roles + actor-matches-order: customer owns, provider assigned/org-member, employee is assigned) + `assert_can_cancel_order`. `services.py` (thin).
- **Entry**: consumed by `orders/services.py`, `orders/allowed_actions.py`, `providers/views.py`.
- **Tests**: covered via `orders/tests.py` transition cases.
- **Related reqs**: BR2, BR3, BR4, BR6, FR8. **No dedicated `workflow/tests.py`** (coverage is indirect through orders).

### 2.8 `documents/` — uploaded files
- **Models**: `Document` (`secure_document_upload_path` → `secure_orders/<order_number>/documents/<uuid>.<ext>`, `original_filename` stored separately, `file_extension`/`file_size`/`mime_type`, `status`, `is_final_document`, `is_verified`, `SoftDeleteModel`; `clean()` re-validates extension + size + declared MIME + dangerous-extension blocklist).
- **APIs**: `documents/<id>/download/` (`AllowAny` view with layered auth: authenticated permission check → signed token → order_number+phone for final docs only), `documents/<id>/download-token/` (issues short-lived signed token), `staff/documents/` + `staff/documents/<id>/verify/`, router `admin/documents`.
- **Logic**: `services.py` (`create_order_document`, `verify_document`, `can_user_download_document`), `selectors.py` (`get_documents_for_user`), `tests_selectors.py`.
- **Tests**: `documents/tests.py`, `documents/tests_selectors.py`.
- **Related reqs**: FR2, FR10, NFR6, BR4. **Risks**: the download **view** is sound; the parallel unauthenticated `/media/` route is not (D1). MIME check trusts client `content_type` (D5).

### 2.9 `notifications/`
- **Models**: `Notification` (`SoftDeleteModel`, type enum, `target_service`, `template_key`, read state), `NotificationTemplate` (`SoftDeleteModel`).
- **APIs**: `notifications/` (center), `notifications/<id>/read/`, `admin/notifications/…`, `employee/notification-templates/`, `orders/<id>/manual-notification/`, router `admin/notification-templates`.
- **Logic**: `services.py` (`notify_client`, `send_notification_event`), `event_map.py`, `selectors.py`, `utils.py`.
- **Tests**: `notifications/tests.py`.
- **Related reqs**: FR5, PRD2, PRD3, SR4. **Gap**: no `unread-count`, no `mark-all-read` (D8).

### 2.10 `payment/` — billing foundation
- **Models**: `Payment` (status enum), `Invoice`, `CommissionRule`, `ProviderPayout`.
- **APIs**: `customer/payments/` (+detail), `admin/payments/` (+detail + `status`).
- **Logic**: `billing.py`, `services.py`.
- **Tests**: `payment/tests.py`.
- **Related reqs**: BB6, PRD "Invoices/Payments". **Status**: data model + service helpers only; no gateway (matches B2/A3 "not yet included").

### 2.11 `providers/`
- **Models**: `ProviderProfile` (`SoftDeleteModel`).
- **APIs**: `provider/dashboard/`, `provider/orders/…` (list/detail/status/notes/final-document), router `admin/providers`.
- **Tests**: `providers/tests.py`.
- **Related reqs**: FR6, BR7, BB5. Provider admin queries organization-scoped (per 2026-06-16 hardening).

### 2.12 `public_site/` — public CMS
- **Models**: `SiteTheme`, `PublicPageContent`, `Advertisement` (`SoftDeleteModel`), `MissingServiceRequest` (**no org key**).
- **APIs**: `public-site/homepage/`, `public-site/theme/`, `public-site/advertisements/`, `public-site/missing-service-requests/` (create, throttled); admin `public-site/content/`, `public-site/theme/`, routers `admin/public-site/advertisements`, `admin/public-site/missing-service-requests`.
- **Logic**: `services.py`, `selectors.py`, `defaults.py`, `validators.py`.
- **Tests**: `public_site/tests.py`.
- **Related reqs**: FR1, A1 CE6, A4 (homepage redesign), UI2.

### 2.13 `reports/`
- **APIs** (function views, no model): `admin/dashboard/`, `admin/reports/daily/`, `admin/reports/weekly/`, `employee/dashboard/`, `employee/reports/summary/`, `reports/summary/` (scoped).
- **Tests**: `reports/tests.py`.
- **Related reqs**: FR5, PRD2, BB7, BR7 (provider excluded from finance).

### 2.14 `audit/`
- **Model**: `AuditLog` (large `Action`/`Source`/`LogStatus` enums, `user`, `entity_type/id/name`, `old_value`/`new_value` JSON, `error_message`). **No `save()`/`delete()` override** but **no mutating API** — only `admin/audit-logs/` (list) and `orders/<id>/timeline/` (read).
- **Logic**: `utils.create_audit_log`.
- **Tests**: `audit/tests.py`.
- **Related reqs**: FR9, SD6/SD7 (immutability by absence of write surface).

### 2.15 `help_guides/` — in-app manual
- **Models**: `HelpGuide`, `HelpGuideScreenshot`, `HelpGuideBase` + action/field/service/workflow variants (all `SoftDeleteModel`).
- **APIs**: `help/current|index|fields|actions|services/<id>|workflows|search|metadata`, router `help`, admin routers `help/admin/{screens,actions,fields,screenshots,services,workflows}`.
- **Support**: `fallbacks.py`, `screen_registry.py`, `selectors.py`.
- **Tests**: `help_guides/tests.py`.
- **Related reqs**: B7 (user manual), PRD (help CTA).

---

## 3. Frontend map (`frontend/src/`)

| Area | Contents | Notes |
|---|---|---|
| `routes/` | `AppRoutes.jsx` (all routes + per-role nav link arrays), `ProtectedRoute.jsx` (redirects unauth → `/login?next=`, wrong role → `/`) | ~57 routes total. Role gating client-side only; backend is the enforcement point. |
| `context/` | `AuthContext`, `LanguageContext` (t()/RTL), `PublicSiteContext` (homepage/theme), likely a toast/notification context | Auth bootstrap skips `auth/me` when no token (per A6). |
| `api/` | `client.js` (axios, `Bearer` injection, 401→refresh queue, session-vs-local storage mode, `khalisni:auth-expired` event), `authApi`, `ordersApi`, `servicesApi`, `services.js`, `documentsApi`, `notificationsApi`, `paymentApi`, `providersApi`, `publicSiteApi`, `helpGuidesApi` | JWT in `localStorage`/`sessionStorage`. `withCredentials` opt-in via env. |
| `layouts/` | `PublicLayout`, `DashboardLayout` (+ `Sidebar`, `Topbar`, `LanguageSwitcher`) | Role-scoped nav; `roles:[…]` filter on some links. |
| `components/` | `CategoryCard`, `ServiceCard`, `StatusBadge`, `CatalogImageCards`, `AdminSoftDeleteModal`, `RouteErrorBoundary`, `LoadingSpinner`, `public/`, `publicSite/` | `AdminSoftDeleteModal.jsx` = the A2 delete-confirmation modal. |
| `pages/public/` (25) | Home, Services, ServiceCategory, ServiceDetails, CreateOrder, TrackOrder, About, Contact, Faq, PrivacyPolicy, Login, Register, Forgot/ResetPassword (+ tests) | Public catalog + auth entry. |
| `pages/customer/` (7) | DashboardHome, CreateOrder, MyOrders, OrderDetails, MissingDocumentsResponse, Profile | Order lifecycle from the customer side. |
| `pages/employee/` (6) | DashboardHome, ReviewQueue, OrderReview, VerifyDocuments, Reports | Internal review. |
| `pages/admin/` (21) | Overview, OrdersManagement, OrderDetails, RuleManagement, Cms, ServicesManagement, PublicSiteManagement, HomepageContentEditor, AdvertisementManager, ThemeSettings, PreviewPublic, UsersRoles, ProvidersManagement, ServiceProviderAssignments, Reports, Notifications, PaymentsManagement, AuditLog, HelpGuideManagement | Full back office. |
| `pages/provider/` (3) | DashboardHome, AssignedOrders, OrderDetails | Execution. |
| `pages/shared/` (4) | ManualLaunchPage, MissingServiceRequestsPage, ServiceCategoryManagementPage, ServiceRelationsManagementPage | Reused by admin + support. |
| `hooks/`, `utils/`, `locales/`, `styles/`, `help/`, `test/` | `utils/format.js` (`normalizeRole`), i18n dictionaries (ar/en), Tailwind token styles, vitest setup | 22 vitest files / 42 tests pass. |

Build outputs `frontend/dist/` and `frontend/dist-acceptance/` are committed/present (hygiene).

---

## 4. Cross-cutting concerns

| Concern | Where | State |
|---|---|---|
| AuthN | `simplejwt` (`JWTAuthentication` + `SessionAuthentication`), `accounts/views.py`, `frontend/src/api/client.js` | Working; token-lifetime posture is a defect (D4). |
| AuthZ | `config/permissions.py` + `organizations/selectors.py` + `workflow/transition_permissions.py` + per-view querysets; `frontend/routes/ProtectedRoute.jsx` (advisory) | Server-side enforced; needs a full negative-matrix runtime test (not present). |
| Validation | Model `clean()`/`full_clean()` in `save()` across catalog + accounts + documents; DRF serializers; `order_validation.py` | Strong at model layer. |
| Localization | `LANGUAGE_CODE=ar`, `LANGUAGES=[ar,en]`, `frontend/src/locales/`, `name_ar`/`name_en` + `*_ar`/`*_en` fields throughout | Arabic-first; RTL shell in `LanguageContext`. |
| Media/files | `secure_document_upload_path`, `FileSystemStorage` or private S3, `/media/` serve route | D1 risk on the serve route. |
| Notifications | `notifications/services.py`, `event_map.py` | In-system only (matches PRD3). |
| Logging | Django logging config in `settings.py`, `logs/` dir, `create_audit_log` | Audit via `audit` app. |
| Error handling | `RouteErrorBoundary`, DRF exception mapping in views (`_raise_drf_validation_error`) | Reasonable. |
| Config/env | `.env` (git-ignored, local only), `.env.example`, `backend/.env.example`, env-driven settings | No secrets committed (only `.env.example`). |
| Docker/deploy | `backend/Dockerfile`, `entrypoint.sh`, `docker-compose.yml`, `docs/DEPLOYMENT.md`, Coolify/Traefik proxy headers | Postgres + gunicorn + whitenoise. |
| CI | `.github/workflows/ci.yml` | backend test + FE lint/test only; no build/typecheck/E2E/scan (D9). |
| Seeds | `accounts/management/commands/seed_initial_data`, `seed_demo`, `services`/`public_site` seed commands, `check_system_consistency` | Idempotent; demo accounts documented in `README.md`. |
| Tests | 197 backend (all pass), 42 frontend (all pass), lint clean, migration-drift clean; **no** E2E/axe/typecheck/dep-scan | See test audit. |
