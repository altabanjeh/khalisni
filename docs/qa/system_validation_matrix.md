# Khalisni Platform — System Validation Matrix

**Generated:** 2026-05-12  
**Scope:** Full production readiness audit across all actors and flows  
**Legend:**

| Marker | Meaning |
|--------|---------|
| `MISSING` | Feature/check does not exist |
| `BACKEND_FRONTEND_MISMATCH` | Backend allows/blocks something the UI does not reflect correctly |
| `SECURITY_RISK` | Authorization gap that could be exploited |
| `AUDIT_GAP` | Action that modifies data but produces no audit log entry |
| `NOTIFICATION_GAP` | State change that should notify users but does not |
| `TEST_GAP` | No automated test covers this path |
| `CRITICAL_SECURITY_RISK` | High-severity gap — unauthenticated or cross-role data access possible |

---

## 1. Order Lifecycle Flows

| ID | Module | Flow | Actor | Current Status | Action | Expected New Status | Expected DB Change | Expected Notification | Expected Audit Log | Expected UI Change | Allowed Roles | Blocked Roles | Backend Endpoint | Frontend Screen | Existing Tests | Missing Tests | Risk Level | Notes |
|----|--------|------|-------|---------------|--------|--------------------|--------------------|----------------------|-------------------|--------------------|--------------|--------------|-----------------|----------------|---------------|--------------|-----------|-------|
| OL-01 | orders | Public guest submits order | Guest / Customer (no auth) | N/A | POST `/api/orders/create/` with service_id + form fields | `submitted` | `Order` row created; `OrderStatusHistory` row | `order_submitted` event fired → customer email | `create_audit_log` via `_audit_transition` | Redirect to order tracking page | Any (AllowAny) | — | `POST /api/orders/create/` (`PublicOrderCreateAPIView`) | `CreateOrderPage`, `CustomerCreateOrderPage` | `orders/tests.py::OrderLifecycleTests::test_public_order_create` | Missing test for duplicate order prevention per customer+service per day | Low | Guest orders have no `user` FK — tracking only by `order_number` |
| OL-02 | orders | Customer views own orders list | Customer | Any | GET `/api/customer/orders/` | — (read) | — | — | — | List of own orders displayed | `customer` | employee, admin, provider | `GET /api/customer/orders/` (`CustomerOrderListAPIView`) | `MyOrdersPage` | `test_customer_can_list_own_orders` | Missing test: customer cannot see other customers' orders | Medium | Filtered by `request.user` in selector |
| OL-03 | orders | Customer views own order detail | Customer | Any | GET `/api/customer/orders/{id}/` | — (read) | — | — | — | Order detail with documents, status history | `customer` | employee, admin, provider | `GET /api/customer/orders/{id}/` (`CustomerOrderDetailAPIView`) | `CustomerOrderDetailsPage` | — | `TEST_GAP`: no test for customer viewing another user's order (should 404) | `SECURITY_RISK` | Object-level permission uses `CustomerOrderPermission` which checks `order.customer == request.user` |
| OL-04 | orders | Employee/Admin reviews order | employee, admin | `submitted` | GET `/api/admin/orders/{id}/` | — (read) | — | — | — | Full order detail with employee controls | `employee`, `admin` (via `CanReviewOrders`) | `customer`, `provider` | `GET /api/admin/orders/{id}/` (`AdminDashboardOrderDetailAPIView`) | `EmployeeOrderReviewPage`, `AdminOrderDetailsPage` | `test_employee_can_view_order_detail` | Missing: admin-only vs employee distinction at API level | Low | `CanReviewOrders` grants both employee+admin — intentional shared endpoint |
| OL-05 | orders | Employee accepts order (under review) | employee, admin | `submitted` | PATCH `/api/admin/orders/{id}/status/` `{status: "under_review"}` | `under_review` | `OrderStatusHistory` row; `Order.status` updated | `order_under_review` event fired | `_audit_transition` logs `order_status_changed` | Status badge updated; employee controls visible | `employee`, `admin` (via `CanManageOrderWorkflow`) | `customer`, `provider` | `PATCH /api/admin/orders/{id}/status/` | `EmployeeOrderReviewPage` | `test_order_status_transition_under_review` | — | Low | |
| OL-06 | orders | Employee requests missing documents | employee, admin | `under_review` | POST `/api/admin/orders/{id}/missing-documents/` | `pending_missing_documents` | `MissingDocumentRequest` row; `Order.status` updated | `missing_documents_requested` event fired | `create_audit_log` | Customer sees "upload missing docs" CTA | `employee`, `admin` | `customer`, `provider` | `POST /api/admin/orders/{id}/missing-documents/` | `EmployeeOrderReviewPage` | `test_missing_document_request_created` | Missing: test that second request while first is unresolved is blocked | Medium | |
| OL-07 | orders | Admin assigns provider | admin | `under_review` | PATCH `/api/admin/orders/{id}/assign-provider/` | `provider_assigned` | `Order.assigned_provider` set; `OrderStatusHistory` row | `provider_assigned` event fired | `_audit_transition` logs `order_provider_assigned` | Provider field populated | `admin` (via `CanManageOrderWorkflow`) | `employee`, `customer`, `provider` | `PATCH /api/admin/orders/{id}/assign-provider/` | `AdminOrderDetailsPage` | `test_admin_can_assign_provider` | Missing: test that employee cannot assign provider | Medium | `_can_assign_provider` checks active required docs via prefetch |
| OL-08 | orders | Admin marks order ready for delivery | admin | `provider_completed` | PATCH `/api/admin/orders/{id}/status/` `{status: "ready_for_delivery"}` | `ready_for_delivery` | `OrderStatusHistory` row; `Order.status` updated | `order_ready_for_delivery` event fired | `_audit_transition` | Customer notified; status badge updated | `admin` | `employee`, `customer`, `provider` | `PATCH /api/admin/orders/{id}/status/` | `AdminOrderDetailsPage` | — | `TEST_GAP` | Low | |
| OL-09 | orders | Admin marks order completed | admin | `ready_for_delivery` | PATCH `{status: "completed"}` | `completed` | `Order.completed_at` set; `OrderStatusHistory` row | `order_completed` event fired | `_audit_transition` | Status badge `completed`; all action buttons hidden | `admin` | all others | `PATCH /api/admin/orders/{id}/status/` | `AdminOrderDetailsPage` | `test_order_completed_transition` | Missing: confirm no further transitions allowed from `completed` | Low | Terminal state |
| OL-10 | orders | Admin cancels order | admin | Any non-terminal | PATCH `{status: "cancelled"}` | `cancelled` | `OrderStatusHistory` row | `order_cancelled` event fired | `_audit_transition` | All action buttons hidden; red cancelled badge | `admin` | `employee`, `customer`, `provider` | `PATCH /api/admin/orders/{id}/status/` | `AdminOrderDetailsPage` | `test_order_cancellation` | Missing: test cancellation from each valid source state | Low | Terminal state |
| OL-11 | orders | Admin reopens cancelled order | admin | `cancelled` | PATCH `{status: "submitted"}` | `submitted` | `OrderStatusHistory` row | `order_reopened` event fired | `_audit_transition` | Status resets to submitted | `admin` | `employee`, `customer`, `provider` | `PATCH /api/admin/orders/{id}/status/` | `AdminOrderDetailsPage` | — | `TEST_GAP` | Medium | Reopening creates new audit history point |
| OL-12 | orders | Invalid transition attempted | Any | `completed` | PATCH `{status: "submitted"}` (illegal) | — | No DB change | None | None | Error message shown | — | — | `PATCH /api/admin/orders/{id}/status/` | Any status update screen | `test_invalid_status_transition_rejected` | Missing: test all terminal → non-terminal paths | Low | `TRANSITION_RULE_MAP` O(1) lookup; returns 400 |

---

## 2. Document Lifecycle Flows

| ID | Module | Flow | Actor | Current Status | Action | Expected New Status | Expected DB Change | Expected Notification | Expected Audit Log | Expected UI Change | Allowed Roles | Blocked Roles | Backend Endpoint | Frontend Screen | Existing Tests | Missing Tests | Risk Level | Notes |
|----|--------|------|-------|---------------|--------|--------------------|--------------------|----------------------|-------------------|--------------------|--------------|--------------|-----------------|----------------|---------------|--------------|-----------|-------|
| DL-01 | documents | Customer uploads document | Customer | `under_review` or `pending_missing_documents` | POST `/api/documents/` multipart | `uploaded` | `Document` row; file stored in `secure_orders/{order_number}/documents/{uuid}.ext` | — | `AUDIT_GAP`: no audit log for customer document upload | Upload appears in order detail | `customer` | employee, admin, provider | `POST /api/documents/` | `CustomerOrderDetailsPage`, `MissingDocumentsResponsePage` | `test_customer_uploads_document` | `TEST_GAP`: audit log absence | Medium | Filename sanitized via `secure_document_upload_path` |
| DL-02 | documents | Employee verifies document | employee, admin | `uploaded` or `pending_review` | PATCH `/api/documents/{id}/verify/` | `approved` | `Document.status=approved`, `is_verified=True`, `verified_by`, `verified_at` | — | `AUDIT_GAP`: document verification not logged to audit | Document shows "approved" badge; verify button hidden | `employee`, `admin` (via `verify_document` permission) | `customer`, `provider` | `PATCH /api/documents/{id}/verify/` (`DocumentVerifyAPIView`) | `EmployeeVerifyDocumentsPage` | `test_employee_can_verify_document` | Missing: test that customer cannot call verify endpoint | `SECURITY_RISK` |
| DL-03 | documents | Employee rejects document | employee, admin | `uploaded` or `pending_review` | PATCH `/api/documents/{id}/reject/` with `rejection_reason` | `rejected` | `Document.status=rejected`; `rejection_reason` set | `notify_client` called with rejection note | `AUDIT_GAP`: rejection not in audit log | Document shows "rejected" badge with reason | `employee`, `admin` | `customer`, `provider` | `PATCH /api/documents/{id}/reject/` | `EmployeeVerifyDocumentsPage` | `test_employee_can_reject_document` | Missing: test rejection without reason returns 400 | Low | |
| DL-04 | documents | Document auto-approved by rule | System | `uploaded` | Service rule `requires_verification=False` triggers | `approved` | `Document.auto_approved_by_rule=True`, `status=approved` | — | `AUDIT_GAP`: auto-approval not in audit log | Document shows "approved" (auto) badge | System | — | Internal (`workflow/services.py` or order create flow) | — | — | `TEST_GAP`: no test for auto-approval rule trigger | Medium | `auto_approved_by_rule` field added for audit trail |
| DL-05 | documents | Employee downloads document | employee, admin | Any | GET `/api/documents/{id}/download-token/` then redirect | — | — | — | `AUDIT_GAP`: document access not logged | File download begins | `employee`, `admin` | `customer`, `provider` | `GET /api/documents/{id}/download-token/` | `EmployeeOrderReviewPage`, `EmployeeVerifyDocumentsPage` | — | `TEST_GAP`: no test for download token generation | `SECURITY_RISK` | Signed tokens via `TimestampSigner`, 30-min TTL |
| DL-06 | documents | Customer downloads own document | Customer | Any | GET `/api/documents/{id}/download-token/` | — | — | — | `AUDIT_GAP` | File download | `customer` (own order only) | others | `GET /api/documents/{id}/download-token/` | `CustomerOrderDetailsPage` | — | `TEST_GAP`: cross-customer download prevention | `CRITICAL_SECURITY_RISK` | Must verify document belongs to customer's order |
| DL-07 | documents | Admin soft-deletes document | admin | Any | DELETE `/api/documents/{id}/` | `archived` / soft deleted | `Document.is_deleted=True`, `deleted_by`, `deleted_at` | — | `AUDIT_GAP`: soft delete not logged | Document hidden from lists | `admin` (via `delete_sensitive_document`) | `employee`, `customer`, `provider` | `DELETE /api/documents/{id}/` | `AdminOrderDetailsPage` | — | `TEST_GAP` | Medium | Physical file preserved; only soft flag set |

---

## 3. Missing Document Request Flows

| ID | Module | Flow | Actor | Current Status | Action | Expected New Status | Expected DB Change | Expected Notification | Expected Audit Log | Expected UI Change | Allowed Roles | Blocked Roles | Backend Endpoint | Frontend Screen | Existing Tests | Missing Tests | Risk Level | Notes |
|----|--------|------|-------|---------------|--------|--------------------|--------------------|----------------------|-------------------|--------------------|--------------|--------------|-----------------|----------------|---------------|--------------|-----------|-------|
| MD-01 | orders | Employee requests missing docs | employee, admin | `under_review` | POST `/api/admin/orders/{id}/missing-documents/` | `pending_missing_documents` | `MissingDocumentRequest` row; `Order.status` updated | `missing_documents_requested` event | `create_audit_log` | Customer sees "Upload Missing Documents" CTA | `employee`, `admin` | `customer`, `provider` | `POST /api/admin/orders/{id}/missing-documents/` | `EmployeeOrderReviewPage` | `test_missing_document_request` | Missing: re-request while `is_resolved=False` should be blocked | Medium | |
| MD-02 | orders | Customer responds to missing docs | Customer | `pending_missing_documents` | POST documents + PATCH `/api/customer/orders/{id}/missing-docs-response/` | `under_review` | `MissingDocumentRequest.is_resolved=True`, `responded_at` set; `Order.status` → `under_review` | `client_uploaded_missing_document` event | `AUDIT_GAP`: response not logged | Upload form hidden; status reverts to under_review | `customer` | employee, admin, provider | `POST /api/customer/orders/{id}/missing-docs-response/` | `MissingDocumentsResponsePage` | `test_customer_responds_to_missing_docs` | Missing: test double-response prevention | Low | |
| MD-03 | orders | Customer views missing doc request | Customer | `pending_missing_documents` | GET `/api/customer/orders/{id}/` | — (read) | — | — | — | Missing doc request details + upload form shown | `customer` | others | `GET /api/customer/orders/{id}/` | `CustomerOrderDetailsPage` | — | `TEST_GAP` | Low | Details embedded in order detail response |

---

## 4. Provider Assignment and Final Document Upload Flows

| ID | Module | Flow | Actor | Current Status | Action | Expected New Status | Expected DB Change | Expected Notification | Expected Audit Log | Expected UI Change | Allowed Roles | Blocked Roles | Backend Endpoint | Frontend Screen | Existing Tests | Missing Tests | Risk Level | Notes |
|----|--------|------|-------|---------------|--------|--------------------|--------------------|----------------------|-------------------|--------------------|--------------|--------------|-----------------|----------------|---------------|--------------|-----------|-------|
| PA-01 | providers | Admin assigns provider to order | admin | `under_review` | PATCH `/api/admin/orders/{id}/assign-provider/` | `provider_assigned` | `Order.assigned_provider` set; `OrderStatusHistory` row | `provider_assigned` event | `_audit_transition` | Provider name shown; provider controls enabled | `admin` | `employee`, `customer`, `provider` | `PATCH /api/admin/orders/{id}/assign-provider/` | `AdminOrderDetailsPage` | `test_admin_assigns_provider` | Missing: test employee cannot assign | Medium | Validates all required docs present before allowing assignment |
| PA-02 | providers | Provider views assigned orders | provider | `provider_assigned` | GET `/api/provider/orders/` | — (read) | — | — | — | List of orders assigned to this provider | `provider` | admin, employee, customer | `GET /api/provider/orders/` (`ProviderAssignedOrdersListAPIView`) | `AssignedOrdersPage` | — | `TEST_GAP`: provider sees only own orders | `SECURITY_RISK` | Filter by `assigned_provider=request.user` |
| PA-03 | providers | Provider starts work | provider | `provider_assigned` | PATCH `/api/provider/orders/{id}/status/` `{status: "in_progress"}` | `in_progress` | `OrderStatusHistory` row | `provider_started_work` event | `_audit_transition` | "In Progress" badge; upload button appears | `provider` | admin, employee, customer | `PATCH /api/provider/orders/{id}/status/` | `ProviderOrderDetailsPage` | — | `TEST_GAP` | Low | |
| PA-04 | providers | Provider uploads final document | provider | `in_progress` or `provider_assigned` | POST `/api/provider/orders/{id}/final-document/` multipart | `provider_completed` | `Document` row (`is_final_document=True`); `Order.status` updated; `OrderStatusHistory` row | `provider_result_returned` event | `AUDIT_GAP`: final upload not logged separately | Upload form hidden; "Completed" badge shown | `provider` (`IsProviderRole` only — NO Django permission check) | admin, employee, customer | `POST /api/provider/orders/{id}/final-document/` (`ProviderFinalDocumentAPIView`) | `ProviderOrderDetailsPage` | — | `TEST_GAP`: end-to-end final upload test | Medium | **BACKEND_FRONTEND_MISMATCH**: `can_upload_final_document` in `allowed_actions` was previously missing provider role check — fixed in session |
| PA-05 | providers | Admin uploads final document | admin | `in_progress` | POST `/api/admin/orders/{id}/final-document/` | `provider_completed` | `Document` row (`is_final_document=True`); `Order.status` updated | `provider_completed_work` event | `create_audit_log` | Final doc visible in order detail | `admin` (via `CanUploadFinalDocuments` = `documents.upload_final_document`) | `employee`, `customer`, `provider` | `POST /api/admin/orders/{id}/final-document/` (`AdminOrderFinalDocumentAPIView`) | `AdminOrderDetailsPage` | — | `TEST_GAP` | Low | |
| PA-06 | providers | Provider marks work complete | provider | `in_progress` | PATCH `{status: "provider_completed"}` | `provider_completed` | `OrderStatusHistory` row | `provider_completed_work` event | `_audit_transition` | Status updated; admin sees "ready to deliver" CTA | `provider` | others | `PATCH /api/provider/orders/{id}/status/` | `ProviderOrderDetailsPage` | — | `TEST_GAP` | Low | |

---

## 5. Payment Flows

| ID | Module | Flow | Actor | Current Status | Action | Expected New Status | Expected DB Change | Expected Notification | Expected Audit Log | Expected UI Change | Allowed Roles | Blocked Roles | Backend Endpoint | Frontend Screen | Existing Tests | Missing Tests | Risk Level | Notes |
|----|--------|------|-------|---------------|--------|--------------------|--------------------|----------------------|-------------------|--------------------|--------------|--------------|-----------------|----------------|---------------|--------------|-----------|-------|
| PY-01 | payment | Admin records payment | admin | Any | POST `/api/payments/` | — | `Payment` row created | — | `AUDIT_GAP`: payment creation not logged | Payment visible in admin payments list | `admin` | `employee`, `customer`, `provider` | `POST /api/payments/` (`PaymentViewSet`) | `PaymentsManagementPage` | — | `TEST_GAP` | Medium | Manual payment entry; no payment gateway integration |
| PY-02 | payment | Admin views all payments | admin | Any | GET `/api/payments/` | — (read) | — | — | — | Payments list with filters | `admin` | `employee`, `customer`, `provider` | `GET /api/payments/` | `PaymentsManagementPage` | — | `TEST_GAP` | Low | |
| PY-03 | payment | Customer views own payments | customer | Any | MISSING | — | — | — | — | — | — | — | MISSING | MISSING | — | `TEST_GAP`: customer payment visibility | `SECURITY_RISK` | **MISSING**: no customer-facing payment endpoint exists; customers cannot see their payment records |
| PY-04 | payment | Admin updates payment status | admin | Any | PATCH `/api/payments/{id}/` | — | `Payment` row updated | — | `AUDIT_GAP` | Payment status badge updated | `admin` | others | `PATCH /api/payments/{id}/` | `PaymentsManagementPage` | — | `TEST_GAP` | Low | |

---

## 6. Service Management Flows

| ID | Module | Flow | Actor | Current Status | Action | Expected New Status | Expected DB Change | Expected Notification | Expected Audit Log | Expected UI Change | Allowed Roles | Blocked Roles | Backend Endpoint | Frontend Screen | Existing Tests | Missing Tests | Risk Level | Notes |
|----|--------|------|-------|---------------|--------|--------------------|--------------------|----------------------|-------------------|--------------------|--------------|--------------|-----------------|----------------|---------------|--------------|-----------|-------|
| SV-01 | services | Admin creates service | admin | N/A | POST `/api/services/` | — | `Service` row + `ServiceCategory` link | — | `AUDIT_GAP`: service creation not logged | New service appears in list | `admin` | `employee`, `customer`, `provider` | `POST /api/services/` (`ServiceViewSet`) | `ServicesManagementPage` | — | `TEST_GAP` | Low | |
| SV-02 | services | Admin edits service | admin | Any | PATCH `/api/services/{id}/` | — | `Service` row updated | — | `AUDIT_GAP` | Service form pre-populated; changes reflected | `admin` | others | `PATCH /api/services/{id}/` | `ServicesManagementPage` | — | `TEST_GAP` | Low | Full CRUD added in this session (`ServicesManagementPage.jsx` rebuilt) |
| SV-03 | services | Admin deletes service | admin | Any (no active orders) | DELETE `/api/services/{id}/` | — | `Service` row deleted (or soft delete?) | — | `AUDIT_GAP` | Service removed from list | `admin` | others | `DELETE /api/services/{id}/` | `ServicesManagementPage` | — | `TEST_GAP`: deletion with active orders should be blocked | Medium | Risk: deleting a service with active orders may break FK constraint or leave orphan orders |
| SV-04 | services | Public views services | Guest | Any | GET `/api/services/` | — (read) | — | — | — | Services list on public page | Any (AllowAny) | — | `GET /api/services/` | `ServicesPage` | — | — | Low | |
| SV-05 | services | Admin manages document requirements | admin | N/A | POST `/api/services/{id}/requirements/` | — | `ServiceRequiredDocument` row | — | `AUDIT_GAP` | Requirements list updated | `admin` | others | `POST /api/services/{id}/requirements/` | `ServicesManagementPage` | — | `TEST_GAP` | Low | Affects `_can_assign_provider` logic |

---

## 7. Admin User and Permission Management Flows

| ID | Module | Flow | Actor | Current Status | Action | Expected New Status | Expected DB Change | Expected Notification | Expected Audit Log | Expected UI Change | Allowed Roles | Blocked Roles | Backend Endpoint | Frontend Screen | Existing Tests | Missing Tests | Risk Level | Notes |
|----|--------|------|-------|---------------|--------|--------------------|--------------------|----------------------|-------------------|--------------------|--------------|--------------|-----------------|----------------|---------------|--------------|-----------|-------|
| UP-01 | accounts | Admin creates user | admin | N/A | POST `/api/admin/users/` | — | `CustomUser` row created | — | `create_audit_log` called | New user in list | `admin` (via `CanManageUserRoles`) | `employee`, `customer`, `provider` | `POST /api/admin/users/` (`AdminUserViewSet`) | `AdminUsersRolesPage` | `test_admin_can_create_user` | Missing: duplicate email prevention | Low | |
| UP-02 | accounts | Admin views all users | admin | Any | GET `/api/admin/users/` | — (read) | — | — | — | Users list with roles and permissions | `admin` | others | `GET /api/admin/users/` | `AdminUsersRolesPage` | `test_admin_can_list_users` | — | Low | |
| UP-03 | accounts | Admin updates user role | admin | Any | PATCH `/api/admin/users/{id}/` | — | `CustomUser.role` updated | — | `create_audit_log` | Role badge updated | `admin` | others | `PATCH /api/admin/users/{id}/` | `AdminUsersRolesPage` | `test_admin_can_update_user` | Missing: downgrading admin role self-revoke scenario | Medium | |
| UP-04 | accounts | Admin views available permissions | admin | N/A | GET `/api/admin/available-permissions/` | — (read) | — | — | — | Grouped permission checkboxes rendered | `admin` | others | `GET /api/admin/available-permissions/` (`AvailablePermissionsAPIView`) | `AdminUsersRolesPage` (Permissions tab) | `test_available_permissions_returns_grouped_dict` | Missing: test with no DRF installed | Low | Returns dict grouped by app label |
| UP-05 | accounts | Admin assigns permissions to user | admin | Any | PATCH `/api/admin/users/{id}/permissions/` | — | `user.user_permissions` M2M set | — | `create_audit_log` | Checkboxes pre-checked reflect new state | `admin` | others | `PATCH /api/admin/users/{id}/permissions/` | `AdminUsersRolesPage` (Permissions tab) | `test_patch_user_permissions_sets_direct_permissions` | Missing: test self-permission removal (admin removing own `manage_user_roles`) | `SECURITY_RISK` | Full replace (not merge) — sends complete permission list |
| UP-06 | accounts | Admin clears all permissions | admin | Any | PATCH `{permissions: []}` | — | `user.user_permissions.clear()` | — | `create_audit_log` | All checkboxes unchecked | `admin` | others | `PATCH /api/admin/users/{id}/permissions/` | `AdminUsersRolesPage` | `test_patch_user_permissions_clears_all_when_empty_list` | — | Low | |
| UP-07 | accounts | Admin rejects unknown permission codename | admin | Any | PATCH `{permissions: ["fake.do_thing"]}` | — | No DB change; 400 returned | — | — | Error message shown | `admin` | others | `PATCH /api/admin/users/{id}/permissions/` | `AdminUsersRolesPage` | `test_patch_user_permissions_rejects_unknown_codename` | — | Low | Validated against `_PERMISSION_APPS` whitelist |
| UP-08 | accounts | Non-admin attempts user management | employee | Any | GET `/api/admin/users/` | — | No DB change; 403 returned | — | — | Access denied (redirected by `ProtectedRoute`) | — | `employee`, `customer`, `provider` | `GET /api/admin/users/` | — | `test_available_permissions_requires_admin_role` | — | Low | |

---

## 8. Notification Flows

| ID | Module | Flow | Actor | Trigger | Notification Type | Recipient | Expected Notification | Backend Source | Frontend Consumption | Existing Tests | Missing Tests | Risk Level | Notes |
|----|--------|------|-------|---------|-----------------|-----------|----------------------|----------------|---------------------|----------------|--------------|-----------|-------|
| NF-01 | notifications | Order submitted | System | Order created | `order_submitted` | Customer | "طلبك قيد المعالجة" | `send_notification_event` in order create service | `NotificationsPage` (admin) | — | `TEST_GAP`: notification created in DB | Low | |
| NF-02 | notifications | Order accepted for review | System | Status → `under_review` | `order_under_review` | Customer | "جاري مراجعة طلبك" | `send_notification_event` in `_audit_transition` | `NotificationsPage` | — | `TEST_GAP` | Low | |
| NF-03 | notifications | Missing documents requested | System | `MissingDocumentRequest` created | `missing_documents_requested` | Customer | "مطلوب منك تقديم وثائق" | `send_notification_event` | `CustomerOrderDetailsPage` badge | — | `TEST_GAP` | Medium | Customer must act — high importance |
| NF-04 | notifications | Customer uploads missing docs | System | Customer responds | `client_uploaded_missing_document` | Employee/Admin | "العميل رفع الوثائق المطلوبة" | `send_notification_event` | `EmployeeReviewQueuePage` | — | `TEST_GAP` | Low | |
| NF-05 | notifications | Provider assigned | System | Status → `provider_assigned` | `provider_assigned` | Provider | "تم تعيينك لطلب" | `send_notification_event` | Provider dashboard | — | `TEST_GAP` | Medium | Provider must be notified to begin work |
| NF-06 | notifications | Provider completes work | System | Status → `provider_completed` | `provider_result_returned` | Admin | "المزود أنهى العمل" | `send_notification_event` | `AdminOrderDetailsPage` | — | `TEST_GAP` | Low | |
| NF-07 | notifications | Order ready for delivery | System | Status → `ready_for_delivery` | `order_ready_for_delivery` | Customer | "طلبك جاهز للتسليم" | `send_notification_event` | `CustomerDashboardHome` | — | `TEST_GAP` | Medium | Customer action may be needed |
| NF-08 | notifications | Order completed | System | Status → `completed` | `order_completed` | Customer | "تم إنجاز طلبك" | `send_notification_event` | `CustomerOrderDetailsPage` | — | `TEST_GAP` | Low | |
| NF-09 | notifications | Order cancelled | System | Status → `cancelled` | `order_cancelled` | Customer | "تم إلغاء طلبك" | `send_notification_event` | `CustomerOrderDetailsPage` | — | `TEST_GAP` | Low | |
| NF-10 | notifications | Document rejected | System | Document rejected | `notify_client` (direct) | Customer | Rejection reason shown | `notify_client` in document reject flow | `CustomerOrderDetailsPage` | — | `TEST_GAP` | Medium | Uses direct notify, not event system |
| NF-11 | notifications | Admin reads notifications | admin | Manual | GET `/api/notifications/` | Admin | List of all notifications | `GET /api/notifications/` | `NotificationsPage` | — | `TEST_GAP`: unread count | Low | `NOTIFICATION_GAP`: no unread/read tracking surfaced in UI |
| NF-12 | notifications | Customer reads own notifications | customer | Manual | `MISSING` | Customer | — | `MISSING` | `MISSING` | — | `TEST_GAP` | `SECURITY_RISK` | **MISSING**: No customer-facing notification endpoint; customers have no way to view their notifications in the dashboard |

---

## 9. Audit Log Flows

| ID | Module | Flow | Actor | Trigger | Expected Audit Entry | Logged? | Backend Source | Existing Tests | Missing Tests | Risk Level | Notes |
|----|--------|------|-------|---------|---------------------|---------|----------------|---------------|--------------|-----------|-------|
| AL-01 | audit | Order status transition | Any | Any status change | `action=order_status_changed`, actor, from_status, to_status, order_id | Yes | `_audit_transition` in `orders/services.py` | `test_audit_log_created_on_status_change` | — | Low | |
| AL-02 | audit | Provider assigned | admin | Assignment | `action=order_provider_assigned`, admin actor, provider_id | Yes | `_audit_transition` | — | `TEST_GAP` | Low | |
| AL-03 | audit | User created | admin | User creation | `action=user_created`, admin actor, new user_id | Yes | `AdminUserViewSet.create` | `test_admin_can_create_user` | — | Low | |
| AL-04 | audit | User role changed | admin | Role update | `action=user_role_changed` | Yes | `AdminUserViewSet.update` | `test_admin_can_update_user` | — | Low | |
| AL-05 | audit | Permission set changed | admin | PATCH permissions | `action=user_permissions_changed`, before/after snapshot | Yes | `user_permissions` action view | `test_patch_user_permissions_sets_direct_permissions` | Missing: verify exact audit payload structure | Low | |
| AL-06 | audit | Document uploaded by customer | customer | Upload | `action=document_uploaded` | `AUDIT_GAP` | — | — | `TEST_GAP` | Medium | No `create_audit_log` call in document upload view |
| AL-07 | audit | Document verified/rejected | employee | Verify/Reject action | `action=document_verified` or `document_rejected` | `AUDIT_GAP` | — | — | `TEST_GAP` | Medium | Critical compliance gap — verification decisions must be traceable |
| AL-08 | audit | Document soft deleted | admin | Delete | `action=document_deleted` | `AUDIT_GAP` | — | — | `TEST_GAP` | Medium | |
| AL-09 | audit | Final document uploaded by provider | provider | Upload | `action=final_document_uploaded` | `AUDIT_GAP` | — | — | `TEST_GAP` | Low | |
| AL-10 | audit | Payment recorded | admin | Payment creation | `action=payment_created` | `AUDIT_GAP` | — | — | `TEST_GAP` | Medium | Financial action with no audit trail |
| AL-11 | audit | Service created/edited/deleted | admin | CRUD | `action=service_created/edited/deleted` | `AUDIT_GAP` | — | — | `TEST_GAP` | Low | |
| AL-12 | audit | Admin login | admin | Successful login | `action=user_login` | `AUDIT_GAP` | — | — | `TEST_GAP` | Medium | Login events are high-value for security monitoring |

---

## 10. File Download and Security Flows

| ID | Module | Flow | Actor | Action | Expected Behavior | Security Control | Risk Level | Notes |
|----|--------|------|-------|--------|------------------|-----------------|-----------|-------|
| FS-01 | documents | Generate signed download token | Authenticated user | GET `/api/documents/{id}/download-token/` | Returns short-lived signed URL token (30 min) | `TimestampSigner` HMAC; token expires | Low | Token embeds document_id and timestamp |
| FS-02 | documents | Use signed token to download | Authenticated user | GET `/media/...?token=...` | File served if token valid and not expired | Token signature verified; `max_age=1800` | Low | Token is single-use only if explicitly invalidated (currently not single-use) |
| FS-03 | documents | Expired token rejected | Any | GET with old token | 403 Forbidden | `SignatureExpired` exception caught | Low | |
| FS-04 | documents | Tampered token rejected | Any | GET with modified token | 403 Forbidden | `BadSignature` exception caught | Low | |
| FS-05 | documents | Cross-user document access | Customer A | GET `/api/documents/{id}/` (belongs to Customer B) | 403/404 | `CustomerOrderPermission` checks `order.customer == request.user` | `CRITICAL_SECURITY_RISK` | `TEST_GAP`: cross-customer access not tested in test suite; confirmed by code review but no automated guard |
| FS-06 | documents | File upload extension validation | Customer | POST with `.exe` file | 400 — "This file type is not allowed" | `Document.clean()` dangerous extensions check | Low | Double validation: extension + MIME type |
| FS-07 | documents | File size exceeded | Customer | POST file > `FILE_UPLOAD_MAX_SIZE` | 400 — "File exceeds maximum allowed size" | `Document.clean()` size check | Low | Default 10 MB; configurable via env |
| FS-08 | documents | Stored filename not predictable | Any | Upload file named `../../etc/passwd.pdf` | File stored as `{uuid}.pdf` | `secure_document_upload_path` generates UUID name | Low | `original_filename` preserves display name safely |
| FS-09 | documents | Media served in production | Any (with valid auth) | GET `/media/secure_orders/...` | File served | `django.views.static.serve` via `re_path` regardless of `DEBUG` | Medium | `SECURITY_RISK`: `django.views.static.serve` not suitable for high-traffic production — should use nginx `X-Accel-Redirect` or S3 |
| FS-10 | auth | JWT access token expiry | Any | Request after 8h | Silent refresh attempted via interceptor | Refresh token sent to `/api/auth/token/refresh/`; new access token issued | Low | Queue-based interceptor prevents race condition on multiple simultaneous 401s |
| FS-11 | auth | Logout blacklists refresh token | Any | POST `/api/auth/logout/` | Refresh token added to `TokenBlacklist` | `rest_framework_simplejwt.token_blacklist` | Low | Access token remains valid until expiry (8h) — no server-side access token revocation |
| FS-12 | auth | Session token storage | Any | Login | Tokens stored in `sessionStorage` | Cleared on tab/browser close; not accessible cross-tab | Low | Trade-off: users must log in again in each tab |

---

## 11. Invalid Transition Protection

| ID | Module | Attempted Transition | From Status | To Status (Attempted) | Expected Result | Enforcement Point | Existing Tests | Missing Tests | Risk Level |
|----|--------|---------------------|------------|----------------------|----------------|------------------|---------------|--------------|-----------|
| IT-01 | workflow | Completed → Any | `completed` | Any | 400 Bad Request | `TRANSITION_RULE_MAP` O(1) lookup in `OrderStatusUpdateService` | `test_invalid_status_transition_rejected` | Missing: test each terminal state individually | Low |
| IT-02 | workflow | Cancelled → submitted | `cancelled` | `submitted` | 400 Bad Request (unless admin reopen) | `WORKFLOW_TRANSITIONS` tuple | — | `TEST_GAP` | Low |
| IT-03 | workflow | submitted → completed | `submitted` | `completed` | 400 Bad Request | `TRANSITION_RULE_MAP` | — | `TEST_GAP` | Low |
| IT-04 | workflow | Provider sets status not in allowed set | provider | `completed` | 400 Bad Request | Provider status update view validates against allowed transitions | — | `TEST_GAP` | Low |
| IT-05 | workflow | Employee bypasses to provider_assigned | employee | `provider_assigned` | 400 or 403 | `CanManageOrderWorkflow` + transition map | — | `TEST_GAP` | Medium |

---

## 12. UI Allowed-Action Validation

| ID | Module | UI Element | Condition | Expected Behavior | Enforcement | Risk Level | Notes |
|----|--------|-----------|-----------|------------------|-------------|-----------|-------|
| UA-01 | orders | "تعيين مزود" (Assign Provider) button | `can_assign_provider=True` in `allowed_actions` | Button visible and active | `get_order_allowed_actions` + React conditional render | Low | |
| UA-02 | orders | "رفع المستند النهائي" button (Provider) | `can_upload_final_document=True` | Button visible | Fixed in session: `IsProviderRole` bypass added | Low | **Previously broken — providers always saw button disabled** |
| UA-03 | orders | Status update dropdown | `can_update_status=True` | Dropdown shown with valid transitions | `get_order_allowed_actions` | Low | |
| UA-04 | orders | Customer "Upload Missing Docs" CTA | Order status = `pending_missing_documents` | CTA shown; upload form accessible | Status check in `CustomerOrderDetailsPage` | Low | |
| UA-05 | auth | Protected dashboard routes | User role matches allowed roles | Redirect to `/login` or `/` | `ProtectedRoute` component | Low | |
| UA-06 | auth | Admin permission tab | `selectedUser !== null` | Permissions tab shown only when user selected | Conditional render in `AdminUsersRolesPage` | Low | |
| UA-07 | orders | Employee seeing admin-only actions | Employee role | Admin-only actions (cancel, assign provider) hidden | `can_assign_provider`, `can_cancel` derived from role | `BACKEND_FRONTEND_MISMATCH` | Employee can see order detail via shared endpoint but UI must hide admin controls — not enforced at API level for all actions |
| UA-08 | notifications | Customer notification badge | Customer logged in | `MISSING` — no notification count/list for customer | `MISSING` | Medium | Customer has no notification UI; `NOTIFICATION_GAP` |

---

## 13. API Endpoint Authorization Validation

| ID | Endpoint | Method | Permission Class | Allowed Roles | Blocked Roles | Returns on Block | Existing Tests | Missing Tests | Risk Level | Notes |
|----|---------|--------|----------------|--------------|--------------|-----------------|---------------|--------------|-----------|-------|
| EP-01 | `/api/orders/create/` | POST | `AllowAny` | All | — | — | `test_public_order_create` | — | Low | |
| EP-02 | `/api/customer/orders/` | GET | `IsAuthenticated` | `customer` | others (filtered, not blocked) | Empty list if wrong role | `test_customer_can_list_own_orders` | Missing: cross-role access returns empty (not 403) | Medium | Filtering enforced by selector, not permission class |
| EP-03 | `/api/customer/orders/{id}/` | GET | `CustomerOrderPermission` | `customer` (own orders) | others + other customers | 403/404 | — | `TEST_GAP`: cross-customer access | `CRITICAL_SECURITY_RISK` | Object-level permission check must be tested |
| EP-04 | `/api/admin/orders/` | GET | `CanReviewOrders` | `employee`, `admin` | `customer`, `provider` | 403 | `test_employee_can_list_orders` | Missing: provider returns 403 | Low | |
| EP-05 | `/api/admin/orders/{id}/status/` | PATCH | `CanManageOrderWorkflow` | `admin`, `employee` (subset) | `customer`, `provider` | 403 | `test_order_status_transition_under_review` | Missing: employee cannot do admin-only transitions | Medium | |
| EP-06 | `/api/admin/orders/{id}/assign-provider/` | PATCH | `CanManageOrderWorkflow` | `admin` | `employee`, `customer`, `provider` | 403 | `test_admin_can_assign_provider` | Missing: employee gets 403 | Medium | `BACKEND_FRONTEND_MISMATCH`: `CanManageOrderWorkflow` doesn't distinguish admin vs employee — policy enforced by workflow transitions |
| EP-07 | `/api/provider/orders/{id}/final-document/` | POST | `IsProviderRole` | `provider` | admin, employee, customer | 403 | — | `TEST_GAP`: full test | Low | |
| EP-08 | `/api/admin/orders/{id}/final-document/` | POST | `CanUploadFinalDocuments` | `admin` | others | 403 | — | `TEST_GAP` | Low | |
| EP-09 | `/api/documents/{id}/verify/` | PATCH | `verify_document` Django perm | `employee` (with perm), `admin` | `customer`, `provider`, employee (without perm) | 403 | `test_employee_can_verify_document` | Missing: customer returns 403 | `SECURITY_RISK` | |
| EP-10 | `/api/admin/users/` | GET/POST | `CanManageUserRoles` | `admin` | others | 403 | `test_admin_can_list_users` | — | Low | |
| EP-11 | `/api/admin/users/{id}/permissions/` | GET/PATCH | `CanManageUserRoles` | `admin` | others | 403 | `test_patch_user_permissions_sets_direct_permissions` | — | Low | |
| EP-12 | `/api/admin/available-permissions/` | GET | `CanManageUserRoles` | `admin` | others | 403 | `test_available_permissions_requires_admin_role` | — | Low | |
| EP-13 | `/api/track-order/` | GET | `AllowAny` | All | — | — | — | `TEST_GAP` | Low | Public tracking by `order_number` |
| EP-14 | `/api/payments/` | GET/POST | `IsAdminRole` | `admin` | others | 403 | — | `TEST_GAP` | Medium | |
| EP-15 | `/api/notifications/` | GET | `IsAuthenticated` (filtered?) | `admin` | `customer` (no endpoint) | `MISSING` for customer | — | `TEST_GAP` | `SECURITY_RISK` | Customer notification endpoint missing entirely |
| EP-16 | `/api/auth/token/refresh/` | POST | `AllowAny` | All | — | 401 if refresh invalid/blacklisted | — | `TEST_GAP`: blacklisted token rejected | Low | Added in this session |
| EP-17 | `/api/auth/logout/` | POST | `IsAuthenticated` | All authenticated | Unauthenticated | 401 | — | `TEST_GAP` | Low | |

---

## Summary: Critical Gaps by Priority

### CRITICAL_SECURITY_RISK
1. **EP-03 / DL-06**: No automated test verifying that Customer A cannot access Customer B's documents/orders. Code-review confirms the check exists (`CustomerOrderPermission`), but without a test, a regression could go undetected.

### SECURITY_RISK
2. **PY-03 / NF-12**: Customers have no endpoint to view their payments or notifications — a feature gap, not an exploit, but creates data asymmetry.
3. **DL-02 / EP-09**: No test that `customer` role receives 403 on document verify endpoint.
4. **PA-02 / EP-02**: Provider order list filtered by `assigned_provider=request.user` in selector — no separate test to confirm isolation.
5. **UP-05**: Admin can remove own `manage_user_roles` permission, locking themselves out — no guard or warning.

### AUDIT_GAP (compliance risk)
6. **AL-06**: Customer document upload not logged.
7. **AL-07**: Document verification/rejection not logged — critical for compliance.
8. **AL-08**: Document soft-deletion not logged.
9. **AL-10**: Payment recording not logged.
10. **AL-12**: Login events not logged.

### MISSING Features
11. **PY-03**: Customer payment view endpoint.
12. **NF-12**: Customer notification endpoint.
13. **FS-09**: Production media serving via `django.views.static.serve` — adequate for low-traffic but should be replaced with nginx `X-Accel-Redirect` or object storage (S3/Minio) before scaling.

### BACKEND_FRONTEND_MISMATCH
14. **PA-04**: Provider final upload CTA was always showing disabled — fixed this session.
15. **UA-07**: Employee using shared order detail endpoint can theoretically call admin-only actions if they construct the request manually — workflow transition map is the only guard.
