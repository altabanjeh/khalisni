# Component Architecture

Reusable surface patterns confirmed:
- Public shell: `PublicLayout`.
- Localization helpers: `useLanguage`, `getLocalizedField`.
- Operational data display: `DataTable`.
- Modal forms: `FormModal`.
- Soft-delete flows: `AdminSoftDeleteModal`.
- State labels: `StatusBadge`.

Evidence:
- `frontend/src/layouts/PublicLayout.jsx:32-67`
- `frontend/src/context/LanguageContext.jsx:25-45`
- `frontend/src/pages/admin/AdminUsersRolesPage.jsx:485-599`
- `frontend/src/pages/admin/ServiceProviderAssignmentsPage.jsx:233-352`

