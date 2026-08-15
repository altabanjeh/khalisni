# Khalsni Visual UI Overhaul Comparison

Date: 2026-07-26

## Validation Summary

- Production build: PASS (`npm run build`)
- Focused frontend tests: PASS (`npm test -- src/pages/public/ServicesPage.test.jsx src/pages/public/ServiceDetailsPage.test.jsx src/pages/public/TrackOrderPage.test.jsx src/pages/customer/MyOrdersPage.test.jsx src/components/StatusBadge.test.jsx src/pages/public/ServiceCategoryPage.test.jsx`)
- Full frontend tests: FAIL, matching the baseline admin/provider failures observed before this forced pass:
  - `src/pages/admin/ServiceProviderAssignmentsPage.test.jsx`: test selects the first combobox, but the first combobox is the active/deleted/all filter rather than the provider select.
  - `src/pages/admin/ProvidersManagementPage.test.jsx`: provider creation test times out.
  - `src/pages/admin/AdminUsersRolesPage.test.jsx`: three existing failures around duplicate combobox selection and edit-button language/expectation.
- Backend changed: No.
- Schema migrations: None added or run.

## Runtime Constraints

- The frontend was reachable at `http://127.0.0.1:5173/`.
- `python manage.py check` passed.
- A local Django server was started only for runtime capture. `/api/health/` responded, but catalog and login endpoints returned 500 in the current local backend/database state.
- Because `api.me()` and login were unavailable, protected customer/admin screenshots show the actual unauthenticated redirect state rather than authenticated portal data.

## Screenshot Inventory

Before screenshots:

- `docs/khalsni-ui-overhaul/before/home.png`
- `docs/khalsni-ui-overhaul/before/services.png`
- `docs/khalsni-ui-overhaul/before/service-detail.png`
- `docs/khalsni-ui-overhaul/before/application.png`
- `docs/khalsni-ui-overhaul/before/track-order.png`
- `docs/khalsni-ui-overhaul/before/customer-dashboard.png`

After screenshots:

- `docs/khalsni-ui-overhaul/after/home.png`
- `docs/khalsni-ui-overhaul/after/services.png`
- `docs/khalsni-ui-overhaul/after/service-detail.png`
- `docs/khalsni-ui-overhaul/after/application.png`
- `docs/khalsni-ui-overhaul/after/track-order.png`
- `docs/khalsni-ui-overhaul/after/customer-dashboard.png`
- `docs/khalsni-ui-overhaul/after/customer-orders.png`
- `docs/khalsni-ui-overhaul/after/admin-dashboard.png`

## Page-Level Comparison

| Page | Before | After | Result |
|---|---|---|---|
| Homepage | `before/home.png` | `after/home.png` | Visibly transformed. The first viewport changed from a split hero dominated by the missing-service assistant to a dark navy service-search hero with action buttons and category/service entry cards. |
| Services | `before/services.png` | `after/services.png` | Visibly transformed. The directory now uses a category-first layout, search-focused hero, and side metric panel. Runtime data remained empty because the catalog API returned 500. |
| Service detail | `before/service-detail.png` | `after/service-detail.png` | Partially transformed in source and tests, but runtime screenshot remains API-limited because the service detail endpoint was not available for the sample slug/backend state. |
| Application entry | `before/application.png` | `after/application.png` | Runtime route confirmed existing unauthenticated redirect into registration. The authenticated customer order wizard source was transformed, but it could not be captured without a working login/API session. |
| Track order | `before/track-order.png` | `after/track-order.png` | Visibly transformed. The page now has a dark navy tracking hero, inline lookup form, and a stronger empty/results region. |
| Customer dashboard | `before/customer-dashboard.png` | `after/customer-dashboard.png` | Protected runtime capture is blocked by auth; screenshot shows login redirect. Customer dashboard source was transformed, but authenticated runtime capture was unavailable. |
| Customer orders | Not captured before | `after/customer-orders.png` | Protected runtime capture is blocked by auth; screenshot shows login redirect. Source and focused test for `MyOrdersPage` passed. |
| Admin dashboard | Not captured before | `after/admin-dashboard.png` | Protected runtime capture is blocked by auth; screenshot shows login redirect. Shared admin shell components were restyled, but authenticated runtime capture was unavailable. |

## Source Areas Visibly Changed

- Public homepage: `frontend/src/pages/public/HomePage.jsx`
- Services directory: `frontend/src/pages/public/ServicesPage.jsx`
- Service detail: `frontend/src/pages/public/ServiceDetailsPage.jsx`
- Track order: `frontend/src/pages/public/TrackOrderPage.jsx`
- Customer application wizard: `frontend/src/pages/customer/CustomerCreateOrderPage.jsx`, `frontend/src/components/ApplicationStepper.jsx`, `frontend/src/components/FileUploader.jsx`
- Customer dashboard/orders/workspace: `frontend/src/pages/customer/CustomerDashboardHome.jsx`, `frontend/src/pages/customer/MyOrdersPage.jsx`, `frontend/src/pages/customer/CustomerOrderDetailsPage.jsx`
- Shared portal/admin shell: `frontend/src/layouts/DashboardLayout.jsx`, `frontend/src/components/Sidebar.jsx`, `frontend/src/components/Topbar.jsx`, `frontend/src/components/PageHeader.jsx`, `frontend/src/components/DataTable.jsx`
- Service presentation helpers: `frontend/src/components/ServiceDurationDisplay.jsx`, `frontend/src/components/ServicePriceDisplay.jsx`, `frontend/src/utils/servicePresentation.js`

## Remaining Blockers

- Authenticated portal screenshots require a working login and `api.me()` flow.
- Public catalog/detail screenshots require the local `/api/services/` and related service endpoints to return data instead of 500.
- Full Vitest remains red in pre-existing admin/provider tests that were already failing at baseline.
