# Form, Table, And Interaction Audit

Status: CONFIRMED WITH CONDITIONS

Tables are implemented through shared `DataTable`; edit/create workflows commonly use `FormModal`; confirmation workflows use `ConfirmModal` and `AdminSoftDeleteModal`. During validation, two admin screens required hiding the background table while the modal is open to keep modal controls unambiguous.

Form findings:
- File uploads validate size and accept values and show chosen files.
- Several upload strings are hardcoded Arabic, which is a bilingual readiness issue.
- Admin form modals use disabled/loading states, but route-wide focus trapping and keyboard traversal are not confirmed.
- Destructive actions use modal confirmation patterns, but terminology should be standardized.

Table findings:
- `DataTable` supports loading skeletons, empty state, mobile card fallback below 1024px, toolbar, pagination, row classes, and horizontal overflow.
- Dense admin/staff queues should be audited against actual next-action workflows.
- Direction-aware alignment should be reviewed for English/LTR tables.

Evidence:
- `frontend/src/pages/admin/AdminUsersRolesPage.jsx:485-599`
- `frontend/src/pages/admin/ServiceProviderAssignmentsPage.jsx:233-352`
- `frontend/src/components/DataTable.jsx:24-137`
- `frontend/src/components/FileUploader.jsx:46-182`
- `frontend/src/pages/admin/AdminUsersRolesPage.test.jsx`
- `frontend/src/pages/admin/ServiceProviderAssignmentsPage.test.jsx`
