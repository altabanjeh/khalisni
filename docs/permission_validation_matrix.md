# Permission Validation Matrix

| Screen/API | Client | Employee | Provider | Admin | Backend Permission | Frontend Visibility | Notes |
|---|---|---|---|---|---|---|---|
| `/api/customer/orders/` | Yes, own orders only | No | No | No | `IsCustomerRole` + `get_orders_for_user()` | Customer menu only | Customer cannot see other customers' orders |
| `/api/customer/orders/{id}/` | Yes, own order only | No | No | No | `IsCustomerRole` + queryset ownership filter | Customer order detail only | Internal notes stripped from serializer |
| `/api/customer/orders/{id}/documents/` | Yes, own active order only | No | No | No | `IsCustomerRole` + order ownership + upload validation | Customer order detail and missing-doc response screen | Final states block upload |
| `/api/staff/documents/` | No | Yes if `documents.verify_document` | No | Yes if same permission | `CanVerifyDocuments` + reviewable-order scope | Employee document verification screen | Defaults to pending review documents |
| `/api/staff/documents/{id}/verify/` | No | Yes if `documents.verify_document` | No | Yes if same permission | `CanVerifyDocuments` + reviewable-order scope | Employee actions only | Verification/rejection enforced server-side |
| `/api/admin/orders/` | No | No | No | Yes | `IsAdminRole` | Admin orders screen | Raw record endpoint blocks dangerous workflow fields |
| `/api/admin/orders/{id}/` | No | Yes for reviewable orders | No | Yes | `CanReviewOrders` + scoped queryset | Employee review detail and admin detail | Returns `allowed_actions` for current user |
| `/api/admin/orders/{id}/status/` | No | Only if user has `orders.manage_order_workflow` | No | Yes | `CanManageOrderWorkflow` + service-layer transition validation | Employee/admin action buttons shown from `allowed_actions` | Generic endpoint only permits whitelisted transitions |
| `/api/admin/orders/{id}/request-documents/` | No | Yes if `orders.request_missing_documents` | No | Yes | `CanRequestMissingDocuments` | Employee review screen | Requires reason and reviewable-order scope |
| `/api/admin/orders/{id}/assign/` | No | Yes if `orders.assign_order` | No | Yes | `CanAssignOrders` + provider/service match validation | Employee review screen and admin order tools | Backend blocks assignment before required docs are approved |
| `/api/provider/orders/` | No | No | Yes, assigned orders only | No | `IsProviderRole` + `provider_orders_queryset()` | Provider menu only | Other providers receive 404 |
| `/api/provider/orders/{id}/status/` | No | No | Yes, assigned order only | No | `IsProviderRole` + transition permission check | Provider order detail only | Provider may only move to `IN_PROGRESS` or `WAITING_GOVERNMENT` |
| `/api/provider/orders/{id}/final-document/` | No | No | Yes, assigned order only | No | `IsProviderRole` + final upload workflow validation | Provider order detail only | Uses same file validation path as customer uploads |
| `/api/documents/{id}/download/` | Yes for own docs/final docs; anonymous final-doc access with order number + phone | Yes | Yes only for assigned order and allowed doc types | Yes | `can_user_download_document()` and anonymous final-doc gate | Download buttons depend on serializer and role view | Providers cannot access unrelated client documents |
| `/api/admin/providers/` | No | Read-only list if `orders.assign_order` | No | Yes full CRUD if `accounts.manage_user_roles` | `CanAssignOrders` for list/retrieve, `CanManageUserRoles` for mutations | Employee sees candidates in order flow; admin sees provider management screens | Approval/activation actions remain admin-only |
| `/api/admin/service-provider-assignments/` | No | No | No | Yes | admin service management permissions | Admin provider-services screen only | Separates provider creation from service assignment |
| `/api/admin/users/` | No | No | No | Yes | `CanManageUserRoles` | Admin users screen only | Normal employees blocked by backend even if route guessed |
| `/api/admin/audit-logs/` | No | No | No | Yes | `IsAdminRole` | Admin audit screen only | Audit API now exposes role, source, request, and status fields |
| `/api/admin/dashboard/` and report APIs | No | Limited employee dashboard via employee endpoints only | No | Yes | `CanViewReportsDashboard` or `CanViewScopedReports` | Separate admin and employee report screens | Scoped reports use role-aware querysets |
| `/api/notifications/` | Yes, own only | Yes, own only | Yes, own only | Yes, own only | authenticated notification-center queryset | Notification panel for signed-in roles | Admin operational notification management is separate |

