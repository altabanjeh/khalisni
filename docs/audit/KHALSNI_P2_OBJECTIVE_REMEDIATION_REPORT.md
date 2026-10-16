# KHALSNI P2 OBJECTIVE REMEDIATION REPORT

BASE SHA: `ec3e70c7a5297964628ddd5bc2606606442c5e2e` (end of the P1 remediation)
FINAL SHA: the commit that adds this report on branch `fix/p2-objective-remediation` (`git log -1 fix/p2-objective-remediation`)
BRANCH: `fix/p2-objective-remediation`
DATE: 2026-10-16
SCOPE: U04/B04, B10-6, B10-8, D03, the accessibility failures proven by axe, footer touch targets. No product, legal, pricing, privacy, payment or activation decision was taken. P1 findings B02, F05 and F02 were not changed.

ENVIRONMENT (reproduction on the base code, verification on the fixed code):
- **P / P2**: fresh `migrate` + `seed_demo` + `seed_client_audit_qa`. Base: API `:8031`, web `:4341`. Fixed: API `:8041`, web `:4351`.
- **Q / Q2**: a migrated *copy* of the legacy `backend/db.sqlite3` (38 services, legacy English notifications, original `KH-2026-000001`). Base: `:8032`/`:4342`. Fixed: `:8042`/`:4352`. The repository database was only read.
- Media and mail were redirected to a scratch directory. Browser: Chrome via Playwright.

FILES CHANGED:

| File | Change |
|---|---|
| `backend/accounts/validators.py` (new) | One canonical phone rule and its AR/EN messages |
| `backend/core/i18n.py` (new) | Request language helpers (`Accept-Language` → `ar`/`en`) |
| `backend/accounts/serializers.py` | `RegisterSerializer`: required, validated phone; customer-facing duplicate messages; race-safe create. Profile phone changes use the same rule. Admin users API exposes `is_email_verified`/`is_phone_verified` read-only |
| `backend/accounts/views.py` | Registration messages (including Django password validators) follow the screen language |
| `backend/accounts/password_reset.py`, `backend/accounts/templates/accounts/email/*.txt` (new) | Reset and password-changed emails rendered from AR and EN templates |
| `backend/services/views.py` | Admin services: server-side `is_deleted` filter, stable ordering; service-document rules: stable ordering |
| `backend/services/serializers.py` | `duration_display_ar` / `duration_display_en` (existing `duration_display` unchanged) |
| `backend/orders/system_events.py` (new), `backend/orders/models.py`, `backend/orders/migrations/0017_orderstatuslog_system_event.py` (new), `backend/orders/serializers.py` | Status logs store a `system_event` code for system-written notes; legacy rows are recognised at read time; timelines expose `system_event` + `system_event_params` |
| `backend/notifications/legacy_content.py` (new), `backend/notifications/serializers.py` | Legacy English notifications rendered in Arabic at read time (rows not rewritten) |
| `backend/documents/presentation.py` (new), `backend/documents/serializers.py` | `document_type_label` {ar, en} on documents |
| `backend/providers/serializers.py` | Approval label follows the request language |
| `backend/accounts/tests_p2_remediation.py`, `backend/orders/tests_p2_remediation.py` (new) | 34 backend regression tests |
| `frontend/src/api/client.js` | `fetchAllPages` (follows every page, fails loudly past 50) and `fetchPage` |
| `frontend/src/api/servicesApi.js`, `frontend/src/api/services.js` | `getAdminServices` / `getAdminServiceDocuments` read every page; new `getAdminServicesPage` |
| `frontend/src/pages/admin/ServicesManagementPage.jsx` | Server-paginated services table with search, category and status filters; localized duration |
| `frontend/src/pages/admin/AdminRuleManagementPage.jsx` | Services and document-rule tabs list every record with a pager; localized duration |
| `frontend/src/components/Pagination.jsx` | Current page announced (`aria-current`), named nav, direction-aware arrows, readable range text |
| `frontend/src/pages/admin/AdminUsersRolesPage.jsx` | Account state and verification facts shown separately |
| `frontend/src/pages/public/RegisterPage.jsx`, `frontend/src/utils/passwordPolicy.js` (new) | Phone keypad, example and server error; full password rules |
| `frontend/src/utils/timelinePresentation.js`, `frontend/src/utils/documentPresentation.js` (new) | AR/EN presentation of timeline codes and document names |
| `frontend/src/components/OrderTimeline.jsx`, `RequestCard.jsx`, `DocumentList.jsx`, `pages/employee/EmployeeVerifyDocumentsPage.jsx`, `pages/admin/AdminOverviewPage.jsx` | Localized system text; contrast fixes |
| `frontend/src/components/DataTable.jsx`, `frontend/src/locales/*.json` | Focusable, named scroll region with a visible focus ring |
| `frontend/src/pages/admin/OrdersManagementPage.jsx` | Active filter-chip count contrast |
| `frontend/src/layouts/PublicLayout.jsx` | Footer links at least 24 px tall, with a focus ring |
| `AdminOrderDetailsPage.jsx`, `EmployeeOrderReviewPage.jsx`, `ProviderOrderDetailsPage.jsx` | Dropped the obsolete `staff` prop of `DocumentList` (it only enabled raw codes) |
| 6 new frontend test files, `frontend/e2e/p2-accessibility.spec.js` (new) | 19 unit tests, 5 Playwright tests (×2 viewports) |

Evidence: `docs/audit/evidence/p2-objective-remediation-2026-10-16/` (`*-before*` = base code, `*-after*` = fixed code). Probe scripts read `KHALSNI_QA_PASSWORD` from the environment; reset tokens are redacted.

---

## U04/B04 — registration validation

ROOT CAUSE:
- `RegisterSerializer` was a plain `ModelSerializer`. `CustomUser.phone` is `blank=True`, so the generated field accepted `""`, and nothing checked the format, so `"abc"` was accepted.
- `create()` read `validated_data["phone"]`; with the field omitted that raised `KeyError` → **HTTP 500**.
- Uniqueness came from DRF's generated validators, whose message is Django's model text ("النموذج User والحقل email موجود مسبقاً.").
- The page hint said only "ثمانية أحرف على الأقل" ("at least eight characters"), while `AUTH_PASSWORD_VALIDATORS` also rejects similar, common and all-numeric passwords.

CHANGE:
- **One canonical rule** (`accounts/validators.py`). No Khalsni document defines a country numbering policy, so the rule is a sane international one rather than Jordan-only:
  - optional leading `+`;
  - digits with optional spaces, hyphens, dots or parentheses;
  - **8–15 digits** (E.164 maximum).
  - Examples that pass: `0791234567`, `+962 79 123 4567`, `00962-78-1234567`, `(06) 5512345`.
  - The value is stored as entered (trimmed), because order tracking compares the phone as typed.
- **Registration API:**
  - phone required, blank rejected, format validated;
  - every case returns a structured 400 (`{"phone": [...]}`), never a 500;
  - messages follow `Accept-Language` (AR default);
  - Django's password-validator messages follow the same language.
  - The regex is **not** duplicated in the frontend: the page uses `type="tel"`, `inputMode="tel"` (phone keypad), shows an example, and shows the server's message under the field with `aria-invalid`.
- The same rule applies when a customer **changes** their phone in the profile, so a valid registration cannot be edited back to `"abc"`.
- **Password guidance** lists the four configured validators in AR/EN: length 8, not only numbers, not common, not similar to name, email or phone (`utils/passwordPolicy.js`). A backend test reads that file and fails if `AUTH_PASSWORD_VALIDATORS` and the guidance diverge.
- **Duplicate account:**
  - The email message is now "يوجد حساب مسجّل بهذا البريد الإلكتروني. سجّل الدخول أو استخدم خيار «نسيت كلمة المرور»." ("An account is already registered with this email. Sign in or use 'Forgot password'.") / "An account with this email already exists. Sign in or use “Forgot password”."
  - Phone and national ID duplicates have equivalent messages.
  - Checks include soft-deleted accounts and the normalized email.
  - A concurrent `IntegrityError` becomes the same 400.
  - **Security note:** registration still reveals that an address is taken. Hiding that requires an activation/verification step, which is the open product decision (B04). Registration remains throttled (`auth_register`). No activation was added.

TESTS:
- `accounts.tests_p2_remediation.RegistrationValidationTests` (10):
  - missing phone → 400 AR and EN (1);
  - blank and whitespace (2);
  - 7 malformed values (3);
  - 4 valid local and international forms (4);
  - the canonical rule;
  - duplicate email AR/EN, normalized and soft-deleted (5);
  - duplicate phone;
  - password messages AR/EN;
  - profile phone change.
- `PasswordGuidanceTests` (6): frontend guidance == configured validators, minimum length.
- Frontend `RegisterPage.validation.test.jsx` (6): phone required, `tel`, example; server phone error displayed; duplicate message displayed; Arabic rules == policy; English rules and example; valid submit unchanged.

RUNTIME PROOF (`P2-api-before.json` → `P2-api-after.json`, P→P2):

| Request | Before | After |
|---|---|---|
| phone omitted | **500** KeyError | **400** `رقم الهاتف مطلوب.` |
| `phone: ""` | 201 | **400** |
| `phone: "abc"` | 201 | **400** with format guidance |
| `0791…`, `+962 78 1…` | 201 | 201 |
| duplicate email (ar / en) | `النموذج User والحقل email موجود مسبقاً.` (both) | localized customer message (ar / en) |
| duplicate phone | `النموذج User والحقل phone موجود مسبقاً.` | `رقم الهاتف هذا مستخدم في حساب آخر…` ("This phone number is used by another account…") |

STATUS: **FIXED** (activation remains a product decision; enumeration via registration is inherent until then)

---

## B10-6 — admin service pagination

ROOT CAUSE:
- DRF paginates (`PAGE_SIZE 20`), but `unwrapList()` returns only `results` of the **first** page. `/admin/services` therefore showed 20 of 38 services with no pager.
- The rules page `/admin/rules` had the same defect for services (20/38) and for document rules (**20 of 153**).
- The service pickers on the provider-assignment, service-relations and help-guide screens were truncated the same way.
- The "deleted" status filter was applied in the browser on top of a single page.
- Ordering `display_order, name_ar` is not unique (the legacy catalogue has three services named `????`), so page boundaries could move.

CHANGE:
- **`/admin/services`: server pagination (architecture A).**
  - New `getAdminServicesPage` returns `{results, count, hasNext, hasPrevious}`.
  - The table uses the existing `Pagination` control: page numbers, previous/next and "عرض 1 - 20 من 38" ("showing 1–20 of 38").
  - Search (debounced), category and status are sent to the server. Changing any of them returns to page 1 and keeps the other filters.
  - The backend gained an `is_deleted` filter (with `include_deleted`) so "deleted only" counts and pages correctly.
  - If the last row of the last page is deleted, the page steps back.
  - `PAGE_SIZE` was **not** changed; the page size is learned from the server.
- **Bounded catalogue lists needed in full (architecture B):**
  - `getAdminServices` and `getAdminServiceDocuments` now follow every page (`fetchAllPages`). This fixes the rules tabs and every service picker.
  - The rules tabs page client-side with the same pager.
  - `fetchAllPages` throws past 50 pages instead of silently truncating.
- **Stable ordering:** primary-key tiebreak on admin services and service-document rules.
- **Pager:** `aria-current="page"`, "الصفحة 2 من 2" ("page 2 of 2") labels, `nav` landmark, arrows that follow the reading direction, and range text at ≥ 4.5:1.

AUDIT OF OTHER `unwrapList` ADMIN HELPERS (first page only):
- Endpoints that don't paginate, so nothing is truncated: `admin/categories`, `required-document-definitions`, `audit-logs`, `payments`, `advertisements`, `missing-service-requests`, `help/admin/*`, `workflow-rules`.
- Now fixed: `admin/services`, `admin/service-documents`.
- **Paginated but not changed in this pass** (each held ≤ 20 rows in both datasets, so nothing is hidden today; past 20 rows they will truncate):
  - `admin/orders` (`OrdersManagementPage`, client-side filtering/paging over page 1);
  - `admin/users`, `admin/providers`, `admin/notifications`, `admin/notification-templates`, `staff/documents`, `admin/service-relations`, `admin/service-provider-assignments`;
  - customer and provider order lists.
  - Orders and users grow with use and need server pagination with server-side status/search filters. That is listed under remaining findings, not hidden by a page-size increase.

TESTS:
- Backend `AdminServicePaginationTests` (4):
  - 38 services, each reachable exactly once over 2 pages (7);
  - next/previous (8, 9);
  - category, search, deleted and include-deleted on the server (10);
  - service-document rules stable across pages.
- Frontend `ServicesManagementPage.pagination.test.jsx` (2):
  - 20 → next → 18 → previous;
  - range text and `aria-current`;
  - all 38 ids seen;
  - category, search and status passed to the server and reset to page 1.
- Frontend `AdminRuleManagementPage.pagination.test.jsx` (2):
  - rules services tab 38 rows over 2 pages, Arabic duration;
  - `fetchAllPages` follows pages and fails loudly.

RUNTIME PROOF (`P2-ui-before.json` → `P2-ui-after.json`, Q→Q2, real 38-service catalogue; screenshots `P2-after-1440-B-admin-services*.png`, `P2-after-390-B-admin-services-en.png`):

| Check | Before | After |
|---|---|---|
| `/admin/services` rows reachable | 20, no pager | **38** over 2 pages: "عرض 1 - 20 من 38" → "عرض 21 - 38 من 38" |
| search "جواز" (passport) | n/a | 2 matching services |
| English layout | n/a | "Showing 1–20 of 38" |
| mobile 390 | n/a | pager shown, horizontal overflow 0 |
| `/admin/rules` services | 20 of 38 | "عرض 1 - 20 من 38" with pager |
| `/admin/rules` document rules | 20 of 153 | "عرض 1 - 20 من 153" with pager |

STATUS: **FIXED** for services and the rules screen. Other paginated admin lists are recorded as latent (above).

---

## B10-8 — active is not verified

ROOT CAUSE: `AdminUsersRolesPage.jsx` rendered `StatusBadge status="VERIFIED"` ("تم التحقق", "verified") for every active user and `PENDING_REVIEW` for inactive ones. The admin users API returned only `is_active` and `is_verified`.

CHANGE:
- **Account status:** from `is_deleted`/`is_active` only: "نشط / Active", "غير نشط / Inactive", "محذوف / Deleted".
- **Verification column:** three separate facts from the existing fields, none derived from another:
  - `is_verified` ("الحساب موثّق", account verified; same wording as the existing edit form);
  - `is_email_verified` ("البريد الإلكتروني مؤكَّد", email confirmed);
  - `is_phone_verified` ("رقم الهاتف مؤكَّد", phone confirmed).
  - Each shows Yes / No / Not available. Not available is used when an older payload lacks the field, and is never treated as verified.
- No combined "verified" value was invented. The two flags are exposed **read-only**, because who sets them is undecided. `is_verified` keeps its existing editable checkbox.
- The mobile card shows the same facts.

TESTS:
- Frontend `AdminUsersRolesPage.verification.test.jsx` (2):
  - active + unverified → Active, all No (11);
  - inactive → Inactive (12);
  - email-confirmed shown independently of active and of `is_verified` (13);
  - no "تم التحقق" anywhere;
  - a missing field shows "غير متاح" (not available).
- Backend `UserVerificationFieldsTests` (2): the API reports active and each flag separately; the flags cannot be set through the admin API.

RUNTIME PROOF (Q→Q2 `/admin/users`, 13 users, all `is_verified=false`; `P2-before/after-1440-B-admin-users.png`):
- Before: "تم التحقق" × **13**.
- After: "تم التحقق" × **0**. Each user shows "نشط" plus three "لا" ("no") facts.

STATUS: **FIXED** (the business meaning of "verified" remains an owner decision)

---

## D03 — remaining system English in Arabic mode

ROOT CAUSE:
- Several screens printed server codes or English text that the system itself writes:
  - chart status codes;
  - English default notes in status logs;
  - `approval_status_label` hard-coded "Approved";
  - raw `document_type` codes in the verify queue;
  - `duration_display` = English label;
  - English-only reset emails;
  - legacy notification rows stored in English with no `localized` copy.
- Status presentation already had one central map (`utils/format.js → statusMeta/getStatusLabel`), but the dashboard chart bypassed it.

CHANGE:
- **Status presentation:** the admin chart renders through `getStatusLabel` (central map, AR/EN); no new mapping was added.
- **Timeline (structured):**
  - `OrderStatusLog.system_event` (additive migration 0017) stores a code whenever the note is one of the system's fixed sentences (`orders/system_events.py`, 14 codes).
  - The recovery note keeps the typed reason as a parameter.
  - The English text stays in `note` for API clients that read text only.
  - Screens render the code via `utils/timelinePresentation.js` (AR/EN). Notes typed by staff, customers or providers have no code and are shown **exactly as written**.
  - Legacy rows are matched at read time only on an exact sentence; nothing in the database is rewritten.
  - Customer timelines expose the code only where they already expose the note.
  - A backend test fails if a backend code has no frontend presentation.
- **Legacy notifications:** exact legacy sentences render in Arabic at read time:
  - "Order received", "Order completed", "Final result uploaded", "New assigned order", "More documents required" (title only);
  - their fixed messages, with the order number taken from the text.
  - English mode still shows the stored English. Any non-matching or typed text (e.g. a staff reason) is unchanged.
- **Document names:**
  - The API adds `document_type_label` {ar, en} from the order's requirement snapshot, then the master definition, then a generic "مستند / Document". It is never the raw code.
  - The final result is "النتيجة النهائية" (final result).
  - The verify queue, its detail panel and every document list use it.
- **Provider approval badge:** server label follows the request language ("معتمد"/"Approved", "قيد المراجعة"/"Pending review").
- **"Expected completion: N days":** the admin services and rules tables use the new `duration_display_ar/en`; the `duration_display` field is unchanged for existing clients.
- **Emails:**
  - Reset and password-changed emails are rendered from `accounts/templates/accounts/email/password_{reset,changed}_{ar,en}.txt`, with localized subjects.
  - Language: the `Accept-Language` of the request that triggered them, i.e. the user's selected screen language. There is no stored per-user language field.
  - Requests that name no language (e.g. the mobile app, which sends none) keep the previous English email, which also keeps the existing `accounts.tests` assertion valid.
  - Sender configuration untouched.
- Not translated by design: typed notes, customer and provider free text, uploaded file names, and the admin document-definition **code** column (a configuration key labelled "الكود", code).

TESTS:
- Frontend `localization.p2.test.jsx` (5):
  - Arabic chart ticks "جديد، بانتظار العميل، تم التعيين، مكتمل" (new, waiting for customer, assigned, completed) and no raw codes (14);
  - verify queue shows "تفويض تجريبي" (test authorization) and "النتيجة النهائية", no codes (15);
  - system timeline in Arabic and typed note unchanged (16);
  - presentation fallbacks and English.
- Backend:
  - `TimelineSystemEventTests` (6): stored code; typed note never coded; legacy row; recovery parameter; customer gating; every code presented in the frontend.
  - `DocumentNameTests` (2).
  - `LegacyNotificationTests` (2): Arabic rendering, rows not rewritten, typed text untouched.
  - `LocalizedLabelTests` (2): approval label, durations.
  - `PasswordEmailLanguageTests` (4): reset Arabic (17); reset English (18); no-language behaviour; password-changed follows language.

RUNTIME PROOF (system-English scan of rendered Arabic pages, `P2-ui-before.json` → `P2-ui-after.json`):

| Page | Before | After |
|---|---|---|
| `/admin` chart | `NEW, WAITING_CUSTOMER, COMPLETED` | clean ("تم التعيين، قيد التنفيذ، جاهز للتسليم، بانتظار العميل", assigned, in progress, ready for delivery, waiting for customer) |
| `/admin/orders/8`, `/employee/orders/8`, `/provider/orders/8` timelines | "Order assigned to provider", "Provider completed work and uploaded final result" | clean |
| `/employee/orders/6` | "Approved" | clean ("معتمد") |
| `/employee/documents/verify` | `client-audit-qa-202610-authorization`, `final-result` | clean |
| `/admin/rules`, `/admin/services` | "Expected completion" | clean |
| legacy bell (Q2 customer) | "Order completed", "Order received", "Final result uploaded", "More documents required", "…was created successfully" | clean |
| reset email `Accept-Language: ar` / `en` | English / English | "إعادة تعيين كلمة المرور في خلّصني" (Arabic body) / "Khalsni password reset" |

The only Latin left is user data (`final-result.pdf` file name, a seeded customer note) and the admin code column.

STATUS: **FIXED** for system-generated text.
- Legacy rows that match no known sentence (e.g. seed notes "review", "wait") are authored text and are shown as stored. No structured context exists to translate them reliably.

---

## ACCESSIBILITY

ROOT CAUSE:
- `text-slate-500` (#64748b) is below 4.5:1 on the light brand fills:
  - **A.** Employee verify selected item: 4.37:1 on #eff6ff.
  - **C.** `OrderTimeline` stage label and date: 4.37:1 on the current entry's brand-50 card.
  - New pager range text: 4.49:1 on `panel-muted`.
- **B.** The admin orders active chip count used `text-white/80`: 4.34:1 on brand.
- **D.** `DataTable` wrapped the scrolling box in `role="region"` with no name, and the scrolling box itself was not focusable (axe `scrollable-region-focusable`, keyboard users could not scroll it).

CHANGE:
- Local class changes only; brand colours untouched:
  - verify meta, timeline stage and date, pager range → `text-slate-600` (≈ 7:1);
  - active chip count → `text-white`, idle → `text-slate-600`.
- `DataTable`: the scrolling box is the region. It has `tabIndex=0`, an accessible name (`ariaLabel` prop, default "جدول البيانات" / "Data table") and an inset `focus-visible` ring that the rounded frame cannot clip.
- No axe rule was disabled.

TESTS:
- Playwright `e2e/p2-accessibility.spec.js` (desktop-1440 and mobile-390):
  - verify queue selected item, axe `color-contrast` (19);
  - admin orders with each of the first four chips active (20);
  - timeline `/admin/orders/8` (21);
  - rules workflow table: axe `scrollable-region-focusable`, region receives focus and scrolls with the keyboard (22).
- The existing `axe-auth.spec.js` (all roles, all WCAG 2.2 AA tags) also covers `/employee/documents/verify` and `/admin/orders`.
- Unit: the verify meta class (19); timeline classes (21); region focusable and named, Tab reaches it (22).

RUNTIME PROOF:
- Probe: axe serious/critical on 18 authenticated screens at 1440 and 390, plus the rules tabs.
  - **Before**: 11 `color-contrast` (timeline on admin, employee and provider order pages; verify queue) + 1 `scrollable-region-focusable` (`/admin/rules` workflow).
  - **After**: **0**.
- Playwright: `axe-auth` and `p2-accessibility` all pass on both viewports. In the closure-audit and P1 runs, 4 `axe-auth` tests had failed on these contrast issues.

STATUS: **FIXED**

---

## TOUCH TARGETS

ROOT CAUSE: footer `Link`/`a` elements were inline text at 20 px line height (WCAG 2.2 SC 2.5.8 needs ≥ 24×24 CSS px).

CHANGE: shared footer link class `inline-flex min-h-6 items-center py-0.5`, with a `kh-focusable` focus ring. The spacing between links is kept (grid gap), so the mobile layout is unchanged.

TESTS:
- Playwright (23): every footer link ≥ 24 px in both dimensions, and axe `target-size` clean, on desktop and mobile.
- Unit: footer link classes.

RUNTIME PROOF: `/` at 390 px, AR and EN: **before 7/7 links 20 px tall → after 0/7 undersized** (`P2-ui-*.json`, `footer`).

STATUS: **FIXED**

---

## FULL REGRESSION:

- **Backend:** `manage.py test` (all apps, serial) → **529 tests, OK (skipped=7)** (final run below).
  - An earlier full run of this branch found 1 failure: `accounts.tests` expected the English password-changed email when the request names no language.
  - It was fixed by keeping English for language-less requests; the existing test is **unchanged**.
  - `accounts` + `config.tests_hardening_closure` were then 81 OK.
- **Defect reproduction:** the new tests were run against the base code (`git archive ec3e70c`):
  - backend 34 tests → **14 failures + 21 errors** (including the missing-phone KeyError);
  - frontend 15 tests → **13 failed**.
  - The tests still passing on base check behaviour that was already right (the services API already paginated; the UI did not).
  - Evidence: `REPRO-new-tests-on-base-*.txt`.
- **Frontend:** `vitest run` → **43 files / 130 tests passed** (previous 111 + 19 new) (`REG-vitest.txt`).
- **Lint:** `eslint src` (+ the new e2e spec) → **clean**, exit 0 (`REG-lint.txt`).
- **Playwright:** existing suites (client-audit ×5 in QA mode, hardening ×2, a11y, **axe-auth**, **responsive**) + new `p2-accessibility`, desktop-1440 and mobile-390, against P2 → **75 passed, 1 failed, 2 skipped** (`REG-e2e.txt`).
  - The failure is `client-audit-responsive` mobile-390. The page header rendered but the lazy route chunk under `<main>` had not loaded within the spec's 12 s.
  - In isolation the spec gave **2/2, 1/2 (another page, desktop), 2/2** (`REG-e2e-responsive-rerun.txt`). It is intermittent and not tied to a page this pass changed; the same spec was transient in the P1 run.
  - Every `axe-auth` test now passes.
  - The 2 skips are conditional skips inside the specs.
- **P1 still closed:**
  - The P1 regression tests are in the backend suite.
  - The journey below covers B02's valid upload path and F05's request/verify flow.
  - `KH-2026-000001` on Q2 still shows the F02 safe state: 0 file inputs, 0 resubmit buttons, 0 non-GET requests, status unchanged (`P1-F02-legacy-customer-after-p2.json`).

Final backend run (finished code): **529 tests, OK (skipped=7)**. That is the previous 495 plus 34 new. `makemigrations --check`: no changes detected (`REG-backend.txt`).

## END-TO-END: **PASS**

Fixed build P2, order `KH-2026-000015`, Arabic UI, each role in its own browser session (`JOURNEY-part1-after-p2.txt`, `JOURNEY-part2-after-p2.txt`):
1. customer wizard submit (consent unchecked by default; double-click gives 1 POST / 1 order);
2. employee review;
3. missing-document request;
4. bell opens the missing-docs page;
5. **valid PDF upload + resubmit → UNDER_REVIEW**;
6. document verification;
7. provider assignment;
8. provider progress;
9. final result;
10. final verification;
11. completion;
12. completion notification in the bell, **in Arabic** ("اكتمل الطلب", request completed);
13. **customer downloads the final PDF**, byte-identical to the provider's file;
14. re-login keeps COMPLETED;
15. one order, no duplicate transitions.

All steps PASS.

## KNOWN REMAINING FINDINGS:

- **Owner/client decisions (untouched by design):**
  - D05, D06, B05;
  - F04 customer rejection-reason visibility;
  - account activation (B04), and with it registration's account-exists signal;
  - provider identity to customers;
  - D02 catalogue wording;
  - B10-1/2/3/4/7/9/10;
  - the meaning of "verified" and who sets `is_email_verified`/`is_phone_verified`;
  - a Jordan-specific phone policy, if wanted (the current rule is documented international).
- **Latent pagination (B10-6 class):** `admin/orders`, `admin/users`, `admin/providers`, `admin/notifications`, `admin/notification-templates`, `staff/documents`, `admin/service-relations`, `admin/service-provider-assignments`, and customer and provider order lists still read only the first page. Each holds ≤ 20 rows today; they need server pagination with server-side filters before the data grows.
- **Phone rule coverage:** applied to registration and profile changes. Guest order creation and contact inquiries still accept any phone text (not part of U04).
- **Mobile app:** sends no `Accept-Language`, so its users get the English reset email and Arabic API messages as before.
- **Legacy data:** seed and status notes without a known sentence (e.g. "review", "wait") are shown as stored. `KH-2026-000001` still needs the audited operator recovery from P1.
- **Accessibility outside the proven findings:** the staff layout has no `<main>` landmark (seen while probing; not in the audit's axe results).
- **Flaky e2e:** `client-audit-responsive` lazy-chunk timing (12 s) on the local preview server.
- **Release verification:** real-device iOS/Android (B09); SMTP delivery (B04); re-running against the deployed build.

## FINAL STATUS

**P2 OBJECTIVE REMEDIATION PASS**

U04/B04, B10-6 (services and rules), B10-8, D03 (system text), the axe-proven accessibility failures and the footer touch targets are fixed, covered by regression tests that fail on the base code, and verified at runtime. This does **not** close the original audit: the owner/client decisions and the latent items above remain.
