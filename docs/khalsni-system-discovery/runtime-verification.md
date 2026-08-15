# Runtime Verification

Discovery date: 2026-07-26

## Commands Run

All commands were non-destructive.

| Command | Result |
|---|---|
| `python --version` | CONFIRMED Python 3.12.11 |
| `python manage.py check` from `backend/` | CONFIRMED passed: `System check identified no issues (0 silenced).` |
| `python -m pip show Django djangorestframework ...` | CONFIRMED local Django 5.1.11, DRF 3.16.1, SimpleJWT 5.5.1, django-filter 25.2, django-cors-headers 4.9.0, WhiteNoise 6.9.0, psycopg 3.2.9 |
| `python -c "find_spec(...)"` | CONFIRMED local `corsheaders`, `rest_framework`, `rest_framework_simplejwt`, `django_filters`, `whitenoise`; NOT FOUND locally: `storages`, `boto3` |
| `node --version; npm --version` | CONFIRMED Node v24.18.0, npm 11.16.0 |
| `npm run typecheck` from `mobile/` | CONFIRMED passed |
| `npm test -- --runInBand` from `frontend/` | INVALID COMMAND: Vitest rejected Jest-only flag `--runInBand` |
| `npm test` from `frontend/` | PARTIALLY CONFIRMED frontend tests execute but fail in current tree |

## Frontend Test Failures Observed

`npm test` ran Vitest 3.2.4 and exited non-zero. Confirmed failures included:

- `src/pages/admin/ServiceProviderAssignmentsPage.test.jsx`: selects value `8` from a status filter whose options are `active`, `deleted`, `all`.
- `src/pages/admin/AdminUsersRolesPage.test.jsx`: expects Arabic `/تعديل/`, while rendered action buttons include English `Edit`/`Delete`.
- Several tests timed out at the default 5000 ms, including provider, missing-document, register, track-order, login, and admin/provider management flows.
- `src/pages/admin/ServicesManagementPage.test.jsx` timed out at 15000 ms.

No test files were changed.

## Screenshots

No runtime screenshots were captured. The audit stayed static plus non-destructive checks because starting and seeding the full Docker stack would run migrations and seed commands via `backend/entrypoint.sh`, which is outside the requested discovery-only constraint.

