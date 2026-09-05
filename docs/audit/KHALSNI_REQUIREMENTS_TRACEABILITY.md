# KHALSNI — Requirements Traceability Matrix

Gate 1 · 2026-09-05 · HEAD `574753e`

Status vocabulary: **PASS** (implemented + automated-test or code-verified end-to-end), **PARTIAL** (implemented, gap or missing verification), **FAIL** (implemented but violates the requirement), **NOT_IMPLEMENTED**, **NOT_TESTED** (present, no evidence of function), **REQUIREMENT_CONFLICT**, **NOT_APPLICABLE**.

> **Gate 1R recalculation (2026-09-05)** — status re-derived from executed runtime evidence (route matrix 73/73, journeys J01–J20 20/20, authz matrix 78+3, contract 7/7, axe, screenshots), not carried over.
>
> | Requirement | Gate 1 | Gate 1R | Evidence |
> |---|---|---|---|
> | FR1 public browse categories/services | PARTIAL | **PASS** | route matrix (`/`,`/services`,`/services/category/:slug`,`/services/:slug` all clean); J01–J03; contract |
> | FR2 request creation | CONFLICT | **PASS** (rule stated) | C1 resolved (SRS aligned); J06/J08; authz matrix (anon denied) |
> | FR3 public tracking | PARTIAL | **PASS** | J04; `/track-order` route matrix; `TrackOrderPage.test` |
> | FR4 customer auth/orders/docs/rate | PARTIAL | **PASS** | J06/J07/J08/J09/J10/J13; customer routes 5/5 |
> | FR5 admin management | PARTIAL | **PASS** | admin routes 22/22; J14/J19/J20; authz matrix |
> | FR6 provider assigned-only | PARTIAL | **PASS** | J18 (unassigned→404, assigned→200, execution); authz matrix; provider routes 3/3 |
> | FR7 support view-only, no price/delete | PARTIAL | **PASS** | authz matrix (support: catalog read-only, no users/settings/audit, no delete) |
> | FR8 status change → log | PASS | **PASS** | J11/J15/J17/J20 assert `OrderStatusLog` |
> | FR9 sensitive ops → audit | PASS | **PASS** | J19/J20 assert `AuditLog`; `restore_*` audited |
> | FR10 upload type+size | PARTIAL | **PASS** | D5 magic-byte sniff (`documents/tests_remediation`) + serializer ext/size; J09/J16 |
> | NFR1 Arabic RTL | PARTIAL | **PASS** | route matrix `dir=rtl` every route |
> | NFR1 (English LTR) | PARTIAL | **PARTIAL** | LTR renders correctly when set, **but D-UX1**: no public UI to switch → English unreachable for public visitors |
> | NFR2 responsive | PARTIAL | **PASS** | 25/25 checks, 0 overflow at 5 viewports |
> | NFR3 JWT | PARTIAL | **PASS** | D4 fixed + `TokenVersionRevocationTests`; contract (login shape) |
> | NFR6 protected document paths | FAIL | **PASS** | D1 runtime-verified (404 on all sensitive `/media/` paths) + nginx deny |
> | CE5 price visibility | FAIL | **PASS** | D2 runtime + contract (`related_services` no raw fees; `pricing` gated) |
> | CE6 public category cards → services | PARTIAL | **PASS** | J02/J03; `ServiceCategoryPage` route + screenshot |
> | CE7 soft delete hidden + restore + audit | PARTIAL | **PASS** | J19 (create→delete→hidden→restore→audit) |
> | A2 SD1/SD3/SD4 delete/restore/tabs UI | PARTIAL | **PARTIAL** | restore endpoints + api + J19 proven; per-page tab/button UI still not asserted per screen |
> | CE10 doc validation by definition ID | PARTIAL | **PARTIAL** | still `document_type`-keyed (D6 deferred) |
> | KH-A11Y (WCAG AA) | PARTIAL | **PARTIAL** | axe: 0 critical, 1 serious contrast root cause (D-A11Y-1); keyboard walk still owed |
> | KH-UI (visual system) | PARTIAL | **PARTIAL** | light-direction conformance good; D-UX2 + carry-forward U1–U13 open; C-VIS1 pending |
> | KH-SEC (deps) | PARTIAL | **PARTIAL** | `pip-audit` clean; `npm audit --omit=dev` = **4 high** (D-DEP1) |
> | KH-MOBILE | PARTIAL | **PARTIAL** | mobile reviewed + `typecheck` PASS; no runtime tests, no build attempted |
> | KH-PERF | PARTIAL | **PARTIAL** | build OK, lazy routes; no Lighthouse/RUM |
>
> **Post-Gate-1R roll-up (63 tracked lines):** PASS **≈ 41** · PARTIAL **≈ 20** · FAIL **0** · BLOCKED **0** · CONFLICT 1 (C-VIS1, decision) · NOT_IMPLEMENTED 0. Remaining PARTIALs each name the missing evidence (English public switcher, per-screen soft-delete UI, D6 doc-ID validation, keyboard-a11y walk, visual U1–U13, dep bump, mobile runtime tests, perf budget).
>
> **Gate 2 update (2026-09-05):** the two FAIL rows are now fixed & regression-tested — **NFR6 (D1)**: `/media/` route + nginx allow-list, `documents/tests_remediation.py`; **CE5 (D2)**: `RelatedServiceSerializer` fee-gating, `services/tests_remediation.py`. **FR2 (C1)** conflict resolved by aligning `docs/SRS.md`. **CE10 (D6)** remains PARTIAL (deferred: destructive migration). Post-remediation FAIL count: **0**.

Per the gate rule, "code exists" alone is not PASS. Where the only evidence is source review + unit tests (no runtime journey rerun), status is capped at **PARTIAL** unless a backend/frontend automated test directly exercises the behaviour.

Requirement sources: **SRS** = `docs/SRS.md`; **PRD** = `docs/PRD.md`; **A1** = `khalisni_service_catalog_enhancement_codex_prompt.md`; **A2** = `khalisni_soft_delete_ui_fix_prompt.md`; **A3** = `docs/b2b2c_architecture.md`; **B3** = `docs/service_categories.md` + `docs/service_dependency_rules.md`; **A4/A5** = UI prompts + `docs/ui/`.

---

## A. SRS functional requirements

| ID | Requirement | Source | Backend / API | Frontend | DB | Permissions | Tests | UI route | Status | Issue | Remediation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| FR1 | Public browse active categories & services | SRS FR1 | `ServiceListAPIView`, `ServiceCategoryListAPIView`, `PublicServiceCategoryServicesAPIView`, `ServiceDetailAPIView` (all `AllowAny`); `visible_services_queryset` | `pages/public/Services`, `ServiceCategory`, `ServiceDetails`, `HomePage` | `Service`/`ServiceCategory` `is_active`+`show_on_public_site`+`is_deleted` indexes | AllowAny + org resolution | `services/tests.py`, FE `HomePage`/`Services`/`ServiceCategory`/`ServiceDetails` tests | `/`, `/services`, `/services/category/:slug`, `/services/:slug` | **PARTIAL** | Related-service fee leak (D2) sits on this endpoint | fix D2 |
| FR2 | Public create request with data + file uploads | SRS FR2 | `CreateOrderAPIView` (`IsAuthenticated`+`IsCustomerRole`); public funnel via `_get_or_create_public_customer` | `pages/public/CreateOrder`, `pages/customer/CustomerCreateOrderPage` | `Order`, `Document` | customer-only | `orders/test_end_to_end.py`, FE `CreateOrderPage` test | `/create-order`, `/customer/orders/new` | **REQUIREMENT_CONFLICT** | SRS says "public users"; code requires an authenticated customer (see Conflict C1) | confirm intended rule with product owner; update SRS |
| FR3 | Public track order by number + phone | SRS FR3 | `TrackOrderAPIView` (`AllowAny`, `order_tracking` throttle 10/min) | `pages/public/TrackOrderPage` | `Order.order_number` unique index | AllowAny + phone match | `orders/tests.py`, FE `TrackOrderPage` test | `/track-order` | **PASS** | — | — |
| FR4 | Customer auth, view orders, upload missing docs, rate completed | SRS FR4 | `CustomerOrderList/Detail`, `CustomerOrderDocumentUploadAPIView`, `CustomerOrderRatingAPIView`, `MissingDocumentRequest` flow | `pages/customer/*` (MyOrders, OrderDetails, MissingDocumentsResponse, Profile) | `Rating`, `MissingDocumentRequest` | `IsCustomerRole` + ownership | `orders/tests.py`, FE `MyOrdersPage`, `MissingDocumentsResponsePage` tests | `/customer/orders*`, `/customer/orders/:id/missing-docs` | **PARTIAL** | rating/missing-doc paths covered by unit tests; full journey not rerun this gate | E2E journey suite |
| FR5 | Admin manage services/categories/providers/orders/reports/notifications/audit | SRS FR5 | admin routers across `services`/`orders`/`providers`/`reports`/`notifications`/`audit`/`public_site`/`accounts` | `pages/admin/*` (21) | — | `IsAdminRole` / capability perms + B2B2C selectors | per-app `tests.py`; FE `AdminUsersRoles`, `Providers`, `Services`, `AdminRuleManagement` tests | `/admin/*` | **PARTIAL** | broad surface; no full role-negative runtime matrix | AuthZ matrix E2E |
| FR6 | Provider sees only assigned orders, adds notes/progress, uploads final doc | SRS FR6 | `ProviderOrderList/Detail/Status/Notes/FinalDocument`; `transition_permissions` provider-assigned check | `pages/provider/*` | `Order.assigned_provider`/`assigned_provider_organization` | `IsProviderRole` + assignment/org-membership | `providers/tests.py`, `orders/tests.py`, FE `ProviderOrderDetails` test | `/provider/orders*` | **PARTIAL** | scoping code verified by review + unit tests; runtime negative test absent | — |
| FR7 | Support: view orders + customer-visible messages; no price change; no delete | SRS FR7 | `IsSupportRole`, `IsAdminOrSupportReadOnly`; `CanManageServicePrices` excludes support write unless perm; `AdminDeleteGuardMixin.check_permissions` blocks non-super-admin DELETE | `pages/employee/*` shared shell, `roles:['support']` links | — | support gated per class | per-app tests | `/employee/*` | **PARTIAL** | "no delete" enforced by delete guard (super-admin only); "no price change" enforced; not runtime-verified per action | — |
| FR8 | Every status change → status log | SRS FR8 | `OrderStatusLog` written in `orders/services.py` transition functions | order timeline UI | `OrderStatusLog` | — | `orders/tests.py` | order detail pages | **PASS** | — | — |
| FR9 | Sensitive operations → audit log | SRS FR9 | `audit.utils.create_audit_log` called across delete guard, order actions, catalog admin, auth | `/admin/audit` | `AuditLog` | read-only APIs | `audit/tests.py` | `/admin/audit` | **PASS** | — | — |
| FR10 | Uploaded files validated for type & size | SRS FR10 | `orders/serializers.py` (ext + size vs `requirement`), `documents/serializers.py` (`validate_file`: ext + size + declared MIME), `Document.clean()` (+ dangerous-ext blocklist) | upload forms | `Document.file_size` check constraint | — | `documents/tests.py` | upload forms | **PARTIAL** | MIME check trusts client `content_type`; no magic-byte sniffing (D5) | add content sniffing |

---

## B. SRS business rules

| ID | Requirement | Backend | Tests | Status | Issue |
|---|---|---|---|---|---|
| BR1 | Order number `KH-YYYY-######` | `Order` number generation | `orders/tests.py` | **PASS** | — |
| BR2 | Order cannot be assigned while `NEW` | `workflow/rules.py` has no `NEW→ASSIGNED` rule; assign requires `UNDER_REVIEW` + `required_documents_approved` | `orders/tests.py` | **PASS** | — |
| BR3 | Reject actions require a reason | `TransitionRule(..reject_order, reason_required=True)`; `reject_order()` raises without reason | `orders/tests.py` | **PASS** | — |
| BR4 | Completion requires final doc or admin confirmation | `complete_order()` — `has_final_document or admin_confirmation`; verified-doc rule unless override | `orders/tests.py` | **PASS** | — |
| BR5 | Internal notes hidden from customers | `OrderNote.visibility`; customer serializers filter | `orders/tests.py` | **PARTIAL** | verified by review; explicit customer-facing negative test not confirmed |
| BR6 | Customer cannot mutate order status | generic status endpoint whitelist + `assert_order_transition_allowed` (customer only in `cancel`/`resume_review` rules) | `orders/tests.py` | **PASS** | — |
| BR7 | Provider cannot assign orders or access finance reports | no provider role in assign rules; `CanViewScopedReports`/`reports` exclude finance for provider | `providers/tests.py`, `reports/tests.py` | **PARTIAL** | assign side verified; finance-report exclusion not runtime-verified this gate |
| BR8 | Orders archived logically, not hard-deleted | `AdminOrderRecordViewSet.destroy` → `archive_order()`; no `Order` hard-delete path | `orders/tests.py` (archive transition) | **PASS** | — |

---

## C. SRS non-functional requirements

| ID | Requirement | Evidence | Status | Issue |
|---|---|---|---|---|
| NFR1 | Arabic-first RTL | `LANGUAGE_CODE=ar`, `LanguageContext` RTL shell, `name_ar` primary, ar/en locale dicts | **PARTIAL** | RTL present; no automated RTL/LTR E2E (A7 KH-I18N-01) |
| NFR2 | Responsive desktop + mobile | Tailwind; A6 reports live checks at 4 desktop + 3 mobile widths, 0 overflow | **PARTIAL** | no committed responsive test runner |
| NFR3 | JWT authentication | `simplejwt`, `client.js` Bearer + refresh | **PARTIAL** | 8h access token + no rotation (D4) |
| NFR4 | PostgreSQL for production | `docker-compose.yml` Postgres; env-driven `DATABASES` | **PARTIAL** | local dev + local test run use SQLite; `backend/db.sqlite3` present |
| NFR5 | Dockerized deployment | `backend/Dockerfile`, `entrypoint.sh`, `docker-compose.yml`, `docs/DEPLOYMENT.md` | **PARTIAL** | not built/run this gate |
| NFR6 | Protected document download paths | `DocumentDownloadAPIView` layered auth + signed token | **FAIL** | parallel unauthenticated `/media/` serve route bypasses it (D1) |

---

## D. Catalog / public-site / soft-delete enhancement (A1 — newest functional authority)

| ID | Requirement | Backend / DB | Frontend | Tests | Status | Issue | Remediation |
|---|---|---|---|---|---|---|---|
| CE1 | Master required-document definition table | `services.RequiredDocumentDefinition` (code, name_ar/en, allowed ext/mime, max size, sort, soft-delete) + `admin/required-document-definitions` router | admin doc-definition management screen | `services/tests.py` | **PARTIAL** | `code` not globally unique (D7) | global unique index on `code` |
| CE2 | Service form selects docs from master (no free-text duplication) | `ServiceRequiredDocument.document_definition` FK; `clean()` copies name/ext from definition | `ServicesManagementPage` (visual-fields schema test present) | `services/tests.py`, FE `ServicesManagementPage.test.jsx` | **PARTIAL** | FK nullable; legacy `document_type`/`name_ar` still stored (D6) | make FK required post-backfill; drop legacy fields |
| CE3 | Must create definition before linking | enforced by FK + `admin/required-document-definitions` being the only create path | admin shortcut to library | — | **PARTIAL** | UI adoption not verified this gate | UI gate |
| CE4 | Delivery time: duration OR from/to date range | `Service.delivery_time_mode` (`duration`/`duration_range`/`date_range`) + `clean()` validation + `save()` normalisation + `delivery_time_payload()` | duration/range display helper; admin mode selector | `services/tests.py`, FE duration tests (per A7 KH-DURATION-01) | **PASS** | implementation exceeds spec (adds `duration_range`) | — |
| CE5 | Field-by-field public price visibility (total/gov/company) | `show_total_price_public`/`show_government_fee_public`/`show_company_fee_public` + `_public_pricing_payload` gating; admin serializer returns all | cards/details show gated fields | `services/tests.py` (per A7 KH-PRICE-01) | **FAIL** | `RelatedServiceSerializer` returns raw `government_fee`+`service_fee` unconditionally on the public detail endpoint (D2) | gate related-service fees through same flags or drop them |
| CE6 | Public site: category cards → services within category | `public-site/service-categories/` + `/<slug>/services/`; `service_count` in payload | `pages/public/HomePage`, `ServicesPage`, `ServiceCategoryPage` | FE `ServiceCategoryPage.test.jsx`, `HomePage.test.jsx` | **PARTIAL** | category-card → services flow present; full visual conformance to A4 references deferred to UI gate | UI gate |
| CE7 | System-level soft delete; hidden from normal + public; admin/audit recovery | `core.SoftDeleteModel` applied to Category/Service/DocDef/Relation/Assignment/Address/Advertisement/Notification/HelpGuide/CustomUser/OrderNote/OrderIssue/Rating/ProviderProfile/Organization/Branch/Membership; `AdminDeleteGuardMixin` → `soft_delete()`; `?include_deleted=` for admin | `AdminSoftDeleteModal.jsx` | per-app `tests.py`; A7 says "197 backend tests" cover delete guard | **PARTIAL** | no default manager (per-view exclusion risk); frontend Active/Deleted/All + Restore completeness unverified (see A2) | add `SoftDeleteManager`; verify FE |
| CE8 | Simplify UI; backend computes derived values | slug/number/price-object/delivery-label/snapshots/service-count all backend-computed | grouped admin forms | FE `ServicesManagementPage.test.jsx` | **PARTIAL** | backend automation present; UI-simplicity is a UX-gate judgement | UI gate |
| CE9 | Order snapshots delivery config at creation | `Order` delivery snapshot fields + `service_name_snapshot` etc. | order detail | `orders/tests.py` | **PARTIAL** | snapshot fields present; explicit "delivery snapshot on create" assertion not confirmed this gate | add focused test |
| CE10 | Order create validates docs against stable definition IDs/codes, not names | `orders/serializers.py` matches on `document_type` string + `requirement.allowed_extensions` | upload form | `orders/tests.py` | **PARTIAL** | still string/`document_type`-keyed, not definition-ID-keyed (D6, Conflict C3) | key validation on `document_definition_id` |

---

## E. Soft-delete UI (A2 — clarifies A1 item 7)

| ID | Requirement | Evidence | Status | Issue |
|---|---|---|---|---|
| SD1 | Visible Delete action on every admin-manageable screen | `AdminSoftDeleteModal.jsx` exists; backend `AdminDeleteGuardMixin` on catalog/org/public-site/help viewsets; api-client `deleteX`/`softDelete` methods present | **PARTIAL** | API layer complete; no test proves the Delete button is rendered on each of the ~15 target screens |
| SD2 | Confirmation modal (name, warning, impact, reason, delete-password) | `AdminSoftDeleteModal.jsx`; backend `enforce_admin_delete_guard` requires `delete_password` | **PARTIAL** | modal exists; field completeness per spec unverified |
| SD3 | Active / Deleted / All filter tabs, default Active | backend `?include_deleted=` on `AdminDeleteGuardMixin.get_queryset`; frontend `filterSoftDeleted(records, {status})` in `src/api/services.js` handles `active`/`deleted`/`all` | **PARTIAL** | filter plumbing exists at api layer; per-page tab control + default-Active behaviour not test-verified |
| SD4 | Restore action for deleted rows | **CONFIRMED present**: `@action(detail=True) restore` on ~14 admin viewsets (`services`: service / category / required-document-definition / service-document-rule / relation; `accounts` admin users; `providers`; `organizations`: org / branch / membership / partner-config; `public_site` advertisements; `notifications` templates; `help_guides` all 6 types), each writing a `restore_*` audit log; api-client `restoreX` methods in `providersApi`, `publicSiteApi`, `notificationsApi`, `helpGuidesApi`, `services.js` | **PARTIAL** | endpoints + api-client done; per-page Restore button wiring + tests unverified |
| SD5 | Public + normal screens hide deleted | `visible_services_queryset`, `AdminDeleteGuardMixin.get_queryset` default-excludes | **PARTIAL** | per-view; no global guarantee (no manager) |
| SD6 | Audit log for delete + restore | `create_audit_log` in delete guard (success + blocked); `restore_*` audit actions in each `restore` action | **PASS** (code-verified) | — |
| SD7 | Never hard-delete business records; audit logs immutable | orders archive-only; audit app has no write API | **PASS** | — |
| SD8 | Related-data protection (e.g. delete category with active services) | `ServiceCategory.clean()` blocks deactivation with active services; `Service.category` is `PROTECT` | **PARTIAL** | soft-delete-cascade behaviour for children not fully traced |

---

## F. B2B2C architecture (A3)

| ID | Requirement | Evidence | Status | Issue |
|---|---|---|---|---|
| BB1 | Organization/Branch/Membership tenant model | `organizations/models.py` | **PARTIAL** | present; not line-reviewed |
| BB2 | Tenant isolation in selectors + permissions (frontend not trusted) | `organizations/selectors.py` used by `config/permissions.py`, `orders/selectors.py`, providers/payment views | **PARTIAL** | design verified; full negative multi-tenant runtime matrix absent (2026-06 pass fixed several leaks) |
| BB3 | Service scope + `PartnerServiceConfig` | `Service.scope`, `PartnerServiceConfig`, `_matched_partner_config` in serializers | **PARTIAL** | present |
| BB4 | Order org ownership + snapshots | `Order.organization`/`branch`/`assigned_provider_organization` + snapshot fields | **PASS** | — |
| BB5 | Provider org assignment scoping | `transition_permissions` org-membership fallback; provider views org-scoped | **PARTIAL** | verified by review |
| BB6 | Billing MVP models | `payment/models.py` (Invoice/Payment/CommissionRule/ProviderPayout) + `billing.py` | **PASS** (scope-limited: no gateway, matches spec) | — |
| BB7 | Reports grouping by org/branch/category/service/provider/status | `reports/views.py` | **NOT_TESTED** (mapped only) | not line-reviewed this gate |

---

## G. Catalog relations & categories (B3)

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| SC1 | Category hierarchy + validation (unique slug, unique name/parent, no cycles) | `ServiceCategory.clean()` + `ensure_category_parent_not_circular` | **PASS** |
| SC2 | Public only if `is_active` AND `show_on_public_site` (and not deleted) | `visible_services_queryset`, category public serializer filters | **PASS** |
| SC3 | Category deactivation blocked if active services exist | `ServiceCategory.clean()` | **PASS** |
| SR1 | `ServiceRelation` 4 types | `ServiceRelation.RelationType` | **PASS** |
| SR2 | Prerequisite cycle detection | `services/service_relations.py` + model `clean()` | **PASS** |
| SR3 | Order creation blocks on missing required prereqs, warns on optional | `services/order_validation.py`, warnings in create response | **PARTIAL** | verified by review + `services/tests.py`; not runtime-rerun |
| SR4 | Completion → recommendation notifications, no dup unread | `services/order_completion.py` | **PARTIAL** | `services/tests.py` covers; not runtime-rerun |

---

## H. UI / visual (A4 / A5 / UI reports)

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| UI1 | One consistent light Khalsni design system across public + internal | A6 report; shared `PublicPage` primitives, tokens | **PARTIAL** — prior live audit only; not reverified |
| UI2 | Public homepage redesign (hero, real search, category/service cards, footer) | `HomePage.jsx`, `docs/khalsni-public-homepage/` | **PARTIAL** |
| UI3 | RTL + LTR correctness | A6 spot checks | **PARTIAL** — no automated coverage |
| UI4 | Responsive at multiple breakpoints | A6 (180 checks) | **PARTIAL** |
| UI5 | Accessibility WCAG 2.2 AA baseline | source-level semantics only | **PARTIAL** — no axe runner |
| UI6 | Optional catalog images (category + service) with fallback | `ServiceCategory.image`, `Service.image`, `image_url` in serializers, FE fallbacks | **PASS** (A7 KH-CAT-01/KH-SVC-01, 31 catalog tests) |

---

## I. Product / PRD

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| PRD1 | Portals: public, customer, admin, provider (support backend-enabled, UI-light) | `AppRoutes.jsx` role trees | **PARTIAL** — support UI is now broader than PRD text (Conflict C6); functional |
| PRD2 | Core reporting + notification log + audit log | `reports/`, `notifications/`, `audit/` | **PARTIAL** |
| PRD3 | Notifications in-system logged, no external gateway | `notifications/services.py` | **PASS** |

---

## Roll-up

| Status | Count (of 63 tracked requirement lines A–I) |
|---|---|
| PASS | 22 |
| PARTIAL | 37 |
| FAIL | 2 (NFR6 / D1, CE5 / D2) |
| REQUIREMENT_CONFLICT | 1 (FR2 / C1) |
| NOT_IMPLEMENTED | 0 |
| NOT_TESTED | 1 (BB7 report grouping — mapped only) |
| NOT_APPLICABLE | 0 |

Erratum vs first draft: SD4 restore is **implemented** (per-resource `restore` actions on ~14 viewsets + api-client methods), and SD3 filter plumbing exists in `src/api/services.js`; both were downgraded from NOT_IMPLEMENTED/NOT_TESTED to PARTIAL after a second grep pass. What remains unproven is the per-page **UI wiring** and its **test coverage**, not the capability.

"PARTIAL" dominates because this gate did not run the J01–J20 end-to-end journeys, the multi-role negative-authorization matrix, or any browser/RTL/accessibility runner — none of which exist as committed, reproducible suites (see Test Audit). It does **not** imply the features are broken; it means end-to-end functioning is asserted by prior manual passes and unit tests, not proven by this gate.
