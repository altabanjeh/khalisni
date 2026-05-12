# EMPLOYEE ISSUES REVIEW

## Employee Responsibilities

- Review new orders and claim ownership.
  Ref: `backend/orders/services.py:167-190`, explicit.
- Request missing customer documents and move orders to `WAITING_CUSTOMER`.
  Ref: `backend/orders/services.py:249-279`, explicit.
- Assign eligible providers after document approval.
  Ref: `backend/orders/services.py:193-239`, explicit.
- Verify uploaded documents.
  Ref: `backend/documents/views.py:63-84`, `backend/documents/services.py:54-78`, explicit.
- Reject or cancel review-stage orders.
  Ref: `backend/workflow/transition_permissions.py:14-18`, `65-86`, explicit.
- Access limited reports in the backend.
  Ref: `backend/accounts/role_groups.py:41-45`, `backend/reports/views.py:42-55`, `71-79`, `110-118`, explicit.

## Employee Current Permissions

- `orders.view_order`
- `orders.review_order`
- `orders.request_missing_documents`
- `orders.cancel_order`
- `orders.reject_order`
- `orders.assign_order`
- `orders.manage_order_workflow`
- `orders.view_reports_dashboard`
- `documents.view_document`
- `documents.verify_document`
- `notifications.view_notification`
- `notifications.send_manual_notification`

Source: `backend/accounts/role_groups.py:33-46`, explicit.

## Employee Current Screens

- `/employee`
  Dashboard home
  Ref: `frontend/src/routes/AppRoutes.jsx:111-117`, explicit.
- `/employee/orders`
  Review queue
  Ref: `frontend/src/routes/AppRoutes.jsx:113-115`, explicit.
- `/employee/orders/:id`
  Order review detail
  Ref: `frontend/src/routes/AppRoutes.jsx:115`, `frontend/src/pages/employee/EmployeeOrderReviewPage.jsx:16-286`, explicit.
- `/employee/documents/verify`
  Document verification queue
  Ref: `frontend/src/routes/AppRoutes.jsx:116`, `frontend/src/pages/employee/EmployeeVerifyDocumentsPage.jsx:23-163`, explicit.

## Employee Missing Screens

- No employee reports route, even though the backend gives employees report permission.
  Ref: `backend/accounts/role_groups.py:41`, `frontend/src/routes/AppRoutes.jsx:111-117`, explicit.
- No employee manual-notification screen, even though the backend gives employees notification-send permission.
  Ref: `backend/accounts/role_groups.py:45`, `backend/notifications/views.py:45-61`, `frontend/src/routes/AppRoutes.jsx:111-117`, explicit.
- No employee payment screen, despite payment/order follow-up likely affecting operations.
  Ref: `backend/payment/views.py:49-93`, inferred from missing frontend route.
- No employee provider detail/approval screen.
  Ref: `backend/providers/views.py:19-55`, `frontend/src/routes/AppRoutes.jsx:111-117`, explicit.
- No employee note history screen; employee can add notes but the employee page does not render the order notes list.
  Ref: `frontend/src/pages/employee/EmployeeOrderReviewPage.jsx:143-276`, explicit.

## Employee Allowed Actions

- Start review from `NEW`.
  Ref: `frontend/src/pages/employee/EmployeeOrderReviewPage.jsx:41-50`, explicit.
- Request missing documents.
  Ref: `frontend/src/pages/employee/EmployeeOrderReviewPage.jsx:63-78`, explicit.
- Assign provider.
  Ref: `frontend/src/pages/employee/EmployeeOrderReviewPage.jsx:52-61`, `223-252`, explicit.
- Add internal note.
  Ref: `frontend/src/pages/employee/EmployeeOrderReviewPage.jsx:80-88`, `255-269`, explicit.
- Reject order when backend exposes `can_reject`.
  Ref: `frontend/src/pages/employee/EmployeeOrderReviewPage.jsx:90-98`, `272-277`, explicit.
- Verify documents.
  Ref: `frontend/src/pages/employee/EmployeeVerifyDocumentsPage.jsx:50-64`, explicit.

## Employee Blocked Actions

- No service/category/price management.
  Ref: `backend/services/views.py:46-83`, explicit.
- No user/role management.
  Ref: `backend/accounts/views.py:102-118`, explicit.
- No system-setting management.
  Ref: `backend/accounts/views.py:109-113`, explicit.
- No provider create/update/delete.
  Ref: `backend/providers/views.py:50-55`, explicit.
- No audit-log access.
  Ref: `backend/audit/views.py:11-15`, explicit.

## Employee Unclear Workflow Points

- Employee status power is broader than the employee UI wording suggests. Because employees hold `orders.manage_order_workflow`, the backend may return transitions such as `COMPLETED`, and the employee page will render them in the generic status dropdown.
  Ref: `backend/accounts/role_groups.py:40`, `backend/orders/allowed_actions.py:33-46`, `frontend/src/pages/employee/EmployeeOrderReviewPage.jsx:39-42`, explicit.
- The employee page says review starts automatically on first action, but the actual backend assignment/request-doc calls also depend on transition validity and ownership rules.
  Ref: `frontend/src/pages/employee/EmployeeOrderReviewPage.jsx:43-78`, `backend/workflow/transition_permissions.py:42-62`, explicit.
- Employees can access report APIs but have no navigation or page for them, so the effective role behavior is inconsistent between API and UI.
  Ref: `backend/reports/views.py:13-119`, `frontend/src/routes/AppRoutes.jsx:111-117`, explicit.

## Employee Risks

- Employees can complete or otherwise advance workflow through the generic status API without the stronger validations enforced by dedicated service functions.
  Ref: `backend/orders/views.py:256-273`, `backend/orders/services.py:144-151`, `307-343`, `346-373`, explicit.
- Employees can see broad customer/order data for reviewable orders, including fields that may exceed operational need.
  Ref: `backend/orders/serializers.py:105-145`, `backend/orders/selectors.py:6-44`, explicit.
- Employees can verify or reject documents without an audit entry for the verification decision itself.
  Ref: `backend/documents/services.py:54-78`, `backend/audit/utils.py:4-21`, explicit.
- Employees can see notifications tied to reviewable orders even when they are not the direct recipient.
  Ref: `backend/notifications/selectors.py:25-27`, explicit.
- The document verification queue is not limited to `pending_review`; employees can revisit already-approved or rejected documents.
  Ref: `backend/documents/views.py:45-60`, `backend/documents/services.py:54-78`, explicit.

## Recommended Employee Dashboard / Actions

- `My Assigned Orders`
  Filter by `assigned_employee=self`.
- `Unassigned New Orders`
  Separate queue so ownership is explicit.
- `Waiting Customer Replies`
  Show orders in `WAITING_CUSTOMER` with the exact missing document list.
- `Ready For Provider Assignment`
  Show only review-stage orders with all required docs approved.
- `Document Verification Queue`
  Default filter should be `status in uploaded,pending_review`.
- `Manual Customer Notification`
  Use simple templates plus a required reason/note.
- `Safe Completion Action`
  Dedicated button that calls only the strong completion endpoint, never the generic status patch.
