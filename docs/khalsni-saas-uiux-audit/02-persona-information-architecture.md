# Persona Information Architecture

Confirmed personas:
- Anonymous visitor: discovers services, reads public content, tracks requests, logs in/registers.
- Customer: dashboard, create order, view orders, upload missing documents, profile, manual.
- Employee/support: review queue, missing service requests, order review, document verification, reports, manuals, support maintenance routes.
- Admin: platform configuration, services, rules, CMS, providers, users, reports, payments, notifications, audit, help guides.
- Provider: dashboard, assigned orders, order detail, manual.

Evidence:
- `frontend/src/routes/AppRoutes.jsx:158-242`
- `frontend/src/layouts/PublicLayout.jsx:67`
- `frontend/src/pages/admin/AdminUsersRolesPage.jsx:433-599`

