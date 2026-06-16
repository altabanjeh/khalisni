# Mobile API Gap Report

## Status Legend
- `Ready`: backend endpoint already exists and matches mobile needs closely.
- `Usable with adapter`: endpoint exists, but mobile needs client-side composition or normalization.
- `Missing`: backend support should be added before full mobile parity.

## Authentication

| Capability | Status | Existing endpoints | Notes |
| --- | --- | --- | --- |
| Login | Ready | `POST /api/auth/login/` | JWT access + refresh returned with user payload. |
| Logout | Ready | `POST /api/auth/logout/` | Uses refresh token blacklist when SimpleJWT blacklist is enabled. |
| Refresh token | Ready | `POST /api/auth/token/refresh/` | Access lifetime 8h, refresh lifetime 7d. |
| Current user | Ready | `GET /api/auth/me/` | Includes `permissions`. |
| Customer profile update | Ready | `PATCH /api/customer/profile/` | Customer only. |
| Forgot password | Ready | `POST /api/auth/forgot-password/` | Public endpoint; now rate-limited. |
| Reset password | Ready | `POST /api/auth/reset-password/{token}/` | Public endpoint; now rate-limited. |
| Provider/employee/admin self-profile update | Missing | None | Only admin user management exists, not self-service profile editing. |

## Customer Module

| Capability | Status | Existing endpoints | Notes |
| --- | --- | --- | --- |
| Customer order creation | Ready | `POST /api/orders/` | Requires authenticated customer access. |
| Track order | Ready | `GET /api/orders/track/` | Uses `order_number` + `phone`. |
| Customer order list | Ready | `GET /api/customer/orders/` | Mobile should support paginated or array response. |
| Customer order detail | Ready | `GET /api/customer/orders/{id}/` | Includes allowed actions, notes, docs, logs. |
| Upload missing/customer document | Ready | `POST /api/customer/orders/{id}/documents/` | Multipart. |
| Cancel order | Ready | `POST /api/customer/orders/{id}/cancel/` | Reason required by backend. |
| Submit rating | Ready | `POST /api/customer/orders/{id}/rating/` | Completed orders only. |
| Customer dashboard summary | Usable with adapter | Compose from `/customer/orders/` + `/notifications/` | No dedicated summary endpoint exists. |
| Customer payment list/create | Ready | `GET/POST /api/customer/payments/` | Not yet used by current frontend but backend exists. |
| Customer payment detail | Ready | `GET /api/customer/payments/{id}/` | Mobile can surface payment history. |

## Employee and Internal Workflow

| Capability | Status | Existing endpoints | Notes |
| --- | --- | --- | --- |
| Review queue | Ready | `GET /api/admin/orders/` | Scoped by backend permissions and user visibility. |
| Review order detail | Ready | `GET /api/admin/orders/{id}/` | Employee uses admin/scoped order detail endpoint. |
| Update order status | Ready | `PATCH /api/admin/orders/{id}/status/` | Generic endpoint only for transitions marked generic in workflow rules. |
| Request missing documents | Ready | `POST /api/admin/orders/{id}/request-documents/` | Creates `MissingDocumentRequest`. |
| Assign provider | Ready | `PATCH /api/admin/orders/{id}/assign/` | Validates provider eligibility and approved docs. |
| Add internal/customer note | Ready | `POST /api/admin/orders/{id}/notes/` | Visibility handled by payload/backend. |
| Complete order | Ready | `POST /api/admin/orders/{id}/complete/` | Requires final document verification unless admin override. |
| Reject order | Ready | `POST /api/admin/orders/{id}/reject/` | Reason required. |
| Cancel order | Ready | `POST /api/admin/orders/{id}/cancel/` | Role rules apply. |
| Staff document queue | Ready | `GET /api/staff/documents/` | Supports `status` and `order` filters. |
| Verify/reject document | Ready | `POST /api/staff/documents/{id}/verify/` | Uses verification serializer. |
| Employee dashboard | Ready | `GET /api/employee/dashboard/` | Good mobile dashboard source. |
| Employee workflow reports | Ready | `GET /api/employee/reports/summary/` | Supports date range query params. |

## Provider Module

| Capability | Status | Existing endpoints | Notes |
| --- | --- | --- | --- |
| Provider dashboard | Ready | `GET /api/provider/dashboard/` | Summary metrics included. |
| Assigned orders list | Ready | `GET /api/provider/orders/` | Scoped to assigned provider only. |
| Provider order detail | Ready | `GET /api/provider/orders/{id}/` | Includes allowed actions and filtered documents. |
| Provider status update | Ready | `PATCH /api/provider/orders/{id}/status/` | Only `IN_PROGRESS` and `WAITING_GOVERNMENT` via provider endpoint. |
| Provider note | Ready | `POST /api/provider/orders/{id}/notes/` | Internal note only. |
| Provider final document upload | Ready | `POST /api/provider/orders/{id}/final-document/` | Also triggers workflow transition. |
| Explicit accept/decline assignment | Missing | None | Current model implies accept by moving `ASSIGNED -> IN_PROGRESS`. |

## Admin Module

| Capability | Status | Existing endpoints | Notes |
| --- | --- | --- | --- |
| Admin overview dashboard | Ready | `GET /api/admin/dashboard/` | Summary cards and top metrics. |
| Full order records | Ready | `GET /api/admin/order-records/`, `GET /api/admin/orders/`, `GET /api/admin/orders/{id}/` | Two admin order surfaces exist: raw records and workflow-driven list/detail. |
| Users CRUD | Ready | `GET/POST/PATCH/DELETE /api/admin/users/` | Delete is soft deactivate. |
| Direct permission assignment | Ready | `GET/PATCH /api/admin/users/{id}/permissions/` | Good for mobile role/permission management. |
| Available permissions | Ready | `GET /api/admin/available-permissions/` | Grouped by app. |
| System settings | Ready | `GET/POST/PATCH /api/admin/system-settings/` | Delete intentionally blocked. |
| Services CRUD | Ready | `GET/POST/PATCH/DELETE /api/admin/services/` | Delete is soft disable. |
| Categories CRUD | Ready | `GET/POST/PATCH/DELETE /api/admin/categories/` | Delete is soft disable. |
| Required document rules | Ready | `GET/POST/PATCH/DELETE /api/admin/service-documents/` | Delete is soft disable. |
| Service-provider assignments | Ready | `GET/POST/PATCH/DELETE /api/admin/service-provider-assignments/` | Delete is soft disable. |
| Providers management | Ready | `GET/POST/PATCH/DELETE /api/admin/providers/` | Includes approval and activation actions. |
| Provider approval | Ready | `POST /api/admin/providers/{id}/approval/` | Approve/reject provider. |
| Provider activation | Ready | `POST /api/admin/providers/{id}/activation/` | Activate/deactivate provider account. |
| Payments management | Ready | `GET/POST /api/admin/payments/`, `GET /api/admin/payments/{id}/`, `POST /api/admin/payments/{id}/status/` | Good for admin mobile. |
| Notifications admin list | Ready | `GET /api/admin/notifications/` | Read-only use is fine; creation exists too. |
| Notification templates | Ready | `GET/POST/PATCH/DELETE /api/admin/notification-templates/` | Includes preview action. |
| Workflow rule visibility | Ready | `GET /api/admin/workflow-rules/` | Useful for admin read-only/mobile reference. |
| Public site content | Ready | `GET/PUT /api/admin/public-site/content/` | Multipart-friendly. |
| Public site theme | Ready | `GET/PUT /api/admin/public-site/theme/` | Multipart-friendly. |
| Advertisements | Ready | `GET/POST/PATCH/DELETE /api/admin/public-site/advertisements/` | Ready for admin mobile forms. |
| Audit logs | Ready | `GET /api/admin/audit-logs/` | Admin only. |
| Raw role management abstraction | Usable with adapter | Use `/admin/users/` + `/admin/users/{id}/permissions/` | No separate “roles service” beyond Django groups + direct perms. |

## Notifications

| Capability | Status | Existing endpoints | Notes |
| --- | --- | --- | --- |
| Notification center list | Ready | `GET /api/notifications/` | All authenticated roles. |
| Employee notification templates | Ready | `GET /api/employee/notification-templates/` | For manual in-app notifications. |
| Send manual order notification | Ready | `POST /api/orders/{id}/manual-notification/` | Employee/internal use. |
| Mark notification as read | Ready | `PATCH /api/notifications/{id}/read/` | Available for authenticated users within their scoped notification set. |
| Mark all as read | Missing | None | Recommended for mobile UX. |
| Unread count | Missing | None | Needed for badge without downloading full list every time. |
| Push device registration | Missing | None | Needed for Expo/FCM/APNs integration. |

## Documents

| Capability | Status | Existing endpoints | Notes |
| --- | --- | --- | --- |
| Secure download token | Ready | `GET /api/documents/{id}/download-token/` | Best path for mobile authenticated downloads. |
| Download document | Ready | `GET /api/documents/{id}/download/` | Supports authenticated, token-based, and limited anonymous final-doc access. |
| Customer upload | Ready | `POST /api/customer/orders/{id}/documents/` | Multipart. |
| Staff verify | Ready | `POST /api/staff/documents/{id}/verify/` | Approve/reject. |
| Admin final upload | Ready | `POST /api/admin/orders/{id}/final-document/` | Internal final document path. |
| Inline preview metadata endpoint | Usable with adapter | Order detail includes documents | Enough for list/detail, but no thumbnail/preview endpoint. |

## Reports

| Capability | Status | Existing endpoints | Notes |
| --- | --- | --- | --- |
| Admin dashboard | Ready | `GET /api/admin/dashboard/` | |
| Daily report | Ready | `GET /api/admin/reports/daily/` | |
| Weekly report | Ready | `GET /api/admin/reports/weekly/` | |
| Employee dashboard | Ready | `GET /api/employee/dashboard/` | |
| Employee summary report | Ready | `GET /api/employee/reports/summary/` | |
| Scoped operational summary | Ready | `GET /api/reports/summary/` | Useful for provider/customer/admin scoped analytics. |

## Required Backend Additions Before Full Mobile Production

1. `POST /api/notifications/read-all/`
2. `GET /api/notifications/unread-count/`
3. `POST /api/mobile/devices/` for Expo/FCM token registration
4. Optional self-profile endpoints for provider/employee/admin

## Backend Support Not Required Immediately

- Customer dashboard can be composed client-side from orders + notifications.
- Provider “accept work” can map to existing `ASSIGNED -> IN_PROGRESS`.
- Mobile report screens can begin with existing summary endpoints.
