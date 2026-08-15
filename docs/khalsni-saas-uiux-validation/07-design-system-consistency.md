# Design System Consistency

Status: PARTIAL

Confirmed consistent:
- Public shell, dashboard shell, sidebar/topbar, glass panels, buttons, cards, status pills, and Lucide icon family are broadly consistent.
- Shared `DataTable` now uses logical text alignment and active document direction.
- Shared `FileUploader` now has bilingual behavior through language context.
- Modals and confirmation dialogs use common components.

Remaining visual islands:
- Admin resource screens still include English labels in Arabic mode and Arabic copy in English mode.
- Some admin table values show `???` when localized source data is missing.
- Admin navigation remains dense and flat.

Evidence:
- `frontend/src/components/DataTable.jsx`
- `frontend/src/components/FileUploader.jsx`
- `frontend/src/layouts/DashboardLayout.jsx`
- `frontend/src/layouts/PublicLayout.jsx`
- `docs/khalsni-saas-uiux-validation/screenshots/admin-services-ar-1024.png`
- `docs/khalsni-saas-uiux-validation/screenshots/admin-users-en-1024.png`

