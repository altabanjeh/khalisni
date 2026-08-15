# Test Regression Report

Baseline:
- `npm run build`: PASS
- `npm run lint`: FAIL with 2 pre-existing unused-symbol errors.
- `npm test`: FAIL with pre-existing page test failures/timeouts.

Targeted verification after changes:
- `npm run build`: PASS
- `npm run lint`: FAIL with the same 2 unused-symbol errors:
  - `frontend/src/api/client.js:426`
  - `frontend/src/pages/admin/AdminUsersRolesPage.jsx:4`
- `npm test -- src/pages/public/ServicesPage.test.jsx src/pages/public/ServiceDetailsPage.test.jsx src/components/StatusBadge.test.jsx`: PASS
- `npm test -- src/pages/public/ServiceCategoryPage.test.jsx`: PASS

Final full suite:
- `npm test`: FAIL.
- Final observed failing test cases: 6.
- Remaining failures are in the same pre-existing areas recorded at baseline:
  - `src/pages/admin/ServiceProviderAssignmentsPage.test.jsx`: select option `8` not present in the first combobox.
  - `src/pages/admin/ProvidersManagementPage.test.jsx`: timeout.
  - `src/pages/admin/AdminUsersRolesPage.test.jsx`: 3 failing cases, including timeout and stale Arabic `تعديل` action expectation while rendered action is `Edit`.
  - `src/pages/admin/ServicesManagementPage.test.jsx`: timeout.

No touched public tests failed in final targeted verification.
