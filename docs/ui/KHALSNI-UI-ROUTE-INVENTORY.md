# KHALSNI UI Route Inventory

Date: 2026-08-15

Scope: inventory gate for the system-wide UI foundation. This inventory is based on `frontend/src/routes/AppRoutes.jsx`, shared layouts, and the component layer under `frontend/src/components`.

## Summary

- Public routes: 14
- Customer portal routes: 7
- Employee/support routes: 8
- Admin routes: 23
- Provider routes: 4
- Total routed screens inventoried: 56

## Shared Layouts And Systems

| System | Current Implementation | Notes |
| --- | --- | --- |
| Public layout | `PublicLayout` with `PublicSiteProvider`, public header, footer, mobile drawer, floating contact action | Uses real CMS/theme data and language direction; currently dark-heavy and needs light SaaS foundation. |
| Authenticated layout | `DashboardLayout` with `Sidebar`, `Topbar`, `Outlet` | Already uses shared dashboard shell; needs token alignment and lighter premium surfaces. |
| RTL/LTR | `LanguageProvider` sets `document.documentElement.lang` and `dir`; layouts also use `direction` | Foundation exists; directional icons and physical positioning still need ongoing review. |
| Public CMS/theme | `PublicSiteContext` and admin public-site/theme pages | Must preserve existing data-driven public site behavior. |
| Auth/authorization | `ProtectedRoute`, role-scoped route groups, `getDefaultDashboardPath` | No UI foundation work should alter permissions or redirects. |

## Shared Component Inventory

| Component Type | Current Shared Component(s) | Status |
| --- | --- | --- |
| Buttons | Global classes: `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`; public classes: `public-primary-button`, `public-secondary-button` | Exists; needs centralized token polish and consistent hierarchy. |
| Icon buttons | Repeated `button` markup in `Topbar`, `Sidebar`, modals, file removal | Partially shared through classes; future component extraction recommended. |
| Link buttons | Global/public button classes applied to `Link` | Exists as class pattern; future explicit component optional. |
| Card | `glass-panel`, `panel-muted`, `table-card`; page-specific cards | Exists; several pages duplicate card styling. |
| Service card | `ServiceCard` | Exists; currently dark public styling and needs token-aligned light styling. |
| Category card | `CategoryCard` | Exists; currently dark/image overlay styling and needs token-aligned light styling. |
| Inputs | Global `.field`; public helpers in page files | Exists; public/authenticated variants should align through tokens. |
| Search input | Mostly `.field` plus page-specific icon wrappers | Duplicated pattern. |
| Textarea/select | Global `.field` | Exists. |
| Checkbox/radio | Mostly page-local controls | Needs further normalization. |
| File uploader | `FileUploader` | Exists; uses real file validation and RHF integration. |
| Badge/status | `StatusBadge`, `.status-pill` | Exists. |
| Alert/toast | `Toast`, inline alert blocks in pages | Partially shared. |
| Empty state | `EmptyState` | Exists. |
| Skeleton/loading | `.skeleton`, `LoadingSpinner`, table skeleton rows | Exists. |
| Modal/dialog | `FormModal`, `ConfirmModal`, `AdminSoftDeleteModal` | Exists. |
| Drawer | `Sidebar` mobile drawer, `HelpGuidePanel` | Exists. |
| Dropdown | `NotificationPanel`, language switcher menu patterns | Partially shared. |
| Breadcrumb | Not found as shared component | Candidate for future extraction. |
| Stepper | `ApplicationStepper` | Exists. |
| Timeline | `OrderTimeline` | Exists. |
| Page header | `PageHeader` | Exists. |
| Section header | Mostly page-local headings | Candidate for future extraction. |
| Pagination | `Pagination` | Exists. |
| Tabs | Page-local segmented controls | Candidate for future extraction. |
| Tooltip/help | `ContextHelpButton`, `InlineHelp`, `HelpGuidePanel` | Exists. |

## Route Inventory

| Route | Area | Current Layout | Shared Components | Arabic | Mobile | Requires Refactor |
| ----- | ---- | -------------- | ----------------- | ------ | ------ | ----------------- |
| `/` | Public home | `PublicLayout` | `PublicHomepageTemplate`, public cards/buttons, data from public CMS/services | Yes | Yes | Yes: align public shell with light tokens. |
| `/services` | Public service directory | `PublicLayout` | `PublicPage`, `CategoryCard`, `ServiceCard`, public search/filter controls | Yes | Yes | Yes: dark public cards and page sections. |
| `/services/category/:slug` | Public category page | `PublicLayout` | `PublicPage`, `ServiceCard`, service/category API data | Yes | Yes | Yes: public card/token alignment. |
| `/services/:slug` | Public service details | `PublicLayout` | `PublicPage`, public cards, `ServiceCard`, required docs, pricing/duration helpers | Yes | Yes | Yes: dark panels and public-specific controls. |
| `/create-order` | Public request form | `PublicLayout` | `PublicPage`, RHF fields, `FileUploader`, service form utilities | Yes | Yes | Yes: public form token alignment; preserve submission flow. |
| `/track-order` | Public request tracking | `PublicLayout` | `PublicPage`, `OrderTimeline`, `StatusBadge`, `DocumentList` | Yes | Yes | Yes: public timeline/document dark variant. |
| `/about` | Public content | `PublicLayout` | `PublicPage`, public cards | Yes | Yes | Yes: public section styling. |
| `/contact` | Public contact/request | `PublicLayout` | `PublicPage`, contact form/links | Yes | Yes | Yes: public form/card styling. |
| `/faq` | Public help | `PublicLayout` | `PublicPage`, FAQ page-local sections | Yes | Yes | Yes: public section styling. |
| `/privacy` | Public legal | `PublicLayout` | `PublicPage`, static content sections | Yes | Yes | Yes: typography and readable content blocks. |
| `/login` | Authentication | `PublicLayout` | Auth API, form fields, public buttons | Yes | Yes | Yes: auth form token alignment. |
| `/forgot-password` | Authentication | `PublicLayout` | Auth API, form fields | Yes | Yes | Yes: auth form token alignment. |
| `/reset-password/:token` | Authentication | `PublicLayout` | Auth API, form fields | Yes | Yes | Yes: auth form token alignment. |
| `/register` | Authentication | `PublicLayout` | Auth API, form fields | Yes | Yes | Yes: auth form token alignment. |
| `/customer` | Customer portal | `DashboardLayout` | `PageHeader`, `StatCard`, dashboard cards | Yes | Yes | Partial: token polish. |
| `/customer/orders/new` | Customer request form | `DashboardLayout` | `ApplicationStepper`, `FileUploader`, dynamic service fields, order draft utilities | Yes | Yes | Partial: form polish; preserve order creation. |
| `/customer/orders` | Customer orders | `DashboardLayout` | `DataTable`, `StatusBadge`, `Pagination`, filters | Yes | Yes | Partial: table/card polish. |
| `/customer/orders/:id` | Customer order details | `DashboardLayout` | `OrderTimeline`, `DocumentList`, `StatusBadge` | Yes | Yes | Partial: detail panel polish. |
| `/customer/orders/:id/missing-docs` | Customer document response | `DashboardLayout` | `FileUploader`, order/document APIs | Yes | Yes | Partial: upload/form polish. |
| `/customer/profile` | Customer account/profile | `DashboardLayout` | Forms, auth/customer data | Yes | Yes | Partial: form polish. |
| `/customer/manual` | Customer manual | `DashboardLayout` | `ManualLaunchPage`, `HelpGuidePanel` | Yes | Yes | Partial: panel polish. |
| `/employee` | Employee portal | `DashboardLayout` | `PageHeader`, dashboard stats/cards | Yes | Yes | Partial: token polish. |
| `/employee/orders` | Employee review queue | `DashboardLayout` | `DataTable`, filters, `StatusBadge` | Yes | Yes | Partial: table/filter polish. |
| `/employee/missing-service-requests` | Employee missing service requests | `DashboardLayout` | Shared missing-service page, forms, `.field` | Yes | Yes | Partial: form/detail polish. |
| `/employee/orders/:id` | Employee order review | `DashboardLayout` | `OrderTimeline`, `DocumentList`, forms, status/actions | Yes | Yes | Partial: dense workflow polish. |
| `/employee/documents/verify` | Employee document verification | `DashboardLayout` | Review cards/forms/document controls | Yes | Yes | Partial: document card polish. |
| `/employee/reports` | Employee reports | `DashboardLayout` | Report cards/charts | Yes | Yes | Partial: report card polish. |
| `/employee/manual` | Employee manual | `DashboardLayout` | `ManualLaunchPage`, `HelpGuidePanel` | Yes | Yes | Partial: panel polish. |
| `/employee/service-categories` | Support service category admin | `DashboardLayout` | `ServiceCategoryManagementPage`, `DataTable`, `FormModal`, `ConfirmModal` | Yes | Yes | Partial: admin form/table polish. |
| `/employee/service-relations` | Support service relation admin | `DashboardLayout` | `ServiceRelationsManagementPage`, `DataTable`, `FormModal`, `ConfirmModal` | Yes | Yes | Partial: admin form/table polish. |
| `/admin` | Admin overview | `DashboardLayout` | `PageHeader`, stats/cards | Yes | Yes | Partial: token polish. |
| `/admin/orders` | Admin order management | `DashboardLayout` | `DataTable`, filters, `StatusBadge` | Yes | Yes | Partial: table/filter polish. |
| `/admin/orders/:id` | Admin order details | `DashboardLayout` | `OrderTimeline`, `DocumentList`, status/assignment/note forms | Yes | Yes | Partial: dense workflow polish. |
| `/admin/rules` | Admin rules | `DashboardLayout` | Forms, settings tables/cards | Yes | Yes | Partial: form/table polish. |
| `/admin/cms` | Admin system CMS/settings | `DashboardLayout` | `DataTable`, `FormModal`, settings forms | Yes | Yes | Partial: form/table polish. |
| `/admin/service-categories` | Admin service categories | `DashboardLayout` | `ServiceCategoryManagementPage`, `DataTable`, `FormModal`, `ConfirmModal` | Yes | Yes | Partial: admin form/table polish. |
| `/admin/services` | Admin services | `DashboardLayout` | `ServicesManagementPage`, tables/forms, service API data | Yes | Yes | Partial: admin form/table polish. |
| `/admin/service-relations` | Admin service relations | `DashboardLayout` | `ServiceRelationsManagementPage`, tables/forms | Yes | Yes | Partial: admin form/table polish. |
| `/admin/public-site` | Admin public-site hub | `DashboardLayout` | `PublicSiteManagementPage`, cards/links | Yes | Yes | Partial: card polish. |
| `/admin/public-site/content` | Admin homepage content | `DashboardLayout` | Content editor forms, public CMS APIs | Yes | Yes | Partial: form/card polish. |
| `/admin/public-site/advertisements` | Admin advertisements | `DashboardLayout` | `DataTable`, forms, soft delete restore | Yes | Yes | Partial: table/form polish. |
| `/admin/public-site/theme` | Admin public theme | `DashboardLayout` | Theme settings form, color fields, public preview | Yes | Yes | Partial: keep theme variables aligned with foundation. |
| `/admin/public-site/preview` | Admin public preview | `DashboardLayout` | `PreviewPublicPage`, `public-site-shell` | Yes | Yes | Yes: preview should reflect light public foundation. |
| `/admin/missing-service-requests` | Admin missing service requests | `DashboardLayout` | Shared missing-service page | Yes | Yes | Partial: form/detail polish. |
| `/admin/users` | Admin users/roles | `DashboardLayout` | `DataTable`, forms, role controls | Yes | Yes | Partial: table/form/tab polish. |
| `/admin/providers` | Admin providers | `DashboardLayout` | `DataTable`, provider forms, soft delete restore | Yes | Yes | Partial: table/form polish. |
| `/admin/provider-services` | Admin provider assignments | `DashboardLayout` | `DataTable`, assignment forms | Yes | Yes | Partial: table/form polish. |
| `/admin/reports` | Admin reports | `DashboardLayout` | Report cards/charts | Yes | Yes | Partial: chart/card polish. |
| `/admin/notifications` | Admin notifications | `DashboardLayout` | Notification API/list controls | Yes | Yes | Partial: list/card polish. |
| `/admin/payments` | Admin payments | `DashboardLayout` | `DataTable`, payment forms/status | Yes | Yes | Partial: table/form polish. |
| `/admin/audit` | Admin audit log | `DashboardLayout` | `DataTable`, filters | Yes | Yes | Partial: table/filter polish. |
| `/admin/help-guides` | Admin help guide management | `DashboardLayout` | Help guide forms/tables, `HelpGuidePanel` data | Yes | Yes | Partial: dense content polish. |
| `/admin/manual` | Admin manual | `DashboardLayout` | `ManualLaunchPage`, `HelpGuidePanel` | Yes | Yes | Partial: panel polish. |
| `/provider` | Provider portal | `DashboardLayout` | `PageHeader`, stats/cards | Yes | Yes | Partial: token polish. |
| `/provider/orders` | Provider assigned orders | `DashboardLayout` | `DataTable`, filters, `StatusBadge` | Yes | Yes | Partial: table/card polish. |
| `/provider/orders/:id` | Provider order details | `DashboardLayout` | `OrderTimeline`, `DocumentList`, provider workflow actions | Yes | Yes | Partial: detail panel polish. |
| `/provider/manual` | Provider manual | `DashboardLayout` | `ManualLaunchPage`, `HelpGuidePanel` | Yes | Yes | Partial: panel polish. |

## Duplication And Refactor Hotspots

- Public pages use repeated dark `PublicCard`, `PublicPage`, and `text-white/*` patterns.
- Dashboard CRUD pages consistently rely on `.field`, `.btn-*`, `glass-panel`, `DataTable`, `FormModal`, and `ConfirmModal`; this is a good shared foundation point.
- Several filters/search controls are page-local wrappers around `.field`.
- Tabs and segmented controls are repeated in admin pages.
- Public variants of `DocumentList` and `OrderTimeline` need token-aligned light styling.
- Breadcrumbs are not represented by a shared component.

## Inventory Gate Result

The app already has a shared component layer suitable for a system-wide foundation. The first implementation phase should centralize tokens, align Tailwind colors/radii/shadows, and shift shared public components/layout from dark styling to the requested clean light SaaS language while preserving all route behavior and data sources.
