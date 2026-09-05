# KHALSNI — Multi-Role Authorization Runtime Matrix (Gate 1R)

Roles derived from source of truth: `core.choices.UserRole` = **customer, employee, support, provider, admin** (legacy portal roles) layered over `docs/b2b2c_architecture.md` membership roles (platform_super_admin ↔ `admin`, platform_support ↔ `support`, partner_* ↔ `employee`, provider_* ↔ `provider`). `anon` = unauthenticated.

**Direct-API enforcement** is the authoritative test (frontend hiding is not authorization). Executed by `backend/config/tests_authz_matrix.py::AuthorizationMatrixTests` — **4 tests, all PASS** — against a real DB: **13 endpoints × 6 roles = 78 allow/deny assertions + 3 object-ownership (IDOR) / privilege-escalation assertions**.

**UI enforcement** cross-check: `KHALSNI_ROUTE_RUNTIME_MATRIX.md` loaded every role's own routes successfully with a real token; `ProtectedRoute` redirects unauth→`/login?next=` and wrong-role→`/` (client-side, advisory only).

## Endpoint × role (direct API) — all rows verified

`ok` = 2xx · `deny` = 401/403/404

| Method + path | anon | customer | employee | support | provider | admin | Notes |
|---|---|---|---|---|---|---|---|
| `GET /api/services/` | ok | ok | ok | ok | ok | ok | public catalog |
| `GET /api/public-site/service-categories/` | ok | ok | ok | ok | ok | ok | public |
| `GET /api/admin/orders/` | deny | deny | ok | ok | deny | ok | `CanReviewOrders` |
| `GET /api/admin/services/` | deny | deny | deny | ok | deny | ok | support read-only via `CanViewOrManageServiceCatalog` |
| `GET /api/admin/users/` | deny | deny | deny | deny | deny | ok | `CanManageUserRoles` (super-admin) |
| `GET /api/admin/system-settings/` | deny | deny | deny | deny | deny | ok | `IsAdminRole` |
| `GET /api/admin/audit-logs/` | deny | deny | deny | deny | deny | ok | `IsAdminRole` — SRS FR7 does **not** grant Support audit access |
| `GET /api/admin/dashboard/` | deny | deny | ok | ok | **ok** | ok | providers/employees get an **order-scoped, revenue-stripped** dashboard — see D-AZ1 below |
| `GET /api/customer/orders/` | deny | ok | deny | deny | deny | deny | `IsCustomerRole` |
| `GET /api/provider/orders/` | deny | deny | deny | deny | ok | deny | `IsProviderRole` |
| `GET /api/notifications/` | deny | ok | ok | ok | ok | ok | any authenticated; scoped by `get_notifications_for_user` |
| `GET /api/notifications/unread-count/` | deny | ok | ok | ok | ok | ok | new (D8); scoped |
| `POST /api/admin/services/` | deny | deny | deny | deny | deny | ok | `CanViewOrManageServiceCatalog` write = super-admin (or partner_admin) |

## Object-ownership / privilege-escalation (IDOR)

| Test | Result |
|---|---|
| Customer A cannot `GET /api/customer/orders/{B's id}/` | **PASS** — 404 (queryset-scoped, not just hidden) |
| Provider cannot `GET /api/provider/orders/{unassigned id}/` | **PASS** — 404 |
| Customer cannot `PATCH /api/admin/orders/{id}/status/` | **PASS** — 401/403/404 |
| (journey J18) Provider `GET` on another provider's order | **PASS** — 404 |
| (journey J19) Non-super-admin cannot `DELETE /api/admin/services/{id}/` | enforced by `AdminDeleteGuardMixin.check_permissions` (from Gate 1 code review) |
| (Gate 2) Generic `PATCH /admin/orders/{id}/status/` to a non-whitelisted target | **400** — `update_order_status` rejects + audits (`orders/test_end_to_end` scenario 4) |

## Finding D-AZ1 — provider access to `/api/admin/dashboard/` and `/api/admin/reports/*` — **reviewed, NOT a defect**

- `CanViewReportsDashboard` admits `is_provider_user` and `is_partner_user`.
- **However**, `reports/views.py::_scoped_orders_for_reports` returns `get_orders_for_user(user)` for a provider = **only that provider's assigned orders**, and `AdminDashboardAPIView` / `DailyReportAPIView` / `WeeklyReportAPIView` **explicitly strip `revenue_estimate` / `revenue` / `revenue_summary`** for any non-`platform_super_admin`.
- Net: a provider hitting these endpoints sees order **counts and status breakdowns for their own work only, with no financial figures**. SRS **BR7** ("Provider cannot … access finance reports") is satisfied.
- Residual (cosmetic, P3): the endpoints live under the `/api/admin/` prefix despite being provider-reachable — a naming inconsistency, not a security issue. Recorded, not remediated.

## Coverage gaps (for a later exhaustive pass)

- This matrix covers a representative 13 endpoints. A fully exhaustive per-endpoint sweep (~120 API routes) is not yet automated; the pattern (`config/tests_authz_matrix.py::CASES`) is extensible and should be grown in Gate 2.
- Partner/branch B2B2C sub-roles (branch_manager, finance, auditor, partner_owner) are not exercised — no membership fixtures seeded. Tenant-isolation regressions from the 2026-06 hardening pass remain covered by `organizations/tests.py`.
- Mobile app authorization is client-side guards only; the backend endpoints it calls are the same ones tested here.
