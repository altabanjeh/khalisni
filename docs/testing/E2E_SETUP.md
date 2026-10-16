# End-to-end test setup

The full Playwright suite (functional, accessibility/axe, responsive, hardening and client-audit acceptance specs) needs one database state:

1. the schema (`migrate`);
2. the demo accounts most specs sign in with (`seed_demo`: `admin@khalisni.local`, `customer@…`, `employee@…`, `provider@…`);
3. for the client-audit specs, the QA fixtures (`seed_client_audit_qa`: namespaced QA users, a QA service and four scenario orders).

`frontend/playwright.config.js` prepares exactly that when Playwright starts the servers itself (managed mode).

## Full suite: one command

From `frontend/`:

```bash
CI=1 E2E_QA_MODE=1 KHALSNI_QA_PASSWORD='<at least 12 characters>' E2E_DB_PATH=/tmp/khalsni-e2e.sqlite3 npx playwright test
```

PowerShell:

```powershell
$env:CI='1'; $env:E2E_QA_MODE='1'; $env:KHALSNI_QA_PASSWORD='<at least 12 characters>'; $env:E2E_DB_PATH="$env:TEMP\khalsni-e2e.sqlite3"; npx playwright test
```

What happens:

- With `E2E_QA_MODE=1` the database file at `E2E_DB_PATH` is **deleted first**, then `migrate`, `seed_demo` and `seed_client_audit_qa --rebuild-owned` run, then Django starts on port 8009 and a production build of the frontend is served on 4319.
- `CI=1` makes Playwright start its own servers instead of reusing whatever already listens on those ports.
- `KHALSNI_QA_PASSWORD` is the password the QA seed gives the QA accounts and the QA specs sign in with. Do not commit it.

Variables:

| Variable | Effect |
|---|---|
| `E2E_QA_MODE=1` | Adds the QA fixtures and the client-audit specs; implies a fresh database |
| `E2E_KEEP_DB=1` | Reuse the existing database file (no delete) |
| `E2E_FRESH_DB=1` | Fresh database outside QA mode too |
| `E2E_DB_PATH` | SQLite file for the test backend (default `frontend/e2e-results/e2e_db.sqlite3`, ignored by Git) |
| `E2E_BASE_URL`, `E2E_API_URL` | External servers: Playwright starts nothing and you seed them yourself with the three commands above |

Run the suite on an otherwise idle machine; under heavy CPU load the wizard specs can exceed their timeouts.

## Designed skips

- `client-audit-responsive`: runs once, on the `desktop-1440` project (it sets its own four viewports).
- `nginx-deployment`: needs the real nginx container (`E2E_NGINX=1` with `E2E_BASE_URL` pointing at it); skipped against Vite preview.
- `p2-accessibility`: five viewport-specific skips by design.
