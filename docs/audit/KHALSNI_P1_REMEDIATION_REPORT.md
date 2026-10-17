# KHALSNI P1 REMEDIATION REPORT (B02, F05, F02)

BASE SHA: `ba7f94ccc01d29cd4483c6a2d78e1ffc9ba7fc64`
FINAL SHA: see the commit that adds this report on branch `fix/p1-audit-remediation` (`git log -1 fix/p1-audit-remediation`)
BRANCH: `fix/p1-audit-remediation`
DATE: 2026-10-16
SCOPE: only the three technical P1 findings from `docs/audit/KHALSNI_ORIGINAL_AUDIT_CLOSURE.md`. No P2/P3 work, no workflow-rule change, no data edited by hand.

ENVIRONMENT (verification):
- **A2**: fresh `migrate` + `seed_demo` + `seed_client_audit_qa`. API `:8019`, web `:4329`.
- **B2**: a new migrated *copy* of the legacy `backend/db.sqlite3`, which contains the original `KH-2026-000001`. API `:8020`, web `:4330`. The repository database was only read.
- Media and mail were redirected to a scratch directory. Browser: Chrome via Playwright.

FILES CHANGED:

| File | Change |
|---|---|
| `backend/documents/file_validation.py` | New `requirement_upload_error()`: the requirement's extension, size and real-content rules in one place |
| `backend/orders/serializers.py` | Order creation uses the shared helper (same checks, same messages); new `RecoverMissingDocumentRequestSerializer` |
| `backend/orders/services.py` | `upload_customer_document` validates against the requirement **before** persisting. New `missing_document_request_is_invalid()` and audited `recover_invalid_missing_document_request()` |
| `backend/orders/allowed_actions.py` | `workflow_transitions[*].blocked` gives stable codes and params alongside the existing English `blocked_reasons`. New `missing_document_request_valid` and `can_recover_missing_document_request` |
| `backend/orders/views.py`, `backend/orders/urls.py` | `POST /api/admin/orders/<pk>/recover-missing-documents/` (`CanRequestMissingDocuments` + reviewable-orders scope) |
| `backend/orders/management/commands/audit_missing_document_requests.py` | New dry-run-first detection/repair command |
| `backend/orders/tests_p1_remediation.py` | 17 new backend regression tests |
| `frontend/src/utils/workflowPresentation.js` | New AR/EN mapping for actions, roles, checks, channels and blocked-reason codes |
| `frontend/src/components/MissingRequestRecovery.jsx` | New staff recovery panel (confirmation + required reason) |
| `frontend/src/pages/admin/AdminOrderDetailsPage.jsx` | Workflow-actions panel: cancel, request documents, localized blocked list, indirect-action notes, recovery |
| `frontend/src/pages/admin/AdminRuleManagementPage.jsx` | Workflow-rules table rendered from codes in the screen language |
| `frontend/src/pages/customer/MissingDocumentsResponsePage.jsx` | Safe state for unusable requests; success only after the server confirms |
| `frontend/src/pages/employee/EmployeeOrderReviewPage.jsx` | Shows the recovery panel |
| `frontend/src/api/ordersApi.js`, `frontend/src/api/services.js` | `cancelAdminOrder`, `recoverMissingDocumentRequest` |
| `frontend/src/pages/admin/AdminOrderDetailsPage.test.jsx`, `.../AdminRuleManagementPage.workflow.test.jsx`, `.../MissingDocumentsResponsePage.legacy.test.jsx` | New frontend tests |
| `frontend/src/pages/customer/MissingDocumentsResponsePage.test.jsx` | One mock made accurate (see F02) |

Evidence: `docs/audit/evidence/p1-remediation-2026-10-16/`. Probe scripts read `KHALSNI_QA_PASSWORD` from the environment.

---

## B02 — server-side per-requirement document validation

ROOT CAUSE:
- The canonical rules are the order's requirement snapshot (`orders/readiness.py` → `order_requirement()`, with `allowed_extensions` and `max_file_size` copied from `ServiceRequiredDocument`).
- Order creation checked them in `PublicOrderCreateSerializer.validate`. The resubmission path did not:
  - `CustomerOrderDocumentUploadAPIView` validated only against the **global** policy (`DocumentUploadSerializer`: `ALLOWED_UPLOAD_EXTENSIONS`, `FILE_UPLOAD_MAX_SIZE`, MIME list and magic-byte sniff);
  - `upload_customer_document` then stored the file and called `resume_review`.
- Result: a PNG was accepted for a PDF-only requirement and moved the order WAITING_CUSTOMER → UNDER_REVIEW. Only the browser `accept=".pdf"` prevented it.

FIX:
- `requirement_upload_error(upload, requirement)` (`documents/file_validation.py`) holds the requirement checks: extension allow-list, then requirement size limit, then the existing signature sniff. There is no second hard-coded limit.
- The order-creation loop now calls this helper, with identical messages.
- `upload_customer_document` calls it **before** `create_order_document`, the missing-type update, `resume_review`, the audit log and the notification. A refused file raises `{"file": ["…"]}` (400), and the order lock's atomic block guarantees nothing is persisted.
- MIME handling is unchanged: the global allow-list plus magic-byte sniffing, which identifies real content, is kept. No stricter browser-MIME rule was added that could reject valid files.

B02.5, other upload paths inspected:

| Path | Requirement rules apply? | Finding |
|---|---|---|
| Customer resubmission `POST /customer/orders/<pk>/documents/` | **yes, now** | Fixed (this defect). |
| Order creation `POST /orders/` | yes (already) | Now uses the same helper. |
| Provider final result `POST /provider/orders/<pk>/final-document/` and staff `POST /admin/orders/<pk>/final-document/` | n/a | `FINAL_RESULT` has no configured requirement. They use the global policy and sniff. Intentionally broader, so unchanged. |
| `AdminDocumentViewSet` (`/api/admin/documents/`, admin-only raw CRUD) | no | No workflow side effects and admin-only. Not changed in this pass; listed under remaining items. |

TESTS (`orders.tests_p1_remediation.B02RequirementFileRulesTests`, 7):
1. PDF on a PDF-only requirement is accepted and resumes review.
2. A PNG is rejected with 400 "Unsupported file extension for this document."
3. On every rejection: status stays WAITING_CUSTOMER, `missing_document_types` is unchanged, **no `Document` row** exists, the open request is not resolved, no WAITING→UNDER_REVIEW status log is written, and no `client_uploaded_missing_document` notification is sent.
4. Covered by test 3.
5. A PNG renamed to `.pdf` and HTML renamed to `.pdf` are both rejected.
6. A file over the requirement's 50 KB (below the global 10 MB) is rejected; `.exe` is rejected.
7. Order creation with a PNG is still rejected (`document_errors`), and no order is created.

Defect reproduction: with only the new check disabled, the PNG test and the per-requirement size test **fail**; with it restored they pass. The spoofed-content and `.exe` cases were already caught by the global validator and are kept as guards.

Runtime proof: the closure audit's exact probe was re-run on A2 (`B02-B06-B07-api-after-fix.txt`):
- `.exe` → 400, oversize → 400, HTML-as-PDF → 400;
- **PNG on PDF-only → 400** (`Unsupported file extension for this document.`), status **WAITING_CUSTOMER**;
- valid PDF → 201, status UNDER_REVIEW.

The original audit run had shown the PNG → 201 and the order moving to UNDER_REVIEW.

STATUS: **FIXED** (verified by tests and runtime)

---

## F05 — admin workflow controls vs allowed workflow actions

ROOT CAUSE:
- The workflow engine (`workflow/rules.py`), `/admin/workflow-rules/` and `allowed_actions.workflow_transitions` were consistent; runtime evidence did not show the engine wrong, so it was not changed.
- `AdminOrderDetailsPage` rendered only `available_status_transitions`, i.e. the *generic* channel, plus assign, complete and reject flags. Dedicated commands (`cancel_order`, `request_missing_documents`) were never rendered.
- So WAITING_CUSTOMER showed "لا توجد تحوّلات متاحة" ("no transitions available") although cancel was allowed and worked through the API.
- Blocked reasons were printed raw (`resume_review — Requested documents still need upload: <code>.`). The rules table printed English server summaries and check codes.

FIX:
- **Single source:** the page derives everything from `allowed_actions.workflow_transitions`.
  - Generic status moves stay in the status form.
  - Dedicated commands get their own controls only when the server marks them available. `cancel_order` gets a Cancel button with a confirmation modal; the reason is required when the rule's `reason_required` is true. It calls `POST /admin/orders/<pk>/cancel/` and refreshes the order.
  - `request_missing_documents` uses a form whose checkboxes are the order's configured `required_documents` only. The server still rejects empty or unknown types.
  - Assign, reject and complete are unchanged.
- **Indirect actions:** `mark_ready_for_delivery` (done by the provider's final-result upload) and `resume_review` (automatic on the customer upload) have no admin button by design. When available, the panel states where they happen instead of letting them disappear silently.
- **Blocked actions:** the server now adds `blocked: [{code, params}]` (`role_not_allowed`, `actor_not_assigned`, `documents_incomplete`, `no_uploadable_requirements`, `missing_request_invalid`, `requested_documents_pending` with document types, `final_result_unverified`). The English `blocked_reasons` are kept for existing clients.
  - `utils/workflowPresentation.js` maps codes to Arabic or English, and maps document codes to configured document names.
  - Unknown codes fall back to a generic localized sentence, never raw text.
- **Rules page:** status pair, action, channel, checks and roles are rendered from codes in the screen language. The rules themselves are untouched.
- No workflow permission was added.

TESTS:
- Frontend `AdminOrderDetailsPage.test.jsx` (7):
  - cancel shown when available (7) and absent when unavailable (8);
  - cancel requires a reason, calls the dedicated API and refreshes (9);
  - blocked reason in Arabic with no codes or English (10) and in English mode (10b);
  - request-documents only when allowed, refuses an empty selection, sends configured types (11);
  - recovery panel.
- Frontend `AdminRuleManagementPage.workflow.test.jsx` (12): Arabic rule text; no `cancel_order`, `note_required` or English summary.
- Backend `F05WorkflowReasonCodeTests` (3): stable codes, role code, and admin cancel of WAITING_CUSTOMER matching `allowed_actions`.

F05.6 matrix, re-run at runtime on A2 (`F05-ui-matrix-after-fix.json`, screenshots `F05-after-*.png`). "UI exposes" means the control is rendered; "Raw text" checks the page for codes or English server reasons.

| State (order) | Admin rules from state | API allowed (admin) | UI exposes | Mismatch | Raw text |
|---|---|---|---|---|---|
| NEW (KH-…004) | archive, start_review, cancel | all available | status form ARCHIVED/UNDER_REVIEW + Cancel | none | none |
| UNDER_REVIEW (KH-…006) | request docs, assign, reject, cancel | request, reject, cancel; assign blocked (documents incomplete) | request form, Reject, Cancel; assign explained in Arabic | none | none |
| WAITING_CUSTOMER (KH-…005) | resume_review, cancel | cancel; resume blocked (documents pending) | **Cancel**; resume explained ("بانتظار رفع العميل للمستندات: تفويض تجريبي") | none | none |
| ASSIGNED (KH-…007) | cancel (+ provider-only start) | cancel; start = provider role | Cancel; start explained as provider's action | none | none |
| IN_PROGRESS (KH-…002) | mark ready, reject, cancel (+ provider pause) | mark ready, reject, cancel | Reject, Cancel; mark-ready shown as provider upload note | none | none |
| READY_FOR_DELIVERY (KH-…008) | return ×2, complete, cancel | all available (admin override) | status form ×2, Complete, Cancel | none | none |
| COMPLETED (KH-…003) | reopen, archive | both | status form UNDER_REVIEW/ARCHIVED; no Cancel | none | none |
| CANCELLED (KH-…010) | archive | archive | status form ARCHIVED; no Cancel | none | none |
| REJECTED (KH-…006 after reject) | archive | archive | status form ARCHIVED; no Cancel | none | none |

Executed through the admin UI, then read back from the API:

| Transition | Control used | Result |
|---|---|---|
| NEW → UNDER_REVIEW | status form | ✔ |
| UNDER_REVIEW → WAITING_CUSTOMER | new request-documents form | ✔ |
| WAITING_CUSTOMER → CANCELLED | new Cancel action | ✔ |
| CANCELLED → ARCHIVED | status form | ✔ |
| UNDER_REVIEW → REJECTED | Reject | ✔ |

WAITING_GOVERNMENT has no admin rule (provider-only), so it was not separately exercised.

STATUS: **FIXED** (verified by tests and the runtime matrix)

---

## F02 — legacy missing-document request recovery

ROOT CAUSE:
- Legacy WAITING_CUSTOMER orders such as the original `KH-2026-000001` predate `MissingDocumentRequest`, so they have `missing_document_types=[]` and no open request.
- **Customer page:** `MissingDocumentsResponsePage` rendered the form for any WAITING_CUSTOMER order. With an empty list it showed 0/0, and `onSubmit` looped over nothing, then **unconditionally** showed the success toast and navigated away. No request was sent.
- **Staff:** `resume_review` correctly refused ("no valid missing-document request"), but staff had no recovery action, so the order was stuck.
- New requests were already validated by `request_missing_documents` (empty or unknown types → 400). That behaviour is kept.

FIX:
- **F02.1:** `allowed_actions.missing_document_request_valid` is computed from the open request (`unresolved_missing_request_types`).
  - When it is `false`, or the requested list is empty, the customer page renders a safe state: "لا توجد حالياً مستندات قابلة للرفع لهذا الطلب. يرجى انتظار مراجعة الطلب من فريق خلصني أو التواصل مع الدعم." ("There are currently no uploadable documents for this request. Please wait for the Khalsni team to review it, or contact support.")
  - The safe state shows the team's note and a back-to-request button. There is no form, no 0/0, no resubmit and no invented contact data.
- **F02.2:** success is shown only after the server confirms.
  - If nothing was uploaded, a localized inline error is shown and there is no toast.
  - After uploads the page re-reads the order. "Resubmitted" is shown only if the server left WAITING_CUSTOMER; otherwise it says documents were uploaded and others are still awaited.
- **F02.3:** `recover_invalid_missing_document_request` and `POST /api/admin/orders/<pk>/recover-missing-documents/`.
  - Allowed only for staff (admin, employee, support with `orders.request_missing_documents`), only on WAITING_CUSTOMER orders whose request is unusable, with a required reason, through the **existing** WAITING_CUSTOMER → UNDER_REVIEW rule and its role and assignment checks.
  - It records a status log (actor, time, previous and new state, reason). It writes audit logs `recover_missing_document_request` (old/new status + note) and `recover_missing_document_request_detail` (previous recorded types, open requests, reason).
  - It never guesses a document. Staff then send a normal request naming configured documents.
  - The panel appears on both the admin and the employee order screens.
- **F02.4:** `python manage.py audit_missing_document_requests` is **dry-run by default** (`--json`, `--include-valid`).
  - It reports order id and number, status, customer id with masked contact, open request id and types, recorded `missing_document_types`, whether those types are configured, configured requirements, a classification (`no_request_no_recorded_types`, `recorded_types_without_request`, `recorded_types_not_configured`, `request_without_types`) and a recommendation.
  - A repair needs `--apply --order <number> --action {return-to-review|recreate-request} --actor <staff email> --reason "…"`, one order at a time.
  - `recreate-request` is refused unless the order itself records types that are all configured requirements. It uses exactly those types and leaves the status unchanged.
- **Rollback:**
  - `return-to-review`: staff send a new request from the review screen.
  - `recreate-request`: the printed request id is audited; resolve it, or recover the order.
  - Both are audited.

TESTS:
- Frontend `MissingDocumentsResponsePage.legacy.test.jsx` (3):
  - legacy order: safe state, no 0/0, no file input, no resubmit, no success text, **no upload call** (13–16);
  - empty list without the server flag is treated the same;
  - a valid request still shows its field and resubmit (17).
  - The first two fail against the original page; the third passes on both.
- Existing `MissingDocumentsResponsePage.test.jsx`: one test's mock always answered WAITING_CUSTOMER after an accepted upload. It now returns the server's real post-upload state (UNDER_REVIEW); its assertions are unchanged.
- Backend `F02LegacyMissingRequestTests` (7):
  - flag and recover availability per role;
  - a valid request cannot be "recovered" and still works;
  - recovery creates an auditable transition (18) with status log, both audit entries and a required reason;
  - customer and provider refused;
  - the command is dry-run by default, masks the phone and changes nothing without `--apply`;
  - repair needs an explicit action, refuses to guess, `return-to-review` works;
  - `recreate-request` works only from recorded configured types, after which the customer can answer.

Runtime proof (`F02-legacy-customer-only.json`, `F02-legacy-after-fix.json`, `F02-after-fix-*.png`, `F02-audit-command-dryrun-envB.txt`):
- **Customer, original `KH-2026-000001` (B2):** `missing_document_request_valid=false`; safe state rendered; no 0/0; 0 file inputs; 0 resubmit buttons; no false success; **0 non-GET requests**; status still WAITING_CUSTOMER.
- **Admin UI recovery:** the panel was visible, a reason was entered and confirmed, and the order went to **UNDER_REVIEW**. The status log reads "Missing-document request recovered by staff: …" by Admin, and both audit entries are present with the previous state.
- **Afterwards:** the admin sent a new request via the new form (`national-id`); the customer page showed 1 field; after a PDF upload the order returned to UNDER_REVIEW.
- **Dry run on B2:** exactly 1 order flagged (`KH-2026-000001`, `no_request_no_recorded_types`). On A2: 0 need attention.

STATUS: **FIXED** (the code path is fixed. The historical record is not repaired automatically; the operator runs the audited command or the UI recovery per order.)

---

## REGRESSION

backend: `manage.py test` (all apps, serial) → **495 tests, OK (skipped=7)**. That is the previous 478 plus 17 new. `manage.py check` clean. (`REG-backend.txt`)

frontend: `vitest run` → **37 files / 111 tests passed**. That is the previous 100 plus 11 new. (`REG-vitest.txt`)

lint: `eslint src` → **clean** (exit 0). (`REG-lint.txt`)

e2e: the existing Playwright suites (client-audit ×5, hardening ×2, a11y, axe-auth) on desktop-1440 and mobile-390 against A2 → **63 passed, 5 failed** (`REG-e2e.txt`).
- **4 failures** are the pre-existing axe `color-contrast` violations on `/employee/documents/verify` and `/admin/orders`. They were already reported in the closure audit and are unrelated to this pass.
- **1 failure** (`client-audit-responsive` mobile-390: "home did not render") was transient. The failure screenshot is a blank page captured while the backend test suite was saturating the CPU. Re-run in isolation it **passed 2/2 twice** (`REG-e2e-responsive-rerun.txt`), and the homepage is untouched by this pass.

Extra checks on the screens changed by this pass (`AXE-changed-screens.json`; 16 page checks at 1440 and 390):
- overflow 0 and no console errors;
- **no axe violation on any new element**.
- Remaining serious axe findings are pre-existing: small grey text in `OrderTimeline.jsx` and the scrollable region in `DataTable.jsx` (both untouched).

Preserved behaviour, re-verified at runtime: isolation matrix, idempotent submission, bell, readiness, public pages (via the e2e suites) and the full lifecycle below.

## END-TO-END: **PASS**

Fixed build A2, order `KH-2026-000011`, Arabic UI, each role in its own browser session (`JOURNEY-part1-after-fix.txt`, `JOURNEY-part2-after-fix.txt`):
1. customer wizard submit; consent unchecked by default; double-click gives 1 POST / 1 order;
2. employee review;
3. missing-document request (UI);
4. bell opens the missing-docs page;
5. **valid PDF upload + resubmit → UNDER_REVIEW**;
6. verification;
7. assignment;
8. provider progress;
9. final result;
10. final verification;
11. completion;
12. completion notification in the bell;
13. **customer downloads the distinct final PDF**, byte-identical to the provider's file;
14. re-login keeps COMPLETED;
15. one order with 8 unique transitions.

All steps PASS. The B02 fix does not break the valid PDF journey.

## KNOWN REMAINING AUDIT ITEMS (not addressed in this pass)

- **Owner/client decisions:**
  - D05 support contact data (BLOCKED);
  - B05 payment scope (BLOCKED);
  - D06 privacy text (BLOCKED);
  - B10 items 2, 3, 4, 7, 9, 10; activation policy (B04); provider identity to customers (B06 note); customer visibility of rejection reasons (F04).
- **P2 code/content:**
  - F04 rejection reason not rendered;
  - U04/B04 register phone validation and the 500 on a missing phone;
  - D02 admin-panel wording in catalogue notes;
  - D03 remaining English system strings, emails and legacy notifications;
  - B10-1 yes/no typed as number, B10-6 admin services pagination (20/38), B10-8 "verified" label derived from `is_active`;
  - axe contrast in the employee verify queue, admin orders filter chip, `OrderTimeline` small text, and `DataTable` scroll region focusability;
  - footer touch targets.
- **B02-adjacent:** `AdminDocumentViewSet` raw admin CRUD does not apply requirement rules (admin-only, no workflow side effect).
- **Data:** the original `KH-2026-000001` (and any similar record) must be recovered by an operator with the audited command or UI.
- **Release verification:**
  - real-device iOS/Android pass (B09);
  - SMTP delivery (B04);
  - re-running the closure suite against the **deployed** build (nothing here was verified on `khalisni.com`).

## FINAL VERDICT

**P1 TECHNICAL REMEDIATION PASS**

B02, F05 and F02 are fixed in code, covered by regression tests that reproduce each defect, and verified at runtime. This does **not** close the original audit: D05 and B05 still require owner/client decisions, and the P2/P3 findings above remain.
