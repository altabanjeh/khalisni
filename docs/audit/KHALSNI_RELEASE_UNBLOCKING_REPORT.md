# KHALSNI — RELEASE UNBLOCKING REPORT

BASE SHA: `2d40ec0` (the release-gate report commit, documentation only). The latest **product** commit at the base was `f69a8de`, the candidate the gate examined; `2d40ec0` changed only `docs/`.
FINAL SHA: the commit that adds this report on branch `fix/release-unblocking` (`git log -1 fix/release-unblocking`)
BRANCH: `fix/release-unblocking` (created from `2d40ec0`)
origin/main SHA: `ba7f94c` (unchanged; nothing was pushed)
WORKING TREE AT START: clean apart from four untracked evidence folders from earlier passes
DATE: 2026-10-17

No deployment happened in this task. No owner or legal content was invented. No financial value was changed.

Evidence: `docs/audit/evidence/release-unblocking-2026-10-17/` (text only, secrets redacted; a scan for the stack's passwords found none).

| Item | Result |
|---|---|
| DB ROLE | **PASS** |
| D02 | **CLOSED** |
| D03 | **CLOSED** for the defined residual (historical system-generated notes and notifications); one separate content gap recorded below |
| D05 | **BLOCKED** (validation ready; approved values not supplied) |
| D06 | **BLOCKED** (storage and rendering verified; approved text and retention not supplied) |
| B10-10 | **BLOCKED — OWNER PRICING DECISION REQUIRED** |
| RUNBOOK | **PASS** |
| REPOSITORY HYGIENE | **PASS** |
| TEST BOOTSTRAP | **PASS** |
| REGRESSION | **PASS**: PostgreSQL 647 OK; SQLite 647 OK (7 skipped); frontend 156/156; lint and mobile typecheck clean; Playwright 481 passed, 0 failed, 19 designed skips; lifecycle passed on the production-layout stack |

---

## A. Release baseline

- `2d40ec0` = `f69a8de` + `docs/audit/KHALSNI_FINAL_RELEASE_CLOSURE.md` and its evidence. `git log -1 --format=%h -- backend frontend mobile scripts docker-compose.yml .env.example` at the base returns `f69a8de`.
- The product changes of this pass sit on top of that.

## B. PostgreSQL application role (release blocker)

ROOT CAUSE: `docker-compose.yml` passed one `POSTGRES_USER` to the `db` service, which the postgres image creates as a **superuser**, and to the `backend`. `entrypoint.sh` migrated and served with it, so the running application owned every table and could disable the consent triggers.

DESIGN (three roles; no password in the repository):

| Role | Variables | Used by | Rights |
|---|---|---|---|
| Cluster admin | `POSTGRES_USER`, `POSTGRES_PASSWORD` (unchanged names, so existing environments keep working) | `db`, the one-shot `db-init`, `scripts/backup.sh`, `scripts/restore.sh` | superuser |
| Owner / migrator | `KHALSNI_DB_OWNER_USER`, `KHALSNI_DB_OWNER_PASSWORD` | `db-init` only (migrations) | LOGIN; no SUPERUSER, CREATEDB, CREATEROLE, REPLICATION or BYPASSRLS; owns the database, schema `public` and every object in it |
| Application | `KHALSNI_DB_APP_USER`, `KHALSNI_DB_APP_PASSWORD` | the running backend | LOGIN; same "no" flags; owns nothing; DML only |

IMPLEMENTATION:
- `backend/ops/db_bootstrap.py` (new; plain psycopg, no Django). Run with the admin credentials, it creates or updates both roles, resetting passwords from the environment so rotation works. It refuses identical role names or identical owner and app passwords.
- It moves every table, view, sequence and function in `public` that another role owns to the owner. That includes the consent trigger function, and it is what upgrades existing deployments.
- Then it applies the grants:
  - `REVOKE ALL ON DATABASE … FROM PUBLIC`; `GRANT CONNECT … TO app`
  - `REVOKE CREATE ON SCHEMA public FROM PUBLIC`; `GRANT USAGE ON SCHEMA public TO app`
  - `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app`
  - `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app`
  - `ALTER DEFAULT PRIVILEGES FOR ROLE owner IN SCHEMA public` with the same table and sequence grants, so future migrations are covered
  - `REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES … FROM app`
- `db_bootstrap.py` fails if the app role owns anything or is a superuser.
- `backend/ops/db_init.sh` (new) runs three steps: roles, then `migrate` with `POSTGRES_USER`/`PASSWORD` set to the owner, then grants.
- `docker-compose.yml`:
  - new one-shot `db-init` service (backend image, `restart: "no"`) with the admin, owner and app variables;
  - the backend's `POSTGRES_USER`/`POSTGRES_PASSWORD` now come from `KHALSNI_DB_APP_*`, so the backend never receives admin or owner credentials;
  - the backend `depends_on: db-init: service_completed_successfully`.
- `backend/entrypoint.sh` no longer migrates. It waits until `migrate --check` passes, in case Coolify starts the backend early, and fails with an explicit message after about 5 minutes.
- `scripts/restore.sh` runs `db-init` after `pg_restore`. The dump is restored by the admin with `--no-owner`, so ownership has to be handed back.
- `.env.example` and `backend/.env.example` describe the roles. `docs/DEPLOYMENT.md` has a "Database roles" section: exact grants, the upgrade procedure, verification commands and Coolify notes. `KHALSNI_PRODUCTION_ENV_REQUIREMENTS.md` is updated.
- `.gitattributes` (new): `*.sh text eol=lf`. Windows checkouts had CRLF shell scripts, and a container built from them fails. Servers were unaffected because the index already stores LF.

B1. TESTS on PostgreSQL 16, with the real `docker-compose.yml` built and run under separate project names (a scratch override only published a local port and relaxed HTTPS-only settings):

1. **Fresh database**: bootstrap, migrate, application (`b1_startup.txt`, `b1_roles_grants.txt`, `b1_identity_seed.txt`):
   - `db-init` created both roles, migrated as `khalsni_owner` through `orders.0019` and `services.0015`, applied grants, and exited 0.
   - The backend waited for migrations, created the admin and became healthy. Inside it, `current_user = khalsni_app`, superuser false, and no admin or owner variable exists in its environment.
   - Ownership: the database, schema, 58 tables, 589 indexes, 56 sequences and the trigger function all belong to `khalsni_owner`.
   - `khalsni_app` holds exactly SELECT/INSERT/UPDATE/DELETE on 58 tables and USAGE/SELECT on 56 sequences, with no UPDATE on sequences, no schema CREATE, no TEMP and no database CREATE.
2. **Normal workflows as the app role**: demo and QA seeds, then the full UI lifecycle through nginx (`journey_stack_part1.txt`, `journey_stack_part2.txt`):
   - submit with consent (one order on double click and refresh), review, missing document, bell, upload, resubmit, verification;
   - provider assignment, provider progress, no provider name for the customer;
   - final result, approval, completion, notification;
   - download of the exact final bytes, and re-login.
   - **All steps passed.**
3. **Refusals as the app role**, using the backend's own runtime credentials against the consent row the journey created (`b1_app_bypass.txt`):

| Statement | Result |
|---|---|
| `UPDATE orders_orderconsent …` | refused by the **trigger** (`IntegrityError: Consent evidence is append-only. UPDATE refused.`) |
| `DELETE FROM orders_orderconsent …` | refused by the **trigger** (`… DELETE refused.`) |
| `ALTER TABLE … DISABLE TRIGGER orders_orderconsent_append_only` / `DISABLE TRIGGER ALL` | refused: must be owner |
| `DROP TRIGGER …` / `DROP FUNCTION …` | refused: must be owner |
| `TRUNCATE orders_orderconsent` | refused: permission denied |
| `DROP TABLE orders_orderconsent` / `ALTER TABLE … ADD COLUMN` | refused: must be owner |
| `SET session_replication_role = replica` | refused: permission denied |
| `CREATE TABLE` in `public` | refused: permission denied for schema |
| `ALTER ROLE current_user SUPERUSER` | refused |
| hard `DELETE` of the parent order | refused: foreign key |
| consent row afterwards | unchanged |

4. **Upgrade of an existing deployment** (`upgrade_before.txt`, `upgrade_after.txt`, `upgrade_bypass_idempotent.txt`):
   - A stack from the **base** commit's Compose file (single superuser) was seeded and given an order with consent.
   - In that layout the backend, as the superuser, could disable the trigger and rewrite the consent row. This was shown inside a rolled-back transaction.
   - The same volume was then switched to the new Compose file. `db-init` moved 59 objects (58 tables, with their sequences following, plus the trigger function) to the owner, found no migrations to apply, and granted the app role.
   - Data was intact (5 orders, 1 consent, accepted), the trigger was enabled, and the backend connected as `khalsni_app`.
   - Every bypass above was refused again.
   - A second `db-init` run moved 0 objects: idempotent.
5. **Backup and restore with the role layout** (`drill_backup.txt`, `drill_verify.txt`, `drill_restore.txt`):
   - `scripts/backup.sh` and `scripts/verify_backup.sh` passed.
   - An account added after the backup was removed by the `scripts/restore.sh --yes-overwrite` run (52 s), and row counts returned to the backup.
   - `db-init` inside the restore moved the 59 restored objects back to the owner.
   - The trigger was enabled, and the backend reconnected as `khalsni_app`.

Local-only quirks seen while testing on Windows, not product defects:
- Git Bash rewrites container paths unless `MSYS_NO_PATHCONV=1` is set.
- Host `tar` reads `C:/…` as a remote host, so the backup target has to be a relative path.

STATUS: **PASS**. On production this still needs: setting the four variables and deploying, which runs the upgrade path above; then confirming with the three commands in `DEPLOYMENT.md` → "Database roles".

## C. D02: duplicated customer copy

ROOT CAUSE: for a price that is not known yet, `getServicePublicPrice` returns the approved note as both the price **label** and the **note**. The service page showed the label in the hero chip and the note in the summary strip below it. Each related-service card also showed its own label, which was the same sentence, so one page showed it 6 times (`ODI-D02-legacy-service-page.txt` from the gate).

PRESENTATION HIERARCHY (no wording, fee, price type or catalogue data changed):
- **Hero chip:** carries the price sentence, once.
- **Summary strip:** shows the price note only when it differs from the hero label. For a fixed-price service the hero shows the total, so the note still appears once.
- **Aside:** unchanged; it already skipped a note equal to the price note.
- **Related cards on a service page:** receive `priceShownAbove`. A card whose price is the same unknown-price sentence leaves its price chip out. A card with a known total always shows it.
- **Catalogue grids, home and category pages:** unchanged. There each card's chip is that service's own price, not a repetition of a primary summary.

Files: `frontend/src/pages/public/ServiceDetailsPage.jsx`, `frontend/src/components/ServiceCard.jsx`.

TESTS (`ServiceDetailsPage.duplication.test.jsx`, new):
- A quotation service with 4 identical related quotation services shows the approved sentence **exactly once**, and the delivery note once.
- A fixed-price service shows its total and the note once.
- A related card with a known total still shows it.
- On the old components, the quotation and related-card tests fail; the fixed-price test is a control (`d02_tests_on_base.txt`).

STATUS: **CLOSED**

## D. D03: legacy system English

EXISTING MECHANISM (P2): exact-sentence maps render legacy rows at read time.
- `orders/system_events.py` maps status-log notes to codes, which the web timeline renders in AR/EN.
- `notifications/legacy_content.py` maps notification titles and messages; the server returns Arabic for Arabic requests, on web and mobile.
- Rows are never rewritten, and typed text is never translated.
- The status log is an audit trail, so render-at-read was kept instead of rewriting rows.

INVESTIGATION (the real legacy catalogue copy; every text column scanned, `d03_latin_scan.txt`):

| Source | English values | Classification | Rendered in Arabic UI |
|---|---|---|---|
| `orders_orderstatuslog.note` | "Order under review", "Provider completed work and uploaded final result", "Order completed" | system sentences in the map | code, so Arabic (web). The mobile app does not render status logs. |
| `orders_orderstatuslog.note` | "review", "assign", "start", "wait" (8 rows) | **typed through the status API by debug accounts** (`admin-debug-2/3@example.com`, `provider-debug-2/3@example.com`, 2026-05-05). No code writes these words. | shown as typed (rule: never translate authored text) |
| `notifications_notification` | "Order received", "New assigned order", "Final result uploaded", "Order completed", "More documents required" and their 4 message forms | system sentences in the map | Arabic, server-side |
| `orders_orderassignmenthistory.note` | "Order under review", "assign" | system or typed | not shown in any Arabic screen; only the English Django admin |
| `documents_document.verification_note` | "Approved automatically by service rule." (written by `create_order_document` for auto-approved documents) | **system sentence with no Arabic rendering**. The mobile app shows it to the owning customer ("ملاحظة التحقق: …", verification note). | **fixed in this pass** |

CHANGE:
- `documents/presentation.py`: `SYSTEM_VERIFICATION_NOTES` and `localized_verification_note()`. An Arabic request gets "اعتُمد تلقائياً وفق قاعدة الخدمة." ("approved automatically under the service rule"); English is unchanged.
- It is applied in `DocumentSerializer` (owner and staff branch) and `StaffDocumentSerializer`.
- Exact sentence only; the stored row is unchanged; typed notes are never translated.

TESTS (`public_site/tests_release_unblocking.py`, `LegacySystemTextTests`, built from the exact legacy corpus):
- All legacy notification rows render with none of the English system phrases.
- A typed staff message is unchanged.
- Two reads are identical (idempotent).
- Stored rows are unchanged.
- The three system status notes get their codes, the four typed words get none, and stored `system_event` stays empty (no rewrite).
- The auto-approval note is Arabic for customer and staff Arabic requests and English for English, with the row unchanged; a typed note is untouched.

STATUS: **CLOSED** for the defined residual (historical system-generated notifications and status notes, plus the one current system note found).

SEPARATE CONTENT GAP (observed, not part of this residual, not changed):
- Migration `help_guides.0004_manual_guide_library` ships three help-manual guides in English only: "How to Navigate the System", "Login and Account Access", "How to Add Screenshots to the Manual". They appear in the in-app help library for all roles.
- Two related-service messages in the legacy catalogue (`ServiceRelation.message_to_customer`) are English text in an Arabic-only field.
- Both are authored content that needs Arabic text written. They are listed under owner input below.

## E. B10-10: pricing safety

No owner decision was supplied, so **no financial value, price type or price display was changed.** The decision paths are recorded for the owner:

| Option | Effect on the public site | Data change |
|---|---|---|
| A. Total only | Fixed-price services show only `total_price`; the component breakdown is hidden | none |
| B. Full breakdown | The owner defines the customer-facing meaning of `base_price`, `government_fee`, `service_fee`; shown components must sum exactly to the total | per the owner's definitions |
| C. Restructured breakdown | The owner's exact mapping | per that mapping |

Current contradiction (gate evidence): passport renewal shows a total of 64 with visible parts 20 + 12.

STATUS: **BLOCKED — OWNER PRICING DECISION REQUIRED**

## F. D05 / D06: validation only

D05 (no contact value supplied or replaced):
- `core/reserved_domains.py` (new) recognises reserved, undeliverable domains: `.local`, `.localhost`, `.test`, `.example`, `.invalid`, `.internal` (reserved top-level domains).
- **Admin write**: `PublicPageContentAdminSerializer.validate_email` refuses a reserved-domain address with a clear message. A real address or blank is accepted.
  - Consequence: an admin saving the CMS row while it still holds `support@khalisni.local` must replace or blank it first.
- **Public read**: `PublicPageContentPublicSerializer` leaves a reserved-domain email out of the public payload. The stored value is unchanged, and the footer then shows the remaining details or "معلومات التواصل غير منشورة حالياً." ("contact details are not published yet").
- **tel: link**: the footer's `tel:` URI now holds only `+` and digits (`+962 6 560 9000` → `tel:+96265609000`); the visible text is unchanged. `mailto:` is unchanged.
- **WhatsApp**: the number is stored but rendered nowhere (unchanged; showing it is an owner choice).
- **Phone and address**: cannot be verified automatically; the owner confirms them.
- **`manage.py check_public_content`** (new, read-only):
  - lists the published row's contact fields, reserved-domain email, blank fields, missing privacy text and a reserved sender;
  - `--strict` exits 1 while anything needs owner input, usable as a pre-deploy gate;
  - it never changes data.
- **Deploy check `khalsni.W001`** (`manage.py check --deploy`): `DEFAULT_FROM_EMAIL` on a reserved domain (the shipped default `no-reply@khalisni.local`).

D06:
- AR and EN policy are stored and served together; one language alone is refused (model rule); the privacy page renders the CMS text (existing test).
- **No policy version or date mechanism exists** beyond the content row's `updated_at`. None was added.
- **Retention:** `KHALSNI_BACKUP_KEEP` (backup rotation) and `report_document_retention` (read-only purge candidates) take a value once the policy exists; both remain unset by design.

TESTS:
- `public_site/tests_release_unblocking.py`: `ReservedDomainTests`, `PublicContactValidationTests` (5), `PublicContentReportTests` (3), `SenderDeployCheckTests` (2).
- `frontend/src/layouts/PublicLayout.contact.test.jsx` (3): valid tel/mailto, no mail link for a blank email, and the "not published" text when everything is blank.

STATUS:
- **D05 BLOCKED**: validation ready; approved values not supplied; current data untouched.
- **D06 BLOCKED**: approved text and retention periods not supplied.

## G. Recovery runbook

`docs/total-audit/RECOVERY_RUNBOOK.md` section 5 is rewritten:
- **The rule**: restore from the pre-deploy backup is the preferred recovery.
- **Forward and reverse effects** for `orders.0015`–`0019` and `services.0014`–`0015`:
  - `0018` reversal destroys consent evidence: irreversible once used;
  - `0019` reversal removes the database protection;
  - `services.0014`/`0015` reverse as no-ops;
  - `0017` is not tested backward.
- **What redeploying older code means while consent exists**: pre-`0018` code writes no consent.
- **Keep the schema forward.**
- **The triggers block data cleanup by design.**
- **Owner-role migrations** and `db-init` after any restore or manual schema work.

Also updated: the backend-container recovery row, the restore description (it runs `db-init`), and the drill status with this pass's role-layout drill.

STATUS: **PASS**

## H. Repository hygiene

- Removed from the tree (history not rewritten):
  - the two Chrome user-data directories under `docs/khalsni-ui-overhaul/before/` (1,102 tracked files, plus 24 untracked, ignored `.log` leftovers);
  - `live.js` and `live-index-qDIlOwN4.js` at the repository root.
- Re-confirmed beforehand: nothing outside the audit reports references them, the gate found no credentials or tokens in them, and the six real "before" screenshots in that folder are kept.
- `.gitignore` additions:
  - browser-profile patterns (`**/chrome-*/Default/`, `**/User Data/`, `**/Default/Cookies*`, `Login Data*`, `History*`, `Local Storage/`, `Network/`, cache folders);
  - root bundle patterns (`/live*.js`, `/index-*.js`, `/assets/`).
- `generate_manual.py`: the hard-coded `D:\ghassan\…` paths now default to the repository root and can be overridden with `KHALSNI_MANUAL_IMAGES` / `KHALSNI_MANUAL_OUT`.
- Left as is: absolute paths inside committed evidence probe scripts and in `docs/khalsni-system-discovery` (records, not active helpers).
- Side effect: the Windows path-length failure that blocked checking out the base commit (`Filename too long` in the profile) no longer applies to new checkouts.

STATUS: **PASS**

## I. Test environment reliability

ROOT CAUSE: in QA mode the Playwright web server ran only `seed_client_audit_qa`, while most specs sign in as `seed_demo` accounts. A fresh database therefore failed 281 tests with login 401, and a passing run depended on an older database.

CHANGE (`frontend/playwright.config.js`; test bootstrap only):
- The backend command is now always `migrate` and `seed_demo`, plus `seed_client_audit_qa --rebuild-owned` in QA mode.
- QA mode starts from a fresh database file (`E2E_KEEP_DB=1` reuses it; `E2E_FRESH_DB=1` forces fresh elsewhere).
- One documented command: `docs/testing/E2E_SETUP.md`.

STATUS: **PASS** (proven by the full Playwright run below, which started from an empty database file).

## J. Regression

| Run | Result |
|---|---|
| Backend, PostgreSQL 16 (throwaway container) | **647 tests OK, 0 skipped** (821 s) |
| Backend, SQLite | **647 tests OK (7 skipped)**: the previous 633 plus 14 new |
| Frontend `vitest run` | **48 files, 156 tests passed**: 6 new (D02 duplication 3, footer contact 3) |
| `npm run lint` | clean |
| Mobile `npm run typecheck` | clean |
| Playwright, full suite, QA mode, 5 viewports, **started with no database file** (the new bootstrap migrated and seeded everything) | **481 passed, 0 failed, 19 skipped**. Per spec: `a11y` 30, `axe-auth` 80, `p2-accessibility` 20, `client-audit-responsive` 1, `client-audit-acceptance` 10, `client-audit-idempotency` 10, `client-audit-ux` 15, `client-audit-role-reentry` 5, `hardening-access` 5, `hardening-closure` 10, `public` 50, `routes` 245. Designed skips: responsive ×4 (one project), `nginx-deployment` ×10 (needs nginx), `p2-accessibility` ×5. |
| Accessibility (axe) | included above: `a11y` 30/30 and `axe-auth` 80/80 across 5 viewports; `p2-accessibility` 20 passed |
| Full lifecycle on the **production-layout Compose stack, rebuilt from the final code**, backend as `khalsni_app` | part 1 **18/18**, part 2 **14/14** (`final_journey_part1/2.txt`) |
| App-role refusals on the final stack | 13/13 refused, consent row unchanged (`final_app_bypass.txt`) |
| D05 validation live on the final stack | public API hides a reserved email; `check_public_content --strict` exits 1 listing the open owner items; `check --deploy` raises `khalsni.W001` for a reserved sender (`final_d05_live.txt`) |

Explained and resolved during the pass:
- **First SQLite run**: 1 failure, `public_site.tests.PublicSiteAPITests.test_only_admin_can_write_public_site_content` (400 instead of 200). The new reserved-domain rule also listed the IANA example domains, and that existing test publishes `info@example.com`.
- **Fix**: the rule was narrowed to reserved **top-level** domains (`.local`, `.localhost`, `.test`, `.example`, `.invalid`, `.internal`) instead of changing the existing test. The rerun is the result above; the first run is kept (`sqlite_full_backend_run1_example_domain.summary.txt`).
- **First PostgreSQL run**: it had started on the same pre-fix code, so it was stopped and restarted.

No existing test was changed or weakened.

---

# STILL REQUIRES OWNER INPUT

- **D05:** verified support phone, email, WhatsApp, address (AR/EN) and hours, or approval to blank them. Validation and the `check_public_content --strict` gate are ready.
- **D06:** approved AR and EN privacy policy; retention periods for accounts, orders, documents, audit logs and backups (then `KHALSNI_BACKUP_KEEP` and the purge policy).
- **B10-10:** pricing decision A, B or C (section E).
- **Brand/domain:** canonical spelling and the sending domain for `DJANGO_DEFAULT_FROM_EMAIL` (`khalsni.W001` warns until set).
- **B10-8:** meaning of "verified".
- **B10-9:** unresolved document definitions, including the required "تفويض إن وجد" ("authorization, if any").
- **The remaining 15 land services:** whether they get the parcel/basin question.
- **`verification_note`:** A customer-facing, B staff-only, or C separate fields.
- **National-ID format** (and the type of company registration and trade-name numbers).
- **Arabic content for the three English help-manual guides and two English related-service messages** (section D).

# STILL REQUIRES DEPLOYED ENVIRONMENT

- **Push the candidate,** deploy the exact approved SHA and record the deployed SHA.
- **Database roles on production:** set the four role variables, deploy (runs the upgrade path), confirm with the commands in `DEPLOYMENT.md`.
- **Backups:** production cron entry, off-server copy, retention value, restore drill on production-like data.
- **Phone normalization:** `normalize_phones` dry run, manual review of invalid or collision rows, apply with a protected report, re-run the dry run.
- **SMTP:** real delivery, reset AR/EN and password-changed, links to the deployed domain.
- **Real devices:** physical Android Chrome and iPhone Safari.
- **Deployed checks:** end-to-end journey and authorization re-run on the deployed build.
- **Production public content:** `manage.py check_public_content --strict` passes.
- **F02:** recover `KH-2026-000001` on production with the audited operator command.

FINAL VERDICT: **PRE-DEPLOYMENT BLOCKERS PARTIAL**

The engineering blockers that can be closed before deployment are cleared: the database role, D02, D03, the runbook, repository hygiene and the test bootstrap. D05, D06 and B10-10 stay blocked on owner and legal input, and no content or pricing was invented to clear them.

This is not a release approval, and the original audit is **not** closed.
