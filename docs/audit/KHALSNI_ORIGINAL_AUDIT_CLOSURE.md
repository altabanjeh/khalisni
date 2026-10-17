# KHALSNI ORIGINAL AUDIT CLOSURE VERDICT

BUILD / COMMIT: `ba7f94ccc01d29cd4483c6a2d78e1ffc9ba7fc64` (working tree clean; no source file was modified by this audit)
BRANCH: `main`
DATE: 2026-10-15
ENVIRONMENT: Local, isolated, disposable. Django 5 `runserver` + production `vite build`/`vite preview`, SQLite, Windows 11, Python 3.12.11, Node 24.18.0. Uploads and outbound mail redirected to a scratch directory (file-based QA mailbox). Browsers: Google Chrome (Chromium) and Playwright WebKit 1.63.
- **Env A**: fresh `migrate` + `seed_demo` + `seed_client_audit_qa` (canonical QA fixture: 2 customers, 2 providers, employee, admin, internal note, files). API `:8009`, web `:4319`.
- **Env B**: a *copy* of the repository's legacy `backend/db.sqlite3` (May demo data, 38-service imported catalogue), migrated to HEAD. API `:8010`, web `:4320`. The original file was opened read-only.
- The deployed site named in the audit (`khalisni.com`) was **not** tested. Every result below describes the current code at this commit, not what is deployed.

TOTAL FINDINGS: 26

CLOSED: 12
PARTIAL: 9
OPEN: 1
BLOCKED: 3
NOT_APPLICABLE: 1

P1 OPEN/PARTIAL: 3 (F02, F05, B02)
P2 OPEN/PARTIAL: 7 (F04, U04, D02, D03, B04, B09, B10)
P3 OPEN/PARTIAL: 0

Additionally BLOCKED with P1 weight: D05 (support contact data), B05 (payment scope).

END-TO-END JOURNEY:
PASS (local, Env A, order `KH-2026-000011`; every role acted through the browser UI. See section "End-to-end release journey")

RELEASE-CLOSURE CONDITION:
FAIL. The journey and isolation gates pass, but three P1 items remain:
- **F05** (OPEN): the admin order UI still offers no transitions where the displayed rules and the API allow them.
- **F02** (PARTIAL): the legacy reference order still shows 0/0 and gives a false success on resubmit.
- **B02** (PARTIAL): per-requirement file-type rules can be bypassed server-side, and the bypass auto-resumes the order.

FINAL VERDICT: **AUDIT NOT CLOSED**

Source of truth used: `Khalsni_Website_Audit_AR.docx` and `Khalsni_Audit_Evidence.zip` (`audit_data.json`, E01–E14, E01A/B/C, M01/M02), dated 2026-10-01. Both were found at `D:\ghassam moblie\` without the "(1)" suffix. `audit_data.json` and the .docx were compared item by item and agree on all 26 items. The developer's own closure claims in `docs/audit/KHALSNI_CLIENT_FINAL_ACCEPTANCE.md` (19 PASS) were treated as claims only and re-tested independently.

---

## Status table

| ID | Priority | Original issue | Status | What was tested | Evidence | Remaining problem | Required next action |
|----|----------|----------------|--------|-----------------|----------|-------------------|----------------------|
| F01 | P1 | Dashboard showed a missing-document event while the bell said "no notifications" | **CLOSED** | Genuine events created by employee actions (request-docs, reject) for `customer_a`. Compared dashboard "آخر الإشعارات" with the bell panel, then clicked the bell item. Checked unread before/after, reload, and parity with `/notifications/unread-count/`. In the journey, the bell item opened `/customer/orders/11/missing-docs`. | `F01-A-customer-dashboard.png`, `F01-A-bell-open.png`, `F01-A-after-bell-click.png`, `F01-A-bell-after-reload.png`, `J04-customer-bell.png`, `CUSTOMER-results.json`, `DRAFT-F01-results.json` | None against the acceptance criteria. UX notes: the dashboard list items are not clickable, the bell icon has no numeric badge, and customers have no "view all" (panel shows 5). | Optional UX follow-up only. |
| F02 | P1 | `KH-2026-000001` asked for an authorization letter but the page showed 0/0 with no upload field | **PARTIAL** | **(A) Legacy:** Env B migrated copy of the original record, `KH-2026-000001` WAITING_CUSTOMER with `missing_document_types=[]`. **(B) New:** Env A, employee request via API and UI with empty / unknown / valid types. Customer page render, upload, resubmit. | `F02-B-legacy-order1-missing-docs.png`, `F02-B-legacy-after-submit.png`, `F02-legacy-api.txt`, `F02-A-order5-missing-docs.png`, `B02-B06-B07-api.txt`, `J06-customer-after-resubmit.png` | **New requests: fixed.** Empty and unknown types are rejected (400), the field shows the localized name, `accept=.pdf`, 0/1, and upload resumes review. **Legacy record: original defect reproduces.** The page shows **0/0 with no field**, and "رفع المستندات وإعادة الإرسال" is enabled. Clicking it shows a **false success toast** ("تم رفع المستندات وإعادة إرسال الطلب للمراجعة") with **no upload/resubmit request sent**. The order stays WAITING_CUSTOMER, and the employee's resume is blocked ("No valid missing-document request exists."). The record is stuck unless cancelled. | CODE: when no valid requested types exist, disable resubmit and remove the false success. DATA: migrate or repair legacy waiting orders whose request has no types. |
| F03 | P1 | Employee UI claimed "requirements complete / ready" while required documents were missing | **CLOSED** | Readiness from `allowed_actions.readiness` (`orders/readiness.py:90`) compared with the employee UI for: not uploaded (order 5), pending review (6), approved (7), rejected (9), legacy (1). Assign stays blocked until approval. "جاهز الآن" appeared only once all documents were approved (journey step 9). | `F03-F04-A-employee-order{5,6,7,9,1}.png/.txt`, `STAFF-results.json`, `JOURNEY-run2-results.json` | Optional/waived documents were not reproduced at runtime: the QA service has none and no waiver feature exists. Covered only by backend tests `orders.tests_readiness` (passed). | Add an optional-document QA fixture if runtime proof is required. |
| F04 | P2 | A never-uploaded document was shown as "rejected" | **PARTIAL** | Employee labels: "لم يُرفع بعد" (not uploaded), "بانتظار التحقق" (pending), "مرفوض" (rejected), "معتمد" (approved). These are distinct. Rejected a real file with reason "الصورة غير واضحة - QA", then checked the employee page, customer page, customer API and notification. | `F03-F04-A-employee-order5.png`, `F04-A-customer-order9-rejected.png`, `B02-B06-B07-api.txt` | The original mislabel is fixed. However, the **rejection reason is shown nowhere**: it is stored (`rejection_reason` in the staff API) but rendered on neither the employee order page nor the customer page. The customer API returns `rejection_reason: null`, and the rejection notification says only "needs correction". | CODE/UI: show the reason to staff, and to the customer if business rules allow. |
| F05 | P1 | Admin order showed no transitions and a disabled update button, while `/admin/rules` listed waiting→review/cancel | **OPEN** | `/admin/workflow-rules/` compared with per-order `allowed_actions` for all 11 statuses (matrix below) and the admin order UI for orders 1, 4–8. Executed the API transitions. | `F05-matrix-envA.txt`, `F05-workflow-rules-8009.json`, `F05-A-admin-order5.png`, `F05-A-admin-rules-workflow-tab.png`, `F05-api-cancel-probe.txt`, `STAFF-results.json` | The backend rules and API agree. **The admin UI does not.** For WAITING_CUSTOMER, `/admin/orders/5` shows "لا توجد تحوّلات متاحة" and a disabled "تحديث الحالة", although the rules page lists Waiting→Cancelled for Admin. `allowed_actions` reports `cancel_order available=true`, and `POST /admin/orders/1/cancel/` succeeds (200). The admin page has **no cancel and no request-documents control** in any state; only the generic-status select, assign, complete and reject. Prerequisite messages are raw: `resume_review — Requested documents still need upload: client-audit-qa-202610-authorization.` The rules table is English (`Waiting customer to Cancelled by Admin…`, `note_required`). | CODE/UI: expose every dedicated transition the rule and API allow (cancel, request documents) and localize blocked reasons and rule summaries. |
| F06 | P2 | CMS preview differed from the published homepage | **CLOSED** | Env A: editor → save → preview iframe → logged-in public `/` → fresh anonymous context → reload → restore. | `F06-A-content-editor-before.png`, `F06-A-preview-before.png`, `F06-A-preview-after-save.png`, `F06-A-public-after-save.png`, `ADMIN2-results.json` | None. The preview labels itself "هذه الصفحة تعرض الصفحة الرئيسية المنشورة نفسها" ("this page shows the same published homepage"). Note: saving publishes immediately; there is no draft stage. | None (draft workflow would be a new feature). |
| U01 | P2 | Admin header tools stacked vertically on mobile | **CLOSED** | `/admin` at 390, 430, 768 and 1366: header height, visible controls, menu content, overflow. | `U01-admin-{390,430,768,1366}.png`, `U01-admin-*-menu-open.png`, `STAFF-results.json`; compare M01/M02/E02 | None. The header is 68–76 px (8–9 % of the viewport) with menu, bell and "more" visible. Guide, language, public site and logout sit in the menu. Overflow 0. | None. |
| U02 | P2 | Search results appeared below the whole category grid | **CLOSED** | Env B real catalogue, `/services`, searched "تأسيس" at 1366 and 390. Also tested zero results and clearing. | `U02-search-tasis-1366.png`, `U02-search-tasis-390.png`, `U02-zero-results-*.png`, `UX-results.json` | None. One result at y=526 (1366) and y=779 (390), within the first viewport. The category grid is hidden during search. "1 نتيجة" equals one card. Zero results show "لا توجد نتائج مطابقة", and clearing restores the 7 categories. | None. |
| U03 | P2 | Tracking showed `legal_authorization` with no action | **CLOSED** | `/track-order` for Env A orders 5, 1 and 8 and the Env B legacy order 1. Checked the API payload, the rendered text and the action link while logged out. | `U03-track-A-KH-2026-000005.png`, `U03-track-A-KH-2026-000001.png`, `UX-results.json` | None for configured documents. The page shows "تفويض تجريبي" / "خطاب تفويض" with no code, RTL is correct, and the action "سجل الدخول لرفع المستندات" goes to `/login?next=/customer/orders/<id>/missing-docs`. A wrong phone gives 404, and the payload has no internal note, provider or file. The legacy order shows no requested item (see F02). | Covered by F02 data repair. |
| U04 | P2 | Required/optional not shown before submit | **PARTIAL** | Labels before submit and empty-submit errors on `/register` and `/contact`. Backend validation via `POST /auth/register/` and `/public-site/contact-inquiries/`. | `U04-register-before-submit.png`, `U04-contact-before-submit.png`, `U04-*-empty-submit.png`, `UX-results.json`, `B04-U04-auth-api.txt` | Labels are fixed ("(مطلوب)/(اختياري)"), and contact labels match the backend (email optional, phone required). **The register backend disagrees with its labels.** Phone is labelled required, but `phone:""` and `phone:"abc"` are accepted (201), and an **omitted `phone` returns HTTP 500 (KeyError)**. No phone format hint is shown. The password hint says only "ثمانية أحرف على الأقل" ("at least eight characters"), but the backend also rejects common and all-numeric passwords. | CODE: server-side phone required + format, no 500. UI: phone example and full password rules. |
| D01 | P2 | TEXT/SELECT/TEXTAREA/NUMBER shown on the service page | **CLOSED** | Env B `/services/business_company_registration` rendered text, plus Arabic scans at 1366 and 390 in Chromium and WebKit. | `PUB-B-service-1366-ar.png/.txt`, `B09-*-public-services_business_company_registration.png` | None. The tokens are replaced by Arabic hints ("أدخل القيمة الرقمية المطلوبة عند تعبئة الطلب" etc.). | None. |
| D02 | P2 | Public text referred to admin settings ("from the admin panel", "controlled by current settings") and repeated | **PARTIAL** | Same page, plus home and related-service cards (Env B catalogue). Traced the source fields. | `PUB-B-service-1366-ar.txt`, `PUB-B-home-1366-ar.txt`, `B09-webkit-390-public-services_business_company_registration.png` | The code-authored strings are gone (the provider and document-link "controlled by current settings/policies" sentences). **The headline example remains and still repeats.** "يحدد بعد المراجعة من لوحة الإدارة." appears in the hero chip, the summary line ("تُحدد من لوحة الإدارة · يحدد بعد المراجعة من لوحة الإدارة.") and every related-service card on the homepage. The source is catalogue data (`public_price_note_ar`, `delivery_note_ar`) in **36 of 38** services of the migrated catalogue. | CONTENT/DATA: replace the notes with approved customer wording, or add a guard against admin-facing phrases; de-duplicate the hero/summary rendering. |
| D03 | P2 | English strings in Arabic mode | **PARTIAL** | Systematic Latin-script scan of rendered Arabic text on 18 routes (public on the Env B real catalogue, plus customer, employee, provider and admin), legacy notifications in Env B, and the QA mailbox. | `D03-latin-scan.json`, `F01-B-customer-dashboard.png`, `CUSTOMER-results.json`, `STAFF-results.json`, `F03-F04-A-employee-order*.txt` | **Clean:** home, catalogue, service detail, categories, tracking, the request wizard and customer pages (current data). "Civil Status and Passports", "Service for", "Assigned for processing", "National ID" and "Authorization Letter" are no longer present. **Remaining English in Arabic mode is listed after this table.** | CODE (localize system strings and emails) + DATA (legacy notifications). |
| D04 | P3 | Brand spelling inconsistent (خالصني / Khalisni / Khalsni) | **CLOSED** | Rendered header, footer, home, about, title and meta on Env A and B, plus a source scan of frontend visible strings and backend customer-facing text. | `PUB-B-*-1366-ar.txt`, `PUB-B-summary.json` (title `خلصني \| Khalsni`, meta), traceability scan | No "خالصني" or visible "Khalisni" remains. UI uses خلصني/Khalsni, and catalogue prose uses the diacritised خلّصني. "khalisni" survives only in **email domains** (`no-reply@khalisni.local` default sender visible in reset emails; `support@khalisni.local` contact data). These are covered by D05 and an owner decision on the domain spelling (the audited site is `khalisni.com`). Logo unchanged. | Owner: confirm the approved Latin spelling vs domain (table 3). |
| D05 | P1 pre-launch | Placeholder support data (`info@khalisni.local`, +962790000000, "Amman Jordan") | **BLOCKED** (business content required) | Footer and contact page on Env A (fresh) and Env B (legacy CMS row). CMS fields traced. | `PUB-A-contact-1366-ar.txt`, `PUB-B-contact-1366-ar.txt`, `PUB-B-summary.json` (`telLinks`) | The software works: values are CMS-configurable, the fresh default shows "معلومات التواصل غير منشورة حالياً" ("contact information not currently published"), and phone/email render as `tel:`/`mailto:` links. **The published legacy content is still non-real:** `support@khalisni.local` (an undeliverable `.local` domain) and an unverified address. `/contact` itself shows no contact details. No approved business contact data has been supplied. | CLIENT: supply approved phone/email/WhatsApp/address. Then publish and verify the links. |
| D06 | P3 | Privacy page generic | **BLOCKED** (business/legal content required) | Rendered `/privacy` on Env A and B. CMS fields traced. | `PUB-B-privacy-1366-ar.png/.txt`, `PUB-A-privacy-1366-ar.txt` | Technically supported (paired AR/EN CMS fields). The **same four general principles** are still published, with no retention period, deletion/request mechanism, data contact channel, processor identity or document-handling detail. No approved policy text exists. This audit does not draft legal terms. | CLIENT/LEGAL: supply approved policy text. |
| B01 | P1 | Provider assignment → receipt → progress → final delivery could not be tested (no eligible provider) | **CLOSED** | Full UI journey, twice (`KH-2026-000010`, `KH-2026-000011`). Eligible provider chosen from the employee dropdown, provider list and detail, IN_PROGRESS via the provider UI, final result uploaded via the provider UI, employee verified the final result on the verify screen, employee completed, customer downloaded. | `J*.png`, `JOURNEY-run2-results.json`, `JOURNEY2-results-KH-2026-000011.json` | None locally. The downloaded file is byte-identical to the provider's distinct final PDF (marker bytes verified). The customer cannot see the final result before approval. | Re-run on the deployed environment. |
| B02 | P1 | Upload / resubmit / review not verified | **PARTIAL** | Browser upload (wizard and missing-docs), API uploads of `.exe`, an 11 MB PDF, HTML renamed to `.pdf`, and a valid PNG against a PDF-only requirement. Employee reject with and without reason, approve, download authorization. | `B02-B06-B07-api.txt/.json`, `J06-*.png`, `J07-employee-verify-page.png`, `F04-A-customer-order9-rejected.png` | Working: `.exe`, oversize and spoofed content are rejected (400); a reject without reason gives 400; download needs an owner-issued token (other customer/provider → 404). **Defect:** the per-requirement `allowed_extensions` is not enforced server-side on resubmission. A **PNG was accepted (201) for a PDF-only requirement and automatically moved the order back to UNDER_REVIEW** (order `KH-2026-000009`). The browser `accept=.pdf` is the only guard. The rejection reason is not visible to the customer (see F04). | CODE/SECURITY: enforce requirement extensions, MIME and size in `upload_customer_document`. Expose the reason. |
| B03 | P1 | Re-login failed for the customer on the audited site; role sessions not verified | **CLOSED** | Customer, employee, admin and provider QA accounts: UI login, refresh, cross-role URLs, logout, protected URL after logout, storage cleared, re-login, forged/expired tokens. A deactivated user's old access token, refresh token and new login were all checked. | `B03-results.json`, `B03-*-invalid-session.png`, `B04-U04-auth-api.txt` | None locally: every check behaved correctly. The original live-site credential failure was not reproducible here (no live access). | Confirm QA accounts on the deployed site. |
| B04 | P2 | Registration / activation / recovery not verified | **PARTIAL** | Register (API and UI labels), duplicate, forgot for known and unknown addresses, reset via the file-based QA mailbox, token reuse, garbage token, password mismatch, new and old password login. | `B04-U04-auth-api.txt`, `B04-reset-api.txt` | Working: reset is fully proven (link → new password works, old rejected, reuse rejected, generic forgot response, no enumeration there). **Gaps:** register 500 on missing phone (U04); duplicate registration returns a raw model message ("النموذج User والحقل email موجود مسبقاً.") that confirms the account exists; there is **no activation step** (by design; the new account is active immediately); reset emails are English-only from `no-reply@khalisni.local`; real SMTP delivery not observable (external). | CODE (500, messages, email language); CLIENT (activation required?); EXTERNAL (SMTP). |
| B05 | P1 before payment | Payment / cancel / refund not testable | **BLOCKED** (scope decision + sandbox) | Searched for a scope decision. Inspected the payment module and endpoints. Tested cancellation (admin cancel API 200). | `docs/PRD.md` (no payment statement), `F05-api-cancel-probe.txt` | No project document states whether payment is in or out of this release. `docs/PRD.md` does not mention payment, so NOT_APPLICABLE cannot be justified. The code has manual payment records and `/admin/payments`, with gateway fields but **no gateway integration and no webhook**. Customer payment endpoints have no UI. | CLIENT: decide payment scope. If in scope: gateway + sandbox credentials. |
| B06 | P1 | Isolation between users, providers, files and internal notes not verified | **CLOSED** | Adversarial API and UI matrix with Customer A/B, Provider A/B, employee and admin, separate orders, a file and an internal note (seeded plus one created via UI in the journey). Covered list, detail, cancel, upload, status change, token issue and download, admin endpoints, tracking with wrong phone, and tracking payload. | `B02-B06-B07-api.txt/.json`, `B03-results.json`, `J11-provider-order.png`, `J13-customer-progress.png` | None. All cross-object access returns 404/403 (BOLA/IDOR negative). Internal notes never reach customer, provider or tracking. Note for the owner: the customer *API* returns `assigned_provider` (name, type, city, rating), although the customer UI does not render it. | Owner: confirm whether provider identity may be exposed to customers (table 3). |
| B07 | P1 | Duplicate submission / draft not verified | **CLOSED** | UI wizard: double-click submit plus extra click, reload on the success page, unchecked consent default, draft save → reload → logout → re-login. API: same Idempotency-Key replay, changed payload, other customer. | `JOURNEY-run2-results.json` (B07 lines), `DRAFT-F01-results.json`, `B07-draft-after-reload.png`, `B02-B06-B07-api.txt` | None. 1 POST, 1 order, 1 order number. Replay returns the same order (200); a changed payload gets 409; reload adds nothing; the event set is not duplicated. The draft survives reload and is deliberately cleared on logout. Residual: raw API clients that omit `Idempotency-Key` get no dedupe. | None for the web client. |
| B08 | P1 | External notification delivery not verified | **NOT_APPLICABLE** (external channels, this release) | Scope check, channel configuration, in-app lifecycle in the journey. | `docs/PRD.md:34`; `JOURNEY2-results-KH-2026-000011.json`; `backend/notifications/utils.py:45` | `docs/PRD.md:34` states "Notifications are logged in-system; no external gateway integration in this MVP." `NOTIFICATION_EMAIL/SMS/WHATSAPP_ENABLED` are not defined. In-app events submitted, under_review, missing_docs, verified, assigned, started, completed_work, ready and completed were rendered in the bell with no duplicates. The DB `status="sent"` on `channel=system` records is **not** external delivery. Password reset is the only outbound email (B04). | If the client expects email/SMS, that is new scope. |
| B09 | P2 | Mobile / browser coverage incomplete | **PARTIAL** | 144 cases: 18 routes (public, customer wizard, missing-docs, order, employee order and verify, provider order, admin dashboard, order, list and rules) × 390/430/768/1366 × Chromium and WebKit. Checked page overflow, clipping, console errors, RTL and touch targets. | `B09-matrix-chromium_webkit.json`, `evidence/b09/*.png`, `B09-touch-targets-390.json` | Page overflow 0 in all 144 and no console errors. The only "clipped" elements are the intentional horizontal service rails. Workflow pages have no undersized targets; footer links are 20 px tall (minor, below the 24 px WCAG 2.2 minimum). **Not covered:** real iOS Safari and Android Chrome hardware, virtual-keyboard behaviour, native file pickers. Only engine emulation was available. | EXTERNAL: real-device pass (iOS Safari, Android Chrome) incl. keyboard and file picker. |
| B10 | P2 | Form / admin data-rule observations | **PARTIAL** | Each sub-item checked separately (Env B real catalogue, admin UI and API). | `B10-B-admin-services.png/.txt`, `B10-B-admin-users.png/.txt`, `B10-counts-api.txt`, `JOURNEY-run2-results.json` | Sub-items 1, 6 and 8 are still objectively defective; 5 is fixed; 2, 3, 4, 7, 9 and 10 await client decisions. See the B10 breakdown below. | Fix 1, 6 and 8 (code/data). Decisions for the rest (table 3). |

### D03: English found in Arabic mode

- **Legacy notifications** (migrated data, Env B customer bell): "Order completed", "Final result uploaded", "More documents required", "Order received", "Your order … was created successfully".
- **Staff and provider timelines:** system notes "Order assigned to provider", "Provider completed work and uploaded final result", "Customer uploaded all requested missing documents", "Order under review".
- **Employee pages:**
  - provider approval badge "Approved";
  - verify queue shows raw document codes `client-audit-qa-202610-authorization` and `final-result`.
- **Admin pages:**
  - dashboard chart labels `NEW`, `WAITING_CUSTOMER`, `ASSIGNED`, `COMPLETED`;
  - order page `assign_provider — Required documents are incomplete`;
  - rules page "Expected completion: N days" and English workflow summaries.
- **Emails:** password reset and password-changed emails are English only.
- Staff-authored free text (e.g. seed notes such as "Please upload the QA authorization PDF.") keeps its authored language. It is not counted as a defect.

### B10 breakdown

| # | Observation | Classification | Evidence |
|---|---|---|---|
| 1 | Parcel/basin question type | **B: still defective.** The yes/no question "هل تعرف رقم القطعة والحوض؟" is still `type=number` in 2 published services (`request-property-registration-certificate`, `request-cadastral-map`). | Env B schema query (section "Evidence index", B10) |
| 2 | Duplicate fields | **C: awaiting decision.** No exact duplicate labels. Parcel and basin fields coexist with the "do you know them?" question, so the intended data model is undefined. | same |
| 3 | Conditional required fields | **C: awaiting decision.** Parcel and basin are unconditionally required in 18 services, even when the customer may not know them. There is no condition engine. | same |
| 4 | Notes required | **C: awaiting decision.** `additional_notes` (textarea) is `required=True` in 18 services. | same |
| 5 | Consent preselected | **A: fixed.** Starts unchecked in the UI journey and on draft restore. | `JOURNEY-run2-results.json` |
| 6 | Admin service pagination | **B: still defective.** `/admin/services` renders **20 rows of 38**; the API returns `next=?page=2` but the UI has no pagination control. Also affects the services tab on `/admin/rules`. | `B10-counts-api.txt`, `B10-B-admin-services.txt` |
| 7 | Public vs admin count | **C (after fixing 6).** Public 32 vs admin 38, a legitimate difference (hidden services). Admin categories include 3 named "???" (corrupted legacy names, hidden publicly). | `B10-counts-api.txt` |
| 8 | Verified-state source | **B (label defect) + C (meaning).** The users table shows "تم التحقق" for every active user because the column renders `VERIFIED` from `is_active` (`AdminUsersRolesPage.jsx:256`), while `is_verified=false` for all of them. What "verified" means is undecided. | `B10-B-admin-users.txt`, `B10-counts-api.txt` |
| 9 | Document definition duplicates | **C: awaiting decision.** No exact duplicates (DB constraint). Near-duplicates remain: "أي مستندات/وثائق إضافية تطلبها الجهة المختصة", "تفويض خطي أو وكالة / … عدلية", "وكالة قانونية (إن وجدت) / إن وجدت". | Env B query |
| 10 | Fee breakdown | **C: awaiting decision.** Public `base_price` is always null; components are shown per flag; the approved composition is undefined. | traceability map |

---

## F05 state-transition matrix (admin role, Env A, executed 2026-10-15)

| From | To | Action | Rule (admin allowed) | Prerequisite checks | API `allowed_actions` | Admin UI exposes it? | Executed |
|---|---|---|---|---|---|---|---|
| NEW | UNDER_REVIEW | start_review | yes | internal actor | available | yes (status select) | employee UI ✔ (journey) |
| NEW | ARCHIVED | archive_order | yes | none | available | yes (status select) | not executed |
| NEW | CANCELLED | cancel_order | yes | customer owns order | available | **no** | not executed |
| UNDER_REVIEW | WAITING_CUSTOMER | request_missing_documents | yes | note + configured types | available | **no** (employee page only) | employee UI ✔; empty/unknown → 400 |
| UNDER_REVIEW | ASSIGNED | assign_provider | yes | docs approved, provider approved/available/service match | blocked "Required documents are incomplete." until approved | yes (when available) | employee UI ✔ |
| UNDER_REVIEW | REJECTED | reject_order | yes | reason | available | yes | not executed |
| UNDER_REVIEW | CANCELLED | cancel_order | yes | assigned employee or unassigned | available | **no** | not executed |
| WAITING_CUSTOMER | UNDER_REVIEW | resume_review | yes | all requested docs uploaded | blocked with reason | shown only as raw English blocked text; select says "no transitions" | generic endpoint → 400 (dedicated by design); customer upload ✔ |
| WAITING_CUSTOMER | CANCELLED | cancel_order | yes | assigned employee or unassigned | **available** | **no**: select says "لا توجد تحوّلات متاحة", update disabled | **API 200** (`F05-api-cancel-probe.txt`) |
| ASSIGNED | IN_PROGRESS | provider_start_work | no (provider) | assigned provider only | shown blocked "Role 'admin' cannot…" | raw English text | provider UI ✔ |
| ASSIGNED | CANCELLED | cancel_order | yes | none | available | **no** | not executed |
| IN_PROGRESS | READY_FOR_DELIVERY | mark_ready_for_delivery | yes | final doc + docs approved | available | no explicit control (final upload is a provider path) | provider UI ✔ |
| IN_PROGRESS | WAITING_GOVERNMENT | provider_pause | no (provider) | assigned provider | shown blocked | raw text | not executed |
| IN_PROGRESS | REJECTED / CANCELLED | reject / cancel | yes | reason / none | available | reject yes / cancel **no** | not executed |
| READY_FOR_DELIVERY | UNDER_REVIEW / IN_PROGRESS | return_* | yes | reason | available | yes (status select) | not executed |
| READY_FOR_DELIVERY | COMPLETED | complete_order | yes | verified final result or admin override | available (admin override) | yes | employee UI ✔ (after verifying the final result) |
| READY_FOR_DELIVERY | CANCELLED | cancel_order | yes | none | available | **no** | not executed |
| COMPLETED | UNDER_REVIEW / ARCHIVED | reopen / archive | yes | reason / none | available | yes (status select) | not executed |
| REJECTED / CANCELLED | ARCHIVED | archive_order | yes | none | available | yes (status select) | not executed |

Conclusion: the rules source (`workflow/rules.py`), the rules endpoint and the server enforcement are consistent. The **admin order screen omits every dedicated cancel and request-documents transition** and explains blocks with untranslated technical text. That is the original F05 symptom.

---

## End-to-end release journey (section 9)

Order `KH-2026-000011` (Env A), Arabic UI, Chrome. Each role acted in its own browser session; the API was used only to read state.

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | Customer A submits via the 4-step wizard (PDF attached, consent ticked manually) | PASS | `J01-customer-review-step.png`, `J01-customer-success.png` |
| – | Double-click and extra click on submit → 1 POST, 1 order; reload adds nothing | PASS | `JOURNEY-run2-results.json` |
| 2 | Employee sees it in the queue and starts review via the UI | PASS | `J02-employee-order-new.png` |
| 3 | Employee requests the missing document via the UI (checkbox + note) and adds an internal note | PASS | `J03-employee-after-request.png` |
| 4 | Customer receives the in-app notification; the bell item opens `/customer/orders/11/missing-docs` | PASS | `J04-customer-bell.png` |
| 5–6 | Customer uploads the PDF via the file input and resubmits → UNDER_REVIEW | PASS | `J06-customer-after-resubmit.png` |
| 7–8 | Employee opens the verify screen and approves → readiness complete | PASS | `J07-employee-verify-page.png` |
| 9 | Employee assigns eligible QA Provider A (both QA providers listed) → ASSIGNED; "جاهز الآن" shown only after approval | PASS | `JOURNEY-run2-results.json` |
| 10–11 | Provider A sees it in the list and opens it; internal note absent | PASS | `J11-provider-order.png` |
| 12 | Provider sets IN_PROGRESS via the UI | PASS | – |
| 13 | Customer sees "قيد التنفيذ" | PASS | `J13-customer-progress.png` |
| 14 | Internal note hidden from customer and provider (note verified to exist in staff API) | PASS | journey output, internal-note check |
| 15 | Provider uploads a distinct final-result PDF via the UI → READY_FOR_DELIVERY; customer cannot see it yet | PASS | `J15-provider-after-final.png` |
| 16 | Employee verifies the final result on the verify screen (approve enabled after preview) | PASS | `J16-employee-verify-final.png` |
| 17 | Employee "اعتماد النتيجة وإكمال الطلب" + confirm → COMPLETED | PASS | `J17b-employee-completed.png` |
| 18 | Customer bell shows "اكتمل الطلب KH-2026-000011" | PASS | `J18-customer-bell-completed.png` |
| 19 | Customer downloads the final result via the UI; bytes equal the provider's distinct file | PASS | `J19-customer-order-completed.png` |
| 20 | Reload and a fresh login still show COMPLETED | PASS | – |
| 21 | One order; 8 unique transitions; notifications not duplicated | PASS | `JOURNEY2-results-KH-2026-000011.json` |

Honesty note: in the first run (`KH-2026-000010`) my script tried to complete before verifying the final result, as the UI requires. Its steps 18–20 passed on generic text matches and on a final file identical to the customer's upload, so those results were discarded. The run was repeated on `KH-2026-000011` with strict checks and a distinct final file. Both orders reached COMPLETED through the UI.

---

## Regression / security run

| Suite | Result | Evidence |
|---|---|---|
| Backend `manage.py test` (all apps, serial, isolated media) | **478 tests, OK (7 skipped)**, 473 s | `REG-backend-tests.txt` |
| Frontend `vitest run` | **34 files / 100 tests passed** | `REG-frontend-vitest.txt` |
| Frontend `eslint src` | **clean (exit 0)** | `REG-frontend-lint.txt` |
| Playwright existing suites (client-audit ×5, hardening ×2, a11y, axe-auth) on desktop-1440 and mobile-390 against Env A | **68 run: 64 passed, 4 failed** (4.5 min) | `REG-e2e.txt` |

The 4 Playwright failures are all `axe-auth.spec.js`, on both viewports, and are **real WCAG 2 AA `color-contrast` (serious) violations**:
- `/employee/documents/verify`: the selected queue item shows `#64748b` on `#eff6ff` (4.37:1). This is the line that also prints the raw document code.
- `/admin/orders`: the active status-filter count chip shows `#cfdff7` (`text-white/80`) on the brand fill (4.34:1).

They appear only when those lists hold data (QA orders), which the seed used by earlier gate runs did not provide. They are not one of the 26 original findings; they are related to B09 and accessibility, and are added to Remaining Work. Failure screenshots: `e2e-artifacts/axe-auth-*/test-failed-1.png`.

The existing tests passing does **not** contradict the open findings. No existing test covers:
- a per-requirement extension on resubmission (B02);
- a register request with no phone (U04);
- the legacy WAITING order with no requested types in the UI (F02);
- admin-UI exposure of dedicated transitions (F05).

The developer's acceptance report marked F02, F04, F05, U04, D02, D03, B02 and B04 as PASS (or narrower), and this audit could not confirm those claims.

---

# REMAINING WORK

| Rank | ID | Severity | Type | Exact remaining work | Dependency | Estimated complexity |
|------|----|----------|------|----------------------|------------|----------------------|
| 1 | B02 | P1 | SECURITY / CODE DEFECT | Enforce `ServiceRequiredDocument.allowed_extensions`, MIME and `max_file_size` inside `upload_customer_document` (and provider/staff final uploads where configured), before any auto-`resume_review`. Add a regression test that a PNG on a PDF-only requirement returns 400 and the status is unchanged. | none | S |
| 2 | F05 | P1 | CODE DEFECT / UI/UX | On `/admin/orders/:id`, render every `workflow_transitions` entry that is admin-allowed (cancel with reason, request documents with types, resume when available), not only the generic-status list. Map action codes and blocked reasons to localized human text instead of `resume_review — Requested documents…`. Localize the `/admin/rules` workflow table. | none | M |
| 3 | F02 | P1 | CODE DEFECT | `MissingDocumentsResponsePage`: when `missing_document_types` is empty, disable resubmit, remove the unconditional success toast, and show a "contact support / waiting for staff" state. Give staff a recovery action for WAITING orders without a valid request. | none | S |
| 4 | F02 | P1 | DATA / QA FIXTURE | One-off data repair for legacy WAITING_CUSTOMER orders whose request has no types (e.g. the original `KH-2026-000001`): attach the intended requirement or return them to review. | owner approval of mapping | S |
| 5 | U04 / B04 | P2 | CODE DEFECT | `RegisterSerializer`: make `phone` required and non-blank with format validation; remove the `KeyError` 500. Show a phone example and the full password rules. Replace the raw "النموذج User…" duplicate message. | none | S |
| 6 | F04 / B02 | P2 | UI/UX | Show `rejection_reason` on the employee order page and (if approved by owner) on the customer document card and rejection notification. | owner decision on customer visibility | S |
| 7 | B10-6 | P2 | CODE DEFECT | Follow pagination in `getAdminServices` (and other `unwrapList` admin lists) or add pagination controls; the admin currently sees 20 of 38 services. | none | S |
| 8 | B10-8 | P2 | CODE DEFECT | `AdminUsersRolesPage.jsx:256/282`: do not label `is_active` as "VERIFIED"; show active and verified as separate facts. | owner definition of "verified" (for the second half) | S |
| 9 | B10-1 | P2 | DATA | Convert "هل تعرف رقم القطعة والحوض؟" from `number` to yes/no in the 2 published services. | owner confirms answer type | S |
| 10 | D02 | P2 | CONTENT / DATA | Replace `public_price_note_ar` and `delivery_note_ar` values containing "لوحة الإدارة" in 36 services. De-duplicate the hero and summary price/delivery line. | approved wording | S |
| 11 | D03 | P2 | CODE DEFECT | Localize system timeline notes, provider approval badge, admin chart status labels, rules page and duration text, verify-queue document codes, and password emails (AR/EN by user language). Backfill or re-render legacy English notification rows. | none | M |
| 12 | D05 | P1 pre-launch | CONTENT | Publish approved support phone, email, WhatsApp and address. Remove `support@khalisni.local`. Set `DJANGO_DEFAULT_FROM_EMAIL` to a real domain in deployment. Consider showing the channels on `/contact`. | client content | S |
| 13 | D06 | P3 | CONTENT | Publish approved privacy policy text (retention, deletion process, data contact, document handling, processors). | client/legal content | S |
| 14 | B05 | P1 if payment ships | CLIENT DECISION / EXTERNAL SERVICE | Decide payment scope. If in scope: gateway integration, sandbox, webhook idempotency, refund and cancel sync tests. | client decision, gateway contract | L |
| 15 | B09 | P2 | RELEASE VERIFICATION / EXTERNAL SERVICE | Real-device pass on iOS Safari and Android Chrome (keyboard, file picker, modals). Raise footer link targets to ≥24 px. | device access | S |
| 16 | B04 | P2 | EXTERNAL SERVICE / CONFIGURATION | Configure SMTP and verify reset email receipt in a real mailbox. Decide whether account activation is required. | SMTP credentials, client decision | S |
| 16b | (regression, B09-related) | P2 | UI/UX | Fix two axe `color-contrast` serious violations: selected item meta text on `/employee/documents/verify` (#64748b on #eff6ff, 4.37:1) and active filter count chip on `/admin/orders` (white/80 on brand, 4.34:1). | none | S |
| 17 | B10-2/3/4/7/9/10 | P2 | CLIENT DECISION | See table 3. | client | – |
| 18 | ALL | – | RELEASE VERIFICATION | Re-run this closure suite against the deployed build (commit, migrations and catalogue identity). The audited site `khalisni.com` was not tested. | deployment access | S |

---

# ITEMS REQUIRING OWNER / CLIENT INPUT

| ID | Decision required | Why code cannot decide it | Options currently supported |
|----|-------------------|---------------------------|-----------------------------|
| D05 | Official support phone, email, WhatsApp, address (AR/EN), office hours | Business facts; inventing them would publish false contact data | CMS fields `contact_phone`, `whatsapp_number`, `email`, `office_address(_en)`; blank shows "not published" |
| D06 | Approved privacy policy text | Legal/business content; not an engineering decision | CMS `privacy_policy_ar/en` (both required together) |
| D04 | Approved Latin brand spelling vs domain (`Khalsni` brand, `khalisni.com` domain, `@khalisni.*` emails) | Brand/identity choice | Any value via env (`DJANGO_DEFAULT_FROM_EMAIL`) and CMS |
| B05 | Is online payment in this release? | No document states it; PRD silent | Manual payment records and admin status only; no gateway |
| B04 | Must new accounts verify email (activation) before use? | Product/security policy | Currently active immediately; reset flow exists |
| B06 | May customers see the assigned provider's identity (name, city, rating)? | Business/privacy policy | API currently returns it; customer UI does not show it |
| F04 | Should customers see the staff rejection reason verbatim? | Communication policy | Stored in `rejection_reason`; not exposed to customers |
| F02 | How to remap legacy WAITING orders lacking requested types | Needs knowledge of what was originally requested | Cancel, return to review, or attach a requirement |
| B10-1/2 | Answer types and data model for parcel/basin questions and "do you know them?" | Source catalogue ambiguity | checkbox, select, number, text |
| B10-3 | Triggers for conditionally required fields and documents | No machine-readable rule supplied | Optional + manual review only |
| B10-4 | Should "additional notes" be required? | Business rule | required/optional per field |
| B10-7 | Which population each count should show (public vs admin) | Definition missing | Active, public-visible, published-category filters |
| B10-8 | Meaning of "verified user" and who sets it | Policy | `is_verified`, `is_email_verified`, `is_phone_verified` |
| B10-9 | Merge near-duplicate document definitions? | Semantic equivalence is a business judgement | Merge, or keep with clearer names |
| B10-10 | Fee breakdown composition and display per service | Pricing policy | `base_price`, `government_fee`, `service_fee` + `show_*_public` flags |
| D02 | Approved customer-facing price/delivery wording | Content | Per-service `public_price_note_*`, `delivery_note_*` |

---

## Traceability map (implementation located before testing; not proof of closure)

| Finding | Frontend | API | Domain logic | Model | Permission | Existing tests | Route |
|---|---|---|---|---|---|---|---|
| F01 | `components/Topbar.jsx`, `NotificationPanel.jsx`, `context/NotificationContext.jsx`, `pages/customer/CustomerDashboardHome.jsx` | `/api/notifications/`, `/unread-count/`, `/<pk>/read/`, `/mark-all-read/` | `notifications/services.py:97`, `selectors.py:4` | `Notification` | recipient-scoped queryset | `notifications.tests*`, `NotificationPanel.test.jsx` | `/customer` |
| F02 | `pages/customer/MissingDocumentsResponsePage.jsx`, `pages/employee/EmployeeOrderReviewPage.jsx` | `POST /api/admin/orders/<pk>/request-documents/`, `POST /api/customer/orders/<pk>/documents/` | `orders/services.py:518 request_missing_documents`, `:272 upload_customer_document`, `:924 resume_review`, `orders/readiness.py:136` | `MissingDocumentRequest`, `Order.missing_document_types` | `CanRequestMissingDocuments`, customer ownership | `orders.tests`, `MissingDocumentsResponsePage.test.jsx` | `/customer/orders/:id/missing-docs` |
| F03 | `EmployeeOrderReviewPage.jsx:108-408` | `GET /api/admin/orders/<pk>/` (`allowed_actions.readiness`) | `orders/readiness.py:90`, `orders/allowed_actions.py:39-88` | `Document`, `ServiceRequiredDocument` | `CanReviewOrders`, `CanAssignOrders` | `orders.tests_readiness` | `/employee/orders/:id` |
| F04 | `EmployeeOrderReviewPage.jsx:229-243`, `components/DocumentList.jsx`, `utils/format.js:31` | staff/customer order detail, `/api/staff/documents/` | `documents/services.py:118 verify_document` | `Document.status`, `rejection_reason` | `CanVerifyDocuments` | `EmployeeOrderReviewPage.test.jsx` | `/employee/orders/:id`, `/customer/orders/:id` |
| F05 | `pages/admin/AdminOrderDetailsPage.jsx:56-217`, `AdminRuleManagementPage.jsx` | `/api/admin/workflow-rules/`, `/api/admin/orders/<pk>/status|cancel|reject|complete|assign/` | `workflow/rules.py:22`, `workflow/transition_permissions.py:28`, `orders/services.py:370` | `Order` | `IsAdminRole`, `CanManageOrderWorkflow` | `orders.tests`, `config.tests_authz_matrix` | `/admin/orders/:id`, `/admin/rules` |
| F06 | `HomepageContentEditorPage.jsx`, `PreviewPublicPage.jsx` (iframe `/`), `HomePage.jsx` | `/api/admin/public-site/content/`, `/api/public-site/homepage/` | `public_site/views.py:56-85,199` | `PublicPageContent` | `IsAdminRole` | `public_site.tests` | `/admin/public-site/*`, `/` |
| U01 | `components/Topbar.jsx`, `layouts/DashboardLayout.jsx` | – | – | – | – | `client-audit-ux.spec.js` | `/admin` |
| U02 | `pages/public/ServicesPage.jsx:53-240` | `/api/services/` | `services/selectors.py:20` | `Service` | AllowAny | `ServicesPage.test.jsx` | `/services` |
| U03 | `pages/public/TrackOrderPage.jsx:141-160` | `/api/orders/track/` | `TrackOrderSerializer` (`orders/serializers.py:502`) | `Order` | AllowAny + phone match + throttle | `TrackOrderPage.test.jsx` | `/track-order` |
| U04 | `RegisterPage.jsx`, `ContactPage.jsx` | `/api/auth/register/`, `/api/public-site/contact-inquiries/` | `accounts/serializers.py:101-127` | `CustomUser`, `ContactInquiry` | AllowAny + throttle | `RegisterPage.test.jsx`, `ContactPage.test.jsx` | `/register`, `/contact` |
| D01/D02 | `ServiceDetailsPage.jsx:140,266,318-423`, `utils/servicePresentation.js` | `/api/services/<slug>/` | `services/serializers.py:43-58` | `Service.required_information_schema`, `public_price_note_*` | AllowAny | `ServiceDetailsPage.test.jsx` | `/services/:slug` |
| D03 | `utils/servicePresentation.js`, `utils/format.js`, `OrderTimeline.jsx` | various | `notifications/localized_content.py`, `orders/services.py` notes | `Notification.context_data` | – | `services.tests_client_audit_locale` | all |
| D04/D05/D06 | `index.html`, `layouts/PublicLayout.jsx`, `PrivacyPolicyPage.jsx` | `/api/public-site/homepage/` | `public_site/defaults.py` | `PublicPageContent` | AllowAny | `public_site.tests` | `/`, `/contact`, `/privacy` |
| B01 | `ProviderOrderDetailsPage.jsx`, `EmployeeVerifyDocumentsPage.jsx`, `DocumentList.jsx` | `/api/admin/orders/<pk>/assign/`, `/api/provider/orders/*`, `/api/staff/documents/<pk>/verify/`, `/api/admin/orders/<pk>/complete/`, `/api/documents/<pk>/download-token/` | `orders/services.py:478,620,683`, `documents/services.py:118,202` | `Order`, `Document`, `ProviderProfile`, `ServiceProviderAssignment` | `IsProviderRole`, `CanAssignOrders`, `CanVerifyDocuments` | `orders.test_end_to_end`, `providers.tests` | `/provider/orders/:id` |
| B02 | `MissingDocumentsResponsePage.jsx:193`, `CustomerCreateOrderPage.jsx` | upload endpoints | `documents/serializers.py:68 validate_file`, `documents/file_validation.py` | `Document` | ownership | `documents.tests*` | – |
| B03/B04 | `api/client.js`, `AuthContext.jsx`, `ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx` | `/api/auth/*` | `accounts/authentication.py`, `accounts/password_reset.py` | `CustomUser.token_version`, `PasswordResetToken` | – | `accounts.tests*`, `config.tests_hardening*` | `/login`, `/register`, `/forgot-password` |
| B05 | `pages/admin/PaymentsManagementPage.jsx` | `/api/admin/payments/*`, `/api/customer/payments/*` | `payment/services.py` | `Payment`, `Invoice` | `CanViewPaymentStatus`, `CanRefundPayment` | `payment.tests` | `/admin/payments` |
| B06 | – | all object endpoints | `orders/selectors.py:17-74`, `providers/views.py:286`, `documents/services.py:202` | – | role + object scope | `config.tests_authz_matrix`, `config.tests_acceptance_adversarial` | – |
| B07 | `CustomerCreateOrderPage.jsx:303`, `orderDrafts.js` | `POST /api/orders/` + `Idempotency-Key` | `orders/views.py:94-154` | `Order` unique `(customer, submission_key)` | customer | `orders.tests`, `orderDrafts.test.js` | `/customer/orders/new` |
| B08 | `NotificationPanel.jsx` | `/api/notifications/` | `notifications/utils.py:45`, `services.py` | `Notification.Channel/Status` | – | `notifications.tests` | – |
| B09 | all | – | – | – | – | `client-audit-responsive.spec.js` | all |
| B10 | `ServicesManagementPage.jsx`, `AdminUsersRolesPage.jsx`, `api/client.js:324 unwrapList` | `/api/admin/services/` (PAGE_SIZE 20), `/api/admin/users/` | `services/service_import.py:126-313` | `Service`, `RequiredDocumentDefinition`, `CustomUser` | `IsAdminRole` | `services.tests_service_import` | `/admin/services`, `/admin/users` |

---

# EVIDENCE INDEX

All files are under `docs/audit/evidence/original-closure-2026-10-15/`. Responsive screenshots are in its `b09/` subfolder. Probe scripts are in `probes/` (they read `KHALSNI_QA_PASSWORD` from the environment; no secrets committed). QA mailbox messages are not included because they contain reset tokens; the redacted content is quoted in B04.

F01:
- screenshot: `F01-A-customer-dashboard.png`, `F01-A-bell-open.png`, `F01-A-after-bell-click.png`, `F01-A-bell-after-reload.png`, `F01-B-customer-dashboard.png`, `J04-customer-bell.png`, `J18-customer-bell-completed.png`
- browser trace: `CUSTOMER-results.json`, `DRAFT-F01-results.json`
- API: `DRAFT-F01-results.json` (`unread-count` = bell line)
- test: `notifications.tests*` (in `REG-backend-tests.txt`)

F02:
- screenshot: `F02-B-legacy-order1-missing-docs.png`, `F02-B-legacy-after-submit.png`, `F02-A-order5-missing-docs.png`, `J06-customer-after-resubmit.png`
- browser trace: `CUSTOMER-results.json` (`F02_legacy.apiCallsOnSubmit`: no POST)
- API: `F02-legacy-api.txt`, `B02-B06-B07-api.txt` (`X_request_docs_empty/unknown`)

F03:
- screenshot: `F03-F04-A-employee-order{1,5,6,7,9}.png`
- text: matching `.txt`
- API: `STAFF-results.json`, `JOURNEY-run2-results.json` (step 9)

F04:
- screenshot: `F03-F04-A-employee-order5.png`, `F04-A-customer-order9-rejected.png`
- API: `B02-B06-B07-api.txt` (`customer_sees_after_reject`)

F05:
- screenshot: `F05-A-admin-order{1,4,5,6,7,8}.png`, `F05-A-admin-rules-workflow-tab.png`
- API: `F05-workflow-rules-8009.json`, `F05-matrix-envA.txt`, `F05-api-cancel-probe.txt`

F06:
- screenshot: `F06-A-content-editor-before.png`, `F06-A-preview-before.png`, `F06-A-preview-after-save.png`, `F06-A-public-after-save.png`
- trace: `ADMIN2-results.json`

U01:
- screenshot: `U01-admin-{390,430,768,1366}.png`, `U01-admin-*-menu-open.png`
- metrics: `STAFF-results.json`

U02:
- screenshot: `U02-search-tasis-{1366,390}.png`, `U02-zero-results-{1366,390}.png`
- metrics: `UX-results.json`

U03:
- screenshot: `U03-track-A-KH-2026-000005.png`, `U03-track-A-KH-2026-000001.png`, `U03-track-B-KH-2026-000001.png`, `U03-track-A-KH-2026-000008.png`
- API: `UX-results.json`

U04:
- screenshot: `U04-register-before-submit.png`, `U04-register-empty-submit.png`, `U04-contact-before-submit.png`, `U04-contact-empty-submit.png`
- API: `B04-U04-auth-api.txt`

D01 / D02:
- screenshot: `PUB-B-service-1366-ar.png`, `b09/B09-webkit-390-public-services_business_company_registration.png`
- text: `PUB-B-service-1366-ar.txt`, `PUB-B-home-1366-ar.txt`
- DB: Env B query of `public_price_note_ar` / `delivery_note_ar` (36/38 services), quoted in D02

D03:
- scan: `D03-latin-scan.json`
- screenshot: `F01-B-customer-dashboard.png`, `F05-A-admin-rules-workflow-tab.png`
- text: `F03-F04-A-employee-order*.txt`, `J07-employee-verify-page.txt`

D04:
- text: `PUB-B-summary.json`, `PUB-A-summary.json`, `PUB-*-*.txt`
- source scan: quoted in the D04 row

D05:
- text: `PUB-A-contact-1366-ar.txt`, `PUB-B-contact-1366-ar.txt`
- links: `PUB-B-summary.json` (`telLinks`)

D06:
- screenshot: `PUB-B-privacy-1366-ar.png`, `PUB-A-privacy-1366-ar.png`

B01:
- screenshot: `J01…J19*.png`
- trace: `JOURNEY-run2-results.json`, `JOURNEY2-results-KH-2026-000011.json`, `JOURNEY-results.json`, `JOURNEY2-results.json` (first run)

B02:
- API: `B02-B06-B07-api.txt`, `B02-B06-B07-api.json`
- screenshot: `J06-customer-after-resubmit.png`, `J07-employee-verify-page.png`, `F04-A-customer-order9-rejected.png`

B03:
- trace: `B03-results.json`
- screenshot: `B03-{customer_a,employee,admin,provider_a}-invalid-session.png`

B04:
- API: `B04-U04-auth-api.txt`, `B04-reset-api.txt`

B05:
- doc: `docs/PRD.md` (no payment scope)
- API: `F05-api-cancel-probe.txt`

B06:
- API: `B02-B06-B07-api.txt` (all `custB_*`, `provA_*`, `provB_*`, `track*`, `dl_*` keys), `B03-results.json`
- screenshot: `J11-provider-order.png`, `J13-customer-progress.png`

B07:
- trace: `JOURNEY-run2-results.json`, `DRAFT-F01-results.json`
- screenshot: `B07-draft-after-reload.png`
- API: `B02-B06-B07-api.txt` (`B07_*`)

B08:
- doc: `docs/PRD.md:34`
- trace: `JOURNEY2-results-KH-2026-000011.json` (notification list)

B09:
- matrix: `B09-matrix-chromium_webkit.json` (144 cases)
- screenshots: `b09/*.png`
- touch: `B09-touch-targets-390.json`

B10:
- screenshot: `B10-B-admin-services.png`, `B10-B-admin-users.png`
- API: `B10-counts-api.txt`
- text: `B10-B-admin-services.txt`, `B10-B-admin-users.txt`
- DB: Env B schema and definition queries (quoted in the B10 breakdown)

Regression: `REG-backend-tests.txt`, `REG-frontend-vitest.txt`, `REG-frontend-lint.txt`, `REG-e2e.txt`.

---

## Data created during this audit (disposable environments only)

- Env A orders `KH-2026-000009` … (journey, B02, B07 and e2e runs).
- Env A order `KH-2026-000001` cancelled by the admin API probe.
- QA registrations `qa-reg-*@example.test` and `qa-b03-inactive-*@example.test` (one of them deactivated).
- CMS hero title edited and restored.
- One contact inquiry.

Env B received only legacy-order reads plus one UI click on the legacy resubmit button (no request was sent). No repository database, media directory, source file, permission, workflow rule or seed was changed.
