# Remediation Backlog

1. Localize all admin users page content for English LTR.
   - Severity: MAJOR
   - Source: `frontend/src/pages/admin/AdminUsersRolesPage.jsx`
   - Evidence: `screenshots/admin-users-en-1024.png`

2. Localize admin services/categories/document definitions tables and replace `???` placeholders.
   - Severity: MAJOR
   - Source: `frontend/src/pages/admin/ServicesManagementPage.jsx`
   - Evidence: `screenshots/admin-services-ar-1024.png`

3. Group admin navigation by operational domain.
   - Severity: MAJOR
   - Source: `frontend/src/routes/AppRoutes.jsx:207-229`
   - Evidence: admin route family and dashboard screenshots.

4. Add full browser order-submission E2E flow.
   - Severity: MODERATE
   - Scope: service selection, required info, uploads, review, submit, confirmation/order number.

5. Add automated accessibility tooling.
   - Severity: MODERATE
   - Scope: axe or equivalent plus manual keyboard checklist for dialogs, menus, upload, tables.

6. Add route-level visual regression sweep.
   - Severity: MODERATE
   - Scope: all 57 routes, Arabic/English, 390/768/1024/1440.

7. Add performance measurements for representative route families.
   - Severity: MINOR
   - Scope: home, services, login, customer dashboard, employee queue, admin users/services.

