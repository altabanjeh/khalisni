# Baseline

Date: 2026-09-04

| Check | Result |
|---|---:|
| Frontend lint | PASS |
| Frontend production build | PASS (`dist-acceptance`; default `dist` was locked by Windows) |
| Frontend unit tests | PASS: 42/42 |
| Catalog/image backend tests | PASS: 31/31 |
| Full backend tests before remediation | FAIL: 194 pass, 2 fail, 1 error |
| Migration drift | PASS: no changes detected |
| Browser/E2E tooling | Not configured in `frontend/package.json` |

The pre-remediation backend failures concerned guarded archive behavior, required-document registry test setup, and branch-deletion audit naming. They were remediated and the full suite was rerun successfully.
