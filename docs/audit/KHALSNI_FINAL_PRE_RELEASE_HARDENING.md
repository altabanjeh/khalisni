# KHALSNI — FINAL PRE-RELEASE HARDENING

BASE SHA: `9b5335e` (end of the owner decision implementation, branch `fix/owner-decisions-implementation`)
FINAL SHA: the commit that adds this report on branch `fix/final-pre-release-hardening` (`git log -1 fix/final-pre-release-hardening`)
BRANCH: `fix/final-pre-release-hardening` (created from `9b5335e`)
DATE: 2026-10-16

WORKING TREE BEFORE ANY CHANGE: clean apart from four untracked evidence folders from earlier passes (`docs/audit/evidence/original-closure-2026-10-15/`, `owner-decisions-2026-10-16/`, `p1-remediation-2026-10-16/`, `p2-objective-remediation-2026-10-16/`). They stay untracked.

SCOPE: objective defects found during the owner decision pass. No unresolved owner/client decision was implemented, and no new product scope was added.

ENVIRONMENTS:
- **U**: fresh `migrate` + `seed_demo` + `seed_client_audit_qa`, API `:8061`, web (production build, `vite preview`) `:4361`.
- **T**: a copy of the migrated legacy database (the real 38-service catalogue; environment S of the previous pass), migrated to this branch, API `:8062`, web `:4362`.
- **PostgreSQL 16**: a throwaway `postgres:16-alpine` container on port 55432, used for the consent trigger tests and the migration round trip, then removed.
- The repository database was not touched. Media and mail went to a scratch directory. All servers and the container were stopped after the run.

FILES CHANGED:

| Area | Files |
|---|---|
| Provider create | `backend/providers/serializers.py` |
| Verification note | `backend/documents/serializers.py` |
| Consent immutability | `backend/orders/models.py`, `backend/orders/migrations/0019_order_consent_append_only.py` (new) |
| Mobile language | `mobile/src/api/client.ts` |
| National ID | `backend/services/catalogue_rules.py`, `backend/services/service_import.py`, `backend/services/migrations/0015_national_id_fields_as_text.py` (new) |
| New tests | `backend/providers/tests_final_hardening.py`, `backend/orders/tests_final_hardening.py`, `backend/services/tests_final_hardening.py` |
| Report and small text evidence | this file, `docs/audit/evidence/final-pre-release-hardening-2026-10-16/` |

No existing test was changed or weakened.

EVIDENCE: `docs/audit/evidence/final-pre-release-hardening-2026-10-16/` holds text only (test logs, probe scripts, step results, before/after counts). It is committed. Screenshots taken by the probes stayed in the scratch directory and are not committed. Probe scripts read `KHALSNI_QA_PASSWORD` from the environment, and password fallbacks are redacted.

---

## 1. Provider create HTTP 500

PROVIDER CREATE:

ROOT CAUSE: `ProviderAdminSerializer` defined `validate()` twice. Python keeps the last definition, so the first one, which required a password on create, never ran. A create without a password reached `create()`, where `validated_data.pop("password")` raised `KeyError`, and the client got an HTML 500 page.

Reproduced before the fix (`provider-tests-before-fix.txt`):
```
ERROR django.request Internal Server Error: /api/admin/providers/
KeyError: 'password'
AssertionError: 500 != 400
```
The same run also exposed two neighbouring gaps:
- a weak password such as `123` was accepted (the project's `AUTH_PASSWORD_VALIDATORS` were not applied, unlike registration and admin-created users);
- email uniqueness was not checked before `create_user`.

FIX: one authoritative `validate()`:
- **On create**:
  - a missing or blank password (whitespace is trimmed) is a structured `400 {"password": [...]}`;
  - the password goes through Django's configured password validators, as in registration;
  - non-super-admin creators still get `is_approved = False`.
- **Email**: normalized with `normalize_email` and checked for uniqueness against every account, soft-deleted ones included. This is the same rule as registration, which is exact-match after normalization. A taken address is a `400 {"email": [...]}`, never an `IntegrityError`.
- **Unchanged**:
  - updates: no password needed; a password is still changeable only by a platform super admin, and it bumps `token_version`;
  - the phone uniqueness check;
  - permissions.

TESTS (`providers.tests_final_hardening`):
1. `test_create_without_password_is_a_structured_400`: 400 with a `password` key, and no account created.
2. `test_blank_password_is_a_structured_400`: both `""` and `"   "`.
3. `test_valid_create_succeeds_and_the_password_works`: 201, no password in the response, role provider, canonical phone, and the password works.
4. `test_update_without_a_new_password_is_allowed_and_keeps_the_password`: PATCH and PUT without a password give 200, and the old password still works.
5. `test_malformed_payloads_never_answer_500`:
   - 13 malformed bodies: empty, missing name/email/phone, a bad email, a bad phone, a list as password, an object as name, bad and unknown category ids, a bad boolean, an over-long type;
   - 4 raw bodies: `[]`, a string, broken JSON, `null`;
   - every one gets 400, and no provider is created.
- Also:
  - `test_weak_password_is_refused_by_the_password_validators`;
  - `test_duplicate_email_is_a_400_not_an_integrity_error`;
  - `test_permissions_are_unchanged_employee_cannot_create` (employee refused; anonymous 401).

Result: 3 of the 8 new tests failed before the fix (the 500, the weak password, the duplicate email); all 19 provider tests pass after it.

STATUS: **DONE**

---

## 2. Document verification note

VERIFICATION NOTE: `Document.verification_note` holds the staff approval note (`mark_verified(note=...)`), the note a provider or staff member adds to a final-result upload, and, for auto-approved documents, "Approved automatically by service rule."

CURRENT VISIBILITY (traced before the change):

| Surface | Before this pass | After this pass |
|---|---|---|
| Employee/admin API (`StaffDocumentSerializer`: staff queue, staff order detail) | yes | yes (unchanged) |
| Customer API: own order detail, own document list (`DocumentSerializer`) | yes | yes (unchanged) |
| Another customer | no (their order lookups are 404) | no |
| Provider API (`ProviderDocumentSerializer`) | no (not among its fields) | no (unchanged) |
| Web customer UI | not displayed (no component reads it) | unchanged |
| Mobile customer UI (`mobile/src/features/documents/DocumentList.tsx`) | displayed as "ملاحظة التحقق: …" ("verification note: …") | unchanged |
| Notifications (`document_verified`, `document_rejected`) | no (templates carry only the order number) | no |
| **Public tracking** (`/api/orders/track/`, `final_documents`; anonymous order detail with `public_track`) | **yes**: it used `DocumentSerializer`, which returned the note to anyone with the order number and phone | **no** |

The public-tracking exposure was a leak, not a product choice: the note on a final result is written by the provider or staff. The project's own field help (`help_guides/fallbacks.py`) describes the final upload note as "context to the final result file for internal review".

FIX: `DocumentSerializer` now removes `verification_note` under the same rule as the F04 rejection reason. Only staff (admin, employee, support) and the customer who owns the order receive it. Anonymous tracking and any other requester get no key. The owning customer's payload is unchanged, and no visibility was broadened.

REQUIREMENT EVIDENCE:
- No approved requirement marks `verification_note` as customer-facing.
- `docs/workflow_validation_matrix.md` says only that the customer and staff "see updated document status".
- The field help describes the final upload note as for internal review.
- The mobile app's display of it was never decided.

OWNER DECISION NEEDED?: **YES.** Customer behaviour was left as it was (the owning customer still receives the note, and the mobile app shows it). The owner needs to choose:
- **A. customer-facing**: keep it, and label the staff and provider inputs as customer-visible, as F04 did for rejection;
- **B. staff-only**: remove it from the customer API and the mobile screen;
- **C. separate fields**: an internal note and a customer message.

TESTS (`orders.tests_final_hardening.VerificationNoteBoundaryTests`):
- `test_public_tracking_never_receives_the_note`: a completed order with a verified final result. Tracking lists the final document, no key anywhere is `verification_note`, and the note text does not appear.
- `test_owning_customer_behaviour_is_unchanged`.
- `test_other_customers_never_receive_the_note`: 404 on detail, and the text is absent from their list.
- `test_staff_keep_the_note_and_providers_follow_their_serializer`.

STATUS: **DONE** (exposure narrowed to the documented boundary; the customer-facing question remains an owner decision)

---

## 3. Consent immutability

CONSENT IMMUTABILITY:

Before: `OrderConsent.save()` on an existing row and `OrderConsent.delete()` raised errors, but `QuerySet.update()`, `QuerySet.delete()`, `bulk_update()`, the `_base_manager` path and raw SQL did not. The foreign keys to the order and the customer were already `PROTECT`, and the model was not registered in Django admin.

IMPLEMENTATION (strongest boundary at each layer):
- **Model**: unchanged; `save()` of an existing row and `delete()` raise `ValidationError`.
- **QuerySet**: a new `OrderConsentQuerySet`. Its `update()`, `bulk_update()` and `delete()` raise `ValidationError`. It is the default manager **and the base manager** (`Meta.base_manager_name = "objects"`), so `OrderConsent._base_manager`, `order.consents` and `customer.order_consents` refuse bulk changes too.
- **Database** (`orders.0019_order_consent_append_only`):
  - SQLite gets `BEFORE UPDATE` and `BEFORE DELETE` triggers that `RAISE(ABORT)`.
  - PostgreSQL gets a `BEFORE UPDATE OR DELETE` row trigger whose function raises `restrict_violation`.
  - Both surface in Django as `IntegrityError`, which also blocks raw SQL, a database shell, or a bulk path missed in code.
  - The reverse migration drops the triggers.
  - On other database vendors the migration does nothing and the application boundary applies.
- **Cascades**: `order` and `customer` are `PROTECT`, so hard-deleting either raises `ProtectedError` and nothing cascades into the evidence.
  - The ordinary business paths never hard-delete: the admin "delete" of an order record archives it (`archive_order`), and account removal is a soft delete.
- **Admin / API**: no route contains "consent", and `OrderConsent` is not registered in Django admin, so there are no edit or delete actions. The only writer is order submission (`orders/services.py`). The read side is the `consent` summary on order detail.
- No historical consent was created. Orders without a row still read `{"status": "legacy_unknown"}`.

RESIDUAL ADMIN/DB CAPABILITY (cannot be closed inside the application):
- On PostgreSQL, a database owner or superuser can `DROP TRIGGER`, `ALTER TABLE … DISABLE TRIGGER`, or set `session_replication_role = replica`, which skips triggers.
- On PostgreSQL, `TRUNCATE` is not stopped by a row trigger. A statement-level `TRUNCATE` trigger was not added, because Django's test flush on PostgreSQL truncates every table.
- On SQLite, anyone with write access to the database file can drop the triggers.
- Reverse-migrating `orders` past `0019` removes the triggers.
- Restoring an older backup replaces the table, as it does every table.
- Mitigation, an operations matter outside the code:
  - the application should connect as a role that does not own the tables;
  - the database owner role should be restricted;
  - backups should be kept as the record of past evidence.

Local development effect: `manage.py flush` on a SQLite database that already holds consent rows now fails on the delete trigger, by design. Use a fresh database file instead. The Playwright setup migrates and seeds a throwaway file, and the QA seed's `--rebuild-owned` deletes only seeded scenario orders, which have no consent rows; both are unaffected.

TESTS (`orders.tests_final_hardening.ConsentImmutabilityTests`, run on SQLite **and on PostgreSQL 16**):
- `test_update_is_refused_on_every_application_path`: instance save, `QuerySet.update`, `_base_manager.update`, the related manager's `update`, and `bulk_update`.
- `test_model_delete_is_refused`.
- `test_bulk_application_deletion_is_refused`: `objects.all()`, a filtered queryset, `_base_manager`, `order.consents`, `customer.order_consents`.
- `test_database_refuses_raw_update_and_delete`: raw `UPDATE` and `DELETE` raise `IntegrityError` on both databases.
- `test_hard_deleting_the_order_or_customer_cannot_cascade_into_evidence`: `ProtectedError`.
- `test_ordinary_order_archive_and_account_soft_delete_keep_the_evidence`: the admin order delete gives 204 and status `ARCHIVED`, and the customer soft delete leaves the evidence intact.
- `test_no_api_route_or_admin_screen_can_mutate_evidence`: no consent route, no admin registration with change or delete rights, and a smuggled `consent` payload on the raw order-record PATCH changes nothing.

Every test ends by re-reading the row and asserting the stored text, version and acceptance are unchanged.

The PostgreSQL migration round trip was also run (`postgres-migration-roundtrip.txt`): migrate creates the trigger, `migrate orders 0018` removes it (0 triggers), and migrating again re-creates it.

STATUS: **DONE**

---

## 4. Mobile Accept-Language

MOBILE LANGUAGE:

INSPECTION:
- The mobile app has **no language selection and no English UI**.
- Every screen string is hardcoded Arabic, there is no i18n library or locale state, and the mobile consent statement exists only in Arabic (`order-consent-mobile-v1`).
- So its current, and only, screen language is Arabic. No language picker was added.

Before, the app sent no `Accept-Language`. The API then fell back to its own defaults:
- validation messages default to Arabic;
- but the password-reset email defaults to **English** for a client that names no language (`accounts/password_reset.py`);
- and iOS's networking adds the device locale on its own, so an English-locale iPhone could receive English API text on Arabic screens.

IMPLEMENTATION (`mobile/src/api/client.ts`, one place):
- `APP_LANGUAGE = 'ar'` and `headers: {'Accept-Language': APP_LANGUAGE}` on `axios.create`, so every `apiClient` request carries it, including the 401 retry, which reuses the original request headers.
- The token refresh call, the one request that uses bare `axios.post`, passes the same `languageHeaders`.
- There are no per-request duplicates.
- `FileSystem.downloadAsync` (a binary file download) is the only network call outside the client; no language-dependent text comes back from it.

TESTS:
- **Harness** (`mobile-accept-language-harness.txt`): esbuild bundles the real `mobile/src/api/auth.api.ts` and `client.ts`, stubbing only the native storage, query cache and auth store, and runs them against a local echo server whose first `/auth/me/` answers 401. All four requests carried `Accept-Language: ar`:
  - the initial request;
  - `POST /auth/token/refresh/`;
  - the retried request;
  - `POST /auth/forgot-password/`.
- **On the base client** the same harness **fails**: all four requests have no header (`mobile-accept-language-harness-base.txt`).
- **Runtime (U)**: `forgot-password` with `Accept-Language: ar` produces the Arabic reset email; without a header it produces the English one, which is what the mobile app triggered before (`FPH-final-hardening-steps.json`).
- **Arabic validation**: `request_language()` answers Arabic for `ar` (covered by the existing localization tests).
- **English mobile → English validation**: **not applicable**, because the app has no English mode. If one is added, `APP_LANGUAGE` is the single place to make dynamic.
- `npm run typecheck`: clean.

STATUS: **DONE** (Arabic only, matching the app; no locale selection was invented)

---

## 5. National ID field type

NATIONAL ID:

CURRENT MODEL (traced):
- **Account** `CustomUser.national_id` and `CustomerProfile.national_id`: `CharField` (32), unique when not empty. The order form's own national-ID input is a plain text input on web and mobile. These are **already text**.
- **Service-form schemas** (the real catalogue on T):
  - before the change, **23** national-ID fields were `number`: `national_id` in 16 services, seller and buyer national IDs, donor and recipient national IDs, and three "national number / registration number" fields;
  - one field, "الرقم الوطني / رقم الجواز للشريك" ("the partner's national ID / passport number"), was already a `textarea`.
- **Web**: a `number` schema field renders `<input type="number">`. The value is submitted as a string (no `valueAsNumber`) and written into the order notes.
- **Mobile**: a `number` field uses the `number-pad` keyboard with a string value.
- **Server validation**: none by type. Schema answers are stored as text in `customer_notes`, and no national-ID format rule exists anywhere.
- **Leading zeros**: kept as typed, because nothing converts the value to a number.

CONCLUSION: a numeric input is objectively unsafe for these identifiers.
- On the web, a focused `type=number` field changes the value on arrow keys and, in some browsers, on the mouse wheel. One stray key turns a valid ID into another person's.
- It accepts `e`, `+`, `-` and `.`.
- Some browsers submit an empty string for a non-numeric entry while the box still shows text.
- On mobile, `number-pad` makes it impossible to type a letter, yet several labels accept a passport or registration number.
- The HTML standard says `type=number` is not for values that only happen to consist of digits, such as card numbers or postal codes.
- None of this needs a format rule to fix.

CHANGE OR DECISION REQUIRED:
- **Changed**: national-ID schema fields go from `number` to `text`. A field qualifies by key (`national_id`, `seller_national_id`, `buyer_national_id`) or by the label "الرقم الوطني" ("national number").
  - This is backward-compatible: answers are already strings in the order notes.
  - Business semantics are unchanged: the same labels, the same `required` flags, and no added format rule.
  - Real quantities stay `number` (share capital, partner and heir counts, parcel and unit counts, floors).
  - Data migration `services.0015_national_id_fields_as_text`: idempotent, touches only the schema column through `update()`, and its reverse is a no-op. The importer applies the same rule, so a re-import cannot bring `number` back.
- **Owner / domain decision required**: the official national-ID format (length, check digit, rules for non-Jordanians or passport holders) is not documented. No format validation was added.
- **Observed, not changed**: company registration and trade-name numbers ("رقم تسجيل الشركة", "رقم الاسم التجاري") are also identifiers typed `number`. They were outside this item, and their type is left for the same decision.

TESTS (`services.tests_final_hardening`):
- `test_national_id_number_fields_become_text_and_nothing_else_changes`: other keys unchanged, quantities stay `number`, the textarea untouched, the input not mutated, idempotent.
- `test_no_format_rule_is_invented`.
- `test_data_migration_converts_stored_schemas_and_leaves_orders_alone`: prices unchanged, an unrelated service not touched, an order's "الرقم الوطني: 0123456789" (national number: …) kept, and a second run changes nothing.
- `test_importer_types_national_id_as_text`.

RUNTIME (T, the real catalogue; `legacy_national_id_before.txt`, `legacy_national_id_after.txt`):

| | Before | After |
|---|---|---|
| National-ID fields | 23 `number` + 1 `textarea` | 23 `text` (all still required) + 1 `textarea` |
| Orders / Σ note length | 6 / 52 | 6 / 52 |
| Fees (count, Σbase, Σgovernment, Σservice) | (38, 161, 76, 102) | (38, 161, 76, 102) |

STATUS: **DONE** (type only; the format rule is an owner/domain decision)

---

## 6. Branch / release hygiene

- BASE SHA `9b5335e`, BRANCH `fix/final-pre-release-hardening`, created before any change. The working tree was clean apart from the untracked evidence folders listed above.
- Committed: code, tests, migrations, this report, and the text-only evidence folder for this pass.
- No screenshots or large binary evidence were committed. The earlier passes' screenshot folders stay untracked.

---

REGRESSION:

| Run | Result |
|---|---|
| Full backend suite (serial, SQLite, `manage.py test`) | **633 tests, OK (7 skipped)**: the previous 610 plus 23 new. This includes the `TransactionTestCase` race tests, whose table flush is unaffected by the consent triggers. |
| New hardening tests on PostgreSQL 16 (`orders.tests_final_hardening`, `providers.tests_final_hardening`) | **19 tests OK**, no skips; the database trigger test ran against PostgreSQL |
| New provider tests before the fix | 3 of 8 fail (500 `KeyError`, weak password accepted, duplicate email accepted) |
| Frontend `vitest run` | **46 files, 150 tests passed** (no frontend source changed in this pass) |
| `npm run lint` | clean |
| Mobile `npm run typecheck` | clean |
| Mobile language harness | the new client sends `Accept-Language: ar` on 4/4 requests; the base client sends it on 0/4 |
| Playwright, full suite, QA mode, 5 viewports | **481 passed, 0 failed, 19 skipped** (the designed skips: responsive runs on one project, nginx needs a real nginx, P2 designed skips). Per spec: `a11y` 30, `axe-auth` 80, `p2-accessibility` 20, `client-audit-responsive` 1, `client-audit-acceptance` 10, `client-audit-idempotency` 10, `client-audit-ux` 15, `client-audit-role-reentry` 5, `hardening-access` 5, `hardening-closure` 10, `public` 50, `routes` 245. |

The first Playwright attempt failed 281 tests with `login …: 401`. That was a setup error in this run, not a product failure:
- the throwaway database was brand new;
- in QA mode the Playwright web server seeds only the QA fixtures (`seed_client_audit_qa`), while most specs sign in as the `seed_demo` accounts.

The run was repeated on a throwaway database pre-seeded with `migrate` + `seed_demo`, as the suite expects, with the result above (`playwright_first_attempt_empty_db_setup_error.txt`, `playwright_full_run_results.txt`).

END-TO-END (environment U, real browser, production build; `journey_lifecycle.txt`, `journey_lifecycle_part2.txt`):
- **Customer**:
  - the consent box is unchecked by default;
  - submission through the UI wizard creates `KH-2026-000009`;
  - a double click sends one POST and creates one order;
  - a refresh creates nothing.
- **Employee review**: the order appears in the queue, and review starts (`UNDER_REVIEW`).
- **Missing documents**:
  - the employee requests one (`WAITING_CUSTOMER`);
  - the customer's bell shows it and opens the missing-documents page;
  - the customer uploads and resubmits (`UNDER_REVIEW`).
- **Verification**: the employee accepts the document, and the requirements are complete.
- **Provider assignment**: the readiness text is shown, then the assignment is made (`ASSIGNED`). The provider sees the order, with the internal note hidden.
- **Provider progress**: `IN_PROGRESS`. The customer sees "قيد التنفيذ" ("in progress"), and the provider name is not visible to the customer.
- **Final result**:
  - the provider supplies it (`READY_FOR_DELIVERY`);
  - the customer cannot see it before approval;
  - the employee approves it in the UI.
- **Completion**:
  - `COMPLETED` through the employee UI;
  - the completion notification is created and rendered in the customer's bell;
  - the customer sees "مكتمل" ("completed").
- **Download**: the customer downloads the final result through the UI, and the bytes match the stored final document.
- **Re-login and audit trail**: re-login keeps `COMPLETED`; one order, with no duplicate transitions or notifications.

Re-verified in the same environments:

| Check | Result |
|---|---|
| P1 remains closed (F02 on the legacy copy T) | safe state holds: `WAITING_CUSTOMER`, no file input, no false success, no write requests (`p1_f02_recheck.txt`). B02/F05 regression tests are green in the full backend suite. |
| P2 remains closed | P2 regression tests are green in the backend and frontend suites; `p2-accessibility` and `axe-auth` pass on every viewport |
| Owner decisions intact (U, `decisions_probe.txt`) | **18/18**: F04 label and exact reason for the owner, 404 for another customer, no reason in tracking; B06 no provider key or name in customer JSON (staff still see providers); phone stored canonical, tracking accepts `079 880 0103`; consent refused when unchecked, and seeded orders read `legacy_unknown`; B05 customer POST 405, admin ledger 200; B10-7 counts; staff `<main>` |
| Legacy catalogue (T, `legacy_catalogue_probe.txt`) | **11/11**: D02 wording; the parcel/basin yes/no gate, text inputs, leading zero kept; notes optional |
| Consent recorded (U, `envU_consent_db_check.txt`) | `KH-2026-000009`: accepted, `order-consent-web-v1`, `ar`, `web`, timestamp, text. 8 seeded orders have no row. Raw `UPDATE` and `DELETE` on the live database are refused by the trigger (`IntegrityError`), and the row is unchanged. |
| This pass's runtime checks (U, `final_hardening_probe.txt`) | **10/10**: provider create without password, with a blank password or with malformed JSON gives 400; a valid create gives 201; a duplicate email gives 400; an update without a password gives 200; tracking lists the final result with no `verification_note`; the owner payload is unchanged; `Accept-Language: ar` gives the Arabic reset email and no header gives the English one |

Probe corrections (assumptions in the probes, not product failures):
- **Owner-decision probe, first run**: it picked the first document in the verify queue. In this fresh seed that was the provider's *final result* for `KH-2026-000008`, not a customer upload. Rejecting a final result returns the order to the provider (`IN_PROGRESS`), and a rejected final result is never shown to the customer (`is_customer_visible_document`, existing behaviour), so the two F04 "customer sees the reason" steps could not pass for that document. The probe now picks the first non-final document, and F04 passes on the customer upload `KH-2026-000006` (the first run is kept as `decisions_probe_run1_final_result_doc.txt`).
- **Reset-language probe**:
  - the Arabic subject is RFC 2047-encoded and folded onto a continuation line, so the probe now unfolds and decodes it;
  - repeat reset requests for one account are suppressed by the per-account limit, by design, so each check uses its own customer account;
  - reset emails go only to customer accounts, by design.

---

## Remaining release blockers

OWNER / CLIENT:
- **D05**: official phone, email, WhatsApp, address and office hours.
- **D06**: privacy wording, retention periods, legal sufficiency of the consent wording.
- **B10-8**: meaning and workflow of `is_verified`.
- **Unresolved B10-9**: the authorization family, personal-ID file types, and the three approval definitions.
- **B10-10**: the meaning of `base_price`.
- **Brand/domain**: canonical spellings and email domain.
- **The remaining 15 land services**: whether they get the parcel/basin question.
- **`verification_note`**: A customer-facing, B staff-only, or C separate fields (section 2).
- **National ID format**: official length and rules (section 5); also the field type of company registration and trade-name numbers.

DEPLOYMENT:
- **SMTP** real delivery.
- **Real devices**: iOS Safari and Android Chrome.
- **Backup schedule** on production: cron entry, off-server copy, retention value, restore drill.
- **Phone normalization** on production data: `normalize_phones` dry run, review collisions, apply with a report.
- **Consent trigger and database roles**: confirm `orders.0019` ran on production PostgreSQL and that the application's database role does not own the tables (section 3).
- **Deployed-build closure audit**.

FINAL STATUS: **FINAL PRE-RELEASE HARDENING PASS**

The original audit is **not** closed: the owner/client inputs and deployment gates above remain.
