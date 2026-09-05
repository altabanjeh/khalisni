# KHALSNI — Functional Audit (Core Business Flows)

Gate 1 · 2026-09-05 · HEAD `574753e`

Method: static trace of each flow through routes → views → services → models → serializers, cross-checked against `backend` test modules (197 tests pass) and `frontend` vitest (42 pass). **No live end-to-end browser run** was performed in this gate; where a flow's only proof is code + unit tests, it is marked *code-verified*, not *runtime-verified*.

---

## 1. Public side

| Flow | Implementation | Verdict | Notes |
|---|---|---|---|
| Homepage | `GET /api/public-site/homepage/` + `theme` + `advertisements` + services/categories; `HomePage.jsx` via `PublicSiteContext` | code-verified, FE test `HomePage.test.jsx` | A6 reports live redesign complete; empty-state handling added. |
| Navigation | `PublicLayout` header/nav, language switch, mobile drawer | code-verified | A6: compact white header, nav pills, auth actions. |
| Category discovery | `GET /api/public-site/service-categories/` (with `service_count`); `ServicesPage`, `HomePage` cards | code-verified, FE test | CE6 category-cards implemented. |
| Category details | `GET /api/public-site/service-categories/<slug>/services/`; `ServiceCategoryPage.jsx` | code-verified, FE `ServiceCategoryPage.test.jsx` | — |
| Service listing | `GET /api/services/`; `ServicesPage.jsx` + search | code-verified, FE test | — |
| Service details | `GET /api/services/<slug>/` (`ServiceDetailSerializer`); `ServiceDetailsPage.jsx` | code-verified, FE `ServiceDetailsPage.test.jsx` | **DEFECT D2**: response leaks raw `government_fee`+`service_fee` of related services regardless of visibility flags. |
| Service requirements (docs) | `required_documents` from `document_requirements` → `ServiceRequiredDocumentSerializer` | code-verified | Resolves via `document_definition` when set, else legacy strings (D6). |
| Pricing presentation | `_public_pricing_payload` gates total/gov/company on `show_*_public` | code-verified, backend test (A7 KH-PRICE-01) | Correct for the main service; **not** for related services (D2). |
| Duration presentation | `delivery_time_payload()` → `{mode,label,label_ar,label_en,…}` for duration / duration_range / date_range | code-verified, FE duration test | Exceeds spec (adds range mode). |
| Public forms | Missing-service request `POST /api/public-site/missing-service-requests/` (throttle 5/h); contact/FAQ static | code-verified | `MissingServiceRequest` has no tenant key (documented). |
| Auth entry points | `/login`, `/register`, `/forgot-password`, `/reset-password/:token` | code-verified, FE `Login`/`Register` tests | `?next=` redirect honoured. |
| Responsive | Tailwind; A6 live evidence | not runtime-verified this gate | — |
| Arabic/English | `LanguageContext`, ar/en dicts, `name_ar`/`name_en` | code-verified | RTL shell present; no automated RTL test. |

---

## 2. Customer side

| Flow | Implementation | Verdict | Notes |
|---|---|---|---|
| Registration / login | `POST /api/auth/register|login`; JWT issued; role redirect | code-verified, FE tests | "remember me" → localStorage; default → sessionStorage. |
| Account / profile | `GET/PUT /api/customer/profile/`; `ProfilePage.jsx` | code-verified | — |
| Selecting service → starting request | `CustomerCreateOrderPage.jsx` → `POST /api/orders/` | code-verified, `orders/test_end_to_end.py` | Requires authenticated customer (Conflict C1 vs SRS FR2). |
| Saving request (draft) | client-side `orderDrafts` (versioned, expiring) in localStorage | FE `orderDrafts.test.js` | No server-side draft persistence (by design). |
| Completing required fields | `required_information_schema` dynamic fields | code-verified, FE `ServicesManagementPage.test.jsx` builds schema | — |
| Uploading required documents | multipart to `POST /api/orders/` and `POST /api/customer/orders/<id>/documents/`; ext+size validation | code-verified, `documents/tests.py` | — |
| Replace / remove documents | `ServiceRequiredDocument.client_can_replace_file`; `create_order_document` rejects replace when disallowed | code-verified | Remove path not separately traced. |
| Validation | serializer + model `clean()`; prereq checks in `order_validation.py` | code-verified, `services/tests.py` | Missing required prereq blocks; optional → `warnings`. |
| Submitting request → confirmation | order created with `KH-YYYY-######`; response includes number + warnings | code-verified | — |
| Request history / details | `GET /api/customer/orders/`, `/<id>/`; `MyOrdersPage`, `CustomerOrderDetailsPage` | code-verified, FE `MyOrdersPage.test.jsx` | paginated response normalised client-side. |
| Status / tracking | order detail + `orders/<id>/timeline/`; status badge | code-verified | — |
| Missing-documents response | `WAITING_CUSTOMER` state; `MissingDocumentsResponsePage.jsx`; `resume_review` when all uploaded | code-verified, FE `MissingDocumentsResponsePage.test.jsx` | — |
| Messages / notifications | `GET /api/notifications/`, `PATCH /api/notifications/<id>/read/` | code-verified | **No** unread-count / mark-all-read (D8). |
| Rating | `POST /api/customer/orders/<id>/rating/` when `COMPLETED` and not already rated | code-verified, `orders/tests.py` | — |
| Errors / rejected submissions | DRF validation → FE form errors; `RouteErrorBoundary` | code-verified | per-component empty/error states not audited this gate. |
| Cancel | `POST /api/customer/orders/<id>/cancel/` — customers may cancel only `NEW` (`assert_can_cancel_order`) | code-verified | Matches BR6. |

---

## 3. Administration / operations

| Flow | Implementation | Verdict | Notes |
|---|---|---|---|
| Authentication | shared JWT; `IsAdminRole` = `is_platform_super_admin` | code-verified | — |
| Dashboard | `GET /api/admin/dashboard/`; `AdminOverviewPage.jsx` | mapped | `reports/views.py` not line-reviewed. |
| Category management | `admin/categories` router + `ServiceCategoryManagementPage` (admin + support) | code-verified | `clean()` rules enforced. |
| Service management | `admin/services` router + `ServicesManagementPage` | code-verified, FE test | grouped form; backend computes slug/number/labels. |
| Document master / catalog management | `admin/required-document-definitions` router | code-verified | **D7**: `code` not globally unique. |
| Service required-document config | `admin/service-documents` router; `ServiceRequiredDocument` | code-verified | **D6**: FK nullable + legacy strings retained. |
| Service field config | `required_information_schema` JSON on `Service` | code-verified, FE test | — |
| Service duration config | `delivery_time_mode` + fields; admin serializer | code-verified | — |
| Fee config | `base_price`/`government_fee`/`service_fee` + `show_*_public` + notes | code-verified | admin serializer returns all; public gated (except D2). |
| Public fee visibility control | per-field flags | code-verified | **D2** leak on related services. |
| Request processing | `admin/orders/<id>/status|assign|request-documents|notes|final-document|complete|reject|cancel` | code-verified, `orders/tests.py` | dedicated actions; generic `status` endpoint whitelist-locked. |
| Status transitions | `workflow/rules.py` (26 rules) via `orders/services.py` | code-verified | role + actor-match enforced. |
| Customer information | `admin/customer-profiles` router (org-scoped for non-platform admins) | mapped | 2026-06 scoping fix. |
| File / document review | `staff/documents/`, `staff/documents/<id>/verify/`, `EmployeeVerifyDocumentsPage` | code-verified, `documents/tests.py` | — |
| User management | `admin/users` router; `AdminUsersRolesPage` | code-verified, FE `AdminUsersRolesPage.test.jsx` | create user + permission tab tested. |
| Role / permission management | `admin/available-permissions/`, group sync in `role_groups.py`; `CanManageUserRoles` | code-verified | `admin` group very broad (gated downstream). |
| Deletion / archive / soft-delete | `AdminDeleteGuardMixin` + delete-password + audit; orders archive-only | code-verified, backend suite | **A2 frontend Delete/Restore/tabs completeness NOT verified** (D-see traceability SD1/SD3/SD4). |
| Auditability | `create_audit_log`, `admin/audit-logs/`, `orders/<id>/timeline/` | code-verified, `audit/tests.py` | read-only surface. |
| Settings | `admin/system-settings` router, `admin/delete-guard/` | code-verified | delete-guard password stored hashed in `SystemSetting`. |
| Localization / content management | `admin/public-site/content/`, `theme/`, `advertisements` router, `HomepageContentEditorPage`, `ThemeSettingsPage`, `AdvertisementManagerPage` | mapped | `public_site/views.py` not line-reviewed. |
| Provider management | `admin/providers` router, `ProvidersManagementPage` | code-verified, FE `ProvidersManagementPage.test.jsx` | org-scoped. |
| Service–provider assignment | `admin/service-provider-assignments` router, `ServiceProviderAssignmentsPage` | code-verified, FE test | `provider_required` guard in `clean()`. |
| Payments | `admin/payments/` + `/status/`; `PaymentsManagementPage` | mapped | model + service layer only. |
| Notifications management | `admin/notifications/`, `admin/notification-templates` router, `orders/<id>/manual-notification/` | mapped | `CanSendManualNotifications` perm. |
| Reports | `admin/reports/daily|weekly`, `reports/summary/` | mapped | `BB7` grouping not line-verified. |
| Help-guide management | `help/admin/*` routers, `HelpGuideManagementPage` | mapped | large subsystem, not line-reviewed. |

---

## 4. Provider / operations execution

| Flow | Implementation | Verdict |
|---|---|---|
| Auth + dashboard | `provider/dashboard/`; `ProviderDashboardHome` | code-verified |
| Assigned orders only | `ProviderOrderListAPIView` scoped by `assigned_provider` / org membership | code-verified, `providers/tests.py` |
| Execution notes | `provider/orders/<id>/notes/` | code-verified |
| Progress updates | `provider/orders/<id>/status/` → `ASSIGNED→IN_PROGRESS→WAITING_GOVERNMENT→…` provider-only rules | code-verified, `orders/tests.py` |
| Final document upload | `provider/orders/<id>/final-document/` → `upload_final_document()` (blocks unless transition allowed) | code-verified |
| Cannot assign / cannot see finance | no provider role in assign rules; reports scoped | code-verified (assign), review-only (finance) |

---

## 5. Previously-discussed features — current authoritative status

| Feature | Latest requirement | Implemented? | Verdict |
|---|---|---|---|
| Required docs from a central catalog | A1 CE1/CE2 | Yes — `RequiredDocumentDefinition` + FK | **PARTIAL** (D6 legacy path, D7 uniqueness) |
| Add new document types via the catalog | A1 CE3 | Yes — `admin/required-document-definitions` | PARTIAL (UI adoption unverified) |
| Duration ranges vs single fixed duration | A1 CE4 | Yes — `duration_range` + `date_range` | **PASS** |
| Total / government / company fee visibility | A1 CE5 | Yes for main service | **FAIL** for related services (D2) |
| Public category cards | A1 CE6 / A4 | Yes | PARTIAL (visual conformance deferred) |
| Logical delete / archive | SRS BR8 / A1 CE7 / A2 | Yes (backend); FE modal exists | **PARTIAL** (FE Delete/Restore/tabs completeness + restore endpoints unverified) |

---

## 6. Flow-level defects raised

- **D1** (NFR6): unauthenticated `/media/` route bypasses document download authorization.
- **D2** (CE5): related-service fee leak on public service detail.
- **D6/C3** (CE10): order-create document validation keyed on free-text `document_type`, not definition IDs.
- **D8**: notifications missing unread-count / mark-all-read.
- **C1**: order-creation actor conflict (SRS "public" vs code "authenticated customer").
- **SD1/SD3/SD4**: frontend soft-delete UX (visible Delete on every screen, Active/Deleted/All tabs, Restore) not evidenced; per-resource restore endpoints not found.
