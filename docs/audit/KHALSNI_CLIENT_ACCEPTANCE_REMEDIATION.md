# KHALSNI — CLIENT ACCEPTANCE REMEDIATION

BRANCH: `fix/client-acceptance-remediation` (from `main` `f396575` + the acceptance audit commit `6d25067`)
DATE: 2026-10-17
INPUT: `KHALSNI_FINAL_CLIENT_UI_ACCEPTANCE.md` (verdict PARTIAL) and `KHALSNI_FINAL_CLIENT_UI_MATRIX.csv`. The old report is unchanged; the matrix is updated in place.

Evidence: `docs/audit/evidence/client-acceptance-remediation/`

| Folder | Content |
|---|---|
| `evidence/` | browser probes: PNG, page text, JSON |
| `screens/` | 232-capture re-run with `_metrics.json` |
| `catalogue/` | validator before/after |
| `mobile/` | mobile harness |
| `probes/` | the scripts |

No owner, legal or business decision was invented. No price was changed. Nothing was marked out of scope. Everything waiting on the client is in `KHALSNI_CLIENT_DECISIONS_AND_MISSING_CONTENT.md`.

---

## SUMMARY

```
P1 OBJECTIVE DEFECTS BEFORE: 4   (DEF-D01 business services unorderable; DEF-M01, DEF-M02, DEF-M03 mobile)
P1 OBJECTIVE DEFECTS AFTER:  0   (mobile fixes proven by typecheck + Node harness; no device run, see §6)

P2 OBJECTIVE DEFECTS BEFORE: 20
P2 OBJECTIVE DEFECTS AFTER:  1   (DEF-M11 mobile: no tracking/rating/delivery date, safe areas unverified)

CLIENT REQUIREMENTS (189):
PASS:           89   (was 82)
PARTIAL:        45   (was 63)
FAIL:            0   (was 6)
BLOCKED:        47   (was 30)
NOT_APPLICABLE:  8

ORIGINAL 26:  CLOSED 16 · OPEN 1 (D03) · BLOCKED 7 · NOT_APPLICABLE 2

UI:
PUBLIC:    PASS for every objective item; client content still pending (contact, privacy, terms, brand)
CUSTOMER:  PASS for every objective item
EMPLOYEE:  PASS for every objective item (order review page still dense; P3)
ADMIN:     PARTIAL (P3: catalogue names stay Arabic in English tables; raw audit codes)
PROVIDER:  PASS
MOBILE:    PARTIAL (P1 gaps fixed in code; no device or rendered proof)
```

The 20 objective P2 defects from the acceptance audit (owner, legal and content items excluded):

| Status | Defects |
|---|---|
| **Fixed** | DEF-K01, DEF-C06, DEF-C07, B10-3 server rule, editor accepting unusable forms, DEF-M06, DEF-M07, DEF-M08, DEF-M09, DEF-U01, DEF-U02, DEF-E01, DEF-A01, DEF-A02, DEF-C01, CN-VIS-04, DEF-D02, DEF-D07, DEF-D08 |
| **Open** | DEF-M11 (mobile tracking, rating, delivery date; safe areas need a device check) |

P3 items still open:
- admin tables show Arabic catalogue names in English mode (DEF-A03);
- raw audit codes (DEF-A04);
- unlabeled overview charts (DEF-A05);
- 20 px inline help icons (DEF-U05);
- empty card areas on the home page (DEF-P02);
- timeline filler text (DEF-C04).

FINAL VERDICT: **CLIENT ACCEPTANCE REMEDIATION PARTIAL**

Every objective P1 code, data and UI defect is gone. Every business service with complete client data can be ordered. No client-approved visual requirement is knowingly missing, and no known Arabic system error is shown in English.

PASS is still not met, for three reasons:
1. The mobile fixes can't be proven at runtime here (no device, and no Expo web dependencies installed).
2. One P2 mobile gap remains (DEF-M11).
3. Some PARTIAL rows are not purely waiting on the client: rendered proof not repeated in this pass, P3 polish, and the D03 English-table names.

---

## 1. P1: business services could not be ordered (DEF-D01, CN-BIZ-00)

**Cause:**
- The importer split choice lists only on commas, and skipped any note containing «عند» ("when").
- The client sheet writes dropdown choices as «شركة / مؤسسة فردية» ("company / sole proprietorship").
- So 17 dropdowns in 9 business services were imported with no choices, 14 of them required.

**Traced field by field** (`KHALSNI_CATALOGUE_VALIDATION_REPORT.md`):
- **Choices listed in the sheet:** 11 fields. Populated verbatim.
- **Sheet allows "Text":** 2 fields. Changed to text.
- **No list given:** 4 fields, `company_type` ×4, `municipality` and the optional `trademark_class`. Classified OWNER INPUT REQUIRED and left alone.

**Applied:**
- Migration `services.0016` (idempotent; only imported-state values; orders untouched).
- The same rules in the importer.

**Hardening, all from one module (`services/schema_rules.py`):**
- The **admin editor** refuses to save:
  - a required list with no choices;
  - duplicate option values;
  - an option without a value or label;
  - a default value that is not an option;
  - a condition that names an answer the controlling field doesn't offer;
  - an unknown field type.

  Messages are localized, for example «الحقل 'company_type': حقل القائمة يحتاج إلى خيار واحد على الأقل.» ("field 'company_type': a list field needs at least one choice").
- The **importer** reports the same problems and imports nothing unless `--allow-incomplete-forms` is passed.
- **Order creation** refuses a form no customer could complete, and validates every answer (next section).
- The **service API** returns `orderable` and `order_blockers`. The wizard and the service page show «الطلب الإلكتروني لهذه الخدمة غير متاح حالياً» ("online requests for this service are not available yet") with a special-request link, instead of a form that can't be submitted.

**Runtime on the migrated real catalogue** (`evidence/BUSINESS-SERVICES-results.json`, `B-*.png`):

| Service | Result |
|---|---|
| 15 commercial registration certificate | details step passed → submitted **KH-2026-000007** |
| 16 trade-name certificate | submitted **KH-2026-000008** |
| 17 trade-name registration | submitted **KH-2026-000009** |
| 18 trademark services | submitted **KH-2026-000010** |
| 12, 13, 14, 20 (company type) · 19 (municipality) | notice shown, Next disabled, public page offers a special request; server refuses |

The stored notes were built by the server from the validated answers, with option labels, for example «نوع صاحب السجل: شركة» ("record holder type: company"). See `evidence-business-order-notes.txt`.

**Tests:** `services/tests_client_acceptance.py`:
- the editor rejects a required list with no options and accepts a valid one;
- duplicate options, defaults and conditions are rejected;
- the migration is idempotent and leaves unrelated and non-imported schemas alone;
- the importer reads slash lists and qualifiers;
- an unusable form is refused at order time.

## 2. Order form data protection and errors

- **DEF-C06:**
  - A blank national ID on an order now means "unchanged".
  - An explicit new value still updates the profile. Profile editing is separate.
  - Runtime: `9901234567` kept after a blank submit (`evidence/NATIONAL-ID-results.json`). Tests cover it.
- **DEF-C07:**
  - Phone and national-ID conflicts are checked before saving, and nothing is assigned until the check passes.
  - The response is a field error: AR «رقم الهاتف مستخدم في حساب آخر.» ("this phone number is used by another account") / EN "This phone number is already used by another account."
  - A safety net in the exception handler replaces any raw `Constraint “…” is violated.` text and returns a plain 400 for an `IntegrityError`.

## 3. Server error language (D03, DEF-K01)

**`core/errors.py`:**
- Known system-generated messages are mapped to Arabic: about 190 exact messages plus patterns for messages that carry a value. The mapping is built from an inventory of every message the backend raises.
- A DRF exception handler applies the request language: Arabic by default, English when asked.
- `core/middleware.py` makes Django and DRF built-in messages follow the same rule.
- Typed or authored text is never translated, and internal logs keep the English text.
- Direct error responses (the idempotency conflict, help-not-found) are localized at the source.

**Covered:** upload validation, phone and account conflicts, workflow failures, missing documents, consent, service-form answers, admin form rules, and permission messages.

**Runtime:** an Arabic customer uploading a spoofed PDF now sees «محتوى الملف لا يطابق امتداده.» ("the file content doesn't match its extension"); English still shows the English message (`evidence/E01-spoofed-upload-ar.txt`). Tests: `ErrorLanguageTests`.

Five existing tests asserted English server text from requests that sent no language. They now request English explicitly (`HTTP_ACCEPT_LANGUAGE="en"`), so the same message is asserted with the same strength.

## 4. Approved homepage slogan (CN-VIS-04)

**Source of truth:** the CMS row (`PublicPageContent.hero_title_ar/en`) is now the only source.
- Its default is «ركّز على اللي بهمّك… وإحنا بنخلّص الباقي.» (backend `public_site/defaults.py` and the frontend fallback `utils/publicSiteDefaults.js`).
- The competing hard-coded copy in `HomePage.jsx` was removed.
- Migration `public_site.0008` replaces the previous shipped default only where an admin never changed it.
- The English wording awaits approval (decision C5).

**Runtime:** the h1 is the approved slogan at 1440 and 390; English shows the English wording (`evidence/F-home-*.png`, `FINAL-UI-results.json`).

## 5. Server-side conditional validation (B10-3)

- `service_answers` (a JSON object keyed by schema field key) is validated against the schema on the server:
  - required visible fields;
  - select values in the listed options;
  - number, email and date formats;
  - unknown keys refused;
  - fields hidden by `visible_when` dropped, never stored.
- The server writes the answers block into the order notes. Clients send only the customer's own notes.
- Web (`buildServiceAnswers`), mobile (`buildServiceAnswers`) and the server all read the rules from the same schema; no business rule is duplicated in code.
- **Runtime on the real catalogue:** for the cadastral map, «نعم» ("yes") without a parcel number gives 400 «هذا الحقل مطلوب.» ("this field is required"), and an invalid answer gives «اختر أحد الخيارات المتاحة.» ("choose one of the available options").
- The other 15 land services wait on decision B4.

## 6. Mobile P1 fixes (Expo / React Native, Arabic only)

| ID | Change |
|---|---|
| DEF-M01 | New «حسابي» ("My account") tab for every role, with Profile and Logout. Logout clears SecureStore, the axios header, the session store and the query cache, then returns to sign-in |
| DEF-M02 | Order timeline (Arabic stages, system events as on the web) and a red rejection/cancellation reason card |
| DEF-M03 | The missing-document response lists the requested documents by Arabic name, with one picker each and that requirement's file types and size. There is no code entry, and a safe state for an invalid request |
| DEF-M04 | `api.example.com` and `127.0.0.1` removed from `eas.json`. `app.config.js` fails preview/production builds without a real https URL, and the runtime shows a blocking configuration screen |
| DEF-M09 | Download goes through a token from the refresh-aware client and accepts only a 2xx that isn't JSON or HTML. Otherwise it deletes the file and shows an Arabic error. The filename is sanitized |
| M-06 | Orders follow every page; notifications use paging and the server unread count |
| M-07/M-08/M-10 | Arabic document statuses and names, and Arabic network/timeout/5xx messages. A bug that hid server messages behind a generic one was fixed |

**Proof:**
- `npm run typecheck` clean.
- Node harness: 17 of 17 checks (`mobile/mobile_harness_output.json`). It covers pagination, the `service_answers` payload, Arabic errors, download refusal, the environment guard, and presentation.
- **No device, simulator or rendered screen.** Navigation, the file picker and multipart upload under React Native were checked by code and typecheck only.

## 7. Duplicate and wrong service fields

All are traced to the sheets (`KHALSNI_CATALOGUE_VALIDATION_REPORT.md`):
- **request-land-survey:**
  - 3 duplicate fields and 3 duplicate documents removed;
  - they came from merging the service's two sheets.
- **Question types:**
  - 10 open "ما …؟" ("what …?") questions changed to text;
  - 6 "هل A أم B؟" ("A or B?") questions changed to a choice of A or B;
  - 5 required yes/no questions changed to a required نعم/لا (yes/no) choice;
  - 53 optional yes/no questions unchanged.
- The validator also found the required yes/no checkboxes, which could only be answered "yes".

## 8. Objective UI fixes

| Item | Fix | Evidence |
|---|---|---|
| A. DEF-E01 raw `NORMAL` | Localized priority labels (Low/Normal/High/Urgent) | `F-employee-queue-en-1440.png`; test |
| B. DEF-A02 mojibake | 7 labels in the rules page and 13 mock strings decoded; tree rescan finds 0 | `C-admin-rules-documents.png` |
| C. DEF-A01 help-guide admin | Whole interface bilingual; guide content shown as stored | `F-admin-help-guides-ar-1440.png`; test |
| D. DEF-U01 hidden sidebar | Closed drawer `inert` + `aria-hidden` + invisible; open drawer traps focus, Escape closes | `OFFCANVAS-results.json` (inert true); test |
| E. DEF-U02 panels | Notification panel: non-modal dialog; help panel: modal dialog; focus in, Escape closes, focus returns | `KEYBOARD-results.json`; test |
| F. DEF-U03 double nav | Exactly one current item (longest matching path) | test |
| G. U04 contact phone | `type/inputmode/autocomplete=tel`, the same hint as register (shared helper) | `F-contact-*.png`, `FINAL-UI-results.json` |
| H. DEF-C02 order number | Shared `OrderNumber` (`<bdi dir="ltr">`, no wrapping) on 13 pages | test |
| I. English eyebrow at 390 | Long eyebrows wrap on phones | `screens/public-home-en-390.png` |
| Also: DEF-U04 skip link, DEF-U06 Arabic logo label, DEF-U07 wrong-role redirect to own portal | | keyboard results; tests |
| Also: DEF-C01 | One action card on the customer order (no repeated sentence, one primary button); hidden when no action is needed | test suite |
| Also: CN-ACT-08 | Upload control: Preview, Replace (type-checked, same single input) and Remove per file | `F-upload-preview-replace-ar-1440.png`; test |
| Also: DEF-K06 | Duration words agree with numbers («5 أيام», «يومان», "1 day") | test |

## 9. Placeholder durations (DEF-D02)

New delivery mode `after_review`:
- The customer sees only the service's approved or source sentence.
- No number is shown.
- No promised delivery date is stored on the order.

The 27 imported services still holding the importer's placeholder of 1 day were moved to it, and the importer now uses it.

**Runtime on the real catalogue:** 0 occurrences of «المدة المتوقعة: 1 يوم» ("expected duration: 1 day") on `/services` and the service pages, in AR and EN at 1440 and 390 (`CATALOGUE-UI-results.json`).

## 10. Catalogue validator

`manage.py validate_catalogue [--strict|--json|--no-warnings]`, report `KHALSNI_CATALOGUE_VALIDATION_REPORT.md`.

| Run | Errors | Warnings |
|---|---|---|
| Real catalogue before | 45 | 417 |
| Real catalogue after | 5 | 408 |

The 5 remaining errors are the client-value dropdowns.

## 11. Client decisions and the team decision log

`KHALSNI_CLIENT_DECISIONS_AND_MISSING_CONTENT.md` lists every unresolved client requirement with source, original wording, current system, why it can't be chosen safely, options, recommendation and a blank answer. It includes:
- the business dropdown values;
- the 8 categories;
- pricing;
- document merges;
- the 15 land services;
- repeatable fields;
- coordinates and photos;
- the original catalogue;
- debug data;
- Terms;
- privacy;
- contact;
- brand;
- the English slogan wording;
- Arabic help content;
- support messaging;
- provider earnings;
- late alerts;
- paper delivery;
- complaints;
- reassignment;
- verification;
- `verification_note`;
- national ID;
- mobile registration;
- the API host;
- external notifications;
- written sign-off of the decisions already implemented.

Section F reconciles all 15 rows of `TEAM_DECISION_LOG.md` with the current behaviour and later decisions. The log's "Final Decision" column was **not** filled in.

## 12. Matrix re-run (what changed)

41 rows were re-checked with new evidence; the rest keep their previous status because their code and data were not touched (`KHALSNI_FINAL_CLIENT_UI_MATRIX.csv`).

| Change | Rows |
|---|---|
| → PASS | U04, B10-2, CN-ACT-06, CN-ACT-08, CN-VIS-04, UI-TR-09, UI-TR-10 |
| FAIL → PARTIAL (fixed in code, no device proof) | MOB-04, MOB-06, MOB-09 |
| FAIL → BLOCKED (needs a client specification) | CN-BIZ-01, CN-BIZ-04 |
| PARTIAL → BLOCKED (objective part done; remaining part waits on the client) | B10, B10-3, CN-BIZ-00, CN-BIZ-02, CE1–CE3 |
| PARTIAL → BLOCKED (waits on the client, decision items listed) | CN-ACT-04, CN-MAP-01/02/04/05, CN-OPS-05/06, CN-BIZ-05/09/11 |

**PARTIAL rows that are not purely waiting on the client:**
- the mobile rows (no device);
- D03 (English catalogue names in English admin tables, P3);
- CN-ACT-12/CN-VIS-06/PROP-WEB-02/04/05, CN-BIZ-03/07/08, SD1–SD8, CE7–CE10, UI-TR-07, CN-OPS-04, PRD-J5, FR7: admin edit, delete/restore, reject, rating and support flows not re-exercised in the browser in this pass;
- design-judgement rows CN-VIS-10/15/17–20, UI-TR-06, CN-ACT-03;
- NFR1/NFR2 (content and real devices).

## 13. Regression

| Run | Result |
|---|---|
| Backend SQLite (full) | **677 tests OK (7 skipped)**: 647 before this pass + 30 new |
| Backend PostgreSQL 16 (full) | **677 tests OK, 0 skipped** (throwaway container) |
| New backend tests (`services/tests_client_acceptance.py`) | 30 tests, all pass |
| Frontend `vitest` | 56 files, 179 tests passed (156 before this pass) |
| `npm run lint` | clean |
| Mobile `npm run typecheck` | clean; harness 17/17 |
| Playwright, full suite, 5 viewports, QA mode, empty database | **481 passed, 0 failed, 19 designed skips**: a11y, axe-auth, p2-accessibility, client-audit (acceptance, idempotency, UX, role re-entry, responsive), hardening, public, routes |
| axe | included in the Playwright run (`a11y`, `axe-auth`, `p2-accessibility`) |
| Full web lifecycle through the UI (fresh database) | register AR 1440 + EN 390 **PASS**; journey 21/21 steps **PASS** (submit, missing document, bell, resubmit, verify, assign, provider, final, approve, complete, notification, byte-identical download, re-login, no duplicates) |
| Keyboard | skip link first; panels take and return focus, Escape closes; closed drawer out of the tab order |
| 232-capture screenshot re-run | overflow 0, broken images 0, raw codes 0; one local `ERR_NO_BUFFER_SPACE` network hiccup on one capture; the visually hidden skip link counts as a 1×1 target, by design |

**Problems found and fixed during this pass:**
- **Phone conflict:** the first attempt set the new phone on the user before checking for a conflict. In a test the same user object was reused across requests, so a repeat request passed. The check now runs before assignment.
- **File inputs:** the first preview/replace version added a second hidden file input. Two Playwright specs caught it, since the pages promise one upload control per document. Replace now reuses the single input. That Playwright run was stopped and restarted on the corrected build.

---

This is not a deployment-readiness statement. The deployment gates in the acceptance audit §19 are unchanged.
