# Workflow Audit Findings

## Scope

This audit reviewed the service-order workflow across:

- Django apps: `accounts`, `audit`, `config`, `core`, `documents`, `notifications`, `orders`, `payment`, `providers`, `public_site`, `reports`, `services`, `workflow`
- Frontend screens under `frontend/src/pages/customer`, `frontend/src/pages/employee`, `frontend/src/pages/provider`, `frontend/src/pages/admin`
- Workflow, permission, notification, and audit entrypoints used by the role-based portals

## App And Model Map

| App | Main Models | Purpose |
|---|---|---|
| `accounts` | `CustomUser`, `CustomerProfile`, `SystemSetting` | Authentication, user roles, customer profile, system settings |
| `audit` | `AuditLog` | Immutable operational audit trail |
| `documents` | `Document` | Customer, staff, and provider document storage and verification |
| `notifications` | `Notification`, `NotificationTemplate` | In-app and channel-aware notifications |
| `orders` | `Order`, `OrderStatusLog`, `OrderNote`, `OrderAssignmentHistory`, `OrderIssue`, `Rating` | Core order lifecycle and operational history |
| `providers` | `ProviderProfile` | Provider account profile and provider portal access |
| `services` | `ServiceCategory`, `Service`, `ServiceProviderAssignment`, `Address`, `ServiceRequiredDocument` | Catalog, required documents, provider-service mapping |
| `reports` | no persistent report model | Aggregated operational and management reporting |
| `workflow` | transition rules and validation helpers | Canonical status transition layer |
| `payment` | `Payment` | Payment tracking and audit |
| `public_site` | homepage/theme/advertisement models | Public marketing site content |

## Canonical Order Statuses

Defined in `backend/core/choices.py` and enforced through `backend/workflow/rules.py` and `backend/workflow/services.py`.

| Status | Meaning |
|---|---|
| `NEW` | Newly created order |
| `UNDER_REVIEW` | Internal review started |
| `WAITING_CUSTOMER` | Missing documents requested from customer |
| `ASSIGNED` | Provider assigned |
| `IN_PROGRESS` | Provider work started |
| `WAITING_GOVERNMENT` | External authority dependency |
| `READY_FOR_DELIVERY` | Final result uploaded and waiting internal approval |
| `COMPLETED` | Final result approved and order closed |
| `REJECTED` | Order rejected |
| `CANCELLED` | Order cancelled |
| `ARCHIVED` | Historical archived record |

## Permission And Role Map

Role checks are centralized in `backend/config/permissions.py`.

Key permission codenames used in the workflow:

- `orders.review_order`
- `orders.request_missing_documents`
- `orders.assign_order`
- `orders.manage_order_workflow`
- `orders.complete_order`
- `orders.reject_order`
- `documents.verify_document`
- `documents.upload_final_document`
- `notifications.send_manual_notification`
- `accounts.manage_user_roles`
- `services.manage_service_prices`

Order visibility is further constrained in:

- `backend/orders/selectors.py`
- `backend/documents/selectors.py`
- `backend/documents/services.py::can_user_download_document`

## Workflow Entry Points

### Order creation and customer updates

- Public order creation: `backend/orders/views.py::CreateOrderAPIView`
- Customer order list/detail: `CustomerOrderListAPIView`, `CustomerOrderDetailAPIView`
- Customer document upload: `CustomerOrderDocumentUploadAPIView`
- Customer cancel/rating: `CustomerOrderCancelAPIView`, `CustomerOrderRatingAPIView`

### Employee/admin operations

- Review queue/detail: `AdminDashboardOrderListAPIView`, `AdminOrderDetailAPIView`
- Generic safe status updates: `AdminOrderStatusUpdateAPIView`
- Request missing documents: `AdminRequestDocumentsAPIView`
- Assign provider: `AdminOrderAssignAPIView`
- Add note: `AdminOrderNotesAPIView`
- Final upload by staff: `AdminOrderFinalDocumentAPIView`
- Completion/rejection/cancellation: `AdminOrderCompleteAPIView`, `AdminOrderRejectAPIView`, `AdminOrderCancelAPIView`
- Document verification queue: `backend/documents/views.py::StaffDocumentListAPIView`
- Document verification action: `StaffDocumentVerifyAPIView`

### Provider operations

- Provider queue/detail: `backend/providers/views.py::ProviderOrderListAPIView`, `ProviderOrderDetailAPIView`
- Provider status update: `ProviderOrderStatusAPIView`
- Provider note: `ProviderOrderNoteAPIView`
- Provider final upload: `ProviderFinalDocumentAPIView`

## Important Status Change Locations

The canonical service layer is `backend/orders/services.py`.

Main entrypoints:

- `create_public_order`
- `upload_customer_document`
- `update_order_status`
- `review_order`
- `request_missing_documents`
- `assign_provider_to_order`
- `provider_update_status`
- `complete_provider_work`
- `return_to_provider`
- `return_to_internal_review`
- `complete_order`
- `reject_order`
- `cancel_order`
- `reopen_order`
- `archive_order`

The hard transition gate is:

- `backend/workflow/rules.py`
- `backend/workflow/transition_permissions.py`
- `backend/workflow/services.py`

## Document Flow Locations

- Create document rows: `backend/documents/services.py::create_order_document`
- Verify/reject documents: `backend/documents/services.py::verify_document`
- Download permission: `backend/documents/services.py::can_user_download_document`
- Upload serializer and metadata validation: `backend/documents/serializers.py::DocumentUploadSerializer`
- File model validation: `backend/documents/models.py::Document.clean`

## Frontend Touchpoints

### Client

- `frontend/src/pages/customer/CustomerCreateOrderPage.jsx`
- `frontend/src/pages/customer/MyOrdersPage.jsx`
- `frontend/src/pages/customer/CustomerOrderDetailsPage.jsx`
- `frontend/src/pages/customer/MissingDocumentsResponsePage.jsx`

### Employee

- `frontend/src/pages/employee/EmployeeReviewQueuePage.jsx`
- `frontend/src/pages/employee/EmployeeOrderReviewPage.jsx`
- `frontend/src/pages/employee/EmployeeVerifyDocumentsPage.jsx`
- `frontend/src/pages/employee/EmployeeDashboardHome.jsx`
- `frontend/src/pages/employee/EmployeeReportsPage.jsx`

### Provider

- `frontend/src/pages/provider/AssignedOrdersPage.jsx`
- `frontend/src/pages/provider/ProviderOrderDetailsPage.jsx`

### Admin

- `frontend/src/pages/admin/OrdersManagementPage.jsx`
- `frontend/src/pages/admin/AdminUsersRolesPage.jsx`
- `frontend/src/pages/admin/ProvidersManagementPage.jsx`
- `frontend/src/pages/admin/ServiceProviderAssignmentsPage.jsx`
- `frontend/src/pages/admin/NotificationsPage.jsx`
- `frontend/src/pages/admin/AuditLogPage.jsx`
- `frontend/src/pages/admin/ReportsPage.jsx`

## Findings Resolved In This Audit

### 1. Audit logs did not capture reliable actor context

Observed:

- `AuditLog` had `source` and request metadata fields, but `create_audit_log()` did not populate `source` or `request_id`
- no role snapshot was stored on the audit row

Fix:

- added `AuditLog.user_role`
- `create_audit_log()` now derives `user_role`, `source`, and `request_id`
- request-driven actions now keep portal origin evidence in the database

Files:

- `backend/audit/models.py`
- `backend/audit/utils.py`
- `backend/audit/migrations/0003_auditlog_user_role.py`

### 2. The audit API did not expose the fields the admin audit screen needs

Observed:

- `AuditLogSerializer` omitted `entity_type`, `entity_id`, `ip_address`, role snapshot, old/new values, and request metadata
- the admin frontend page expected some of these fields already

Fix:

- expanded `AuditLogSerializer`
- updated `frontend/src/pages/admin/AuditLogPage.jsx` to show role, source, status, and formatted timestamps

Files:

- `backend/audit/serializers.py`
- `frontend/src/pages/admin/AuditLogPage.jsx`

### 3. Document verification actions lost request-scoped audit metadata

Observed:

- `verify_document()` created audit rows and notifications without the incoming request object
- this dropped IP, user-agent, request-id, and portal source on a critical approval/rejection action

Fix:

- threaded `request` through `StaffDocumentVerifyAPIView` into `verify_document()`
- audit rows and notification-event audit rows now keep request metadata

Files:

- `backend/documents/views.py`
- `backend/documents/services.py`

### 4. Internal notifications were incomplete for key workflow transitions

Observed:

- public order creation notified the customer only
- customer response to missing documents notified the assigned employee only
- provider final upload notified customer and assigned employee, but not admins
- order completion notified the customer only

Fix:

- `order_submitted` now notifies `customer` and `admins`
- `client_uploaded_missing_document` now notifies `assigned_employee` and `admins`
- `provider_completed_work` now notifies `customer`, `assigned_employee`, and `admins`
- `order_completed` now notifies `customer` and the assigned `provider`

File:

- `backend/notifications/event_map.py`

## Existing Architecture Validated As Correct

These areas were verified from the code and passing tests:

- centralized transition map exists and blocks invalid order status jumps
- provider visibility is scoped to the assigned provider only
- customer order visibility is scoped to the owning customer only
- final completion requires final document verification or explicit admin confirmation
- provider uploads use the same file validation path as customer uploads
- document download permissions are centralized server-side
- employee reviewability is scoped through selectors, not only frontend filters

## Remaining Risks And Design Debt

### 1. Missing-document requests are tracked as order state, not a dedicated model

Current implementation:

- `Order.missing_document_types` JSON field
- customer-visible `OrderNote`
- `OrderStatusLog`

Impact:

- the workflow works, but there is no first-class `MissingDocumentRequest` record for richer SLA/history analytics

### 2. Auto-approved documents rely on status rather than a full verifier snapshot

Current implementation:

- service rules may mark a document `APPROVED` immediately when `requires_verification=False`
- human `verified_by` is intentionally absent in that path

Impact:

- operationally valid, but audit semantics differ between human verification and rules-based approval

### 3. Anonymous final-document download still relies on order number plus phone

Current implementation:

- `DocumentDownloadAPIView` allows unauthenticated final-document access when `order_number` and customer `phone` match

Impact:

- stronger than public media URLs, but weaker than signed, expiring download tokens

## Verification Run

Verified during this audit:

- `python manage.py test`
- targeted regression slices for `audit`, `documents`, `notifications`, and `orders.test_end_to_end`
- frontend `npm run build`

