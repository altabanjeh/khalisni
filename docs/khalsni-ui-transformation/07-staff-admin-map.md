# Staff And Admin Map

Routes preserved:
- Employee/support route family under `/employee`.
- Admin route family under `/admin`.
- Provider route family under `/provider`.

Backend behavior preserved:
- Existing workflow rules remain backend-authoritative.
- No frontend-only workflow transitions were added.
- Existing guarded delete and soft-delete contracts were not changed.
- No provider assignment or organization scoping behavior was changed.

Implemented in this pass:
- Shared design tokens and primitives affect existing staff/admin/provider screens through existing global classes.

Not completed in this pass:
- Page-by-page staff/admin/provider migration.
- Admin catalog forms were not restructured into new tabs in this pass.
