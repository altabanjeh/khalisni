# Khalsni total audit: forensic baseline

Recorded 2026-10-13, before any application change. The only file added before this record is the probe suite `backend/config/tests_total_audit.py`, which changes no behaviour.

## Repository

| Item | Value |
|---|---|
| Branch | `main` |
| Base SHA | `b6a4242384a60f537f5608cf33fd3af6fe0091a2` |
| Working tree | clean at start |
| Remote | `origin/main` is at the same SHA. `hardening/release-gate` also points to it, so the hardening work is merged and pushed. The hardening report still says "not pushed, not merged"; that line is out of date. |
| Repository visibility | Public on GitHub (unauthenticated API returns 200). |

## Environment

| Item | Value |
|---|---|
| Machine | Windows 11, local development machine. Nothing here is the deployed environment. |
| Python / Django / DRF | 3.12.11 / 5.2.13 / 3.17.1 |
| Node | 24.18.0 (CI uses 22) |
| Local database | SQLite `backend/db.sqlite3`. It is 11 migrations behind (`accounts.0007`, `services.0010`–`0013`, `orders.0014`–`0016`, `public_site.0005`–`0007`). It is a stale developer file and is not used by any test. |
| Production database | PostgreSQL 16 (`postgres:16-alpine` in `docker-compose.yml`). Not reachable. |
| Cache | Local memory. `REDIS_URL` unset; Compose defines no Redis service. |
| Trusted proxy count | `API_THROTTLE_NUM_PROXIES` unset (`NUM_PROXIES = None`). |
| Docker | Engine 29.6.2 running. `ghassan-db-1`, `ghassan-backend-1`, `ghassan-frontend-1` exist, stopped two weeks ago. Other projects' containers are running and were left alone. |
| Deployed URL | `https://khalisnidev.raedaltabanjeh.com` (from the earlier baseline). Not probed in this audit; deployed commit, migration state and data are unknown. |
| Mobile | `mobile/` is an Expo / React Native TypeScript app, not Flutter. Flutter commands do not apply. |
| Client audit sources | `D:\ghassam moblie\Khalsni_Website_Audit_AR.docx` and `Khalsni_Audit_Evidence.zip` exist outside the repository. |

Tools not installed: `psql`, `pg_dump`, `gitleaks`, `trufflehog`, `trivy`, `nginx`, `gh`. PostgreSQL and nginx checks run in containers; secret scanning is a pattern search.

## Baseline checks on unmodified code

| Check | Command | Result |
|---|---|---|
| Django system check | `manage.py check` | 0 issues |
| Migration consistency | `manage.py makemigrations --check --dry-run` | No changes detected |
| Migration plan | `manage.py migrate --plan` | 11 unapplied on the stale local file only; chain is linear |
| Backend tests, SQLite | `manage.py test --parallel 4` | 405 run, 403 passed, 2 skipped (PostgreSQL-only race tests), 139 s |
| Frontend lint | `npm run lint` | pass |
| Frontend unit tests | `npm test` | 87 / 87 (34 files) |
| Frontend production build | `npm run build` | pass |
| Mobile type-check | `npm run typecheck` | pass. The mobile app has no tests and no lint. |
| Python dependencies | `pip-audit -r backend/requirements.txt` | Did not complete: the tool crashed deleting its temporary environment (Windows file lock). Re-run recorded in the final report. |
| Web dependencies, production | `npm audit --omit=dev` | 0 vulnerabilities |
| Web dependencies, all | `npm audit` | 19 (2 critical, 13 high, 3 moderate, 1 low), all in development tooling |
| Mobile dependencies, production | `npm audit --omit=dev` | 53 (2 critical, 36 high, 14 moderate, 1 low) |
| Browser suites | Playwright | Not re-run at baseline. Last recorded: 176 / 176 managed stack, 10 / 10 through nginx (hardening report). |
| PostgreSQL suite | — | Not re-run at baseline. Last recorded: 405 / 405. |

## Probe result on unmodified code

`config.tests_total_audit`: 30 probes, each asserting safe behaviour. **20 fail and 1 errors on the base SHA** while the existing 405 tests are green. The failures are the findings in `KHALSNI_TOTAL_FINDINGS.csv`.

| Probe class | Failing | What it shows |
|---|---|---|
| `LegacyRoleEscalationTests` | 3 / 3 | An organization admin can create or promote platform-wide staff through the `role` field. |
| `CrossTenantAccountTakeoverTests` | 4 / 5 | An organization admin can attach any user to their organization and then reset that user's password and email. |
| `PlatformCatalogWriteBoundaryTests` | 2 / 4 (+1 fixture error) | Organization admins can edit shared categories. |
| `SharedProviderBoundaryTests` | 3 / 4 | Organization admins can revoke approval of, deactivate, or pre-approve shared providers. |
| `TimelineShadowEndpointTests` | 2 / 4 | `/api/orders/<id>/timeline/` gives customers and providers staff identity and internal reasons. |
| `CustomerPayloadStaffPrivacyTests` | 1 / 2 | Customer order payloads carry the assigned employee's email. |
| `FinalResultSupersededTests` | 2 / 2 | An older verified result lets a newer unverified one reach the customer. |
| `RobustErrorTests` | 3 / 3 | Three inputs return 500. |
| `RefreshTokenRevocationTests` | 1 / 3 | The refresh endpoint accepts a revoked token (the access token it returns is refused). |

## Sources read

`docs/PRD.md`, `docs/SRS.md`, `docs/audit/KHALSNI_CLIENT_DECISIONS_REQUIRED.md`, `docs/hardening/*` (baseline, final, production requirements), `docker-compose.yml`, `backend/entrypoint.sh`, `.github/workflows/ci.yml`, and the backend source for accounts, organizations, orders, documents, providers, payment, notifications, reports, public site, services, audit, help guides, workflow and core. The web frontend, mobile app and infrastructure files were read by three parallel read-only reviews.

## Requirement hierarchy applied

PRD / SRS and recorded business decisions → client-accepted requirement → security and data-integrity constraint → current implementation → current tests.

## Open client and external items carried in

D05, D06 (client content), B10 (eight decisions), B04, B09 (external test environments), B05, B08 (not in MVP scope), KHS-033 and KHS-040 (deployment gates), KHS-034 and KHS-043 (client decisions).
