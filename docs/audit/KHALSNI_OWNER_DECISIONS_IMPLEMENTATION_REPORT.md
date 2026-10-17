# KHALSNI — OWNER DECISION IMPLEMENTATION + RELEASE HARDENING REPORT

BASE SHA: `f5b98b9` (end of the P2 objective remediation). The branch also carries `3f0af8f` (the owner decision dossier, documentation only).
FINAL SHA: the commit that adds this report on branch `fix/owner-decisions-implementation` (`git log -1 fix/owner-decisions-implementation`).
BRANCH: `fix/owner-decisions-implementation`
DATE: 2026-10-16

DECISIONS IMPLEMENTED:
- B05: payment is out of release.
- F04: the customer sees the exact staff rejection reason.
- B04: no activation (nothing added, by decision).
- B06: provider identity is hidden from customers.
- D02: approved catalogue wording.
- B10-1/2/3: parcel/basin yes/no gate (conditional fields).
- B10-4: "additional notes" is optional.
- B10-7: labelled service counts.
- Phone policy: canonical E.164 identity, default country +962.

RELEASE HARDENING (Part 9 and Part 10): consent evidence, latent pagination, staff `<main>`, the flaky responsive test, the dead homepage component, the duplicate contact source, documented file-retention behaviour with a hook point, and backup automation.

NOT DECIDED, NOT IMPLEMENTED: D05, D06, B10-8, the ambiguous B10-9 merges, B10-10 and brand/domain. Current behaviour is kept; see "Remaining owner/client input".

ENVIRONMENTS:
- **R**: fresh `migrate` + `seed_demo` + `seed_client_audit_qa`, API `:8061`, web (production build, `vite preview`) `:4361`.
- **S**: a copy of the migrated legacy database (the real 38-service catalogue, already used as Q2 in P2), API `:8062`, web `:4362`. The repository database was not touched.
- Media and mail went to a scratch directory. Browser: Chrome via Playwright. All servers were stopped after the run.

FILES CHANGED:

| Area | Files |
|---|---|
| B05 payment | `backend/payment/views.py`, `urls.py`, `serializers.py`, `services.py` (customer create path, serializer and service removed) |
| F04 rejection reason | `backend/documents/serializers.py`, `frontend/src/components/DocumentList.jsx`, `frontend/src/pages/employee/EmployeeVerifyDocumentsPage.jsx` (label) |
| B06 provider privacy | `backend/orders/serializers.py` (order list/detail, notes), `backend/notifications/serializers.py` |
| D02, B10-1/2/3, B10-4 | `backend/services/catalogue_rules.py` (new), `backend/services/migrations/0014_apply_owner_catalogue_decisions.py` (new), `backend/services/service_import.py`, `backend/services/serializers.py` (`visible_when` validation), `frontend/src/utils/serviceForms.js`, `frontend/src/components/DynamicServiceFields.jsx`, `frontend/src/pages/customer/CustomerCreateOrderPage.jsx`, `mobile/src/utils/serviceForms.ts`, `mobile/src/features/client/screens/CreateOrderScreen.tsx` |
| B10-7 counts | `backend/services/selectors.py`, `backend/services/views.py` (`/api/admin/services/counts/`), `frontend/src/api/servicesApi.js`, `frontend/src/api/services.js`, `frontend/src/pages/admin/ServicesManagementPage.jsx` |
| Phone policy | `backend/accounts/validators.py`, `backend/accounts/fields.py` (new), `backend/accounts/models.py`, `backend/accounts/serializers.py`, `backend/accounts/admin.py`, `backend/accounts/management/commands/normalize_phones.py` (new), `backend/core/filters.py` (new), `backend/config/settings.py` (search filter), `backend/providers/serializers.py`, `backend/orders/serializers.py`, `backend/orders/services.py`, `backend/orders/views.py` (tracking), `backend/documents/views.py` (public download), `backend/public_site/serializers.py`, `frontend/src/pages/public/RegisterPage.jsx` (hint) |
| Consent | `backend/orders/consent.py` (new), `backend/orders/models.py` (`OrderConsent`), `backend/orders/migrations/0018_order_consent.py` (new), `backend/orders/serializers.py`, `backend/orders/services.py`, `frontend/src/utils/orderConsent.js` (new), `mobile/src/utils/orderConsent.ts` (new) |
| Pagination | `backend/orders/views.py`, `backend/accounts/views.py`, `backend/providers/views.py`, `backend/notifications/views.py`, `backend/documents/views.py`, `frontend/src/api/{ordersApi,providersApi,notificationsApi,documentsApi,authApi,services}.js`, `frontend/src/pages/admin/{OrdersManagementPage,AdminUsersRolesPage,ProvidersManagementPage,NotificationsPage}.jsx`, `frontend/src/pages/employee/EmployeeVerifyDocumentsPage.jsx`, `frontend/src/pages/customer/MyOrdersPage.jsx`, `frontend/src/pages/provider/AssignedOrdersPage.jsx` |
| Structure / tests infrastructure | `frontend/src/layouts/DashboardLayout.jsx`, `frontend/src/routes/AppRoutes.jsx`, `frontend/src/routes/ProtectedRoute.jsx`, `frontend/src/components/RouteErrorBoundary.jsx`, `frontend/e2e/client-audit-responsive.spec.js`, `frontend/e2e/p2-accessibility.spec.js` |
| Dead code / duplicate source | `frontend/src/components/publicSite/PublicHomepageTemplate.jsx` (deleted), `frontend/src/pages/admin/AdminCmsPage.jsx`, `frontend/src/pages/admin/AdminRuleManagementPage.jsx`, `backend/accounts/serializers.py`, `backend/accounts/views.py`, `docs/FULL_PROJECT_ARCHITECTURE.md` |
| Files / backups | `backend/documents/retention.py` (new), `backend/documents/management/commands/report_document_retention.py` (new), `scripts/verify_backup.sh` (new), `scripts/backup_scheduled.sh` (new), `docs/total-audit/RECOVERY_RUNBOOK.md`, `docs/DEPLOYMENT.md` |
| New tests | `backend/payment/tests_owner_decisions.py`, `backend/orders/tests_owner_decisions.py`, `backend/accounts/tests_phone_normalization.py`, `backend/services/tests_owner_decisions.py`, `backend/orders/tests_release_pagination.py`, `frontend/src/pages/ownerDecisions.test.jsx`, `frontend/src/pages/releasePagination.test.jsx`, `frontend/src/api/releasePagination.test.js` |
| Existing tests updated (see "Existing tests changed") | `backend/config/tests_hardening_access.py`, `backend/config/tests_acceptance_adversarial.py`, `backend/accounts/tests_p2_remediation.py`, `backend/orders/tests.py`, `frontend/src/pages/public/RegisterPage.validation.test.jsx`, `frontend/src/pages/admin/AdminUsersRolesPage.test.jsx`, `AdminUsersRolesPage.verification.test.jsx`, `ProvidersManagementPage.test.jsx`, `frontend/src/pages/localization.p2.test.jsx` |

Evidence: `docs/audit/evidence/owner-decisions-2026-10-16/` (screenshots with text dumps, probe scripts, step results, test-run logs). The evidence folder is not committed, matching the P1/P2 evidence folders. Probe scripts read `KHALSNI_QA_PASSWORD` from the environment, and password fallbacks are redacted. Phone numbers in the evidence are synthetic QA/test fixtures. The legacy phone report is masked; the unmasked apply report stayed in the scratch directory.

The test numbers (1–33) refer to the list in the task.

---

## 1. B05 — Payment out of the current release

DECISION: no customer online payment ships in this release. The unused customer create path is closed; the admin manual ledger stays.

ROOT CAUSE: `CustomerPaymentListCreateAPIView` accepted `POST /api/customer/payments/` and created `pending` payment records, although no screen called it and nothing approved online payment.

IMPLEMENTATION:
- The view is now `CustomerPaymentListAPIView` (`ListAPIView`). Under DRF's convention for a method a resource does not support, `POST` answers **405 Method Not Allowed** and creates nothing.
- `GET` of a customer's own records (list and detail) is unchanged.
- `CustomerPaymentCreateSerializer` and `create_customer_payment` were dead after this and were removed.
- Admin views (`/api/admin/payments/`, detail, status) and existing payment records are untouched. No gateway was added.

B05 STATUS FOR THE AUDIT: **NOT_APPLICABLE for this release, by explicit owner decision.**

DATA MIGRATION: none (existing records kept).

TESTS:
- **1**: `payment.tests_owner_decisions.PaymentOutOfReleaseTests.test_customer_payment_create_is_blocked_and_creates_nothing`. A normal and a gateway-shaped POST both get 405, and the record count is unchanged.
- **2**: `test_admin_manual_ledger_remains_usable` (admin create, list and status change).
- Also: the customer can still read existing records.
- Updated: `config.tests_hardening_access.CustomerPaymentRecordTests` now expects 405 and asserts that no payment row exists (see "Existing tests changed").

RUNTIME PROOF (R, `ODI-decisions-ui-steps.json`): customer POST → `405`; `GET /api/admin/payments/` → `200`.

STATUS: **DONE**

---

## 2. F04 — Document rejection reason shown to the customer

DECISION: the customer sees the exact staff reason. The staff field says so. Internal notes stay separate.

ROOT CAUSE: `Document.rejection_reason` was only in `StaffDocumentSerializer`. The customer `DocumentSerializer` omitted it, so the customer was told a document "needs correction" without the reason.

IMPLEMENTATION:
- **API**: `DocumentSerializer` includes `rejection_reason`, then removes it unless the requester is staff (admin, employee, support) or the customer who owns the order.
  - Anonymous tracking and other customers never receive the key.
  - Providers use `ProviderDocumentSerializer`, which is unchanged and has no reason.
  - The order-level `internal_notes` and `OrderNote` visibility are untouched.
- **Staff UI**:
  - The verify screen's textarea now has a visible label, "ملاحظة الاعتماد أو سبب الرفض" (approval note or rejection reason).
  - It also has a described-by line: **"سيظهر هذا السبب للعميل" / "This reason will be shown to the customer"**.
  - The placeholder no longer says "internal". The approval note (`verification_note`) was already returned to customers by the API (see "Observed, not changed").
- **Customer UI**: `DocumentList` shows "سبب الرفض: …" (rejection reason) under a rejected document whenever the API sent a reason. The same component shows it on the staff order pages.
- **Notification**: the existing `document_rejected` notification is unchanged and points to the order (`order_id`), where the reason is now visible. Its text was not changed, so no unapproved wording was added.

DATA MIGRATION: none.

TESTS:
- **3**: `orders.tests_owner_decisions.RejectionReasonTests.test_owning_customer_sees_the_exact_staff_reason`.
- **4**: `test_another_customer_cannot_read_the_reason` (404, and the reason never appears in their list) and `test_serializer_drops_the_reason_for_a_non_owner`.
- **5**: `test_public_tracking_does_not_expose_the_reason` (no `rejection_reason` key anywhere in the tracking JSON).
- **6**: `ownerDecisions.test.jsx` › "the reject reason box says the reason will be shown to the customer" (label, `aria-describedby` text, no "داخلية"/"internal" in the placeholder).
- Also covered:
  - staff still see the reason (order detail and staff queue);
  - provider payload unchanged;
  - the notification points to the order;
  - UI: `DocumentList` shows the reason only when the API sent one.

RUNTIME PROOF (R, `ODI-F04-*.png`, `ODI-decisions-ui-steps.json`): an employee rejected a queued document in the browser with the reason "QA-ODI: الصورة غير واضحة، يرجى رفع نسخة أوضح.". Then:
- the label read exactly "سيظهر هذا السبب للعميل";
- the owner's API returned that exact text;
- the owner's order page showed it;
- the second QA customer got 404;
- the tracking JSON contained neither the text nor the key.

STATUS: **DONE**

---

## 3. B04 — Account activation

DECISION: no activation in this release; registration stays active immediately.

IMPLEMENTATION: nothing added; no verification gating exists. Registration still creates an active account (covered by the existing and P2 registration tests, all green). Real SMTP delivery remains a release gate.

STATUS: **DONE (no change by decision)**

---

## 4. B06 — Provider identity hidden from customers

DECISION: hide provider identity from customers; the customer API and customer UI must match.

ROOT CAUSE:
- `OrderListSerializer` (and so `OrderDetailSerializer`) returned `assigned_provider` (`id, full_name, provider_type, city, rating, is_available`) to customers. No customer screen displayed it.
- A review of every customer response found two more leaks:
  - **customer-visible order notes** carried `user` and `user_name` (a provider who wrote a customer-visible note was named);
  - **the notification centre** returned `actor` and `actor_name` (provider assignment and completion notifications named the provider).

IMPLEMENTATION:
- Order list and detail: the `assigned_provider` key is **dropped** (not nulled) for customer requests.
- Order notes: for customers and public tracking, `user` and `user_name` become `null` unless the customer wrote the note.
- Notifications: for a customer, `actor` and `actor_name` become `null` unless the customer is the actor.
- Already clean, now asserted by tests:
  - tracking (`TrackOrderSerializer`);
  - document payloads (no uploader field);
  - customer timelines (no `changed_by`);
  - the order-level `assigned_employee`, which was already nulled.
- Staff and provider APIs are unchanged.

DATA MIGRATION: none.

TESTS (key-level checks; each test walks every key of the JSON):
- **7**: `ProviderIdentityPrivacyTests.test_customer_order_list_and_detail_have_no_provider_identity`. No key in `{assigned_provider, provider, provider_id, provider_name, provider_type, is_available}` is present. The provider's name, type, city, email and phone appear nowhere in the payload, and no `user`/`actor` value equals the provider's ids. `test_customer_notifications_have_no_provider_identity` checks notifications the same way.
- **8**: `test_tracking_has_no_provider_identity`.
- **9**: `test_staff_and_provider_apis_are_unaffected` (the staff detail still names the provider and the note author).

RUNTIME PROOF (R):
- Every order, order detail and notification of QA customer A was read.
- None contained a provider key or the names "QA Provider A"/"QA Provider B".
- The admin API still returned both names.
- In the lifecycle journey, step 14 confirmed the provider's name is not visible to the customer in the UI (`providerNameVisibleToCustomer: false`).

STATUS: **DONE**

---

## 5. D02 — Catalogue wording

DECISION: replace the admin-facing public wording with the approved AR/EN sentences, and promise nothing else.

ROOT CAUSE:
- The service importer wrote "يحدد بعد المراجعة من لوحة الإدارة." ("determined after review from the admin panel") with English "Shared after review." into `public_price_note_*`.
- The source documents' duration value "تُحدد من لوحة الإدارة" ("set from the admin panel") was copied into `delivery_note_ar` with no English.

IMPLEMENTATION:
- `services/catalogue_rules.py` holds the approved sentences and the rule: a note whose Arabic mentions "لوحة الإدارة" is replaced, in Arabic **and** English, by:
  - price: "يتم تأكيد الرسوم النهائية بعد مراجعة الوثائق." / "Final fees are confirmed after document review."
  - delivery: "تُحدَّد مدة الإنجاز بعد مراجعة الطلب." / "The completion time is confirmed after your request is reviewed."
- Other notes, including delivery notes like "حسب إجراءات دائرة الأراضي والمساحة." ("per the Land and Survey Department's procedures"), are untouched.
- The importer now applies the same rules, so a re-import cannot bring the old wording back.

DATA MIGRATION: `services.0014_apply_owner_catalogue_decisions`:
- idempotent `RunPython`;
- touches only the two note pairs and the form schema, through `update()`, so no save hook recalculates anything;
- prices, price types and durations are unchanged;
- the reverse is a no-op (the old wording is not restored).

TESTS:
- **10**: `services.tests_owner_decisions.CatalogueDataMigrationTests.test_no_public_service_mentions_the_admin_panel` (public list and every public detail JSON).
- **11**: `test_admin_panel_wording_is_replaced_in_arabic_and_english`.
- Also:
  - `test_prices_and_price_types_are_unchanged` (base, government and service fee, total and price type, per service);
  - `test_migration_is_idempotent` (a second run changes no column of any row);
  - `test_importer_produces_the_approved_shapes`.

RUNTIME PROOF (S, the real catalogue; `legacy_catalogue_before.txt`, `legacy_catalogue_after.txt`, `ODI-D02-legacy-service-page.png`):

| | Before | After |
|---|---|---|
| Services mentioning "لوحة الإدارة" | 27 | **0** |
| Price note (AR / EN) | 27 × "يحدد بعد المراجعة من لوحة الإدارة." / "Shared after review." | 34 × approved AR / approved EN (27 converted + 7 that already had it) |
| Delivery note "تُحدد من لوحة الإدارة" / EN empty | 9 | 9 × approved AR / approved EN |
| Fees (count, Σbase, Σgovernment, Σservice) | (38, 161, 76, 102) | (38, 161, 76, 102) |
| Price types | fixed 11, quotation 27 | fixed 11, quotation 27 |
| Orders / Σ length of order notes | 6 / 52 | 6 / 52 |

The public service page in the browser shows the approved sentence, and neither it nor `/services` contains "لوحة الإدارة".

STATUS: **DONE**

---

## 6. B10-1/2/3 — Parcel / basin

DECISION: "Do you know the parcel and basin numbers?" is a yes/no question. "Yes" shows parcel and basin and makes them required; "no" hides them and staff resolve them.

ROOT CAUSE:
- The importer typed any label containing "رقم" (number) as `number` before checking for a yes/no question, so the question "هل تعرف رقم القطعة والحوض؟" became a numeric input.
- The form engine had no conditional fields.
- Parcel and basin were `number` inputs, which drop leading zeros.

IMPLEMENTATION: **the preferred conditional model, not the interim one.**
- **Schema**: a field may carry `visible_when: {"field": "<key>", "equals": "<answer>"}`.
  - The admin schema validator accepts it only when it names another field of the same form, with exactly those two keys.
  - A hidden field is never required and is not sent.
- **Web** (`serviceForms.js`, `DynamicServiceFields.jsx`, `CustomerCreateOrderPage.jsx`):
  - hidden fields are not rendered;
  - the step check validates only visible required fields;
  - the conditional field's rule re-checks visibility against the current answers, so a stale "required" cannot block submit;
  - hidden answers are left out of the submitted notes;
  - a select answer is written as its label ("لا", "no"), not its code.
- **Mobile** (`serviceForms.ts`, `CreateOrderScreen.tsx`): the same visibility rule. It also reads `label_ar` for option labels and `help_text_ar`. `npm run typecheck` is clean.
- **Catalogue rule** (`catalogue_rules.apply_schema_rules`) for every service that has the question:
  - the question becomes a `select` with options `yes`/`no` ("نعم"/"Yes", "لا"/"No");
  - help text: "إذا لم تكن تعرف رقمي القطعة والحوض فاختر «لا»، ويساعدك فريقنا في تحديدهما أثناء مراجعة الطلب." / "If you do not know the parcel and basin numbers, choose “No” and our team will help identify them while reviewing your request.";
  - it moves before the numbers;
  - parcel and basin get `required: true` with `visible_when` = yes.
- **Identifier type**: no authoritative source proves numeric semantics, so `parcel_number` and `basin_number` become `text` in **all 17** services that have them. Leading zeros are kept.
- **Unchanged**: the 15 services without the question keep both numbers always required. Adding the question there was not decided (see "Remaining owner/client input").
- **Existing orders**: unaffected. Schema answers are stored in the order notes at submission, and the migration does not touch orders.

DATA MIGRATION: the same `services.0014` (schema part).

TESTS:
- **12**: `test_parcel_question_becomes_a_yes_no_select_asked_before_the_numbers`, plus the web unit test "the parcel question is a yes/no choice…".
- **13** and **14**: `test_parcel_and_basin_are_required_only_when_the_answer_is_yes`, plus the rendered-form test "yes makes parcel and basin required; no hides them" (a submit with "yes" and an empty parcel shows "الحقل رقم القطعة مطلوب" (parcel number is required); with "no" it submits).
- **15**: `test_parcel_and_basin_identifiers_are_text_so_leading_zeros_survive`, plus the web test (notes keep "رقم القطعة: 012" and "رقم الحوض: 007").
- Also:
  - `test_services_without_the_question_keep_the_numbers_always_required`;
  - `test_visible_when_must_name_an_earlier_field_of_the_form`;
  - `test_existing_order_snapshot_is_not_mutated`.

RUNTIME PROOF:
- S data, after migration: the 2 services have `field_2fa52c6cfa` as `select`, and parcel and basin are `text`, required, `visible_when` yes. The other 15 have them as `text`, required, without a condition.
- S browser (`ODI-legacy-catalogue-ui-steps.json`, 11/11, real "request-cadastral-map" form):
  - options "نعم | لا";
  - parcel and basin hidden before an answer;
  - help text shown;
  - "yes" shows a `text` input that keeps "012";
  - "no" hides them;
  - "next" with them hidden raises no error for parcel, basin or notes.

STATUS: **DONE** (conditional model)

---

## 7. B10-4 — Additional notes optional

DECISION: "additional notes" is optional by default; nothing else changes.

ROOT CAUSE: the importer marks every source field required, so `additional_notes` ("ملاحظات إضافية") was required in 17 services.

IMPLEMENTATION: `apply_schema_rules` sets `required: false` only on fields with key `additional_notes` or the labels "ملاحظات إضافية" / "هل توجد ملاحظات إضافية؟" ("any additional notes?"). No other textarea changes; `request_reason` stays required in the test.

DATA MIGRATION: `services.0014`. On S, 17 × `additional_notes` went from required to optional. The 3 "هل توجد ملاحظات إضافية؟" fields were already optional.

TESTS:
- **16**: `test_additional_notes_are_optional_and_other_fields_unchanged`.
- Rendered-form test: empty notes do not block submission.

RUNTIME PROOF: the S browser check above (no notes error).

STATUS: **DONE**

---

## 8. B10-7 — Service count semantics

DECISION: do not force public and admin totals to match. Show four labelled counts whose meaning matches the backend filters.

IMPLEMENTATION:
- **Server definitions** in `services/selectors.py`:
  - `published_services_queryset()` is the published filter;
  - `visible_services_queryset()` now builds on it, so the catalogue and the count share one definition;
  - `service_counts()` returns:
    - `total`: not deleted;
    - `active`: also `is_active`;
    - `published`: active, shown on the public site, in an active, shown, not-deleted category;
    - `customer_visible`: published plus the organization scope rules, for a platform customer by default, or for `?organization=`.
- **Endpoint**: `GET /api/admin/services/counts/`, with the same permission and organization scope as the admin service list.
- **UI** (admin services page): a named region "أعداد الخدمات" (service counts) with four `<dt>` labels and a one-line definition each:
  - "إجمالي الخدمات / Total services";
  - "نشطة / Active";
  - "منشورة للعامة / Published";
  - "ظاهرة للعميل / Visible to customer".
- No client-side filtering computes them.

DATA MIGRATION: none.

TESTS:
- **17**: `ServiceCountTests.test_counts_follow_backend_definitions`.
  - Fixture: 3 published, 1 hidden service, 1 in a hidden category, 1 inactive, 1 deleted, giving `{total: 6, active: 5, published: 3, customer_visible: 3}`.
  - It also asserts that `customer_visible` equals the length of the public `/api/services/` list and that `total` equals the admin list `count`.
- The permission test and the web test check the four labels and values.

RUNTIME PROOF (R, `ODI-B10-7-service-counts.png`): all four labels shown, with the values from `/counts/` (8/8/8/8 on the small seed).

STATUS: **DONE**

---

## 9. Phone policy — canonical E.164, default +962

DECISION: one canonical E.164 identity. A local number without a code is Jordanian; an explicit `+` or `00` code stays international. All comparisons use the canonical form.

ROOT CAUSE: since P2, phones were validated for shape but **stored as typed**. Uniqueness, tracking, public download and guest reuse all compared exact strings, so `0791234567` and `+962791234567` were different people.

IMPLEMENTATION:
- **`accounts/validators.py`**:
  - `normalize_phone()` returns `+<digits>`, `""` for an empty value, or `None` if invalid.
  - Separators (space, `-`, `.`, `()`) are ignored, and Arabic-Indic digits are read.
  - Recognised forms:
    - `00` → `+`;
    - `962…` with 11–12 digits;
    - local `0…`;
    - bare 8–9 digits under the default country.
  - Jordanian numbers need 9 digits after +962 for `7x` mobiles and 8 otherwise.
  - International numbers need 8–15 digits and must not start with 0.
  - `phone_identity()` and `phones_match()` compare canonical numbers. A legacy value that cannot be normalized falls back to its trimmed text.
- **Storage**: `CustomUser.clean()` (run on every save) stores the canonical form in the single authoritative `phone` field.
- **`CanonicalPhoneField`**: a DRF field with AR/EN errors, used for:
  - registration;
  - profile;
  - admin user create and edit;
  - provider create and edit;
  - the order form (which also updates the account phone);
  - contact inquiries;
  - missing-service requests.
- **Uniqueness** is checked on the canonical value, soft-deleted accounts included:
  - registration;
  - profile, where a real change only: typing your own number differently is no change and needs no password;
  - admin users;
  - providers.
- **Lookups**:
  - tracking and the public final-result download match the canonical number to the order's customer;
  - guest-account reuse searches by the canonical number;
  - DRF search on phone fields (`PhoneAwareSearchFilter`, now the default backend) and the Django admin user and customer-profile search also match a number typed in any equivalent format.
- **Display**: the canonical number is shown as stored, with no separate formatting. The register hint now says numbers outside Jordan need their country code.
- **Out of scope as non-identity contact fields**: `Organization`/`Branch.phone` and `ProviderProfile.phone` (a company phone).

PHONE DATA MIGRATION: `python manage.py normalize_phones`.
- **Dry run by default.** It scans accounts (soft-deleted included), contact inquiries and missing-service requests. For each value it shows original → canonical, masked unless `--unmasked`. Each row is one of `unchanged`, `normalize`, `invalid` or `collision`.
- For accounts it shows order counts and whether the account is a guest. A collision lists the other account ids.
- **`--apply` requires `--confirm NORMALIZE` and `--report <file>`.**
  - It writes every original value to the report first.
  - It then rewrites only `normalize` rows, in one transaction, and only while the row still holds the scanned value.
  - Collisions and invalid values are never changed, and **accounts are never merged**.
- **Rollback / recovery**: `--rollback <report> --confirm RESTORE` restores the originals for every row that still holds the value the command wrote. A full database backup before apply remains the primary recovery path (`scripts/backup.sh`).

TESTS:
- **18**: `NormalizePhoneTests.test_equivalent_jordan_formats_normalize_identically`: 10 spellings → `+962791234567`, including `00962…`, `962…`, `(079) 123.4567` and Arabic-Indic digits.
- **19**: `PhoneIdentityTrackingTests.test_tracking_works_with_every_equivalent_format` (6 spellings), `test_tracking_rejects_a_different_number`, `test_tracking_matches_a_legacy_unnormalized_stored_phone` and `test_public_final_download_compares_canonical_numbers`.
- **20**: `PhoneIdentityApiTests.test_duplicate_account_is_blocked_after_normalization` (3 variants of a taken number refused), plus the soft-deleted, profile, admin-user and provider uniqueness tests.
- **21**: `test_international_number_with_country_code_stays_international` and `test_international_registration_is_kept_international` (`+44 20 7946 0958` → `+442079460958`).
- **22**: `NormalizePhonesCommandTests.test_dry_run_reports_normalizations_invalid_values_and_collisions_and_changes_nothing`, `test_apply_requires_explicit_confirmation_and_a_report`, `test_apply_changes_only_safe_rows_and_rollback_restores_them` (collisions untouched, no merge, idempotent second run, rollback) and `test_default_output_masks_numbers`.
- **23**: `test_invalid_values_are_identified` (10 invalid inputs) and the dry run's `invalid` row.
- Also:
  - registration stores canonical;
  - invalid input gets a localized message;
  - the order form stores canonical and refuses an invalid number;
  - contact inquiries;
  - guest reuse;
  - admin search in 3 formats.

RUNTIME PROOF:
- **S** (`legacy_normalize_phones_dryrun_masked.txt`, `legacy_normalize_phones_apply_masked.txt`):
  - the dry run found 13 account phones and 1 missing-service request to normalize, with 0 invalid and 0 collisions;
  - `--apply` without `--confirm` was refused;
  - with confirmation, 14 values were rewritten;
  - a second dry run shows everything `unchanged`.
- **R**:
  - the QA customer's phone is stored as `+9627…`;
  - the tracking page found the order with the number typed as `079 880 0103`;
  - the request was `GET 200` (`ODI-phone-track-other-format.png`).

STATUS: **DONE**. Running `normalize_phones` (dry run, then apply) on production is a deployment step; until then, legacy values still match in tracking and download through `phones_match`.

---

## 10. Consent persistence (Part 9)

DECISION / SCOPE: store technical evidence of the consent already required by the form. The wording itself and its legal sufficiency remain D06.

ROOT CAUSE: `PublicOrderCreateSerializer` validated `consent` and then discarded it (`payload.pop("consent")`).

IMPLEMENTATION:
- **`OrderConsent`** (migration `orders.0018_order_consent`) stores:
  - order and customer;
  - `accepted`;
  - `consent_version`;
  - `consent_text`, the exact text shown;
  - `language`;
  - `source` (`web`/`mobile`/`unknown`);
  - `created_at`.
- It is **append-only**: `save()` on an existing row and `delete()` raise errors.
- **`orders/consent.py`** registers the texts by version:
  - `order-consent-web-v1` (AR + EN, identical to `frontend/src/utils/orderConsent.js`);
  - `order-consent-mobile-v1` (AR, identical to `mobile/src/utils/orderConsent.ts`).
- Changing a text means a new version.
- **Clients**:
  - the web form now sends `consent_version` and `consent_source=web`, and the mobile app sends its own pair;
  - an unknown version is refused (400);
  - a client that sends no version still gets its acceptance recorded, as `unversioned-client` with **no text claimed**.
- **Read side**: order detail exposes `consent: {status, accepted, version, language, source, accepted_at}`. Orders without a row read **`{"status": "legacy_unknown"}`**. Nothing is backfilled.

DATA MIGRATION: schema only (new table). No historical consent is fabricated.

TESTS:
- **24**: `ConsentEvidenceTests.test_order_cannot_be_submitted_without_consent` (`false` and missing → 400, no order, no row).
- **25** and **26**: `test_accepted_consent_creates_evidence_with_version_text_time_and_language` (EN request → EN text and `en`), plus the mobile and unversioned cases and the unknown-version refusal.
- **27**: `test_historical_orders_are_not_backfilled`.
- Also:
  - `test_consent_evidence_is_append_only`;
  - the web test checks the form's statement and version are byte-identical to the server registry.

RUNTIME PROOF (R):
- The 8 seeded orders have **0** consent rows, so they read `legacy_unknown`.
- Each of the 15 orders created through the web form during the run has exactly 1 row (`envR_consent_rows.txt`).
- The UI journey's order `KH-2026-000024` has `accepted=True`, `order-consent-web-v1`, `ar`, `web`, a timestamp and the text (`journey_order24_consent.txt`).
- A submit with `consent=false` → 400.
- Correction to the decision probe: its step "seeded order stays legacy_unknown" picked `KH-2026-000023`, an order the e2e suite had just created through the web form. That order correctly showed `recorded`, so the step's assumption was wrong, not the product. The seeded-order check is the row table above.

STATUS: **DONE**

---

## 11. Release hardening (Part 10)

### A. Latent pagination

ROOT CAUSE: these screens read only the first page of a 20-row paginated answer (`unwrapList`), and several filtered and counted that page in the browser.

IMPLEMENTATION (server-side paging and filtering; PAGE_SIZE unchanged at 20; unique `pk` tiebreak in every ordering):

| List | Server additions | Screen |
|---|---|---|
| `/api/admin/orders/` | `?status_group=action\|execution\|completed`; `?include_status_counts=true` adds counts over the whole scoped, searched set; search also covers English service name, provider name and city | `OrdersManagementPage`: pager, chips and tile counts from the server |
| `/api/admin/users/` | `?role=`, `?is_deleted=` (with `include_deleted`) | `AdminUsersRolesPage` |
| `/api/admin/providers/` | `?is_deleted=` (with `include_deleted`) | `ProvidersManagementPage` |
| `/api/admin/notifications/` | `?status=`, `?channel=` | `NotificationsPage` |
| `/api/staff/documents/` | stable ordering | verify queue (pager, total from the server) |
| `/api/customer/orders/` | `?status_group=action\|active\|done`, `?search=`, status counts | `MyOrdersPage` ("show more" replaced by the standard pager) |
| `/api/provider/orders/` | `?status_group=active\|ready\|done`, `?search=`, status counts | `AssignedOrdersPage` |

- Dashboards that summarise one customer's or provider's own orders read every page (`fetchAllPages`, which fails loudly past 50 pages instead of truncating).
- Permissions and organization scoping are unchanged; the new code only adds filters and ordering on top of the existing scoped querysets.

TESTS:
- **28–31**: `orders.tests_release_pagination` (15 tests, 21–45 rows each). Every row is reachable through `?page=` for:
  - admin orders, including the status filter and counts;
  - users;
  - providers;
  - notifications;
  - staff documents;
  - the customer list (own orders only);
  - the provider list (assigned only).
- Frontend: `releasePagination.test.jsx` (7) checks that page 2 is requested from the server and filters go as parameters. `api/releasePagination.test.js` (5) checks the exact query strings and that dashboards read every page.

STATUS: **DONE**

### B. Staff layout `<main>`

IMPLEMENTATION: `DashboardLayout` wraps the page outlet in `<main id="main-content">` with the same classes (no visual change).

TESTS:
- **32**: the web test "the staff layout has one main landmark…".
- Runtime: one `<main>` on `/admin/services`.

**33**: the full axe suite passes (`a11y.spec.js`, `axe-auth.spec.js` on 5 viewports, `p2-accessibility.spec.js`); see Regression.

STATUS: **DONE**

### C. Flaky responsive test (`client-audit-responsive`)

INVESTIGATION (`responsive_timing_run1.txt`, `responsive_timing_under_load.txt`): each of the spec's 48 cold page loads (12 pages × 4 widths) was timed twice, on an idle machine and again during the full backend suite.
- `h1` appeared in at most **1.04 s** (idle) and **1.00 s** (under load).
- The slowest JS chunk took **39 ms**, and the slowest API call 147 ms.
- **The lazy chunk itself is not slow, and Vite preview is not saturated.** A 12 s timeout against a 1 s load means the page never reached the state the test waited for.

CAUSES FOUND:
1. **The test waited for the wrong readiness condition.** `page.locator('h1').first()` is satisfied by *any* heading, including the route error page (`RouteErrorBoundary` renders an `h1` "تعذر تحميل هذه الصفحة" ("this page could not be loaded")). A broken page could pass, and a stuck route loader (Suspense chunk or auth check) surfaced only as a bare 12 s timeout with no cause.
2. **Redundant load.** The spec sets its own four viewports but ran under all five Playwright projects: 240 cold loads instead of 48, on the same local servers as everything else.

FIX (no timeout increased):
- The route-level states are marked: `data-page-loading="route-chunk"` (Suspense loader), `data-page-loading="auth"` (protected-route check) and `data-route-error` (route error page). Section spinners are deliberately not marked.
- The spec's `waitForPageReady` polls for: no route error, no route-level loader, and a visible `h1`.
- Failed requests and 5xx responses are collected and printed in the failure message, so a future failure names what the page was waiting for.
- The spec runs once (project `desktop-1440`).

TESTS / RUNTIME:
- Full Playwright run: the responsive spec passed.
- Then `--repeat-each=3`: **3/3 passed** (≈44 s each).

STATUS: **DONE**. The old 12 s timeout was not reproduced on this machine, even under load. The readiness condition is now deterministic, and a future failure will report its cause instead of timing out silently.

### D. Dead homepage component

`frontend/src/components/publicSite/PublicHomepageTemplate.jsx` was imported by nothing (no route, no test). It held the "managed from the admin panel" copy and the only WhatsApp rendering, and it was the only caller of the public missing-service intake API. **Deleted**; `docs/FULL_PROJECT_ARCHITECTURE.md` was updated to say that API has no web caller now. Lint and the full frontend suite are green after removal.

STATUS: **DONE**

### E. Duplicate contact source

The public footer reads the active CMS row (`PublicPageContent`). The `site.contact` system setting was editable in two admin screens but read by no public page.
- **The CMS is now the single runtime source.**
- `site.contact` is retired:
  - it is removed from `SAFE_SYSTEM_SETTINGS`, so the API refuses to create or update it;
  - it is excluded from the settings list;
  - it is removed from `AdminCmsPage`, `AdminRuleManagementPage` and the test mock.
- An existing row is **kept untouched** in the database. No contact value was invented or changed.

TEST: `RetiredContactSettingTests` (not listed, create refused, old row unchanged).

STATUS: **DONE**

### F. Files never removed

- **Behaviour (unchanged, now documented)** in `documents/retention.py`: soft delete keeps the stored file, and nothing purges files.
- **Soft-deleted files cannot be downloaded**: the signed-in, signed-token and public order-number + phone paths all read only `is_deleted=False` rows.
- **Hook for a future D06 policy**: `purge_candidates(deleted_before=…)` (read-only queryset) and `manage.py report_document_retention` (read-only report: count, size, list). No destructive purge was implemented.

TESTS:
- `test_soft_deleted_documents_cannot_be_downloaded` (owner and admin get 404; the public phone gate gets 404).
- `RetentionReportTests`.

STATUS: **DONE** (purge awaits a retention policy)

### G. Backup automation

- `scripts/backup.sh` (existing) already reads back its dump and archive.
- **`scripts/verify_backup.sh`** (new, needs no running stack, so it works on the off-server copy) checks:
  - completeness (no `.partial`);
  - `SHA256SUMS`;
  - that the gzip/tar media archive is readable;
  - the PostgreSQL custom-format magic;
  - the manifest fields.
- **`scripts/backup_scheduled.sh`** (new) runs one cron/systemd cycle: backup, then verify, then the optional off-server copy (`KHALSNI_BACKUP_COPY_COMMAND`), then optional rotation.
  - Rotation runs only when `KHALSNI_BACKUP_KEEP` is set; it is validated before any backup, and `.partial` directories are never deleted.
  - **No retention default is invented**; unset means nothing is deleted.
  - It exits non-zero on any failure.
- The runbook (schedule, variables, verification) and `DEPLOYMENT.md` are updated. Restore is the existing `scripts/restore.sh`.

TESTS: exercised locally with synthetic backups.
- **Verify**: a good backup passes; tampered checksums, a non-PostgreSQL dump and a `.partial` directory are refused.
- **Scheduled wrapper**: run with a stubbed `backup.sh`, it keeps the newest N, never removes the `.partial`, calls the copy command, and refuses `KHALSNI_BACKUP_KEEP=abc` before taking a backup.
- Not run against a real Compose/PostgreSQL stack in this pass.

STATUS: **DONE** (production schedule confirmation remains a release gate)

---

## Regression

| Run | Result |
|---|---|
| Full backend suite (serial, `manage.py test`) | **610 tests, OK (7 skipped)** |
| New backend tests run against the base code (`f5b98b9`, imports guarded) | 66 tests: **50 fail on base**. The 16 that pass on base are controls by design: staff/provider unchanged, admin ledger usable, prices unchanged, migration idempotent, another customer still blocked, and so on (`test-runs/new-backend-tests-on-base-f5b98b9.txt`). Test 24's "consent required" part already worked on base; it fails there only on the missing `OrderConsent` evidence. |
| Full frontend suite (`vitest run`) | **46 files, 150 tests passed** |
| `npm run lint` | clean |
| Mobile `npm run typecheck` | clean |
| Playwright, full suite, QA mode, 5 viewports (includes axe, responsive, P2 accessibility, hardening, acceptance) | **477 passed, 4 failed, 19 skipped** on the first run. The 4 failures were one P2 test (admin orders chip-count contrast) on 4 viewports: axe sampled the chip while its CSS colour transition was still running (confirmed: `CSSTransition background-color/color: running` right after the click). Server-side filtering now re-renders on click, which exposed the timing. The test now waits for CSS transitions to finish before measuring, and the colours are unchanged. Rerun: **`p2-accessibility.spec.js` × 3 repeats, 60 passed, 15 skipped (its designed skips), 0 failed**. |
| Responsive spec `--repeat-each=3` | **3/3 passed** |
| Full lifecycle, customer → employee → provider → customer (R, UI) | **all steps passed**: submit with consent (one order on double click and refresh), queue, review, missing-document request, bell, upload and resubmit, acceptance, provider assignment, provider progress, customer progress with no provider name, final result, final-result approval, completion, completion notification, download of the exact final file, re-login, no duplicate transitions or notifications (`journey_lifecycle.txt`, `journey_lifecycle_part2.txt`, `J*.png`) |
| P1 F02 on the legacy copy (S) | safe state holds: `WAITING_CUSTOMER`, no file input, no false success, no write requests (`p1_f02_recheck.txt`) |
| P1 B02/F05 and P2 findings | their regression tests are part of the green full suites above |

### Existing tests changed

| Test | Why | Strength |
|---|---|---|
| `config.tests_hardening_access.CustomerPaymentRecordTests` | expected 400 (validation) from a write path that B05 removed | now 405, plus no payment row exists; stricter |
| `config.tests_acceptance_adversarial` fixture `mk()` | generated `079` + 6 digits (9 digits), which is not a valid Jordanian mobile under the approved default-country rule | fixture now generates valid 10-digit `079…` numbers; no assertion changed |
| `accounts.tests_p2_remediation` (valid phones, profile) | asserted "stored as typed", which the phone policy replaces | asserts the canonical value; the second sample number changed because two spellings of one number are now one identity |
| `orders.tests.OrderAPITests.test_customer_can_create_order` | same | asserts `+962795555555` |
| `RegisterPage.validation.test.jsx` | mocked server message text | updated to the new server message |
| `AdminUsersRolesPage*.test.jsx`, `ProvidersManagementPage.test.jsx`, `localization.p2.test.jsx` | mocked the old full-list functions | mock the page variants; no assertion removed |
| `e2e/p2-accessibility.spec.js` (test 20) | measured mid-transition | waits for CSS transitions to finish, then asserts zero contrast violations |
| `e2e/client-audit-responsive.spec.js` | wrong readiness condition; ran in all projects | deterministic readiness and one project; same overflow assertions |

### Observed, not changed (outside the approved scope)

- **`Document.verification_note`** (the approval note, and the provider's delivery note) is returned to customers and shown in the mobile app. The web staff placeholder used to call it "internal"; it no longer says so. Whether approval notes should reach customers is a product question.
- **`ProviderAdminSerializer`** defines `validate()` twice. The first, which requires a password on create, is unreachable, so creating a provider without a password raises `KeyError` (500).
- **`OrderConsent`**: `save()` and `delete()` refuse changes, but a bulk `QuerySet.delete()` bypasses model methods. No code path does that.
- **15 land services** keep parcel and basin always required, without the "do you know them?" question (owner choice, below).
- **The mobile app** still sends no `Accept-Language`.
- **`national_id`** is typed `number` in the catalogue schemas (field-type debt from the dossier).

---

REMAINING OWNER/CLIENT INPUT:
- **D05**: official phone, email, WhatsApp, address and office hours. Current placeholders are unchanged; the CMS row is now the only source.
- **D06**: privacy policy wording, retention periods (for the purge hook and for backup rotation), and whether the recorded consent wording is legally sufficient.
- **B10-8**: meaning and workflow of `is_verified`.
- **B10-9**, unresolved groups:
  - the authorization / power-of-attorney family, including "تفويض إن وجد" ("authorization, if any") required in all 8 services;
  - the personal-ID file types;
  - the three approval definitions.
  - No definition was merged in this pass.
- **B10-10**: the meaning of `base_price`. Fixed-price services still show parts that do not add up (passport renewal: total 64, shown parts 20 + 12).
- **Brand/domain**: canonical spellings and email domain (unchanged).
- Also (dossier B10-1/2/3): should the 15 land services without the question get it?

RELEASE GATES REMAINING:
- SMTP real delivery.
- Real iOS Safari.
- Real Android Chrome.
- Deployed-build closure audit.
- Official contact and privacy content (D05/D06).
- Production backup schedule confirmation: cron entry, off-server copy, retention value, and a restore drill on production-like data.
- Deployment step: run `normalize_phones` (dry run, review collisions, apply with a report) on production data.

FINAL STATUS: **OWNER DECISION IMPLEMENTATION PASS**

The original audit is **not** closed: the owner/client inputs and release gates above remain.
