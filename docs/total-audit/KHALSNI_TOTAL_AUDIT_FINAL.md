# Khalsni total assurance verdict

2026-10-13. Everything below was done on a development machine. **Nothing was verified on the deployed site, and the changes are uncommitted in the working tree on `main`.**

## Verdict

**READY TO MERGE WITH DEPLOYMENT GATES** for branch `hardening/total-assurance-release` (was "ready with dependencies" for the uncommitted working tree; release closure on 2026-10-13 added four findings, three fixed and one low open, and is described in the addendum below).

**The build that is deployed today (`b6a4242` or older) should be treated as HOLD**: it contains the two critical and nine of the high findings below, including an organization administrator's path to every tenant's data and customers reading other customers' payment records.

| | |
|---|---|
| Base SHA | `b6a4242384a60f537f5608cf33fd3af6fe0091a2` |
| Final SHA | tip of `hardening/total-assurance-release` (see `git log`); not pushed, not merged |
| Deployed SHA | unknown (site not probed) |

## Release closure addendum (2026-10-13)

The working tree was moved to branch `hardening/total-assurance-release` and reviewed as one diff against `b6a4242`.

**Diff review.** No removed or weakened assertion, no skipped test, no debug output, no QA-only branch in application code, no hardcoded id, no credential. Broad exception handlers exist only in the rate-limit fail-open path and are logged.

**Account-management rule.** `config/tests_release_closure.py` proves the six properties the release depends on: organization admins cannot manage platform administrators (legacy `admin` role, superuser, staff flag, platform memberships, with or without a membership in the admin's organization); cannot attach outside users by either endpoint, nor re-point a membership; cannot create unscoped or platform-level accounts; no kind of membership removal broadens access; creating, renaming, resetting and re-assigning their own staff still works; platform administrators keep every capability, including restoring a former tenant employee with an explicit platform membership.

**New findings.** Fixed, with tests that fail on the base commit: KTA-041 (provider-role scope, HIGH), KTA-042 (Redis outage latency, MEDIUM), KTA-043 (create-user form, MEDIUM). Open: KTA-044 (LOW), one unexplained intermittent failure of the viewport browser spec, about 1 in 9 executions.

**New read-only commands:** `audit_access_review` and `audit_demo_accounts`; see `PREDEPLOY_ACCESS_REVIEW.md`.

**Local stack verification.** The Compose file was built and run locally behind a stand-in edge proxy (two proxies, two gunicorn workers, Redis, PostgreSQL 16, production settings): throttling for sign-in, registration and password reset; forged `X-Forwarded-For`; Redis stopped and hung; backup, failure cases and a full restore drill. Results in `KHALSNI_RELEASE_GATE.md` and `RECOVERY_RUNBOOK.md`. None of it was on the server.

**Web: READY. Mobile: HOLD** (never run on a device, placeholder production endpoint, 38 critical or high dependency advisories unreviewed, one open contract gap).

## Findings

Register: `KHALSNI_TOTAL_FINDINGS.csv`, 44 rows (KTA-041 to 044 were found during release closure), built by `scripts/build_total_findings.py`.

| Severity | Found | Fixed | Open |
|---|---:|---:|---:|
| CRITICAL | 2 | 2 | 0 |
| HIGH | 13 | 12 | 1 |
| MEDIUM | 17 | 12 | 5 |
| LOW | 9 | 4 | 5 |
| INFO | 3 | 1 | 2 |

The existing suite (405 backend, 87 frontend tests) was fully green while every one of these was present.

### What was wrong and is now fixed

| ID | Sev. | Finding |
|---|---|---|
| KTA-001 | CRITICAL | An organization admin could create a platform-wide `support` or unscoped `employee` account, or promote a member, and read every tenant's orders. |
| KTA-002 | CRITICAL | An organization admin could attach any user to their organization and then replace that user's password and email, including platform administrators who hold the role by membership. |
| KTA-003 | HIGH | Removing a partner employee's membership gave them access to every organization instead of none. |
| KTA-004 | HIGH | Any customer could read their organization's whole payment ledger (other customers' names and amounts) and record refunds through the operations endpoint. |
| KTA-005 | HIGH | An organization admin could move any customer into their organization. |
| KTA-006, 007 | HIGH | An organization admin could edit shared categories and block global services with a prerequisite rule. |
| KTA-008 | HIGH | An organization admin could revoke approval of, deactivate, or pre-approve shared providers. |
| KTA-009 | HIGH | With Redis configured and down, every API request returned 500. |
| KTA-010 | HIGH | Unhandled errors were logged nowhere in production. |
| KTA-011 | HIGH | The deployment guide's command published the database and backend ports. |
| KTA-013 | HIGH | The missing-documents page stopped responding after a rejected file. |
| KTA-014 | HIGH | Mobile: forced logout after an hour, provider screen crash, cancel always failing, duplicate orders on retry. |
| KTA-015 to 018 | MEDIUM | Timeline endpoint leaking staff identity; an unverified newer result reaching the customer; the start-up admin command promoting or reviving accounts; no rate limit on the Django admin sign-in. |
| KTA-021 to 026 | MEDIUM | Web session handling, false "no data" states, unguarded admin buttons, English-mode Arabic text, ten mobile contract mismatches, CI without PostgreSQL or image builds. |
| KTA-030 to 033 | LOW | Three 500s, refresh endpoint accepting revoked tokens, staff email in customer payloads, ten small deployment defects. |
| KTA-041 | HIGH | An account with the legacy `provider` role and a partner membership was unscoped: it listed every organization's branches and branding and, as partner admin, could edit other partners' service configuration. An organization admin could create one. Found in closure. |
| KTA-042 | MEDIUM | With Redis down every request waited 8 to 20 seconds. Now one request per worker per 30 s pays about 4 s. Found in closure. |
| KTA-043 | MEDIUM | The web create-user form did not send the organization the server now requires, so organization admins could not create users. Web fixed; mobile not. Found in closure. |

### What remains open

| ID | Sev. | Finding | Owner | Blocks go-live |
|---|---|---|---|---|
| KTA-012 | HIGH | No scheduled backup, no off-server copy, no restore drill on the real stack. Scripts and a runbook now exist; the database part was rehearsed locally. | DevOps | **Yes** |
| KTA-020 | MEDIUM | `API_THROTTLE_NUM_PROXIES` unset: rate limits bypassable by header rotation (was KHS-033). | DevOps | **Yes** |
| KTA-019 | MEDIUM | Demo credentials and an old database file with password hashes are in the public repository history. | Repository owner | **Yes, until the deployed database is checked for the demo accounts** |
| KTA-027 | MEDIUM | Mobile dependencies: 53 advisories; build profiles point at a placeholder and a cleartext address. | Engineering | Mobile store release only |
| KTA-028 | MEDIUM | Backend container runs as root; dependencies and image tags unpinned. | DevOps | No |
| KTA-029 | MEDIUM | Unpaginated lists and Python-side aggregation. Not measured. | Engineering | No |
| KTA-034, 036 | LOW | Tokens and phone numbers in URLs; single-language server messages. | Engineering | No |
| KTA-035, 037, 039 | LOW / INFO | Registration reveals registered phones; payment states have no transition rules; organization admins can reset their own customers' passwords. | Client decision | No |
| KTA-038 | INFO | The delete-guard password screen stores a password that is never checked. | Engineering | No |
| KTA-044 | LOW | The viewport browser spec failed once in nine executions: one page started without making any request. Cause not found. | Engineering | No |

## Tests

| Suite | Result |
|---|---|
| Backend, SQLite | 478 run, 471 passed, 7 skipped (PostgreSQL-only race tests) |
| Backend, PostgreSQL 16 | 478 / 478, none skipped |
| of which new in this audit | 73: `config/tests_total_audit.py` 47 (5 are PostgreSQL race tests), `config/tests_release_closure.py` 26 |
| Frontend unit | 100 / 100 (34 files); 13 new |
| Frontend lint | PASS |
| Frontend production build | PASS |
| Mobile | `tsc --noEmit` PASS. No tests exist. Not run on a device or emulator. |
| Browser, public + routes + accessibility (1440 and 390 px, emulated Chromium) | 162 / 162 |
| Browser, journey + CMS + idempotency + role re-entry + access + closure + viewport matrix (1440 px) | First run 11 / 12 on an idle machine: `client-audit-responsive.spec.js` failed (employee page at 430 px rendered nothing; the server saw no request from it). Second full run 12 / 12. That spec alone, six times with tracing: 6 / 6. Cause not found; recorded as KTA-044. |
| Browser, mobile UX + idempotency (390 px) | 6 / 6 |
| Security probes | 39 / 39 after the fixes; 24 of the first 33 failed on the base SHA |
| Accessibility (axe, 6 public and 16 signed-in routes, 2 viewports) | 0 serious or critical; included in the 162 |
| Migration | PASS: fresh PostgreSQL 16, 110 migrations in 26 s; `orders 0014` rollback and forward clean. This audit adds no migration. |
| Backup and restore | Local Compose stack, PostgreSQL 16, production settings: backup PASS; backup with database down and with backend down both exit 1; restore of database and media into a separate project PASS in 12 s with identical counts. Production copy: NOT AVAILABLE. |
| Dependency audit | Backend `pip-audit`: none. Web production `npm audit`: 0. Web development tooling: 19. Mobile: 53. |
| Secret scan | Pattern search only (no gitleaks or trufflehog here): no live secrets tracked; demo credentials found (KTA-019). |
| `manage.py check`, `check --deploy`, `makemigrations --check` | PASS |
| `nginx -t` in the built image, `docker compose config`, both image builds | PASS. Header, private-media and admin sign-in limit checks run with curl against the local stack. `nginx-deployment.spec.js` NOT RUN (needs the debug QA fixture behind nginx). |
| CI | WRITTEN / AWAITING FIRST REMOTE RUN. Workflow passes `actionlint`. |

## System areas

| Area | Result | Basis |
|---|---|---|
| Architecture | PASS | Service layer, one transition table, one visibility selector per role |
| Business workflow | PASS | Browser journey; workflow tests; newest-result rule (KTA-016) |
| Authentication | PASS | Session revocation, refresh revocation, throttles; proxy count is a deployment item |
| RBAC | PASS after fixes | KTA-001, 002, 006, 007, 008 |
| Tenant isolation | PASS after fixes | KTA-003, 005 |
| IDOR | PASS after fixes | KTA-004; existing cross-account suite |
| Documents | PASS | Readiness, frozen requirements, closed-order immutability |
| File security | PASS | Upload validation tests; nginx media allowlist by reading and `nginx -t`. Not re-run through the nginx container in this audit. |
| Pricing integrity | CLIENT DECISION | B10-8, KHS-034 unchanged |
| Notifications | PASS | Recipient-only; dedupe under race |
| Audit trail | PASS | Refused actions recorded; no secrets in entries read |
| Database integrity | PASS | Constraints reviewed; no new ones added |
| Concurrency | PASS | 7 race tests on PostgreSQL |
| Idempotency | PASS | Order creation, including two tabs with one key |
| Migrations | PASS | See above |
| Deployment | UNVERIFIED | Configuration hardened and validated locally; the server was not touched |
| Recovery | UNVERIFIED | KTA-012 |
| Frontend | PASS | Unit tests, build, browser suites listed above |
| Mobile | UNVERIFIED | Type-check only |
| Localization | PASS with gaps | KTA-036 |
| RTL | PASS | Route and public suites in Arabic |
| Responsive | PASS (emulated) | 390, 430, 768, 1366 and 1440 px in Chromium. 360, 1024 and 1920 px, WebKit and real devices were not run. |
| Accessibility | PASS (automated) | axe only; no manual keyboard or screen-reader pass |
| Performance | NOT MEASURED | No query counts, no load test, no large-volume seed (KTA-029) |
| Observability | PASS after fix | KTA-010; no aggregation or alerting |
| Privacy controls | PASS with open items | KTA-015, 032 fixed; KTA-034, 035 open |

## Not done

Stated plainly so nobody assumes otherwise:

- Load testing, large-volume seeding and endpoint timing (phases 47 to 49).
- Rehearsal on a production copy, and any check against the deployed site (phases 35, 39).
- A restore drill on the real stack or with real data (phase 36). The drill was done locally, database and media.
- Mobile on a device or emulator (phase 32).
- WebKit, real devices, manual accessibility (phases 30, 31).
- Forced-failure browser runs for each role and route (phase 27): the handling was added and unit-tested, not driven in a browser.
- Tool-based secret, container and image scans (phases 42, 44): the tools are not installed.
- Re-reading the client's original Word document and evidence archive: the regression below relies on the existing mapping in `docs/audit/`.

## Order state table

Enforced by `workflow/rules.py` and `orders/services.py`, each action in one transaction under a row lock.

| From | Action | To | Actor | Conditions |
|---|---|---|---|---|
| NEW | start review | UNDER_REVIEW | staff | |
| NEW | cancel | CANCELLED | customer (own order), admin | reason |
| NEW | archive | ARCHIVED | admin | |
| UNDER_REVIEW | request documents | WAITING_CUSTOMER | staff | reason; types from the order's frozen requirements |
| UNDER_REVIEW | assign provider | ASSIGNED | staff with assign permission | required documents approved; provider approved, available, active and linked to the service or category |
| UNDER_REVIEW | reject / cancel | REJECTED / CANCELLED | staff (assigned employee if one is set) | reason |
| WAITING_CUSTOMER | resume review | UNDER_REVIEW | customer by uploading every requested document, or staff | all requested types uploaded since the request |
| WAITING_CUSTOMER | cancel | CANCELLED | staff | reason |
| ASSIGNED | start work | IN_PROGRESS | assigned provider | |
| IN_PROGRESS | pause / resume | WAITING_GOVERNMENT / IN_PROGRESS | assigned provider | |
| IN_PROGRESS, WAITING_GOVERNMENT | upload result | READY_FOR_DELIVERY | assigned provider, or staff with the permission | required documents approved |
| IN_PROGRESS | reject | REJECTED | staff | reason |
| ASSIGNED, IN_PROGRESS, WAITING_GOVERNMENT, READY_FOR_DELIVERY | cancel | CANCELLED | admin | reason |
| READY_FOR_DELIVERY | return to provider / to review | IN_PROGRESS / UNDER_REVIEW | staff | reason |
| READY_FOR_DELIVERY | reject result | IN_PROGRESS (or UNDER_REVIEW with no provider) | document reviewer | reason |
| READY_FOR_DELIVERY | complete | COMPLETED | staff | **newest result verified**, or admin confirmation |
| COMPLETED | reopen | UNDER_REVIEW | admin | reason |
| COMPLETED, REJECTED, CANCELLED | archive | ARCHIVED | admin | |

Customer uploads are accepted in NEW, UNDER_REVIEW and WAITING_CUSTOMER only. Documents of closed orders cannot be reviewed. The customer sees a final result only after completion, and only verified files unless the order was closed by admin confirmation with none verified.

## Threat model summary

| Actor | Main goal | Control | State |
|---|---|---|---|
| Anonymous | Track or download by guessing | Order number and exact phone both required; 10 per minute; completed verified results only | Holds. Limit depends on KTA-020. |
| Anonymous | Guess passwords | 20 per minute on sign-in; nginx limit on the Django admin | Holds, with KTA-020 |
| Customer | Read another customer's data | Ownership filters on every customer endpoint | Holds after KTA-004 |
| Customer | Mark own upload as the result, pay as refund | Server-owned fields | Holds |
| Provider | See unassigned work, customer identity or prices | Assignment queryset; provider serializers | Holds |
| Former provider or employee | Keep access after reassignment or offboarding | Access follows current assignment and membership | Holds after KTA-003 |
| Employee | Skip readiness or verification | Transition table under lock; newest-result rule | Holds after KTA-016 |
| Organization admin | Reach other tenants or the platform | Scope on every write; account-management rule | Holds after KTA-001, 002, 005 to 008 |
| Platform admin, compromised | Everything | Delete guard needs the account password; audit log | By design. No second factor. |
| Holder of a leaked access token | Act as the user for up to 30 minutes | Token version: password change, logout-all, deactivation end it | Tokens live in web storage (KHS-043, open) |
| Holder of a reset link | Take over the account | Single use, 30 minutes, hashed at rest | Holds. Token is in the URL (KTA-034). |
| Holder of a document id | Download it | Authorization per document; signed 30-minute token | Holds. The token is a bearer value. |
| Operator | Read data on the server | None in the application | Out of scope; root container (KTA-028) |
| Bot | Flood public forms | 5 per hour per address | Holds, with KTA-020 |

## Historical data: what an order keeps

| Frozen on the order | Follows the live catalog |
|---|---|
| Service name (Arabic), category name, organization name | Service name (English) |
| Total price | Fee components shown beside it (KHS-034, B10-8) |
| Document requirements: names, required flag, extensions, size, verification and provider-visibility rules | Document definition records themselves |
| Expected duration and delivery dates | |
| Status history, assignment history, notes | Provider profile details |

Orders that existed before the requirements snapshot was introduced carry the catalog as it was on migration day (recorded in the hardening report).

## Client-audit regression

No fix in this audit touches the behaviour behind the original client items. The suites that proved them were re-run:

| ID | Status | Evidence in this audit |
|---|---|---|
| F01 to F06 | PASS | Browser journey and CMS spec; KTA-013 closes a gap left in F02 |
| U01 to U04 | PASS | `client-audit-ux.spec.js` at 390 px |
| D01 to D04 | PASS | Component tests in the 99 |
| B01, B02, B03, B06, B07 | PASS | Journey, role re-entry, idempotency, access specs |
| D05, D06 | CLIENT_INPUT_REQUIRED | Unchanged |
| B10 | BUSINESS_DECISION_REQUIRED | Unchanged; three more decisions added below |
| B04, B09 | BLOCKED_EXTERNAL | Unchanged |
| B05, B08 | NOT_IN_RELEASE_SCOPE | Unchanged |

## Client dependencies

| Item | Needed |
|---|---|
| D05 | Approved support contact details |
| D06 | Approved privacy-policy text |
| B10 | The eight decisions in `docs/audit/KHALSNI_CLIENT_DECISIONS_REQUIRED.md` |
| New | May an organization admin reset the password of that organization's customers? (KTA-039) |
| New | Which payment status changes are allowed, and what a refund record means (KTA-037) |
| New | How long backups of identity documents may be kept (runbook, section 3) |

## Top ten remaining risks

1. The deployed build still has the critical findings until this work is committed, reviewed and deployed.
2. No backup: one disk failure loses every order and document (KTA-012).
3. Rate limits are bypassable until the proxy count is set and verified on the server (KTA-020).
4. Demo administrator credentials are public; the deployed database has not been checked for them (KTA-019).
5. Nothing here was verified on the server: proxy headers, TLS, media rules, Redis, logging.
6. Performance at volume is unknown; several lists are unbounded (KTA-029).
7. The mobile app has never been run against the current backend; its fixes are type-checked only.
8. Access and refresh tokens live in browser storage (KHS-043).
9. Role is carried twice (the `role` field and memberships). The fixes close the known gaps between them; the duplication remains and is where the critical findings came from.
10. The frontend failure handling added here is unit-tested, not exercised in a browser with forced errors.

## Exact release blockers

1. Review, merge and deploy branch `hardening/total-assurance-release`. Rebuild both images; the Compose file now includes Redis. Gates in `KHALSNI_RELEASE_GATE.md`.
2. Schedule backups with an off-server copy and complete one restore drill (`RECOVERY_RUNBOOK.md`).
3. Set `API_THROTTLE_NUM_PROXIES` and run the verification commands in `docs/hardening/KHALSNI_PRODUCTION_ENV_REQUIREMENTS.md` section 4.
4. Run `audit_demo_accounts` and `audit_access_review` on the deployed database (`PREDEPLOY_ACCESS_REVIEW.md`).
5. D05 and D06 content from the client.

## Exact next action

Review the diff, starting with `backend/organizations/selectors.py` (`can_manage_user_account`, `has_tenant_membership_history`), because those two rules change who can manage whom. Then commit and deploy to the development site and run the section 4 checks there.

Two behaviour changes need a word to the people affected before deploy:

- Organization admins can no longer create `support` users, add existing outside users to their organization, edit shared categories, or approve and deactivate providers.
- A partner employee whose membership is removed now loses all access. If any real account relies on the old behaviour (an internal employee who once had a partner membership), give it a platform membership first.
