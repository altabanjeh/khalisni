# ADMIN CONFIG RULES

| Rule | Current Location | Current Behavior | Admin Editable Now? | Should Admin Edit It? | Requires Super Admin? | Needs Audit? | Recommended UI Control |
|---|---|---|---|---|---|---|---|
| User role | `backend/accounts/models.py`, `backend/accounts/views.py`, `frontend/src/pages/admin/AdminCmsPage.jsx` | Admin can create/update `role` through `/api/admin/users/` | Yes | Limited | Yes for creating/changing admin-level users | Yes | Dropdown |
| `is_staff` / Django admin access | `backend/accounts/serializers.py:82-95`, frontend user form `frontend/src/pages/admin/AdminCmsPage.jsx:730-733` | Admin can set `is_staff` directly in React admin UI | Yes | Limited | Yes | Yes | Toggle with warning |
| `is_superuser` | `backend/accounts/models.py:26-39`, Django admin only in `backend/accounts/admin.py:18` | Only Django admin exposes it; custom API does not | No (custom UI/API) | No for normal admin | Yes | Yes | Super Admin only |
| Generic system settings | `accounts.SystemSetting`, `/api/admin/system-settings/`, `AdminCmsPage` | Free-form key/value JSON with no key whitelist or schema | Yes | Limited | Sometimes | Yes | Key dropdown + typed form |
| Service category active/order | `services.ServiceCategory`, `/api/admin/categories/`, `AdminCmsPage` | Name/slug/order/active flag editable | Yes | Yes | No | Yes | Text inputs + toggle + number input |
| Service pricing and flags | `services.Service`, `/api/admin/services/`, `AdminCmsPage` | Price fields and service flags editable | Yes | Yes | No | Yes | Number inputs + toggles + dropdowns |
| Required information schema | `services.Service.required_information_schema`, `AdminCmsPage` | Raw JSON array editable from textarea | Yes | Limited | No | Yes | Structured field-builder, not raw JSON |
| Required documents per service | `services.ServiceRequiredDocument`, `/api/admin/service-documents/` | Backend CRUD exists; no React admin screen | Backend Yes, Frontend No | Yes | No | Yes | Ordered repeater |
| Service-provider assignments | `services.ServiceProviderAssignment`, `/api/admin/service-provider-assignments/` | Backend CRUD exists; no React admin screen | Backend Yes, Frontend No | Yes | No | Yes | Multi-select |
| Provider approval | `providers.ProviderProfile.is_approved`, `approved_by`, `approved_at` | Exists in model, but not exposed in provider serializer or frontend screen | No (custom UI/API) | Yes | Usually | Yes | Toggle with approval history |
| Provider availability | `providers.ProviderProfile.is_available` | Exists in serializer, but frontend provider page is read-only list | Backend Yes, Frontend No | Yes | No | Yes | Toggle |
| Notification templates | `notifications.NotificationTemplate`, `/api/admin/notification-templates/` | Backend CRUD exists; no frontend screen; runtime send path does not use templates | Backend Yes, Frontend No | Yes | No | Yes | Template editor |
| Notification channel runtime | `backend/notifications/utils.py:6-18` | Runtime sender always creates `channel="system"` notifications | No | No for normal admin | Yes | Yes | Read-only / Super Admin only |
| Upload limits and MIME rules | `backend/config/settings.py:175-192`, `frontend/src/utils/serviceForms.js:3-6` | Hardcoded globally to `10 MB` and a fixed extension/MIME list | No | Limited | Yes | Yes | Number input + multi-select |
| Workflow transition map | `backend/workflow/rules.py:4-50` | Hardcoded status map | No | Usually No | Yes | Yes | Read-only |
| Transition role map | `backend/workflow/transition_permissions.py:9-35` | Hardcoded role-to-transition matrix | No | Usually No | Yes | Yes | Read-only |
| Employee reviewable statuses | `backend/orders/selectors.py:6-12` | Hardcoded set of statuses visible in employee queue | No | Limited | Yes | Yes | Multi-select |
| Public tracking access policy | `backend/orders/views.py:80-93`, `backend/documents/views.py:36-42` | Public access uses only `order_number + phone` | No | Limited | Yes | Yes | Toggle / policy dropdown |
| Default passwords for admin-created users | `backend/accounts/serializers.py:98-100`, `backend/providers/serializers.py:56-59` | Missing passwords fall back to predictable defaults | Yes, indirectly | No | Yes | Yes | Read-only / remove behavior |
| Direct order CRUD | `/api/admin/order-records/` | Admin can create/update/delete raw order rows | Yes | No | Yes | Yes | Read-only / Super Admin only |
| Direct document CRUD | `/api/admin/documents/` | Admin can create/update/delete raw documents; delete is hard delete | Yes | Limited | Yes | Yes | Read-only / Super Admin only |
| Payment status and refunds | `payment.Payment`, `/api/admin/payments/`, `/api/admin/payments/<id>/status/` | Backend supports view/create/status-update; no frontend screen | Backend Yes, Frontend No | Yes | For refunds maybe | Yes | Dropdown + notes |
| Report visibility | `backend/reports/views.py:42-55`, `71-79`, `110-118` | Admin sees full reports; non-admin report users receive reduced payload | No | No | Yes | Yes | Read-only |
