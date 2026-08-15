# Accessibility Audit

Status: PARTIALLY CONFIRMED

Automated tests use accessible roles and names for critical actions. The remaining accessibility risks are incomplete keyboard/focus traversal coverage and no automated axe scan in this repository.

Confirmed strengths:
- Tests query buttons, comboboxes, fields, and workflows through accessible roles/names.
- `FileUploader` gives the remove-file button an `aria-label`.
- `DataTable` wraps table overflow in a `role="region"` container.

Risks:
- Dialog focus trap and return focus were not browser-verified.
- Icon-only controls need full accessible-name audit.
- Color-only status meaning needs visual and screen-reader audit.
- No automated WCAG scan was found.
- Mobile zoom/reflow for protected dense screens is not fully screenshot-validated.

Evidence:
- `frontend/src/pages/public/LoginPage.test.jsx`
- `frontend/src/pages/admin/AdminUsersRolesPage.test.jsx`
- `frontend/src/pages/admin/ServiceProviderAssignmentsPage.test.jsx`
- `frontend/src/components/FileUploader.jsx:164`
- `frontend/src/components/DataTable.jsx:96`
