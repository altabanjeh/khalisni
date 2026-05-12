# PHASE 4 ADMIN RULE MANAGEMENT

## Admin Screens Added Or Fixed

### New admin rule workspace

- Added a dedicated safe rule-management screen at:
  - `frontend/src/pages/admin/AdminRuleManagementPage.jsx`
  - route: `/admin/rules`
  - compatibility route: `/admin/cms`
- The screen groups rule management into non-technical modules:
  - services and pricing
  - required documents
  - provider assignment rules
  - provider approval
  - workflow rules review
  - notification templates
  - payment status management
  - user and role management
  - audit log viewer
  - system settings

### Backend rule-management APIs hardened or extended

- Service rules remain under:
  - `/api/admin/services/`
  - `/api/admin/categories/`
  - `/api/admin/service-documents/`
  - `/api/admin/service-provider-assignments/`
- Provider approval and activation actions added:
  - `/api/admin/providers/<id>/approval/`
  - `/api/admin/providers/<id>/activation/`
- Workflow rule review remains read-only and now returns simpler summaries:
  - `/api/admin/workflow-rules/`
- Notification template management extended with safe preview:
  - `/api/admin/notification-templates/`
  - `/api/admin/notification-templates/preview/`
- Payment status management remains safe-action only:
  - `/api/admin/payments/`
  - `/api/admin/payments/<id>/status/`
- Audit log viewer remains read-only:
  - `/api/admin/audit-logs/`
- Safe system settings remain whitelisted:
  - `/api/admin/system-settings/`

## Admin Editable Rules

### Services management

- Admin can safely edit:
  - Arabic and English names
  - category
  - active or inactive state
  - base price
  - government fee
  - extra service fee
  - estimated duration and unit
  - provider required toggle
  - employee review required toggle
  - service descriptions
- Service deletion remains soft-disable only.

### Required documents

- Admin can safely edit:
  - document names
  - required or optional state
  - service mapping
  - allowed file types from a safe allowlist
  - maximum file size within the global safety limit
  - verification required toggle
  - client replace toggle
  - provider visibility toggle
- Raw document rows and uploaded files are still not editable from the rule screen.

### Provider assignment rules

- Admin can:
  - link providers to services
  - activate or deactivate service-provider links
- Order reassignment itself remains in the order workflow and still requires a reason.

### Provider approval

- Admin can:
  - view providers and their capability summaries
  - approve providers
  - reject providers with a required reason
  - activate or deactivate provider access with a required reason when disabling

### Workflow rules review

- Admin can review:
  - plain workflow summaries
  - who can do each action
  - whether a reason is required
  - whether a notification is triggered
- Direct dangerous workflow editing remains blocked.

### Notification templates

- Admin can:
  - edit safe text-only notification templates
  - preview rendered output using safe placeholders
  - activate or deactivate templates
- Unsafe HTML and unsupported placeholders are rejected.

### Price rules

- Admin can edit:
  - base price
  - government fee
  - extra service fee
- Price changes are audited.
- Price history is available through the audit log viewer.

### Payment status management

- Admin can:
  - view payment status
  - update payment status only through the dedicated safe action
  - add reference number
  - add notes or failure reason
- Raw payment rows are not directly editable.

### User and role management

- Admin can:
  - view users
  - activate or deactivate users
  - create and update normal business roles
- Normal admin cannot:
  - create admin users
  - change admin-level users
  - change super admin users
  - edit raw permission internals

### Audit log viewer

- Admin can:
  - view audit logs
  - filter by user, module, action, result, and date range
- Audit logs remain read-only.

### System settings

- Admin can edit only whitelisted safe settings.
- The serializer now exposes:
  - friendly label
  - help text
  - warning text
  - safe field definitions
- Raw JSON is still hidden from the admin UI.

## Super Admin Only Rules

- Creating or assigning `admin` role users remains super-admin only.
- Updating admin-level or superuser accounts remains super-admin only.
- Direct workflow mutation is still not exposed to normal admin.
- Sensitive system or security settings are still expected to remain under super admin or code control.

## Audit Behavior

- All admin rule changes continue to create `AuditLog` records.
- Added or hardened audit coverage for:
  - service updates and disable actions
  - required document rule changes
  - service-provider rule changes
  - provider approval decisions
  - provider activation changes
  - notification template changes and disable actions
  - payment status changes
  - system setting changes
  - user management actions
- Audit payload serialization is now JSON-safe for values such as decimals and datetimes.

## Tests Added

### Backend

- `providers.tests.ProviderPermissionsTests.test_admin_can_approve_and_deactivate_provider_with_audit`
- `providers.tests.ProviderPermissionsTests.test_employee_cannot_use_provider_approval_actions`
- `notifications.tests.NotificationCenterTests.test_admin_can_preview_safe_notification_template`

### Existing safety coverage still passing

- safe service editing with audit
- protected order field mutation blocked
- safe required-document management
- non-admin blocked from admin APIs
- super-admin-only user role protection
- unsafe notification template validation
- audit logs remain non-editable
- safe payment status update flow

## Remaining Admin Decisions

- Provider workload limits are still not modeled in the current database, so the admin screen does not expose them.
- Auto-assignment mode is not yet modeled as a safe business rule, so assignment remains manual plus eligibility filtering.
- Notification recipient-role routing is still limited by the current runtime model and was not expanded in this phase.
- Safe system settings are still limited to the existing whitelisted keys. If more business settings should become editable, each one needs an explicit schema and permission decision first.
- Workflow change request approval does not yet have a dedicated model or approval queue, so workflow rules remain review-only.
