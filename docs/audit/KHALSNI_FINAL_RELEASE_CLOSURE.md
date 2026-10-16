# KHALSNI — FINAL RELEASE CANDIDATE & DEPLOYED CLOSURE GATE

RELEASE SHA (candidate examined): `f69a8de885076a516ef1dc4399154861c3fbc671` (branch `fix/final-pre-release-hardening`)
DEPLOYED SHA: **unknown / not verifiable.** No deployed environment, URL or server access was available to this gate, and the repository names no deployment target.
DATE: 2026-10-16
ENVIRONMENT: local workstation only. Throwaway PostgreSQL 16 (`postgres:16-alpine`, Docker), the migrated legacy catalogue copy (the "T" environment of the previous pass), and the test runs of the frozen candidate.
DATABASE: PostgreSQL 16, production-like role split (separate non-superuser migrator and application roles), created for this gate and removed afterwards.
MIGRATION HEAD: `orders.0019_order_consent_append_only`, `services.0015_national_id_fields_as_text` (every app's head is listed in section 4)

AUTOMATED TESTS (frozen candidate `f69a8de`):
- BACKEND: SQLite 633 OK (7 skipped); PostgreSQL 16 633 OK (0 skipped)
- FRONTEND: 150/150 passed, lint clean
- PLAYWRIGHT: 481 passed, 0 failed, 19 designed skips
- MOBILE: `npm run typecheck` clean (no other mobile test suite exists)

| Gate | Result |
|---|---|
| BACKUP | **FAIL**: no production scheduler, no production backup, and no production restore drill was evidenced. A local database-level drill passed (section 6). |
| SMTP | **FAIL**: not executed; no real SMTP service or QA mailbox was available |
| REAL ANDROID | **FAIL**: not executed; no device |
| REAL IOS | **FAIL**: not executed; no device |
| PHONE MIGRATION | **FAIL**: not run on production data. The legacy copy is clean (section 5). |
| CONSENT DB PROTECTION | **FAIL as configured for release**: the protection works when the application role is separated (proven, section 4), but the shipped `docker-compose.yml` runs the application as the PostgreSQL superuser that owns the tables |
| END-TO-END | **FAIL**: not executed on a deployed build (no deployed build); the local end-to-end passed in the previous pass |

ORIGINAL 26 FINDINGS CLOSED: **16/26** CLOSED, plus 2 NOT_APPLICABLE by owner scope. Of the other 8, 5 are BLOCKED and 3 are OPEN (section 12).

VERDICT: **RELEASE HOLD — SPECIFIC BLOCKERS REMAIN**

This gate made **no code, data or configuration change** to the product. It created only this report and its evidence folder, plus throwaway databases and containers outside the repository, which were removed afterwards.

---

## 0. Audit chain read

Read for this gate:
- `KHALSNI_ORIGINAL_AUDIT_CLOSURE.md`
- `KHALSNI_P1_REMEDIATION_REPORT.md`
- `KHALSNI_P2_OBJECTIVE_REMEDIATION_REPORT.md`
- `KHALSNI_OWNER_DECISION_DOSSIER.md`
- `KHALSNI_OWNER_DECISIONS_IMPLEMENTATION_REPORT.md`
- `KHALSNI_FINAL_PRE_RELEASE_HARDENING.md`
- `docs/PRD.md`, `docs/SRS.md`, `docs/DEPLOYMENT.md`
- `docs/total-audit/RECOVERY_RUNBOOK.md`

Requirement anchors used below:
- PRD: notifications are in-system only (no external gateway) in the MVP.
- SRS: PostgreSQL in production, Dockerized deployment, internal notes hidden from customers, files validated, protected downloads, orders archived and not hard-deleted.
- Neither document mentions payment, privacy text, contact data, SMTP or a native mobile app.

## 1. Release identity

| Item | Value | Status |
|---|---|---|
| BRANCH | `fix/final-pre-release-hardening` | — |
| RELEASE SHA | `f69a8de` | candidate only; no approved release tag exists |
| origin/main SHA | `ba7f94c` (`git ls-remote origin`: the only remote branch) | **behind the candidate by 6 commits** |
| Unpushed release commits | `df0be19`, `ec3e70c`, `f5b98b9`, `3f0af8f`, `9b5335e`, `f69a8de` | none of the audit, P1, P2, owner-decision or hardening work is on the remote |
| DEPLOYED SHA | **unknown**: no deployment URL, server, Coolify project or health endpoint was available; `.github/workflows/ci.yml` builds artifacts but deploys nothing; the docs use `app.example.com` | **HOLD** |
| DATABASE MIGRATION HEAD (candidate) | see section 4 | verified locally |
| FRONTEND BUILD ID | no deployed build to read; the local production build of the same frontend source was used by the previous pass's tests | — |

Under the gate's rule, deployed SHA ≠ approved release SHA means HOLD. Here the deployed SHA cannot even be established, and the candidate is not on the remote. Whatever is deployed today, if anything, cannot contain this candidate unless it was deployed from this workstation, and there is no evidence of that.

## 2. Owner / client decisions

| Item | State | Category | Release impact |
|---|---|---|---|
| D05 support contact data | **Not decided.** The real (legacy) active CMS row still publishes `+962 6 560 9000`, WhatsApp `+962 79 000 0000`, `support@khalisni.local` (undeliverable) and an unverified Shmeisani address (`runtime/legacy_cms_contact_row.txt`). | known placeholder / misleading public content | **BLOCKER** (gate rule) |
| D06 privacy policy / retention | **Not decided.** `privacy_policy_ar/en` are empty in both CMS rows, so the site falls back to the built-in generic text. No retention periods exist (the backup rotation and document purge hooks are deliberately unset). | missing legal content | **BLOCKER** (gate rule) |
| B10-8 verification semantics | Code no longer derives "verified" from `is_active` (P2); the business meaning is undecided | C: non-blocking, post-release | non-blocking if the owner accepts |
| B10-9 document definitions | Authorization family, personal-ID types and three approval definitions unmerged; "تفويض إن وجد" ("authorization, if any") is required in 8 services | needs owner call | blocking only if the owner says so; the "if any" document marked required is a customer-facing inconsistency |
| B10-10 `base_price` semantics | Undecided; fixed-price services show parts that do not add up (passport renewal: total 64, parts 20 + 12) | contradictory pricing on the public site | **BLOCKER** under section 13 ("pricing does not present contradictory totals") until decided or hidden |
| Brand / domain spelling | Undecided (`Khalsni` / `Khalisni` / `khalisni.com`); `DEFAULT_FROM_EMAIL` defaults to `no-reply@khalisni.local` unless the environment sets it | needs owner value | blocking for SMTP (sender domain) |
| Remaining 15 land services (parcel question) | Undecided; they keep parcel and basin always required | C: non-blocking | non-blocking (current behaviour is consistent) |
| `verification_note` visibility | Undecided (A/B/C); public-tracking leak closed in the hardening pass | C: non-blocking | non-blocking (current exposure is limited to staff and the owning customer) |
| National-ID format policy | Undecided; fields are text with no format rule | C: non-blocking | non-blocking |
| B05 payment | Decided: out of release (customer create path closed) | B: out of release | none |
| F04, B06, D02 wording, B10-1/2/3/4/7, phone policy, B04 | Decided and implemented | A | none |

No answer was invented here.

## 3. Clean release candidate

| Check | Result |
|---|---|
| Working tree | Clean apart from four untracked evidence folders from earlier passes (screenshots; intentionally not committed) |
| Secret scan | The repository has no secret-scanning tool (no gitleaks, detect-secrets or trufflehog configuration). A pattern scan of all tracked files (private keys, AWS/GitHub/Slack/Stripe/Google token shapes, assigned `SECRET_KEY`/`PASSWORD`/`TOKEN` literals) found **no production secret**. Literals found are the documented demo passwords (`README.md`, e2e helpers, `.env.example` comments), the settings fallback `dev-only-insecure-key-not-for-production`, and a synthetic provider password in the hardening probe evidence. |
| **Committed browser profiles** | **FAIL (hygiene):** `docs/khalsni-ui-overhaul/before/chrome-customer-order-detail/` and `chrome-customer-orders/` are two complete Chrome user-data directories: 792 files, about 90 MB, including `Cookies`, `Login Data`, `History`, `Local Storage`, `Preferences`. They were added in `ea8d0c1` (2026-08-15) and are on `origin/main`. Inspection of copies: no cookies, no saved logins, history only `127.0.0.1:5173`, no tokens in local storage, so there is **no credential exposure**. They are still debug artifacts in the repository and its history. |
| Root build bundles | **FAIL (hygiene):** `live.js` and `live-index-qDIlOwN4.js` (183 KB each, built Vite output) are committed at the repository root (`4ab280d`, 2026-06-17) |
| Evidence screenshots | 12 original-audit PNGs (1.8 MB) under `docs/audit/evidence/` are committed (`ba2ba31`, on `origin/main`). The later passes' screenshot folders are untracked as intended. |
| Absolute local paths | None in shipped code (backend apps, `frontend/src`, `mobile/src`, scripts, Compose). Present in `generate_manual.py` (root helper: `D:\ghassan\…`), in `docs/khalsni-system-discovery`, and in the hardening pass's probe and harness evidence (`D:/ghassan/frontend/package.json`). |
| Scratch databases | No `.sqlite3`, `.db`, `.log`, `.pem` or `.key` tracked; `.env` is ignored |
| `.local` addresses | Seeds, tests, README, `.env.example` comments and the frontend's test-mode mock data (used only when `MODE === 'test'`) use `@khalisni.local` by design. **Production-relevant**: `DEFAULT_FROM_EMAIL` and Compose default to `no-reply@khalisni.local`, so the deployment must override it, and the legacy CMS row publishes `support@khalisni.local` and `info@khalisni.local` (D05). Guest accounts get `@guest.khalisni.local` internal addresses (never shown or mailed, by design). |
| TODO/FIXME | No TODO/FIXME marking a known release blocker was found in shipped code |
| Mojibake in shipped bundle | The test-mode mock data in `frontend/src/api/services.js` and `utils/mockData.js` contains mojibake Arabic (`Ù…Ø±ØªØ¨Ø·Ø©`). It is reached only in test mode, so it is not user-visible, but it is bundled. |

## 4. Database migrations (production-like PostgreSQL)

Setup (`pg_migrations.txt`, `pg_heads_triggers_roles.txt`):
- Roles:
  - `khalsni_migrator`: non-superuser, owns the database and schema, runs migrations;
  - `khalsni_app`: non-superuser, non-owner, granted only `SELECT/INSERT/UPDATE/DELETE` and sequence usage through default privileges.
- Checks as the migrator (`DJANGO_DEBUG=False`):
  - `makemigrations --check --dry-run` reports "No changes detected";
  - `migrate --plan` and `migrate` both exit 0.

Migration heads:

| App | Head |
|---|---|
| accounts | `0007_customuser_token_version` |
| audit | `0005_alter_auditlog_action` |
| documents | `0007_add_order_deleted_status_index` |
| help_guides | `0006_…` |
| notifications | `0006_…` |
| orders | `0019_order_consent_append_only` |
| organizations | `0002_…` |
| payment | `0003_…` |
| providers | `0004_…` |
| public_site | `0007_publicpagecontent_privacy_policy_ar_and_more` |
| services | `0015_national_id_fields_as_text` |
| token_blacklist | `0013_…` |

Also confirmed:
- catalogue migrations `services.0014` and `services.0015`;
- `orders.0017`, `orders.0018` (the `OrderConsent` table) and `orders.0019`;
- trigger `orders_orderconsent_append_only` present and enabled (`tgenabled = O`).

Phone changes have no schema migration: they are application code plus the `normalize_phones` command.

Controlled test as the **application role** (`app_role_consent.txt`):

| Action as `khalsni_app` | Result |
|---|---|
| Seed reference data (`seed_demo`, `seed_client_audit_qa`) | OK (DML only) |
| Submit an order through the API with consent | 201 `KH-2026-000009`; consent row written (`order-consent-web-v1`, `ar`, `web`) |
| Ordinary order update | OK |
| `UPDATE` consent row | **refused**: trigger, `IntegrityError` |
| `DELETE` consent row | **refused**: trigger, `IntegrityError` |
| `ALTER TABLE … DISABLE TRIGGER` | **refused**: must be owner |
| `DROP TRIGGER` | **refused**: must be owner |
| `SET session_replication_role = replica` | **refused**: permission denied |
| `TRUNCATE` | **refused**: no privilege |
| `DROP TABLE` | **refused**: must be owner |
| Hard `DELETE` of the parent order | **refused**: foreign key |
| Consent row afterwards | unchanged |

**Release finding (BLOCKER).** The shipped `docker-compose.yml` passes one `POSTGRES_USER` to both the `db` service and the `backend` service. The `postgres` image creates that user as a **superuser**, and it owns every table. The application therefore runs as a superuser owner that can disable or drop the consent trigger, and the protection above is not in force under the documented deployment. `DEPLOYMENT.md` has no step creating a separate application role. Under the gate's rule (production role is superuser or owns the tables) this is a HOLD.

## 5. Production phone normalization

Not run: no production database. On the production-like legacy copy:
- the previous pass's dry run found 13 accounts and 1 missing-service request to normalize, 0 invalid, 0 collisions, and applied them with a report;
- this gate's dry run on the migrated copy shows **13 users and 1 request `unchanged`, 0 normalize, 0 invalid, 0 collisions** (`legacy_normalize_phones_dryrun_masked.txt`).

Production totals, the manual-review table, the protected apply report and the post-apply tracking test are **outstanding**. Until then tracking and downloads still match legacy values through `phones_match`.

## 6. Backup / restore

- **Production**:
  - no scheduler entry, recent backup, checksum result, off-server copy or retention setting was available to inspect;
  - the runbook itself states "Nothing is scheduled on any server yet";
  - retention is deliberately unset pending D06.
  - **FAIL.**
- **Local database-level drill** on the gate's PostgreSQL (`pg_restore_drill.txt`), with the same `pg_restore --clean --if-exists --no-owner` command as `scripts/restore.sh`:
  - the dump took 1 s and is 474 KB;
  - restore into an empty database: 6 s;
  - restore again over existing data, including consent rows and the trigger: 8 s;
  - counts were identical each time (9 orders, 1 consent, 9 documents, 11 users, 115 migrations);
  - the trigger was re-created and active afterwards (an UPDATE was refused).
  - This shows `orders.0019` does not break restore. It is not a production drill, and media were not part of it.
- **Runbook drift**: `RECOVERY_RUNBOOK.md` section 5 still says the only recent schema change is `orders.0015` and that "this audit adds no migration". The release adds `orders.0017`, `0018`, `0019` and `services.0014`, `0015`.
  - Reversing `orders.0019` drops the triggers (tested in the hardening pass).
  - `services.0014`/`0015` reverse as no-ops: the data stays converted.
  - Reversal of `orders.0017`/`0018` was not tested in this chain.
  - The rollback guidance must be updated before release.

## 7. SMTP

Not executed: no real SMTP credentials or controlled mailbox. The file-backend runs only prove the content: the reset email is Arabic with `Accept-Language: ar` and English without. Real receipt, sender domain, links to the deployed domain and the password-changed email are **unproven**. Password recovery ships in this release (forgot/reset flow is live in web and mobile), so this is a **HOLD** item.

## 8. Real devices

Not executed: no physical Android or iPhone. The previous pass's Playwright runs cover 390/430/768/1024/1366/1440 viewports and WebKit at 390. Under the gate's rule, emulation does not substitute.

The prompt mentions a Flutter app. Khalsni's mobile app (`mobile/`) is **Expo / React Native TypeScript**, not Flutter. No Android build was produced or tested in this gate.

## 9. Full automated regression (frozen candidate)

| Suite | Result | Notes |
|---|---|---|
| Backend, SQLite | **633 OK (7 skipped)** | run in the hardening pass on the exact tree committed as `f69a8de` (no code changed after the run; only report text) |
| Backend, PostgreSQL 16 | **633 OK, 0 skipped** (1628 s) | run by this gate, `pg_full_backend.txt` |
| Frontend `vitest` | **150/150** | same tree |
| Lint | clean | same tree |
| Mobile typecheck | clean | no other mobile tests exist |
| Playwright (a11y, axe on 5 viewports, responsive, P2 accessibility, acceptance, idempotency, UX, role re-entry, hardening access/closure, public, routes) | **481 passed, 0 failed, 19 skipped** | designed skips: `client-audit-responsive` ×4 (runs on one project), `nginx-deployment` ×10 (needs a real nginx), `p2-accessibility` ×5 (designed). One earlier attempt failed 281 tests with `login: 401` because the throwaway database had no demo accounts; the root cause is understood and documented, and the clean rerun is the result. |

## 10. Security / authorization recheck

On a deployed build: **not executed.**

Locally, against the frozen candidate, the adversarial coverage is green:
- `config.tests_acceptance_adversarial` and the hardening suites;
- `orders.tests_owner_decisions` (customer A/B, provider identity, rejection reasons, tracking);
- `orders.tests_final_hardening` (`verification_note` boundary, consent);
- `providers.tests_final_hardening` (malformed payloads never 500);
- the soft-deleted file and signed-download tests;
- Playwright `hardening-access`/`hardening-closure`.

The previous pass's runtime probes covered:
- customer B gets 404 on customer A's order;
- no provider key or name in customer JSON;
- no rejection reason or `verification_note` in tracking;
- customer payment POST 405.

The deployed re-run remains a gate item.

## 11. Final end-to-end journey (deployed build)

**Not executed:** there is no deployed build. The full UI lifecycle passed locally in the hardening pass (environment U, `KH-2026-000009`): submit with consent, review, missing document, notification, upload, resubmit, verify, assign, provider progress, final result, approval, completion, notification, download (bytes match), re-login; one order, no duplicate transitions or notifications.

## 12. Original 26-finding recheck

| ID | Final status | Evidence | Release impact |
|---|---|---|---|
| F01 | CLOSED | Original closure (genuine events, bell = dashboard) | none |
| F02 | **BLOCKED** | Code fixed (P1); the legacy copy stays in the safe state (`p1_f02_recheck`). The production record `KH-2026-000001` needs the audited operator recovery, which cannot be done without production access. | operator action on production |
| F03 | CLOSED | Original closure (readiness from `allowed_actions.readiness`) | none |
| F04 | CLOSED | Owner decision A implemented; owner sees the exact reason, others and tracking do not (ODI, FPH probes 18/18) | none |
| F05 | CLOSED | P1 fix; regression tests green | none |
| F06 | CLOSED | Original closure | none |
| U01 | CLOSED | Original closure | none |
| U02 | CLOSED | Original closure | none |
| U03 | CLOSED | Original closure | none |
| U04 | CLOSED | P2 registration validation; phone policy (canonical E.164) in the owner-decision pass | none |
| D01 | CLOSED | Original closure | none |
| D02 | **OPEN** | Admin-panel wording gone from all 38 live services (0 matches for "لوحة الإدارة" or "الإعدادات"). The original residual "de-duplicate the hero/summary rendering" is not done: the approved price sentence appears in the hero chip **and** the summary line, then on every related card (6× on one page, `ODI-D02-legacy-service-page.txt`). | minor UX; needs a fix or owner acceptance |
| D03 | **OPEN** | System-generated text localized (P2). Legacy notifications and status notes stored in English are still shown as stored (P2 "known remaining"). | minor; needs data cleanup or owner acceptance |
| D04 | CLOSED | Original closure (rendered brand consistent). The canonical Latin spelling and email domain remain an owner value (section 2). | brand value needed for SMTP sender |
| D05 | **BLOCKED** | Placeholder contact data live in the real CMS row (section 2) | **release blocker** |
| D06 | **BLOCKED** | No approved privacy text; generic fallback; no retention policy | **release blocker** |
| B01 | CLOSED | Full provider journey (original closure and later journeys) | none |
| B02 | CLOSED | P1 server-side requirement validation; malformed-upload tests green. `AdminDocumentViewSet` raw admin CRUD does not apply requirement rules (admin-only, noted in P1). | none |
| B03 | CLOSED | Original closure; re-login verified in every later journey | none |
| B04 | **BLOCKED** | Validation and reset content fixed (P2, hardening); activation decided "none" (owner). Real SMTP delivery unproven. | **release blocker** while password recovery ships |
| B05 | NOT_APPLICABLE | Owner decision: payment out of release; customer create path closed (405) | none |
| B06 | CLOSED | Original isolation matrix plus owner decision B (provider identity hidden) | none |
| B07 | CLOSED | Original closure; double-submit and refresh rechecked in later journeys | none |
| B08 | NOT_APPLICABLE | PRD: notifications in-system only in this MVP | none |
| B09 | **BLOCKED** | Real iOS Safari / Android Chrome not executed | **release blocker** |
| B10 | **OPEN** | B10-1/2/3/4/6/7 done; B10-8 code done (meaning undecided); B10-9 and B10-10 undecided; 15 land services undecided | B10-10 contradictory pricing is a blocker under section 13; others need owner acceptance |

Totals: **CLOSED 16**, **NOT_APPLICABLE 2** (B05, B08), **BLOCKED 5** (F02, D05, D06, B04, B09), **OPEN 3** (D02, D03, B10). They add up to 26.

## 13. Production public-content check

**Not executed on a deployed site:** there is none to inspect. From the production-like legacy data:

| Check | Result |
|---|---|
| Real contact details / support email | **FAIL**: placeholders (D05) |
| No `.local` public address | **FAIL**: `support@khalisni.local` in the active CMS row |
| Approved privacy policy | **FAIL**: none stored (D06) |
| Brand spelling | owner value pending |
| No admin-panel wording | PASS: 0 occurrences in 38 services |
| Pricing not contradictory | **FAIL**: fixed-price parts do not sum to the total (B10-10) |
| Debug services/categories, "????", public counts, links | not checkable without the deployed site. The QA service (`client-audit-qa-202610-service`) is seeded only by the QA command, which must not run in production. |

---

## Blockers and the smallest next action for each

1. **Release identity.** Push the candidate (or merge it to `main` through review), tag the approved SHA, deploy exactly that SHA, and record the deployed SHA from the running stack (for example the backup manifest's `commit`, or a build label).
2. **D05 contact data.** The owner supplies the verified phone, email, WhatsApp, address and hours, or approves blanking them. Then update the active CMS row and remove the `.local` addresses.
3. **D06 privacy and retention.** Legal supplies the AR and EN policy and the retention periods. Store them in `privacy_policy_ar/en`, then set `KHALSNI_BACKUP_KEEP` and the purge policy.
4. **B10-10 pricing.** The owner defines `base_price`, or approves hiding the component breakdown for fixed-price services, so that no public page shows parts that do not add up.
5. **Database role.** Add a separate non-superuser, non-owner application role to the deployment: migrations run as the owner, the app connects with DML-only grants (the role split proven in section 4). Then confirm with `\du` and table ownership on production.
6. **Backups.** Install the documented cron entry for `scripts/backup_scheduled.sh` with the off-server copy, run it once, run `verify_backup.sh`, and run the restore drill on a separate stack with production data. Record the times and invariants.
7. **Phone migration.** Take a verified backup, run `normalize_phones` (dry run), review any invalid or collision rows manually, apply with `--confirm NORMALIZE --report <protected path>`, re-run the dry run, then test tracking with the equivalent spellings.
8. **SMTP.** Configure the real SMTP service and the sender (`DJANGO_DEFAULT_FROM_EMAIL` on the approved domain), then prove mailbox receipt of reset (AR/EN) and password-changed emails with links to the deployed domain.
9. **Real devices.** Run the listed flows on a physical Android (Chrome) and a physical iPhone (Safari) against the deployed build.
10. **Deployed end-to-end and security re-run.** Repeat the lifecycle journey and the adversarial matrix on the deployed build.
11. **F02 data.** Recover `KH-2026-000001` on production with the audited operator command.

Non-blocking, recommended before release:
- remove the committed Chrome profiles and root bundles;
- update the runbook's rollback section for `orders.0017`–`0019` and `services.0014`–`0015`;
- decide or accept D02 repetition, D03 legacy text, B10-8/9, the 15 land services, `verification_note` and the national-ID format.

## Evidence

`docs/audit/evidence/final-release-gate-2026-10-16/` (text only; the throwaway database password is redacted):
- `pg_migrations.txt`
- `pg_heads_triggers_roles.txt`
- `app_role_consent.py` / `.txt`
- `pg_restore_drill.txt`
- `pg_full_backend.txt` (summary)
- `legacy_normalize_phones_dryrun_masked.txt`
- `legacy_cms_contact_row.txt`
- `hygiene_scan.txt`

VERDICT: **RELEASE HOLD — SPECIFIC BLOCKERS REMAIN**

The original audit is **not** closed.
