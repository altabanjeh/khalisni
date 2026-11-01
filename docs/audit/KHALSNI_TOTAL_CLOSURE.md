# KHALSNI — TOTAL CLIENT-NOTE, REQUIREMENT, UI/UX, DATA, MOBILE & RELEASE CLOSURE

BRANCH: `fix/total-closure` (from `fix/client-acceptance-remediation` `fa5a19b`)
DATE: 2026-11-01
MATRIX: `docs/audit/KHALSNI_TOTAL_CLOSURE_MATRIX.csv`, built by `docs/audit/evidence/khalsni-total-closure-2026-11-01/build_matrix.py`
EVIDENCE: `docs/audit/evidence/khalsni-total-closure-2026-11-01/`
DECISIONS: `docs/final_review/TEAM_DECISION_LOG.md` (A: owner decisions, B: implemented rules, C: owner-only facts)

| Folder | Content |
|---|---|
| `evidence/` | browser probes on the migrated real-catalogue copy: PNG, page text, JSON results |
| `probes/` | the probe scripts: closure UI, purity, admin flows, repeater UI, real-catalogue journey, keyboard, off-canvas, screenshot harness |
| `catalogue/` | validator before/after, document merges (dry-run + apply), parcel gate and pricing before/after, demo-data audit |
| `legal/` | privacy policy and terms drafts (not approved) |
| `mobile/` | mobile harnesses: total closure 38/38, repeater 19/19, soft delete 9/9 |
| `ops/` | backup/restore drill, DB roles, SMTP sink proof, phone and F02 rehearsals, release gate, version endpoint |

No owner, legal, price or contact fact was invented. No test was weakened. No historical order or evidence was deleted. No production system was touched.

---

## A. FINAL VERDICT

**ENGINEERING CLOSURE COMPLETE — EXTERNAL ACCEPTANCE ITEMS REMAIN**

Every engineering-controlled requirement is PASS or justified NOT_APPLICABLE. The 17 EXTERNAL_EVIDENCE_REQUIRED rows are owner facts, legal approval, physical devices or production execution. They are listed in §F with the action, the person who does it and the evidence needed. "RELEASE ACCEPTED" cannot be claimed until those items have evidence.

## B. FINAL SHA

`{{SHA}}` on `fix/total-closure` (local; not pushed).

## C. DEPLOYED SHA

**Not deployed.** This pass has no production access and no verified production backup, and the runbook requires one before any production change. `/api/health/version/` and `frontend/version.json` report the build SHA. `scripts/release_gate.sh` refuses a wrong SHA (`ops/release_gate_run_wrong_sha_negative.log`). Deployment and its verification are row TC-DEPLOY-PROD (§F).

## D. REQUIREMENT COUNTS

| | Count |
|---|---|
| Total rows | 212 (189 earlier + 23 closure-pass rows) |
| PASS | 188 |
| NOT_APPLICABLE | 7 (B05, B08 by owner decision; CN-ACT-01, CN-VIS-01 process notes; PROP-WEB-01, PROP-MOB-01, ARCH-01 superseded/not contractual) |
| EXTERNAL_EVIDENCE_REQUIRED | 17 |
| FAIL | 0 |
| PARTIAL | 0 |

Before this pass: PASS 89 · PARTIAL 45 · BLOCKED 47 · N/A 8.

## E. ORIGINAL 26

| ID | Status | Basis |
|---|---|---|
| F01 | PASS | unchanged, regression |
| F02 | EXTERNAL_EVIDENCE_REQUIRED | code + rehearsal PASS (KH-2026-000001 back to review); production run needs access |
| F03 | PASS | unchanged |
| F04 | PASS | owner decision: exact reason to the owning customer (admin_flows 6/6b) |
| F05 | PASS | unchanged |
| F06 | PASS | unchanged |
| U01–U04 | PASS | unchanged |
| D01 | PASS | unchanged |
| D02 | PASS | approved wording |
| D03 | PASS | purity probe: 48 EN pages without Arabic; AR pages hold only identifiers and IP/SMS |
| D04 | PASS | brand migrations; 0 variants on AR/EN 1440/390 |
| D05 | EXTERNAL_EVIDENCE_REQUIRED | placeholders removed, "not published" state; values are owner facts |
| D06 | EXTERNAL_EVIDENCE_REQUIRED | versioned drafts + consent versions; legal approval needed |
| B01–B03 | PASS | unchanged |
| B04 | EXTERNAL_EVIDENCE_REQUIRED | no activation (owner); mail proven on an SMTP sink; real mailbox needed |
| B05 | NOT_APPLICABLE | owner: payments out of the MVP; staff records kept; customer writes 405 |
| B06 | PASS | provider hidden from customers |
| B07 | PASS | unchanged |
| B08 | NOT_APPLICABLE | owner: in-app notifications only |
| B09 | EXTERNAL_EVIDENCE_REQUIRED | physical devices |
| B10 | PASS | B10-1..10 all PASS |

## F. REMAINING EXTERNAL ITEMS

| Row | Exact action | Who | Evidence needed |
|---|---|---|---|
| D05 | Enter phone, email, WhatsApp, address and hours in /admin/public-site | Owner | Published contact page screenshot |
| D06 | Approve (or edit) the privacy and terms drafts; publish the version in /admin/public-site/legal | Owner + legal counsel | Published version id + written approval |
| OD-20 | Approve the consent wording (same text on web and mobile, v2) | Legal counsel | Approval record |
| OD-19 | Set retention periods for orders, documents and logs | Owner + legal | Written periods; then `retention_report` is configured |
| B04 | Provide production SMTP credentials; send a password reset to a real mailbox | Owner, then operator | Received message with headers |
| B09 / CN-ACT-14 | Run the journey on iOS Safari, Android Chrome and the Expo app on a phone | Owner/QA with devices | Dated recordings or a signed device checklist |
| CN-MAP-04 | Define provider compensation if an earnings figure is wanted | Owner | Written rule (then the view is built) |
| CN-BIZ-00 | Supply the company-type list and the governorate/municipality list (5 business services) | Owner | The lists; the services then become orderable |
| TC-PRICES | Confirm or correct the 8 fixed prices whose base equals government + service fee | Owner | Confirmation in admin |
| TC-SLOGAN-EN | Approve or replace the English slogan | Owner | Approval |
| TC-MOB-HOST | Provide the production API host for the mobile build | Owner/infra | Build config + smoke log |
| F02 | Run the F02 recovery on production after a verified backup | Operator | Command output + order status |
| TC-PHONE-PROD | Phone migration: dry-run → collision report → manual resolution → apply → dry-run | Operator + owner for collisions | The four outputs |
| TC-DEMO-PROD | `audit_demo_data`, then `--apply` | Operator | Both outputs |
| TC-BACKUP-PROD | Install the backup cron and the off-site target on the production host | Operator | `backup_status_check` JSON from production |
| TC-DEPLOY-PROD | Deploy the final SHA; run `release_gate.sh` against production | Operator | Gate output with the SHA |

The runbook for every operator step is `docs/operations/PRODUCTION_RELEASE_RUNBOOK.md` (with `DEPLOYMENT.md` and `RECOVERY_RUNBOOK.md`).

## G. DEFECT CLOSURE

| Severity | Before this pass | After |
|---|---|---|
| P0 | 0 | 0 |
| P1 | 0 objective (5 business services blocked on owner lists) | 0 objective; the same 5 services remain owner-blocked (CN-BIZ-00) |
| P2 | 1 (DEF-M11 mobile tracking/rating/delivery/safe areas) | 0: tracking, rating, delivery and safe areas shipped (mobile harness 38/38) |
| P3 | open UI items (English names in English admin tables, InlineHelp targets, timeline filler, notifications paging, rule-page duplicate editing) | 0 open |

Defects found and fixed during this pass:
- **Order uploads between 2.5 and 10 MB returned 500.** Django cannot copy an uploaded file held on disk. Fixed with `documents/upload_limits.copy_request_data`, with a regression test.
- **The admin service builder dropped `label_en`, `help_text_en` and `visible_when` on save** and turned option values into labels. This would have broken the parcel gate's "yes". Fixed, with tests.
- **Demo headline on the real database instead of the slogan.** Fixed by public_site 0012.
- **«خلّصني» in imported service text.** Fixed by brand migrations and the importer.
- **Delete-guard password errors had no Arabic text.** Fixed.
- **The user and advertisement delete reasons were discarded.** Fixed.
- **18 land-service terms and 17 help texts had no English.** Fixed (services 0022).
- **A lowered global upload limit was ignored once requirements carried their own size** (found by the full suite: `config.tests_hardening.test_oversized_upload_is_rejected`). Every requirement stores the standard 10 MB, so the new "larger of the two" rule always won. A requirement now raises the limit only when it deliberately allows more than the standard size. The full suites were re-run after the fix.
- **Next could stall when tapped before the catalogue loaded** on an order opened from a service page. The service was not selected yet, so step 0 validated an empty form. Next is now disabled until the catalogue has loaded (found by Playwright on mobile-390).
- **The notification bell lists every loaded notification** (newest first, with "load more") instead of the 5 newest. The acceptance spec relied on the old cut-off to pick "the last" notice with a given title. It now opens the notice for its own order (matching title and message); the assertions are unchanged.

## H. TEST RESULTS

| Run | Result |
|---|---|
| Backend SQLite (full) | **838 tests OK (7 skipped)** |
| Backend PostgreSQL 16 (full, throwaway container) | **838 tests OK, 0 skipped** |
| Frontend vitest | **85 files, 286 tests passed** |
| `npm run lint` | clean |
| Mobile `npm run typecheck` | clean |
| Mobile harnesses | total closure 38/38; repeater 19/19; soft delete 9/9 |
| Playwright full suite, 5 viewports, QA mode, empty database | **481 passed, 0 failed, 19 designed skips** (24.0 min, fresh QA database). The first full run had 475 passed and 6 failed: 5 from the acceptance spec's notification pick, and 1 from the early-Next race on mobile-390. Both were fixed (§G), the two specs then passed 20/20, and the full suite was re-run |
| axe | inside the Playwright run (a11y, axe-auth, p2-accessibility) |
| Keyboard / off-canvas probes | keyboard: skip link first (AR and EN); the notifications panel takes focus and returns it to the bell on Escape; the help panel keeps focus inside and closes on Escape; keyboard login works. Off-canvas: the closed drawer is aria-hidden, inert and visibility:hidden (`evidence/KEYBOARD-results.json`, `evidence/OFFCANVAS-results.json`). The probe's `skipLinkFirst` flag compares against English text; the Arabic first focus is the Arabic skip link |
| Screenshot harness | the 232-capture harness was not re-run in this pass. The changed screens are captured by the probes (`evidence/TC-*`, `RP-*`, `AF-*`, `RJ-*`) with overflow and console checks |
| `makemigrations --check`, `manage.py check` | no changes, no issues |

New backend tests in this pass:
- `config/tests_total_closure_authz.py`: authorization, messaging, reassignment, overdue alerts and complaints, delivery, profile, pricing leak, brand, slogan, national ID, success metrics, monthly report and export.
- `services/tests_total_closure.py`.
- `services/tests_repeater_fields.py`.
- `services/tests_developer_note_items.py`.
- `core/tests_version.py`.
- `core/tests_admin_soft_delete_contract.py`.

## I. REAL-CATALOGUE JOURNEY

On a migrated copy of the real catalogue, for the real imported service `business_trademark_services`, which was previously not orderable, with order KH-2026-000012. **27/27 PASS** (`evidence/REAL-CATALOGUE-JOURNEY-results.json`):
1. **Order:** UI registration; browsing the real category; the dynamic form; uploads; submit.
2. **Review:** employee review; a missing-document request; the customer bell; the customer resubmits; employee verification.
3. **Delivery:** provider assignment; the provider starts and uploads the final result; employee approval and completion; the completion notification; the final download, byte-identical to the upload; re-login.
4. **Checks:** no duplicate order, transition or notification.
5. **Added this pass:**
   - an admin related-service rule, and the suggestion after completion;
   - a customer message reaching staff;
   - a complaint filed and resolved;
   - a UI rating;
   - admin archive;
   - the monthly CSV, which contains the order but no email or phone.

Also on the real copy:
- **admin_flows: 9/9.** Service edit shown on the public API; category image upload; guarded soft delete, the deleted filter and restore; a manual payment with customer writes refused (405); rejection with a reason shown in the customer UI.
- **repeater_ui: all steps PASS.**
  - The plots repeater appears only after "yes", starts at 2 rows, and adds and removes rows (AR 390 and EN 1366).
  - The server refuses an empty row.
  - Boundary coordinates and site photos are optional.
  - Engineering drawings accept 50 MB.
  - The partners repeater has 4 item fields.
- **closure_ui (AR/EN × 1440/390):**
  - slogan h1; 8/8 category worlds; total-only price (٣٦٫٠٠ د.أ / JOD 36.00);
  - draft banners on privacy and terms; contact "not published" with the form present;
  - parcel gate on a newly gated land service;
  - 0 pricing-invariant violations, 0 brand variants, 0 overflow, 0 console errors.

Earlier runs of the probes in this pass failed because of bugs in the probes themselves: selectors, a corrupt test image, the step order and an escaped newline. `RJ-ERROR-employee.*` is from such a run and is kept. Those runs left some records in the disposable copy (KH-2026-000009, PAY-000001, a probe document definition).

## J. MOBILE

The Expo app is Arabic-only:
- registration;
- tracking;
- rating;
- delivery, notes, messages and complaints cards;
- legal documents screen;
- consent mobile-v2;
- safe areas;
- LTR layout lock plugin;
- repeater fields in the order form;
- order answers on the provider, employee and admin order details;
- form timing;
- admin delete/restore with an Active/Deleted/All filter on Services, Users and Advertisements.

Results: typecheck clean; harnesses 38/38, 19/19 and 9/9. **Not run on a device or simulator** (B09/CN-ACT-14). The production API host is an owner input (TC-MOB-HOST).

## K. ACCESSIBILITY

- axe on public and auth pages in 5 viewports (Playwright a11y, axe-auth, p2-accessibility).
- Keyboard: the skip link comes first; dialogs take focus, return it and close on Escape; the closed mobile drawer is out of the tab order (keyboard: skip link first (AR and EN); the notifications panel takes focus and returns it to the bell on Escape; the help panel keeps focus inside and closes on Escape; keyboard login works. Off-canvas: the closed drawer is aria-hidden, inert and visibility:hidden (`evidence/KEYBOARD-results.json`, `evidence/OFFCANVAS-results.json`). The probe's `skipLinkFirst` flag compares against English text; the Arabic first focus is the Arabic skip link).
- Inline help targets are 32px; repeater add/remove buttons are at least 44px (web) and 44pt (mobile).
- `<html lang/dir>` and the document title follow the language.

## L. SECURITY / AUTHORIZATION

`config/tests_total_closure_authz.py` covers:
- customer↔customer isolation on orders, messages, complaints, rating, documents and download tokens;
- an unassigned provider is refused;
- internal notes hidden from customers and providers;
- provider identity hidden from customers (B06);
- tracking without a phone returns 404;
- notifications are private;
- staff and admin APIs refuse customers, providers and anonymous users;
- soft-deleted documents cannot be downloaded;
- download tokens are bound to the user and expire.

New endpoints are role-checked:
- messages, complaints and delivery;
- reassignment (CanAssignOrders);
- monthly report and export (admins only; the export has no personal data);
- the soft-delete contract (403 for non-admins).

## M. BACKUP + RESTORE

The local drill (`ops/drill_*`):
- built the images;
- seeded the database and ran an API journey;
- took a backup with a manifest, SHA256SUMS and a media inventory;
- verified an off-site copy;
- destroyed the stack and restored it.

After the restore, counts match and the 22 media files are byte-identical, the app connects with the non-owner role, and the consent trigger is enabled. A download works after the restore.

The drill caught two script bugs, fixed and re-run: a schema rollback check, and a media check that was too strict. A production cron and off-site copy are TC-BACKUP-PROD.

## N. SMTP

A local SMTP sink proved that password-reset and password-changed mail render and are delivered in Arabic and English (`ops/smtp/`). Production uses a real domain, never `.local`. A real mailbox is B04.

## O. PRODUCTION DATA

Nothing was run on production. Rehearsals on production-shaped copies:
- phone normalisation: 14 normalised, 0 collisions, second dry-run 0;
- F02 recovery: KH-2026-000001 back to review;
- `audit_demo_data`;
- the document-merge dry-run and apply.

Catalogue migrations (services 0017–0025, help_guides 0007–0008, public_site 0009–0012, orders 0020–0022) are idempotent, touch only values still in their known state, never rewrite orders, and have no-op reverses.

## P. FILES CHANGED

See `git show --stat f35a640` and `git show --stat {{SHA}}`. Main areas:
- **Backend:**
  - services: client categories, pricing, document merges, translations, repeaters, developer-note items, upload limits;
  - orders: messages, reassignment, delivery, complaints, overdue alerts, form timing;
  - reports: success metrics, monthly report, CSV;
  - accounts: national ID; public_site: legal, contact, slogan; core: errors, retention, version, production guard; notifications.
- **Frontend:**
  - category worlds; legal pages and editor; reports;
  - repeater fields; the admin builder fix; file size;
  - messages, complaints, delivery and reassignment panels;
  - order request details; delete modal tests.
- **Mobile:** repeater, soft delete, order answers, legal screen, rating/tracking/delivery cards.
- **Ops:** backup/restore scripts, release gate, version endpoint, nginx body limit.
- **Docs:** this report, the matrix, TEAM_DECISION_LOG, runbooks.

## Q. COMMITS CREATED

- `f35a640`: Total closure: client categories, legal/consent, contact, retention, messaging, reassignment, mobile parity, ops tooling.
- `{{SHA}}`: Total closure (final): repeaters, developer-note fields, large uploads, success metrics, monthly report/CSV, late alerts to customer/provider, national ID, mobile admin soft delete, matrix and report.

Nothing was pushed or deployed.

## R. ANYTHING NOT PROVEN

- **Not tested on real devices.** The mobile app and responsive web have never been checked on a physical device; the Expo app has not been rendered on a device or simulator.
- **Production not touched.** Deployment, the production data steps, the backup cron, and SMTP with a real mailbox have not been done.
- **No legal approval.** The privacy, terms and consent texts are drafts.
- **Owner facts missing:**
  - contact values;
  - retention periods;
  - company-type and municipality lists (5 business services stay not orderable);
  - the 8 prices;
  - the English slogan;
  - the mobile API host;
  - provider compensation.
- **Design rows judged from screenshots.** CN-VIS-10/15/18/19/20 are PASS on screenshot review; the owner's visual sign-off is part of overall release acceptance.
- **Remaining Latin tokens on Arabic legal pages.** They show the version identifier `2026-11-01-draft` (kept for traceability) and the terms IP/SMS inside the legal drafts.
- **Mobile admin lists load only the first page,** including the Deleted view, as before this pass.
- **The mobile Services Deleted view does not show the delete reason.** The reason is saved, but the services admin serializer does not return it; Users and Advertisements show it.
