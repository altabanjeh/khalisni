# PHASE 3 EMPLOYEE WORKFLOW FIXES

## Scope

- Based on:
  - `docs/system_review/EMPLOYEE_ISSUES_REVIEW.md`
  - `docs/fixes/PHASE_1_BACKEND_WORKFLOW_LOCK.md`
  - `docs/fixes/PHASE_2_ORDER_FLOW_SERVICE.md`
- `docs/business_review/EMPLOYEE_SCREEN_REQUIREMENTS.md` was not present in the repository at implementation time.

## Employee Screens / APIs Added Or Fixed

### Backend APIs

- `GET /api/employee/dashboard/`
  - Employee dashboard summary and queue previews.
- `GET /api/employee/reports/summary/`
  - Employee-scoped workflow report totals.
- `GET /api/employee/notification-templates/`
  - Active employee-safe in-app notification templates only.
- `POST /api/orders/<id>/manual-notification/`
  - Now template-based and audit logged.
- `GET /api/admin/orders/`
  - Extended employee queue filters:
    - `search`
    - `status`
    - `service`
    - `date_from`
    - `date_to`
    - `priority`
    - `has_missing_documents`
    - `provider_status`
    - `assigned_employee` (`me`, `unassigned`, or explicit id)
- `GET /api/staff/documents/`
  - Now defaults to actionable documents only (`uploaded`, `pending_review`) and returns staff review metadata.

### Frontend Employee Screens

- `/employee`
  - Rebuilt dashboard against the new employee dashboard API.
- `/employee/orders`
  - Added real backend filters for review queue work.
- `/employee/orders/:id`
  - Expanded review detail with:
    - client basics
    - service document checklist
    - uploaded documents
    - missing document list
    - internal/customer/provider note history
    - workflow timeline
    - safe action sections only
    - provider assignment
    - provider result review
    - template-based manual notifications
- `/employee/documents/verify`
  - Now shows order context and verification history metadata.
- `/employee/reports`
  - Added simple employee workflow report page.

## Employee Actions Now Supported

- View employee dashboard queues for:
  - waiting review
  - client resubmissions
  - waiting internal verification
  - provider-returned results
  - near-deadline work
  - delayed work
  - assigned workload
- Filter the review queue by workflow and assignment state.
- Review order details with required documents, uploaded documents, and history in one page.
- Request one or more missing documents with a required note.
- Verify or reject documents from a staff-only queue with history metadata.
- See eligible providers for an order and assign when backend workflow allows it.
- Review provider final results, return to provider with a reason, or complete through the safe completion endpoint.
- Send manual customer notifications only from approved in-app templates.
- View employee-scoped workflow report totals.

## Permissions Enforced

- Employees still cannot access admin settings:
  - `GET /api/admin/system-settings/` remains forbidden.
- Manual notifications are no longer arbitrary free text for employees.
  - Employees can only select active system-channel templates.
- Manual notifications are audit logged.
- Document verification queue is limited by reviewable-order scope and defaults to actionable documents only.
- Employee UI buttons now align with backend `allowed_actions` and workflow status targets.
- Completion still goes through the dedicated completion endpoint, not raw status mutation.

## Files Changed

### Backend

- `backend/orders/views.py`
- `backend/orders/serializers.py`
- `backend/orders/allowed_actions.py`
- `backend/documents/serializers.py`
- `backend/documents/views.py`
- `backend/notifications/services.py`
- `backend/notifications/views.py`
- `backend/notifications/urls.py`
- `backend/reports/views.py`
- `backend/reports/urls.py`
- `backend/orders/tests.py`
- `backend/documents/tests.py`
- `backend/notifications/tests.py`
- `backend/reports/tests.py`

### Frontend

- `frontend/src/api/ordersApi.js`
- `frontend/src/api/notificationsApi.js`
- `frontend/src/api/services.js`
- `frontend/src/routes/AppRoutes.jsx`
- `frontend/src/pages/employee/EmployeeDashboardHome.jsx`
- `frontend/src/pages/employee/EmployeeReviewQueuePage.jsx`
- `frontend/src/pages/employee/EmployeeOrderReviewPage.jsx`
- `frontend/src/pages/employee/EmployeeVerifyDocumentsPage.jsx`
- `frontend/src/pages/employee/EmployeeReportsPage.jsx`
- `frontend/src/pages/employee/EmployeeReportsPage.test.jsx`

## Tests Added / Covered

### Backend

- `reports.tests.ReportsPermissionTests.test_employee_cannot_access_admin_system_settings`
- `reports.tests.ReportsPermissionTests.test_employee_dashboard_returns_scoped_work_queues`
- `reports.tests.ReportsPermissionTests.test_employee_summary_report_returns_actor_scoped_metrics`
- `orders.tests.OrderAPITests.test_employee_review_queue_supports_safe_filters`
- `orders.tests.OrderAPITests.test_employee_sees_only_allowed_actions_for_current_status`
- `orders.tests.OrderAPITests.test_employee_cannot_complete_invalid_transition`
- `documents.tests.DocumentStaffVerificationTests.test_staff_document_queue_defaults_to_pending_documents_and_includes_history_fields`
- `notifications.tests.NotificationCenterTests.test_employee_can_send_manual_template_notification_for_reviewable_order`

### Frontend

- `frontend/src/pages/employee/EmployeeReportsPage.test.jsx`

## Commands Run

- `..\.venv\Scripts\python.exe manage.py check`
  - Passed
- `..\.venv\Scripts\python.exe manage.py test`
  - Passed, `56` tests
- `npm test -- --run`
  - Passed, `9` files / `10` tests

## Employee Actions Still Missing

- No dedicated employee provider re-assignment flow with mandatory reason.
  - Current workflow still supports assignment, not a separate reassignment service.
- No employee payment follow-up screen.
- No employee-specific provider detail page outside the order review flow.
- No export/download action for employee reports.

## Remaining Decisions

- Whether employees should be allowed to cancel orders from review states remains an inherited workflow rule from earlier phases.
- Whether provider reassignment should be allowed after initial assignment needs an explicit business rule and workflow path.
- Whether manual notifications need a required internal note in addition to the chosen template is still a product decision.
