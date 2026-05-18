# Mobile Screen Map

## Principles
- Mobile screens must preserve current backend workflow and permissions.
- Desktop admin pages should be converted into list/detail/form flows, not copied as dense multi-panel layouts.
- The map below links current web screens to required mobile equivalents.

## Shared Screens

| Mobile screen | Existing web source/equivalent | Primary APIs |
| --- | --- | --- |
| `SplashScreen` | New mobile-only bootstrap | `/auth/me/` |
| `RoleRedirectScreen` | `frontend/src/utils/authz.js` dashboard path logic | `/auth/me/` |
| `LoginScreen` | `/login` | `POST /auth/login/` |
| `NotificationsScreen` | customer notification cards + admin notifications pages | `GET /notifications/` |
| `ProfileScreen` | `/customer/profile` plus `auth/me` | `GET /auth/me/`, `PATCH /customer/profile/` |
| `SettingsScreen` | New mobile-only preferences shell | local mobile settings first |
| `NotAuthorizedScreen` | `ProtectedRoute` behavior | none |
| `ErrorScreen` | route error boundary fallback | none |

## Customer Screens

| Mobile screen | Existing web equivalent | Primary APIs |
| --- | --- | --- |
| `ClientDashboardScreen` | `/customer` | `GET /customer/orders/`, `GET /notifications/` |
| `ServiceListScreen` | `/services` | `GET /services/`, `GET /services/categories/` |
| `ServiceDetailScreen` | `/services/:slug` | `GET /services/{slug}/` |
| `CreateOrderScreen` | `/create-order`, `/customer/orders/new` | `POST /orders/`, `GET /services/`, `GET /services/{slug}/` |
| `UploadOrderDocumentsScreen` | embedded in order details/missing docs | `POST /customer/orders/{id}/documents/` |
| `MyOrdersScreen` | `/customer/orders` | `GET /customer/orders/` |
| `ClientOrderDetailScreen` | `/customer/orders/:id` | `GET /customer/orders/{id}/` |
| `MissingDocumentRequestsScreen` | derived from order details and waiting-customer state | `GET /customer/orders/{id}/` |
| `RespondToMissingDocumentScreen` | `/customer/orders/:id/missing-docs` | `GET /customer/orders/{id}/`, `POST /customer/orders/{id}/documents/` |
| `FinalDocumentScreen` | final docs accessed from customer order detail | `GET /documents/{id}/download-token/`, `GET /documents/{id}/download/` |

## Employee Screens

| Mobile screen | Existing web equivalent | Primary APIs |
| --- | --- | --- |
| `EmployeeDashboardScreen` | `/employee` | `GET /employee/dashboard/` |
| `ReviewOrdersScreen` | `/employee/orders` | `GET /admin/orders/` |
| `EmployeeOrderDetailScreen` | `/employee/orders/:id` | `GET /admin/orders/{id}/` |
| `VerifyDocumentsScreen` | `/employee/documents/verify` | `GET /staff/documents/`, `POST /staff/documents/{id}/verify/` |
| `RequestMissingDocumentScreen` | action inside employee order detail | `POST /admin/orders/{id}/request-documents/` |
| `AssignProviderScreen` | action inside employee order detail | `GET /admin/providers/?order={id}`, `PATCH /admin/orders/{id}/assign/` |
| `EmployeeTasksScreen` | employee dashboard queues + review queue | `GET /employee/dashboard/`, `GET /admin/orders/` |

## Provider Screens

| Mobile screen | Existing web equivalent | Primary APIs |
| --- | --- | --- |
| `ProviderDashboardScreen` | `/provider` | `GET /provider/dashboard/` |
| `AssignedOrdersScreen` | `/provider/orders` | `GET /provider/orders/` |
| `ProviderOrderDetailScreen` | `/provider/orders/:id` | `GET /provider/orders/{id}/` |
| `UploadFinalDocumentScreen` | action in provider order detail | `POST /provider/orders/{id}/final-document/` |
| `ProviderTaskUpdateScreen` | action in provider order detail | `PATCH /provider/orders/{id}/status/`, `POST /provider/orders/{id}/notes/` |

## Admin Screens

| Mobile screen | Existing web equivalent | Primary APIs |
| --- | --- | --- |
| `AdminDashboardScreen` | `/admin` | `GET /admin/dashboard/` |
| `ManageOrdersScreen` | `/admin/orders` | `GET /admin/orders/` |
| `AdminOrderDetailScreen` | `/admin/orders/:id` | `GET /admin/orders/{id}/` plus workflow actions |
| `ManageUsersScreen` | `/admin/users` | `GET/POST/PATCH/DELETE /admin/users/` |
| `ManageRolesScreen` | `/admin/users` direct permissions UI | `GET /admin/available-permissions/`, `GET/PATCH /admin/users/{id}/permissions/` |
| `ManageServicesScreen` | `/admin/services` | `GET/POST/PATCH/DELETE /admin/services/`, `/admin/categories/`, `/admin/service-documents/` |
| `ManagePricesScreen` | part of `/admin/services` and `/admin/rules` | `/admin/services/`, `/admin/system-settings/` |
| `ManageAdvertisementsScreen` | `/admin/public-site/advertisements` | `GET/POST/PATCH/DELETE /admin/public-site/advertisements/` |
| `ManagePublicContentScreen` | `/admin/public-site`, `/admin/public-site/content`, `/admin/public-site/theme` | `GET/PUT /admin/public-site/content/`, `GET/PUT /admin/public-site/theme/` |
| `ReportsDashboardScreen` | `/admin/reports`, `/employee/reports` | `GET /admin/dashboard/`, `GET /admin/reports/daily/`, `GET /admin/reports/weekly/`, `GET /reports/summary/` |
| `AuditLogScreen` | `/admin/audit` | `GET /admin/audit-logs/` |
| `ManageProvidersScreen` | `/admin/providers` | `GET/POST/PATCH/DELETE /admin/providers/`, approval/activation actions |
| `ManageWorkflowRulesScreen` | `/admin/rules` | `GET /admin/workflow-rules/` and related admin CRUD endpoints |
| `ManageNotificationsScreen` | `/admin/notifications` | `GET /admin/notifications/`, notification template endpoints |
| `ManagePaymentsScreen` | `/admin/payments` | payment endpoints |

## Public Marketing Screens

These are optional in the first secure-app release if the mobile app is authenticated-first, but they have direct web equivalents and reusable backend data:

| Mobile screen | Existing web equivalent | APIs |
| --- | --- | --- |
| `HomeScreen` | `/` | `GET /public-site/homepage/`, `GET /public-site/theme/`, `GET /public-site/advertisements/` |
| `AboutScreen` | `/about` | static/public content |
| `ContactScreen` | `/contact` | public content |
| `FaqScreen` | `/faq` | current frontend-managed content |
| `PrivacyPolicyScreen` | `/privacy` | current frontend-managed content |
| `TrackOrderScreen` | `/track-order` | `GET /orders/track/` |

## Screen Priority for Implementation

### Phase 1
- Login
- Role redirect
- Shared shell and notifications list

### Phase 2
- Customer dashboard, services, order creation, order detail, missing docs

### Phase 3
- Employee dashboard, review queue, order detail, document verification

### Phase 4
- Provider dashboard, assigned orders, provider order detail, final upload

### Phase 5
- Admin dashboard, order management, user/service/provider/payment/report screens

### Phase 6
- Public marketing/tracking screens if included in app scope
