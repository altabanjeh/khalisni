# PHASE 5 AUDIT NOTIFICATION REPORTING

## Notification Event Map

### Central event registry

- Added `backend/notifications/event_map.py` as the single notification event map.
- Each event now defines:
  - trigger source
  - recipient role target
  - supported channel set
  - template key
  - required variables
  - audit action
  - safe fallback text

### Implemented events

- `order_submitted`
- `order_under_review`
- `missing_documents_requested`
- `client_uploaded_missing_document`
- `document_rejected`
- `document_verified`
- `provider_assigned`
- `provider_started_work`
- `provider_completed_work`
- `provider_result_returned`
- `order_ready_for_delivery`
- `order_completed`
- `order_cancelled`
- `order_reopened`
- `payment_status_changed`

### Notification safety hardening

- Added a single service-layer dispatcher in `backend/notifications/services.py`.
- Workflow services now call `send_notification_event(...)` instead of sending notifications from multiple scattered locations.
- Duplicate sends are blocked by a per-event `dedupe_key` stored on the notification context.
- If email, SMS, or WhatsApp is not configured, the system still stores a notification row and marks it as a stored record instead of failing silently.
- Template rendering now validates placeholders against an allowlist and fails safely on unsupported or missing variables.
- Provider assignment fallback wording remains role-aware:
  - customer sees `Order assigned`
  - provider sees `New assigned order`

## Audit Coverage Matrix

### Workflow and document actions

- Status transition: audited through order workflow services.
- Missing document request: audited through `request_documents`.
- Customer upload of requested document: audited through `customer_upload_document`.
- Document verification: audited through `verify_document`.
- Document rejection: audited through `reject_document`.
- Final document upload: audited through `upload_final_document` or `provider_upload_final_document`.
- Cancellation and reopen: audited through `cancel_order` and `reopen_order`.
- Provider assignment and reassignment history: audited through `assign_provider` and existing assignment history records.

### Admin and rule actions already covered

- Service price change: existing admin service update audit remains in place.
- Required document rule change: existing service document admin APIs remain audited.
- Notification template change: existing admin template create, update, and disable actions remain audited.
- Payment status change: audited through `payment_status_update`.
- User role and activation change: existing accounts admin APIs remain audited.
- Safe system setting change: existing system setting admin APIs remain audited.

### Audit safety

- `backend/audit/utils.py` now serializes decimals and datetimes into JSON-safe audit payloads.
- Audit logs remain read-only for normal admin users.

## Reports Added Or Fixed

### Existing dashboards kept

- Admin dashboard remains at `/api/admin/dashboard/`.
- Employee dashboard remains at `/api/employee/dashboard/`.
- Employee summary report remains at `/api/employee/reports/summary/`.

### New scoped operational summary

- Added `/api/reports/summary/` in `backend/reports/views.py`.
- Scope rules:
  - admin sees all orders
  - employee and support see their reviewable operational scope
  - provider sees only assigned work
  - client sees only own orders

### Report sections returned

- order status summary
- employee workload
- provider performance
- missing document frequency
- delayed orders
- completed orders
- service volume
- payment summary

## Consistency Checks

### Command added

- Added `python manage.py check_system_consistency`

### Checks performed

- invalid order status values
- completed orders without final document
- orders assigned to inactive provider
- orders that still have pending missing documents but moved forward
- forward-stage orders missing approved required documents
- provider-required orders without assigned provider
- inconsistent payment status metadata

### Command behavior

- Read-only only.
- Reports issues to stdout.
- Does not auto-correct data.

### Current local result

- After applying the pending migration `services.0004_servicerequireddocument_rule_flags`, the command runs successfully.
- Current workspace database result:
  - `required_documents_missing`: 2 issues
  - all other checks: 0 issues

## Tests Added

### Notifications and workflow

- `orders.tests.OrderAPITests.test_public_order_submission_creates_notification_record`
- `notifications.tests.NotificationCenterTests.test_notification_event_dedupes_same_workflow_action`
- `orders.tests.OrderAPITests.test_status_change_creates_audit_log`

### Reports and permissions

- `reports.tests.ReportsPermissionTests.test_scoped_summary_report_requires_authentication`
- `reports.tests.ReportsPermissionTests.test_customer_summary_report_is_limited_to_own_orders`
- `reports.tests.ReportsPermissionTests.test_provider_summary_report_is_limited_to_assigned_work`
- `reports.tests.ReportsPermissionTests.test_admin_summary_report_sees_global_operational_totals`

### Consistency command

- `core.tests.SystemConsistencyCommandTests.test_consistency_check_reports_invalid_operational_rows`

## Remaining Risks

- Notification delivery is still record-first and provider-agnostic. If real email, SMS, or WhatsApp providers are added later, retry and provider callback handling still need a dedicated delivery worker.
- The event map is now centralized, but any new workflow action must be added to the map explicitly or it will remain silent.
- The consistency command reports current data drift but does not yet produce machine-readable output such as JSON or CSV for scheduled monitoring.
- The current database still contains two orders missing approved required documents. Those need operational review before production reporting can be considered fully clean.
