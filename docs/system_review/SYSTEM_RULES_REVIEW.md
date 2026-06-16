# SYSTEM RULES REVIEW

## Executive Summary

This repository is a split Django + React service-order system. The backend contains explicit business rules for roles, workflow transitions, document validation, provider assignment, notifications, reports, and payments. The frontend mainly consumes those backend rules through `allowed_actions`, route guards, and role-based dashboards.

The most important finding is that the codebase has two rule layers:

1. A strong canonical workflow layer in `backend/workflow/*` and `backend/orders/services.py`.
2. Several direct-write admin APIs that bypass part of that layer.

The largest production risks are:

- `AdminOrderRecordViewSet` allows direct order CRUD and can bypass workflow services, notifications, assignment checks, and status logging. (Ref: `backend/orders/views.py:203-225`, `backend/orders/serializers.py:98-103`, explicit)
- Internal users can use the generic `/admin/orders/<id>/status/` endpoint to move orders to `READY_FOR_DELIVERY` or `COMPLETED` without the final-document checks enforced by the dedicated completion/upload services. (Ref: `backend/orders/views.py:256-273`, `backend/orders/services.py:144-151`, `307-343`, `346-373`, explicit)
- Customer missing-document upload clears the entire `missing_document_types` list and reopens review after the first uploaded file, even if multiple missing documents were requested. (Ref: `backend/orders/services.py:93-127`, explicit)
- Provider order detail APIs expose more metadata than the provider download policy allows, including customer PII, all document filenames/types, and all notes in the serialized payload. (Ref: `backend/orders/serializers.py:105-145`, `backend/documents/services.py:81-110`, explicit)

## Current Detected Roles

- `customer`
  Source: `backend/core/choices.py:4-9`, explicit.
- `admin`
  Source: `backend/core/choices.py:4-9`, explicit.
- `employee`
  Source: `backend/core/choices.py:4-9`, explicit.
- `provider`
  Source: `backend/core/choices.py:4-9`, explicit.
- `support`
  Source: `backend/core/choices.py:4-9`, explicit.
- `super admin`
  There is no separate business role. Super-admin behavior is the Django `is_superuser` flag, and `create_superuser()` forces `role="admin"`. Frontend routes do not distinguish this role.
  Source: `backend/accounts/models.py:26-39`, `60-65`, explicit.

## Current Detected Modules

- Accounts, roles, groups, system settings
  `backend/accounts/*`
- Services, categories, required documents, service-provider assignments
  `backend/services/*`
- Orders, ratings, order notes, assignment history, issues
  `backend/orders/*`
- Workflow rules and transition permissions
  `backend/workflow/*`
- Documents and document verification/download
  `backend/documents/*`
- Providers and provider execution dashboard
  `backend/providers/*`
- Notifications and notification templates
  `backend/notifications/*`
- Reports/dashboard analytics
  `backend/reports/*`
- Payments
  `backend/payment/*`
- Audit logs
  `backend/audit/*`
- Frontend routes, guards, API clients, dashboards
  `frontend/src/*`

## Current Order Workflow

### Status list

- `NEW`
- `UNDER_REVIEW`
- `WAITING_CUSTOMER`
- `ASSIGNED`
- `IN_PROGRESS`
- `WAITING_GOVERNMENT`
- `READY_FOR_DELIVERY`
- `COMPLETED`
- `REJECTED`
- `CANCELLED`
- `ARCHIVED`

Source: `backend/core/choices.py:12-23`, explicit.

### Canonical transition map

The canonical transition map is defined in `backend/workflow/rules.py:4-50` and role ownership is defined in `backend/workflow/transition_permissions.py:9-35`.

### Important workflow-side effects

- Assigning a provider requires approved required documents, provider availability, provider approval, and a service/category linkage.
  Source: `backend/orders/services.py:193-239`, `backend/orders/models.py:366-428`, explicit.
- Requesting missing documents stores `missing_document_types`, creates a customer-visible note, and notifies the customer.
  Source: `backend/orders/services.py:249-279`, explicit.
- Customer document upload on a `WAITING_CUSTOMER` order clears `missing_document_types` and moves the order back to `UNDER_REVIEW`.
  Source: `backend/orders/services.py:110-118`, explicit.
- Provider status changes are limited to `IN_PROGRESS` and `WAITING_GOVERNMENT`.
  Source: `backend/orders/services.py:426-440`, explicit.
- Final-document upload moves the order to `READY_FOR_DELIVERY`.
  Source: `backend/orders/services.py:307-343`, explicit.
- Completing an order through the dedicated service requires either a final document or `admin_confirmation=True`.
  Source: `backend/orders/services.py:346-373`, explicit.
- Rejecting a final document sends the order back to `IN_PROGRESS` if a provider exists, otherwise `UNDER_REVIEW`.
  Source: `backend/documents/services.py:54-78`, explicit.

### Workflow gaps and bypasses

- The generic status-update service does not enforce final-document requirements for `READY_FOR_DELIVERY` or `COMPLETED`.
  Source: `backend/orders/services.py:144-151`, explicit.
- `AdminOrderRecordViewSet` can update `Order` rows directly through `OrderAdminSerializer(fields="__all__")`, bypassing workflow services entirely.
  Source: `backend/orders/views.py:203-225`, `backend/orders/serializers.py:98-103`, explicit.

## Role-by-Role Rule Explanation

### Client / Customer

- Authenticated customers can create orders through `/api/orders/`.
  Source: `backend/orders/views.py:56-72`, `backend/orders/serializers.py:147-267`, explicit.
- Public order creation only accepts active services and blocks non-online services.
  Source: `backend/orders/serializers.py:148`, `188-191`, explicit.
- Public order creation enforces required service documents, per-document allowed extensions, and per-document max file size.
  Source: `backend/orders/serializers.py:193-256`, explicit.
- Authenticated customers can list and view only their own orders.
  Source: `backend/orders/views.py:96-109`, `backend/orders/selectors.py:31-32`, explicit.
- Customers can cancel only their own `NEW` orders.
  Source: `backend/workflow/transition_permissions.py:65-73`, explicit.
- Customers can upload documents to their own non-final orders.
  Source: `backend/orders/views.py:112-139`, `backend/orders/services.py:93-127`, explicit.
- Customers can rate only completed orders, once.
  Source: `backend/orders/services.py:130-141`, `backend/orders/models.py:703-719`, explicit.
- Customers can access public tracking and final-document download with only `order_number + phone`.
  Source: `backend/orders/views.py:80-93`, `backend/documents/views.py:36-42`, explicit.

### Employee

- Employees and support users inherit the same group and permission set.
  Source: `backend/accounts/role_groups.py:7-13`, `19-55`, explicit.
- Employees can view reviewable orders plus orders assigned to them or previously assigned to them.
  Source: `backend/orders/selectors.py:6-44`, explicit.
- Employees can review orders, request missing documents, cancel review-stage orders, reject orders, assign providers, verify documents, see notification center items tied to their work, and access report APIs.
  Source: `backend/accounts/role_groups.py:33-46`, explicit.
- Employees can update workflow status through `/api/admin/orders/<id>/status/` because they have `orders.manage_order_workflow`.
  Source: `backend/config/permissions.py:135-136`, `backend/orders/views.py:256-273`, explicit.
- Employees do not have service-management, user-management, system-setting, or provider-CRUD permissions.
  Source: `backend/services/views.py:46-83`, `backend/accounts/views.py:102-118`, `backend/providers/views.py:50-55`, explicit.

### Provider

- Providers can only list and retrieve orders assigned to their own `ProviderProfile`.
  Source: `backend/providers/views.py:58-63`, `90-103`, explicit.
- Providers can move assigned orders to `IN_PROGRESS` and `WAITING_GOVERNMENT`.
  Source: `backend/orders/services.py:426-440`, explicit.
- Providers can upload a final document on assigned orders, which moves the order to `READY_FOR_DELIVERY`.
  Source: `backend/providers/views.py:138-166`, `backend/orders/services.py:456-471`, explicit.
- Providers can add internal notes.
  Source: `backend/providers/views.py:124-135`, `backend/orders/services.py:474-485`, explicit.
- Providers may download final outputs and service-required customer documents only.
  Source: `backend/documents/services.py:100-108`, explicit.

### Admin

- Admins receive every permission in every app except `contenttypes` and `sessions`.
  Source: `backend/accounts/role_groups.py:70-71`, explicit.
- Admins can manage users, system settings, services, categories, required documents, service-provider assignments, providers, notifications, notification templates, payments, reports, audit logs, documents, and orders.
  Source: `backend/accounts/views.py:102-118`, `backend/services/views.py:46-83`, `backend/providers/views.py:19-55`, `backend/notifications/views.py:17-67`, `backend/payment/views.py:49-93`, `backend/reports/views.py:13-119`, `backend/audit/views.py:11-15`, `backend/documents/views.py:87-91`, `backend/orders/views.py:179-419`, explicit.
- Admins can also use Django admin if `is_staff=True`.
  Source: `backend/accounts/models.py:78-81`, explicit.

### Super Admin

- There is no separate API or frontend capability layer for super admin.
- `is_superuser` is only surfaced in Django admin and in `create_superuser()`.
  Source: `backend/accounts/models.py:26-39`, `backend/accounts/admin.py:18`, explicit.
- The custom admin user API does not expose `is_superuser`, so superuser creation/escalation is not supported in the React admin UI.
  Source: `backend/accounts/serializers.py:77-109`, explicit.

## Employee Issue Section

See the focused document: `docs/system_review/EMPLOYEE_ISSUES_REVIEW.md`.

The short version:

- Employees have more backend power than the frontend communicates.
- Employees can access report APIs but have no report route in the UI.
- Employees can complete risky transitions through the generic status dropdown when the backend returns them.
- Employees can see wide order/customer/document data, and some of that is likely broader than necessary.

## Admin Rule Management Section

### Editable by admin now

- Users and roles
  `backend/accounts/views.py:102-118`, frontend UI in `frontend/src/pages/admin/AdminCmsPage.jsx:696-750`
- Generic system settings
  `backend/accounts/views.py:109-113`, frontend UI in `frontend/src/pages/admin/AdminCmsPage.jsx:511-551`
- Service categories and services
  `backend/services/views.py:46-83`, frontend UI in `frontend/src/pages/admin/AdminCmsPage.jsx:554-694`
- Provider records
  `backend/providers/views.py:19-55`, but frontend UI is read-only list only
  `frontend/src/pages/admin/ProvidersManagementPage.jsx:6-20`
- Notification records and templates
  `backend/notifications/views.py:17-67`
- Payments
  `backend/payment/views.py:49-93`

### Hardcoded today

- Canonical workflow transitions
  `backend/workflow/rules.py:4-50`
- Transition role map
  `backend/workflow/transition_permissions.py:9-35`
- Employee reviewable statuses
  `backend/orders/selectors.py:6-12`
- Upload extensions, MIME types, and max file size
  `backend/config/settings.py:175-192`
- Default passwords for admin-created users/providers
  `backend/accounts/serializers.py:98-100`, `backend/providers/serializers.py:56-59`
- Notification runtime always uses the `system` channel and does not render templates
  `backend/notifications/utils.py:6-18`, `backend/notifications/models.py:95-108`, explicit

## Missing Rules

- No distinct super-admin approval path exists for high-risk admin actions such as creating admins, changing `is_staff`, deleting orders, or deleting documents.
- No backend rule requires all requested missing documents to be uploaded before reopening review.
- No backend rule restricts post-submission customer uploads to service-required document types.
- No backend rule prevents re-verifying already approved/rejected documents.
- No backend rule ties payment status to any order workflow transition.
- No backend rule uses notification templates at send time, even though templates exist as a model.
- No backend rule audits service/category/system-setting/provider/user CRUD through the custom APIs.

## Risky Rules

- Predictable default passwords: `ChangeMe@123` for admin-created users and `Provider@123` for provider creation.
  Source: `backend/accounts/serializers.py:98-100`, `backend/providers/serializers.py:56-59`, explicit.
- Direct order deletion is available to admins through `/api/admin/order-records/`.
  Source: `backend/orders/views.py:203-225`, supported by `backend/orders/tests.py:366-390`, explicit.
- Direct document deletion is available to admins through `/api/admin/documents/`, and it uses hard delete instead of the `soft_delete()` helper.
  Source: `backend/documents/views.py:87-91`, `backend/documents/models.py:370-381`, explicit.
- Provider approval exists in the model but is not exposed in the provider admin serializer or frontend provider page.
  Source: `backend/providers/models.py:29-38`, `backend/providers/serializers.py:31-84`, `frontend/src/pages/admin/ProvidersManagementPage.jsx:6-20`, explicit.
- Admin user management can create provider-role users without creating `ProviderProfile`, which leaves unassignable provider accounts.
  Source: `backend/accounts/serializers.py:77-109`, `frontend/src/pages/admin/AdminCmsPage.jsx:717-733`, explicit.

## Recommended Admin Screens

- User and Role Management
  Controls: role dropdown, active toggle, verified toggle, Django-admin toggle, warning banner for admin creation, audit trail.
- Provider Approval and Readiness
  Controls: approval toggle, available toggle, service/category multi-select, warning if profile is incomplete, assignment eligibility preview.
- Service Catalog and Pricing
  Controls: category dropdown, active toggle, online toggle, provider-required toggle, review-required toggle, numeric price inputs with inline total preview.
- Required Documents Builder
  Controls: ordered multi-row grid with document type, required toggle, allowed-extension multi-select, max-size input.
- Workflow Policy
  Controls: read-mostly matrix for statuses and role transitions; super-admin-only edit if ever enabled.
- Notification Templates
  Controls: template key dropdown, channel dropdown, active toggle, title editor, message editor, placeholder help.
- System Settings Registry
  Controls: predefined key dropdown, typed inputs per key, warning for raw JSON, audit diff view.
- Payment Operations
  Controls: status dropdown, refund toggle, notes field, read-only gateway fields.

## Recommended Fixes By Priority

### P0 Critical

- Remove or super-admin-lock direct order CRUD and order deletion, or re-route it through workflow services only.
- Block generic status transitions to `READY_FOR_DELIVERY` and `COMPLETED` unless the same validations as the dedicated services pass.
- Require all requested missing documents before clearing `missing_document_types` and reopening review.
- Reduce provider API exposure to the minimum required order/document fields.

### P1 High

- Add a real provider approval workflow to admin API + UI.
- Remove predictable default passwords and force explicit password set or invitation flow.
- Audit all custom admin CRUD for users, services, providers, templates, settings, documents, and payments.
- Use notification templates and channel selection in runtime send logic.

### P2 Medium

- Add frontend pages for employee reports, manual notifications, payments, and provider detail/approval.
- Restrict customer post-submission uploads to allowed service document types.
- Add clear read-only explanations to the admin UI for hardcoded workflow rules.

## Validation

Validation commands were run after the documentation files were created. Results are recorded below.

- `python manage.py check`
  Ran from `backend/` with `..\.venv\Scripts\python.exe manage.py check`.
  Result: `System check identified no issues (0 silenced).`
- `python manage.py test`
  Ran from `backend/` with `..\.venv\Scripts\python.exe manage.py test`.
  Result: `37` tests found and passed.
  Summary: `Ran 37 tests in 38.463s` and `OK`.
- `npm test -- --run`
  Ran from `frontend/`.
  Result: `8` test files passed and `9` tests passed.
- Lint/check scripts
  `frontend/package.json` defines `dev`, `build`, `preview`, `test`, and `test:watch` only. No lint script is configured.
  No backend lint config/script was detected in the backend root (`pyproject.toml`, `setup.cfg`, `tox.ini`, `.flake8`, `ruff.toml` not found).
- JSON validation
  `docs/system_review/system_rules_extracted.json` and `docs/system_review/scanner_output.json` were parsed successfully with Python `json.load()`.
