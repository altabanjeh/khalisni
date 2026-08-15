# Route Migration Matrix

Routes reviewed: 57

Routes migrated: 57

Routes excluded: 0

Blocked: 0

Status values: MIGRATED, NO VISUAL CHANGE NEEDED, EXCLUDED WITH REASON, BLOCKED.

| Route | Persona | Before Pattern | New Pattern | Status |
|---|---|---|---|---|
| `/` | Public | Public service homepage | PublicLayout, service search, categories, services, CTA, footer | MIGRATED |
| `/services` | Public | Public service list | Service directory with category cards, filters, service cards, English-safe fallbacks | MIGRATED |
| `/services/category/:slug` | Public | Category listing | Category experience with localized service cards | MIGRATED |
| `/services/:slug` | Public | Service detail | Service detail with price, duration, requirements, apply CTA | MIGRATED |
| `/create-order` | Public | Request entry | Application route with current order creation UI | MIGRATED |
| `/track-order` | Public | Tracking form | Tracking page with service-platform shell | MIGRATED |
| `/about` | Public | Public content | PublicLayout content route | MIGRATED |
| `/contact` | Public | Public content/contact | PublicLayout support/contact route | MIGRATED |
| `/faq` | Public | Public FAQ | PublicLayout FAQ route | MIGRATED |
| `/privacy` | Public | Policy content | PublicLayout policy route | MIGRATED |
| `/login` | Auth | Login form | Auth route in coherent public shell | MIGRATED |
| `/forgot-password` | Auth | Password recovery | Auth route in coherent public shell | MIGRATED |
| `/reset-password/:token` | Auth | Reset form | Auth route in coherent public shell | MIGRATED |
| `/register` | Auth | Registration form | Auth route in coherent public shell | MIGRATED |
| `/customer` | Customer | Customer dashboard | DashboardLayout role shell, cards, quick actions | MIGRATED |
| `/customer/orders/new` | Customer | New order form | Customer order creation with shared upload/presentation patterns | MIGRATED |
| `/customer/orders` | Customer | Orders list | Shared table/card patterns | MIGRATED |
| `/customer/orders/:id` | Customer | Order detail | Request workspace with shared timeline/status patterns | MIGRATED |
| `/customer/orders/:id/missing-docs` | Customer | Missing docs form | Localized UploadField behavior and document response flow | MIGRATED |
| `/customer/profile` | Customer | Profile form | DashboardLayout route with shared form styling | MIGRATED |
| `/customer/manual` | Customer | Help/manual | Shared manual launch route | MIGRATED |
| `/employee` | Employee/support | Employee dashboard | DashboardLayout role shell | MIGRATED |
| `/employee/orders` | Employee/support | Review queue | Shared table/card work queue styling | MIGRATED |
| `/employee/missing-service-requests` | Employee/support | Missing service requests | Shared operational list/form patterns | MIGRATED |
| `/employee/orders/:id` | Employee/support | Order review | Operational review workspace with timeline/doc/action panels | MIGRATED |
| `/employee/documents/verify` | Employee/support | Document verification | Shared operational shell and status patterns | MIGRATED |
| `/employee/reports` | Employee/support | Reports | DashboardLayout reports route | MIGRATED |
| `/employee/manual` | Employee/support | Help/manual | Shared manual launch route | MIGRATED |
| `/employee/service-categories` | Support | Service categories | Shared admin/support resource management pattern | MIGRATED |
| `/employee/service-relations` | Support | Service relations | Shared admin/support resource management pattern | MIGRATED |
| `/admin` | Admin | Admin overview | Admin DashboardLayout overview | MIGRATED |
| `/admin/orders` | Admin | Admin orders list | Shared operational list/table pattern | MIGRATED |
| `/admin/orders/:id` | Admin | Admin order detail | Admin order workspace | MIGRATED |
| `/admin/rules` | Admin | Workflow/rules | Admin rules and document definition management route | MIGRATED |
| `/admin/cms` | Admin | CMS/settings | Admin CMS resource route | MIGRATED |
| `/admin/service-categories` | Admin | Categories | Shared category resource management route | MIGRATED |
| `/admin/services` | Admin | Services | Admin services management with grouped forms and resource tables | MIGRATED |
| `/admin/service-relations` | Admin | Relations | Shared relation resource management route | MIGRATED |
| `/admin/public-site` | Admin | Public site management | Public site management route in admin shell | MIGRATED |
| `/admin/public-site/content` | Admin | Homepage content | Public content editor route | MIGRATED |
| `/admin/public-site/advertisements` | Admin | Advertisements | Advertisement management route | MIGRATED |
| `/admin/public-site/theme` | Admin | Theme settings | Theme management route | MIGRATED |
| `/admin/public-site/preview` | Admin | Public preview | Preview route in admin shell | MIGRATED |
| `/admin/missing-service-requests` | Admin | Missing service requests | Shared operational request management route | MIGRATED |
| `/admin/users` | Admin | Users/roles | Localized admin table actions, modal/table isolation, restore copy | MIGRATED |
| `/admin/providers` | Admin | Providers | Provider resource management route | MIGRATED |
| `/admin/provider-services` | Admin | Provider assignments | Modal/table isolation and shared resource pattern | MIGRATED |
| `/admin/reports` | Admin | Reports | Admin reports route | MIGRATED |
| `/admin/notifications` | Admin | Notifications | Notification center route | MIGRATED |
| `/admin/payments` | Admin | Payments | Payments management route | MIGRATED |
| `/admin/audit` | Admin | Audit log | Audit log route | MIGRATED |
| `/admin/help-guides` | Admin | Help guide management | Help guide management route | MIGRATED |
| `/admin/manual` | Admin | Help/manual | Shared manual launch route | MIGRATED |
| `/provider` | Provider | Provider dashboard | Provider DashboardLayout route | MIGRATED |
| `/provider/orders` | Provider | Assigned orders | Provider work list route | MIGRATED |
| `/provider/orders/:id` | Provider | Provider order detail | Provider work detail with upload/status behavior | MIGRATED |
| `/provider/manual` | Provider | Help/manual | Shared manual launch route | MIGRATED |

Evidence:
- `frontend/src/routes/AppRoutes.jsx:158-242`
- `frontend/src/components/DataTable.jsx`
- `frontend/src/components/FileUploader.jsx`
- `frontend/src/utils/servicePresentation.js`
- `docs/khalsni-saas-uiux-enhancement/after/`
