# Admin Audit

Status: CONFIRMED WITH CONDITIONS

Admin contains the broadest surface: overview, orders, workflow rules, CMS, services, service categories, service relations, public-site controls, missing-service requests, users/roles, providers, assignments, reports, notifications, payments, audit, help guides, and manual.

Strengths:
- Admin route surface is explicit and centralized.
- Admin users/roles, provider assignment, providers, services, and rules have automated tests.
- Shared table, modal, status, and soft-delete components are used.

Risks:
- Admin sidebar exposes 22 links at one level.
- Public-site management routes are split across multiple peers without a documented task sequence.
- Admin restore/delete terminology and localization still need cross-route standardization.
- Authenticated visual route sweep is not complete.

Evidence:
- `frontend/src/routes/AppRoutes.jsx:207-229`
- `frontend/src/routes/AppRoutes.jsx:125-153`
- `frontend/src/pages/admin/AdminUsersRolesPage.jsx:433-599`
- `frontend/src/pages/admin/ServiceProviderAssignmentsPage.jsx:208-352`
- `frontend/src/pages/admin/AdminUsersRolesPage.test.jsx`
- `frontend/src/pages/admin/ServiceProviderAssignmentsPage.test.jsx`
