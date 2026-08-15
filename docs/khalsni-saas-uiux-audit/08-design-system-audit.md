# Design System Audit

Status: CONFIRMED

The frontend uses Tailwind utility classes, shared shell classes, shared buttons, fields, cards, status pills, DataTable, FormModal, PageHeader, StatusBadge, and lucide-react icons.

| Component/pattern | Classification | Evidence |
|---|---|---|
| Button classes (`btn-primary`, `btn-secondary`) | NEEDS REFINEMENT | Used broadly; should be documented as tokens |
| IconButton | PARTIALLY CONFIRMED | Lucide icons used; icon-only naming needs route audit |
| Input/Select/Textarea | NEEDS REFINEMENT | Shared `field` class, many inline labels |
| Checkbox | NEEDS REFINEMENT | Used in admin permissions and forms |
| Switch/Radio | NOT FULLY CONFIRMED | Needs component inventory pass |
| Card | NEEDS REFINEMENT | Many card-like patterns, some one-off radii |
| Badge/StatusBadge | GOOD | Shared status component exists |
| Alert | NEEDS REFINEMENT | Inline warning panels exist |
| Dialog/FormModal | GOOD WITH CONDITIONS | Shared modals exist; focus behavior needs E2E |
| Drawer | NOT FOUND | Sidebar behaves as mobile drawer-like shell |
| Tabs | NEEDS REFINEMENT | Admin users permission/info tabs are local |
| Table/DataTable | GOOD WITH CONDITIONS | Responsive table/card fallback exists |
| Pagination | GOOD WITH CONDITIONS | Used by DataTable |
| Breadcrumb | NOT FULLY CONFIRMED | Needs route-by-route check |
| PageHeader | GOOD WITH CONDITIONS | Shared page header exists |
| EmptyState | GOOD WITH CONDITIONS | Used by DataTable |
| Skeleton | GOOD WITH CONDITIONS | Used in DataTable loading rows/cards |
| Toast | GOOD WITH CONDITIONS | Toast context used in forms |
| Upload/FileUploader | NEEDS REFINEMENT | Validation exists; hardcoded Arabic copy |
| Stepper/ApplicationStepper | PARTIALLY CONFIRMED | Component exists; route use needs audit |
| Timeline/OrderTimeline | GOOD WITH CONDITIONS | Shared order timeline exists |
| ServiceCard/CategoryCard | GOOD WITH CONDITIONS | Public discovery cards exist |

Evidence:
- `frontend/package.json:17-20`
- `frontend/package.json:38-40`
- `frontend/tailwind.config.js:1`
- `frontend/src/index.css:144`
- `frontend/src/pages/admin/AdminUsersRolesPage.jsx:433-599`
- `frontend/src/components/DataTable.jsx:24-137`
- `frontend/src/components/FileUploader.jsx:46-182`
