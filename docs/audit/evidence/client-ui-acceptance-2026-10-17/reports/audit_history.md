# KHALSNI — Requirement History & Code Spot-Check (26 original findings + B10 sub-items)

Audit type: READ-ONLY. No repository file modified.
Repo: `D:\ghassan`, branch `main`, HEAD `f396575` (fix(topbar)… — committed AFTER the last audit report).
Date of this review: 2026-10-17.

## 0. Sources and important caveats

| Source | Role |
|---|---|
| `D:\ghassam moblie\Khalsni_Website_Audit_AR.docx` + `D:\ghassam moblie\Khalsni_Audit_Evidence\audit_data.json` (2026-10-01) | **ORIGINAL client audit** (outside the repo). `audit_data.json` read in full; the closure audit states the .docx and JSON agree item by item. Fields per item: `title`, `page`, `role`, `steps`, `expected`, `actual`, `evidence`, `result` (= requested outcome). Quotes below are from this JSON. |
| `docs/audit/KHALSNI_CLIENT_REMEDIATION_PLAN.md` (2026-10-03) | First in-repo restatement of F01–B10 (developer baseline). |
| `docs/audit/KHALSNI_CLIENT_DECISIONS_REQUIRED.md` (2026-10-04) | First in-repo B10 sub-numbering — **uses a DIFFERENT B10-1..B10-8 numbering** (see §0.1). |
| `docs/audit/KHALSNI_ORIGINAL_AUDIT_CLOSURE.md/.csv` (2026-10-15, base `ba7f94c`) | Independent closure verdict; defines the **B10-1..B10-10** numbering used by every later report. |
| `KHALSNI_P1_REMEDIATION_REPORT.md` (`ec3e70c`) | B02, F05, F02. |
| `KHALSNI_P2_OBJECTIVE_REMEDIATION_REPORT.md` (`f5b98b9`) | U04/B04, B10-6, B10-8, D03, a11y, footer targets. |
| `KHALSNI_OWNER_DECISION_DOSSIER.md` (`3f0af8f`) | 15 decision questions; "Owner answer" column **blank**. |
| `KHALSNI_OWNER_DECISIONS_IMPLEMENTATION_REPORT.md` (`9b5335e`) | Claims decisions B05, F04, B04, B06, D02, B10-1/2/3, B10-4, B10-7, phone were taken and implemented. |
| `KHALSNI_FINAL_PRE_RELEASE_HARDENING.md` (`f69a8de`) | Provider-create 500, verification_note leak, consent immutability, mobile Accept-Language, national-ID type. |
| `KHALSNI_FINAL_RELEASE_CLOSURE.md` (`2d40ec0`) | Gate: 16 CLOSED / 2 N/A / 5 BLOCKED / 3 OPEN; RELEASE HOLD. |
| `KHALSNI_RELEASE_UNBLOCKING_REPORT.md` (`f3c8ff1`, merged `ec5964b`) | DB role, D02/D03 closed, D05/D06 validation, B10-10 blocked. Verdict PRE-DEPLOYMENT BLOCKERS PARTIAL. |

### 0.1 Caveats that affect acceptance

1. **No written owner sign-off is stored in the repository.** The dossier's "Owner answer" column is empty; `docs/final_review/TEAM_DECISION_LOG.md` "Final Decision" cells are empty. The only record that decisions were made is the implementation report header ("DECISIONS IMPLEMENTED") and commit `9b5335e` message ("Implement approved owner decisions"). The report says "test numbers refer to the list in the task", i.e. the decisions came from a task prompt. **Acceptance needs the owner's written confirmation of each "decided" item** (dependency: OWNER DECISION – confirmation).
2. **B10 numbering conflict.** `KHALSNI_CLIENT_DECISIONS_REQUIRED.md` (Oct 4) numbers: B10-1 answer types, B10-2 duplicates, B10-3 conditional docs, **B10-4 consent text**, **B10-5 counts/public pagination**, **B10-6 verified user**, **B10-7 document definitions**, **B10-8 pricing**. The closure audit and all later reports use: B10-4 notes required, B10-5 consent, B10-6 admin pagination, B10-7 counts, B10-8 verified, B10-9 doc definitions, B10-10 pricing. This document uses the closure numbering; anyone reading the Oct-4 file must remap.
3. **The original client B10 has no sub-numbers.** It is one paragraph (quoted under B10). The 10 sub-items are the closure auditor's decomposition.
4. **HEAD has a commit after the last report**: `f396575` changes `frontend/src/components/Topbar.jsx` (adds `flex-wrap`, title `min-w-[12rem]`, removes `break-words`, bell becomes icon-only at 2xl). No report re-verified U01/F01 after it.
5. **Nothing was ever tested on a deployed site** (`khalisni.com` never tested; deployed SHA unknown; `origin/main` was `ba7f94c` at gate time). All statuses are local.
6. Original client counts: client saw "admin 20 services vs published **33**"; closure measured public **32** vs admin 38 on the legacy copy.

---

## 1. Per-finding table

Legend for dependency: OWNER DECISION / LEGAL CONTENT / DEPLOYMENT GATE / CODE / UI / DATA / none.
"Latest status" = most recent report that states a status for the item.
QA data for runtime checks: `python manage.py seed_demo` + `python manage.py seed_client_audit_qa` (Env "A/R/U": fresh) and a migrated copy of `backend/db.sqlite3` (Env "B/S/T": legacy 38-service catalogue incl. legacy `KH-2026-000001`).

---

### F01 — Bell does not show customer-dashboard events (P1)

- **ORIGINAL NOTE** (`audit_data.json` functional/F01): "جرس الإشعارات لا يعرض أحداث لوحة العميل". Actual: "آخر الإشعارات يعرض أربعة أحداث بينها طلب مستند جديد؛ الجرس يعرض لا توجد إشعارات حالياً." Requested result: "يظهر طلب المستند في الجرس واللوحة، ويفتح الطلب الصحيح، مع حالة قراءة متسقة." Page `/customer`, `/customer/orders/2/missing-docs`.
- **OWNER DECISIONS:** none.
- **FINAL EXPECTED BEHAVIOUR:** same events in dashboard list and bell; bell item opens the related order (missing-docs page for `missing_documents_requested`); read state consistent across reload.
- **LATEST STATUS:** CLOSED — Original closure (2026-10-15), re-asserted by Final Release Closure §12.
- **WHERE IMPLEMENTED (verified exist):** `frontend/src/context/NotificationContext.jsx` (shared state, refetch on route/focus), `frontend/src/components/NotificationPanel.jsx`, `frontend/src/components/Topbar.jsx` (`handleNotificationNavigate`: customer → `/customer/orders/:id[/missing-docs]`), `frontend/src/pages/customer/CustomerDashboardHome.jsx`; backend `notifications/views.py` (`NotificationCenterAPIView`, unread-count).
- **SPOT-CHECK DISCREPANCIES (current HEAD):**
  - `NotificationCenterAPIView` uses the default `PageNumberPagination` (PAGE_SIZE 20) and the web reads it with `unwrapList` (first page only, `api/notificationsApi.js:50`). The panel's "غير المقروءة: N" is computed client-side from those ≤20 rows (`NotificationPanel.jsx:14`), so for a user with >20 notifications the bell count can disagree with `/notifications/unread-count/` and older unread items are unreachable. Latent (the "latent pagination" pass did not include `/notifications/`). Type: CODE.
  - Bell still has **no unread badge** on the icon and no "view all" (panel shows 5) — UX note from closure, still true. `f396575` additionally removed the bell's text label at 2xl (icon-only, aria-label kept).
- **RUNTIME/UI PROOF NEEDED:** role customer (`customer_a` QA); employee requests a missing document on the customer's order → `/customer` dashboard "آخر الإشعارات" and bell list show the same event; click bell item → lands on `/customer/orders/<id>/missing-docs`; reload → read state persists; compare bell "غير المقروءة" with `GET /api/notifications/unread-count/`. Repeat with a customer holding **>20 notifications** (latent defect). Viewports 390 and 1920 (post-`f396575` header), AR and EN.
- **Open dependency:** CODE (latent >20), UI (badge – optional).

---

### F02 — Missing-document request with no uploadable document (P1)

- **ORIGINAL NOTE** (F02): "طلب نواقص بلا مستند قابل للرفع". Actual: "توجد رسالة Please upload the missing authorization letter لكن الصفحة تعرض 0/0 بدون حقل رفع، مع زر إعادة الإرسال." Result: "تتطابق رسالة النواقص مع تعريفات المستندات؛ يعالج الطلب القديم ويمنع إعادة إرسال غير مكتملة." Order `KH-2026-000001`, `/customer/orders/1/missing-docs`.
- **OWNER DECISIONS:** Closure table 3 "How to remap legacy WAITING orders" — not answered; P1 replaced it with an audited staff/operator recovery (no guessing). No owner decision recorded.
- **FINAL EXPECTED BEHAVIOUR:** new requests must name configured documents (empty/unknown → 400); legacy/invalid requests show a safe state (no 0/0, no form, no resubmit, no false success); staff can recover the order to UNDER_REVIEW with a required reason; operator command `audit_missing_document_requests` (dry-run default).
- **LATEST STATUS:** **BLOCKED** (Final Release Closure §12) — code fixed (P1 "FIXED"), production record `KH-2026-000001` needs operator recovery. Release Unblocking lists it under "STILL REQUIRES DEPLOYED ENVIRONMENT".
- **WHERE IMPLEMENTED (verified):** `frontend/src/pages/customer/MissingDocumentsResponsePage.jsx:75-80` (safe state when `missing_document_request_valid === false` or empty list; success toast only after server state re-read, lines 134/137); `frontend/src/components/MissingRequestRecovery.jsx` (used in `AdminOrderDetailsPage.jsx:215` and `EmployeeOrderReviewPage.jsx:322`); `backend/orders/allowed_actions.py:138-139`; `backend/orders/services.py:974,985` (`missing_document_request_is_invalid`, `recover_invalid_missing_document_request`); `backend/orders/urls.py:50` (`admin/orders/<pk>/recover-missing-documents/`); `backend/orders/management/commands/audit_missing_document_requests.py`. All match the P1 claims.
- **SPOT-CHECK DISCREPANCIES:** **Mobile app is not covered.** `mobile/src/features/client/screens/MissingDocumentRequestsScreen.tsx:31` lists every WAITING_CUSTOMER order with raw `missing_document_types` codes (falls back to "يرجى مراجعة تفاصيل الطلب.") and always offers "الرد الآن"; `RespondToMissingDocumentScreen.tsx` + `features/documents/DocumentUploadWidget.tsx:66-71` make the customer **type the document-type code** ("اكتب القيمة كما يعتمدها النظام مثل passport أو national_id"). No `missing_document_request_valid` handling, no localized names. Server still refuses wrong types (no false success), but the mobile UX reproduces the F02/U03 problem. Type: CODE/UI (mobile).
- **RUNTIME/UI PROOF NEEDED:** (a) Legacy copy: customer of `KH-2026-000001` opens `/customer/orders/1/missing-docs` → safe-state text, 0 file inputs, no resubmit, no POST in network tab. (b) Admin `/admin/orders/1` (and employee `/employee/orders/1`) → recovery panel, reason required, confirm → UNDER_REVIEW, status log + audit entries. (c) `python manage.py audit_missing_document_requests` dry run lists exactly that order. (d) Production: operator recovery of real `KH-2026-000001`. (e) Mobile app, customer with a WAITING order: check the list and the respond screen. AR, 390 + 1366.
- **Open dependency:** DEPLOYMENT GATE (production recovery), DATA, CODE/UI (mobile).

---

### F03 — Readiness message contradicts missing documents (P1)

- **ORIGINAL NOTE** (F03): "رسالة جاهزية تناقض المستندات الغائبة". Actual: "ستة مستندات ظاهرة لم يتم رفعها، بينما تظهر المتطلبات مكتملة وجاهز الآن اختر مزوداً". Result: "لا تظهر الجاهزية إلا عند استيفاء شروطها." Page `/employee/orders/2`.
- **OWNER DECISIONS:** none.
- **FINAL EXPECTED BEHAVIOUR:** readiness/“جاهز الآن” only when all required documents are approved; assign blocked otherwise with a localized reason.
- **LATEST STATUS:** CLOSED (Original closure; Final Release Closure §12).
- **WHERE IMPLEMENTED (verified exist):** `backend/orders/readiness.py`, `backend/orders/allowed_actions.py`, `frontend/src/pages/employee/EmployeeOrderReviewPage.jsx`; blocked reason codes `documents_incomplete` → `frontend/src/utils/workflowPresentation.js`.
- **SPOT-CHECK DISCREPANCIES:** none found. Optional/waived documents never runtime-tested (no waiver feature; backend tests only).
- **RUNTIME/UI PROOF NEEDED:** employee, `/employee/orders/<id>` for QA orders in states: not uploaded, pending review, rejected, approved → readiness text differs; assign control blocked until approval; AR/EN; 1366.
- **Open dependency:** none (optional: optional-document fixture).

---

### F04 — Non-uploaded document shown as "rejected" (P2)

- **ORIGINAL NOTE** (F04): "مستند غير مرفوع يظهر بوصف مرفوض". Expected: "لم يرفع أو مطلوب من العميل، مع فصل نتيجة مراجعة ملف موجود." Result: "تمييز الغياب عن رفض ملف ومبررات الرفض."
- **OWNER DECISIONS:** Dossier #4 (F04): A exact staff reason / B separate customer reason / C generic. **Chosen: A** (Owner Decisions Implementation §2), with staff box labelled "سيظهر هذا السبب للعميل". Related pending: `verification_note` visibility (Final Pre-Release Hardening §2: A/B/C, **still pending**).
- **FINAL EXPECTED BEHAVIOUR:** distinct labels (لم يُرفع بعد / بانتظار التحقق / مرفوض / معتمد); on rejection the owning customer and staff see "سبب الرفض: <exact text>"; other customers, providers and public tracking never receive it.
- **LATEST STATUS:** CLOSED (Final Release Closure §12; ODI "DONE").
- **WHERE IMPLEMENTED (verified):** `backend/documents/serializers.py:34-47` (`rejection_reason` and `verification_note` popped unless staff or owning customer); `frontend/src/components/DocumentList.jsx:82-85`; `frontend/src/pages/employee/EmployeeVerifyDocumentsPage.jsx:245,253` (aria-describedby + "سيظهر هذا السبب للعميل"); mobile `mobile/src/features/documents/DocumentList.tsx:38` shows the reason too.
- **SPOT-CHECK DISCREPANCIES:** none for the reason. Note mobile `DocumentList.tsx:37` still shows `verification_note` to the customer ("ملاحظة التحقق") — consistent with "unchanged pending decision", but the decision is open. The `document_rejected` notification text still does not include the reason (by design: points to the order).
- **RUNTIME/UI PROOF NEEDED:** employee rejects a customer-uploaded (non-final) document at `/employee/documents/verify` with reason text; customer A opens `/customer/orders/<id>` → sees exact reason; customer B → 404; `/track-order` with order number+phone → no reason in page or JSON; employee `/employee/orders/<id>` shows reason. Also a never-uploaded requirement shows "لم يُرفع بعد". AR+EN, 390+1366; mobile app document list.
- **Open dependency:** OWNER DECISION (owner sign-off of A; `verification_note` A/B/C pending).

---

### F05 — Admin transitions don't match displayed rules (P1)

- **ORIGINAL NOTE** (F05): "تحولات الإدارة لا تتطابق مع قواعد التشغيل المعروضة". Actual: "لا توجد تحولات متاحة وزر تحديث الحالة معطل. قواعد التشغيل تعرض انتظار العميل إلى المراجعة أو الإلغاء". Result: "توحيد القواعد والواجهة والتنفيذ، مع توضيح أي شرط إضافي." Evidence E02.
- **OWNER DECISIONS:** none.
- **FINAL EXPECTED BEHAVIOUR:** admin order page renders every server-allowed transition (generic status form + dedicated Cancel with reason modal + Request-documents form limited to configured documents); blocked/indirect actions explained in the screen language; `/admin/rules` workflow table localized.
- **LATEST STATUS:** CLOSED (P1 "FIXED"; Final Release Closure §12).
- **WHERE IMPLEMENTED (verified):** `frontend/src/pages/admin/AdminOrderDetailsPage.jsx:75-146,238` (derives from `allowed_actions.workflow_transitions`, `cancel_order`, `handleRequestDocuments`, `INDIRECT_ACTION_NOTES` for `mark_ready_for_delivery`/`resume_review`); `frontend/src/utils/workflowPresentation.js` (`describeBlockedReason`, `describeRule`); `AdminRuleManagementPage.jsx`; `backend/orders/allowed_actions.py` (`blocked: [{code, params}]`); `frontend/src/api/ordersApi.js` (`cancelAdminOrder`).
- **SPOT-CHECK DISCREPANCIES:** UI matches the claims. Residual: when a dedicated action fails server-side, the toast shows the raw server message via `getDisplayError` — backend messages are English-only (no `.po` files, no `LocaleMiddleware`; e.g. `orders/services.py` has 31 English `ValidationError` strings). See D03.
- **RUNTIME/UI PROOF NEEDED:** admin, `/admin/orders/<id>` for one order in each state (NEW, UNDER_REVIEW, WAITING_CUSTOMER, ASSIGNED, IN_PROGRESS, READY_FOR_DELIVERY, COMPLETED, CANCELLED, REJECTED) — compare controls with `/admin/rules` workflow tab and `GET /api/admin/orders/<id>/` `allowed_actions.workflow_transitions`; execute WAITING_CUSTOMER → Cancel (reason required) and UNDER_REVIEW → request documents; check no raw codes/English in AR mode. 390 + 1366, AR + EN.
- **Open dependency:** none (D03 overlap for error toasts).

---

### F06 — CMS preview differs from published homepage (P2)

- **ORIGINAL NOTE** (F06): "المعاينة النشطة تختلف عن الصفحة الرئيسية المنشورة". Result: "تطابق المحتوى المعتمد مع المعاينة والنشر أو بيان حدود المعاينة."
- **OWNER DECISIONS:** none (draft workflow would be new scope).
- **FINAL EXPECTED BEHAVIOUR:** preview iframe shows the published `/`, labelled as such; save publishes immediately.
- **LATEST STATUS:** CLOSED (Original closure).
- **WHERE IMPLEMENTED (verified):** `frontend/src/pages/admin/PreviewPublicPage.jsx:20-23` (label "هذه الصفحة تعرض الصفحة الرئيسية المنشورة نفسها…", iframe), `HomepageContentEditorPage.jsx`, `backend/public_site/views.py`.
- **SPOT-CHECK DISCREPANCIES:** none.
- **RUNTIME/UI PROOF NEEDED:** admin edits hero title at `/admin/public-site/content`, saves; `/admin/public-site/preview` and an anonymous `/` both show it; restore. AR 1366.
- **Open dependency:** none.

---

### U01 — Admin tools stacked on mobile (P2)

- **ORIGINAL NOTE** (U01): "تكدس أدوات الإدارة على الموبايل… مكدسة عمودياً وتستهلك معظم الشاشة". Result: "جمع الأدوات الثانوية في قائمة… وإبقاء العنوان والجرس والقائمة في رأس قصير." Evidence M01/M02/E02.
- **OWNER DECISIONS:** none.
- **FINAL EXPECTED BEHAVIOUR:** short header (menu, title, bell, "more"); guide/language/site/logout inside a menu; no overflow.
- **LATEST STATUS:** CLOSED (Original closure, 2026-10-15).
- **WHERE IMPLEMENTED:** `frontend/src/components/Topbar.jsx`, `frontend/src/layouts/DashboardLayout.jsx`.
- **SPOT-CHECK DISCREPANCIES:** **Topbar changed after every report** (`f396575`): header now `flex-wrap`, title block `min-w-[12rem] flex-1`, `break-words` removed from `<h2>`, action row `2xl:w-full 2xl:flex-nowrap`. The fix targets a 1920px one-letter-column bug, but the U01 measurements (header 68–76px at 390/430/768) were not re-run. Risk: long Arabic titles without `break-words` at 390px, and header height at 768–1536 when the action row wraps under the title.
- **RUNTIME/UI PROOF NEEDED:** admin `/admin`, `/admin/orders/<id>`, `/admin/services` at 390, 430, 768, 1366, 1536, 1920 — header height, title not split per letter, no horizontal overflow, bell/menu visible, "more" menu contains guide/language/site/logout. AR + EN. Also employee/provider/customer dashboards (same Topbar).
- **Open dependency:** UI (re-verify after `f396575`).

---

### U02 — Search results below all categories (P2)

- **ORIGINAL NOTE** (U02): "نتيجة البحث تأتي بعد جميع التصنيفات". Result: "إخفاء شبكة التصنيفات أثناء البحث أو نقل نتائج البحث فوقها."
- **OWNER DECISIONS:** none.
- **FINAL EXPECTED BEHAVIOUR:** category grid hidden while a search term exists; results in first viewport; zero-result state; clearing restores categories.
- **LATEST STATUS:** CLOSED (Original closure).
- **WHERE IMPLEMENTED (verified):** `frontend/src/pages/public/ServicesPage.jsx:164` (`!searchParam.trim() ? <section…categories>`), `:236` zero results.
- **SPOT-CHECK DISCREPANCIES:** none.
- **RUNTIME/UI PROOF NEEDED:** anonymous `/services`, search "تأسيس" (legacy catalogue) at 1366 and 390 → result in first viewport, count = cards; nonsense term → "لا توجد نتائج مطابقة"; clear → categories return. AR.
- **Open dependency:** none.

---

### U03 — Technical document code on tracking (P2)

- **ORIGINAL NOTE** (U03): "كود المستند لا يشرح الإجراء للعميل… مطلوب منك يعرض legal_authorization كنص تقني فقط". Result: "عرض وكالة عدلية أو تفويض خطي وربط آمن بصفحة النواقص بعد تسجيل الدخول."
- **OWNER DECISIONS:** none.
- **FINAL EXPECTED BEHAVIOUR:** localized document names; action "سجل الدخول لرفع المستندات" → `/login?next=/customer/orders/<id>/missing-docs`; no internal data in payload.
- **LATEST STATUS:** CLOSED (Original closure).
- **WHERE IMPLEMENTED (verified):** `frontend/src/pages/public/TrackOrderPage.jsx:141-159`; `backend/orders/serializers.py` (TrackOrderSerializer); P2 `documents/presentation.py` (`document_type_label`).
- **SPOT-CHECK DISCREPANCIES:** web OK. **Mobile** missing-docs list shows raw codes (see F02).
- **RUNTIME/UI PROOF NEEDED:** logged out, `/track-order` with a WAITING_CUSTOMER QA order + phone (try `079 880 0103` style and `+9627…` style) → Arabic document name, login link with `next`; wrong phone → not found; JSON contains no internal note/provider/rejection reason/verification_note. AR, 390.
- **Open dependency:** CODE/UI (mobile only).

---

### U04 — Required/optional not shown before submit (P2)

- **ORIGINAL NOTE** (U04): "النماذج لا تبين الإلزامية قبل محاولة الإرسال". Expected: "تمييز المطلوب والاختياري قبل بدء التعبئة، خاصة الرقم الوطني والبريد في التواصل." Result: "وسم الحقول المطلوبة والاختيارية وإضافة أمثلة لصيغة الهاتف وقواعد كلمة المرور." Pages `/register`, `/contact`.
- **OWNER DECISIONS:** Dossier #15 phone policy: **chosen C (normalize to E.164), default country +962** (ODI §9).
- **FINAL EXPECTED BEHAVIOUR:** "(مطلوب)/(اختياري)" labels on register and contact; register phone required, validated, stored canonical `+962…`; no 500; phone example; full password rules (length 8, not all-numeric, not common, not similar); localized duplicate messages.
- **LATEST STATUS:** CLOSED (Final Release Closure §12; P2 FIXED + ODI phone DONE).
- **WHERE IMPLEMENTED (verified):** `frontend/src/pages/public/RegisterPage.jsx:24,91-143` (hints, `type="tel"`, `inputMode="tel"`, password rules from `utils/passwordPolicy.js`); `frontend/src/pages/public/ContactPage.jsx:44-79`; `backend/accounts/serializers.py:117-142` (`CanonicalPhoneField`, duplicate messages); `backend/accounts/validators.py` (`DEFAULT_COUNTRY_CODE = "962"`, `normalize_phone`); `backend/accounts/fields.py`; `backend/public_site/serializers.py:13` (contact uses `CanonicalPhoneField`).
- **SPOT-CHECK DISCREPANCIES:** `/contact` phone input has **no example, no `type="tel"`/`inputMode`**, though the backend now validates format there (`ContactPage.jsx:69-70`). The client's requested "أمثلة لصيغة الهاتف" is only on `/register`. Minor UI. Mobile app has no registration screen (nothing to check).
- **RUNTIME/UI PROOF NEEDED:** anonymous `/register` and `/contact` before typing (labels), empty submit (errors), register with phone omitted / "" / "abc" → 400 Arabic message (no 500), `079 123 4567` → 201 and stored `+962791234567`; duplicate email → friendly message AR/EN; `/contact` invalid phone → what message is shown. 390 + 1366, AR + EN.
- **Open dependency:** UI (contact phone hint, minor); OWNER DECISION (confirm phone policy C/+962 in writing).

---

### D01 — Technical field types on service page (P2)

- **ORIGINAL NOTE** (D01): "تظهر SELECT وTEXT وTEXTAREA وNUMBER تحت أسماء البيانات." Result: "حذف الأنواع البرمجية أو استبدالها بتعليمات عربية قصيرة." Page `/services/business_company_registration`.
- **OWNER DECISIONS:** none.
- **FINAL EXPECTED BEHAVIOUR:** Arabic hints instead of type tokens.
- **LATEST STATUS:** CLOSED (Original closure).
- **WHERE IMPLEMENTED (verified):** `frontend/src/pages/public/ServiceDetailsPage.jsx:72` (e.g. "أدخل القيمة الرقمية المطلوبة عند تعبئة الطلب.").
- **SPOT-CHECK DISCREPANCIES:** none. Note national-ID fields became `text` (services.0015), so their hint changes from the numeric hint.
- **RUNTIME/UI PROOF NEEDED:** anonymous `/services/business_company_registration` on the legacy catalogue, AR, 1366 + 390, Chromium + Safari → no SELECT/TEXT/TEXTAREA/NUMBER tokens.
- **Open dependency:** none.

---

### D02 — Service texts refer to admin settings (P2)

- **ORIGINAL NOTE** (D02): "يحدد بعد المراجعة من لوحة الإدارة مكررة؛ تبقى علاقة المزود محكومة بالإعدادات الحالية وروابط المستندات محكومة بسياسات حالية نصوص تشغيلية". Result: "استخدام سنراجع الطلب ونبلغك بالسعر قبل المتابعة… إزالة التكرار يقلل طول الصفحة."
- **OWNER DECISIONS:** Dossier #7: **Approve proposed texts** (ODI §5): price "يتم تأكيد الرسوم النهائية بعد مراجعة الوثائق." / "Final fees are confirmed after document review."; delivery "تُحدَّد مدة الإنجاز بعد مراجعة الطلب." / "The completion time is confirmed after your request is reviewed."
- **FINAL EXPECTED BEHAVIOUR:** no "لوحة الإدارة" or settings/policy phrases on public pages; approved AR/EN sentences; the price sentence appears once on a service page (hero), not in hero+summary+each related card.
- **LATEST STATUS:** **CLOSED** — Release Unblocking §C (dedup). (Final Release Closure had it OPEN for repetition.)
- **WHERE IMPLEMENTED (verified):** `backend/services/catalogue_rules.py` (`APPROVED_PRICE_NOTE`, `APPROVED_DELIVERY_NOTE`, `ADMIN_PANEL_PHRASE`); `backend/services/migrations/0014_apply_owner_catalogue_decisions.py`; `backend/services/service_import.py`; `frontend/src/pages/public/ServiceDetailsPage.jsx:460` (`priceShownAbove`); `frontend/src/components/ServiceCard.jsx:33-40`. Grep of `frontend/src` and backend (non-test, non-migration) finds no "محكومة"/"الإعدادات الحالية"/"لوحة الإدارة" in public copy (remaining hits are the admin dashboard's own title — correct).
- **SPOT-CHECK DISCREPANCIES:** none. Note: data fix is a migration — a production DB must run `services.0014`.
- **RUNTIME/UI PROOF NEEDED:** anonymous, legacy catalogue migrated to HEAD: `/services/<quotation service>` (e.g. `business_company_registration`) → approved sentence exactly once (hero), delivery note once, related cards without repeated sentence; a fixed-price service shows total once; `/`, `/services`, category pages contain no "لوحة الإدارة". AR + EN, 390 + 1366. On production: confirm migration 0014 applied.
- **Open dependency:** DEPLOYMENT GATE (migration on prod); OWNER DECISION (written approval of wording).

---

### D03 — English content in Arabic UI (P2)

- **ORIGINAL NOTE** (D03): "Civil Status and Passports وService for وغيرها إنجليزية؛ التتبع يعرض Assigned for processing… ظهر National ID وAuthorization Letter ورسائل إشعارات إنجليزية." Result: "استكمال الترجمة من بيانات الكتالوج ورسائل النظام، مع fallback عربي واضح."
- **OWNER DECISIONS:** none for system text. Pending owner content: Arabic text for 3 English help guides and 2 English `ServiceRelation.message_to_customer` (Release Unblocking §D).
- **FINAL EXPECTED BEHAVIOUR:** system-generated text (statuses, timeline notes, notifications incl. legacy rows, document names, provider approval label, durations, reset/password-changed emails, auto-approval note) in the screen language; authored text shown as typed.
- **LATEST STATUS:** **CLOSED** "for the defined residual" — Release Unblocking §D; separate content gap recorded.
- **WHERE IMPLEMENTED (verified exist):** `backend/orders/system_events.py`, `orders/migrations/0017_orderstatuslog_system_event.py`, `backend/notifications/legacy_content.py`, `backend/documents/presentation.py:46-48` (auto-approval note AR), `backend/accounts/password_reset.py` + `accounts/templates/accounts/email/*`, `backend/core/i18n.py`, `frontend/src/utils/timelinePresentation.js`, `utils/documentPresentation.js`, `components/OrderTimeline.jsx`, `pages/admin/AdminOverviewPage.jsx`, `mobile/src/api/client.ts:13` (`Accept-Language: ar`).
- **SPOT-CHECK DISCREPANCIES (CURRENT CODE):**
  1. **Server validation/error messages are English-only and are shown raw in the Arabic UI.** No `.po` files exist and `LocaleMiddleware` is not configured; `getDisplayError` (`frontend/src/api/client.js:278`) shows `detail`/first field message as-is. Examples reachable by customers: `documents/file_validation.py:55-57` ("Unsupported file extension for this document.", "This document exceeds the allowed file size.", "File content does not match its extension." — the last one is not pre-empted by client validation), `orders/services.py` ("Documents cannot be uploaded to a closed order.", "This document is not part of this request."), `orders/serializers.py` ("Consent is required.", "This service is not currently available."). The D03 scans were of rendered happy-path pages, so these error paths were never covered. Type: CODE.
  2. Admin-facing: `public_site/serializers.py:211` reserved-domain email message is English only.
  3. `help_guides.0004` English guides (known, owner content).
  4. Mobile `ClientDashboardScreen.tsx:125` shows Latin "Khalisni" (see D04).
- **RUNTIME/UI PROOF NEEDED:** AR mode, all roles: (a) legacy copy customer bell and order timelines (`/customer`, `/customer/orders/<id>`), `/admin` chart, `/admin/orders/8`, `/employee/orders/8`, `/provider/orders/8`, `/employee/documents/verify`, `/admin/rules`, `/admin/services` → no system English; (b) **error paths**: customer uploads an HTML file renamed `.pdf` on `/customer/orders/<id>/missing-docs` → observe toast language; submit an order for an inactive service; (c) password reset email in AR from web and from mobile; (d) help library `/customer/manual` etc. 390 + 1366.
- **Open dependency:** CODE (server error localization — not claimed by any report), OWNER DECISION/LEGAL CONTENT (Arabic help-guide text).

---

### D04 — Brand name inconsistent (P3)

- **ORIGINAL NOTE** (D04): "نصوص مثل مهمة خالصني والتذييل Khalisni مقابل عنوان المتصفح Khalsni." Expected: "خلّصني وKhalsni بصورة متسقة حسب هوية المشروع."
- **OWNER DECISIONS:** Dossier #14 Brand/domain (AR: خلصني/خلّصني; Latin Khalsni/Khalisni; domain; email domain) — **still pending**.
- **FINAL EXPECTED BEHAVIOUR:** one approved Arabic and Latin spelling across UI, metadata, emails; sender/support domain per owner.
- **LATEST STATUS:** CLOSED (Final Release Closure §12) with owner value pending.
- **WHERE IMPLEMENTED:** `frontend/index.html:19` (`<title>خلصني | Khalsni</title>`), `layouts/PublicLayout.jsx`; email defaults `backend/config/settings.py:365` (`no-reply@khalisni.local`), `docker-compose.yml:122`; deploy check `backend/core/checks.py` (`khalsni.W001`).
- **SPOT-CHECK DISCREPANCIES:** **Mobile app shows "Khalisni / خلصني"** in the client dashboard hero (`mobile/src/features/client/screens/ClientDashboardScreen.tsx:125`) while `app.json` name is "Khalsni Mobile" — the closure's "no visible Khalisni remains" scan covered only web/backend. Type: UI (mobile) + OWNER DECISION.
- **RUNTIME/UI PROOF NEEDED:** web `/`, `/about`, footer, page title, reset email subject/sender, AR + EN; mobile client dashboard. After owner decision: `manage.py check --deploy` without W001.
- **Open dependency:** OWNER DECISION (brand/domain), UI (mobile string), DEPLOYMENT GATE (sender domain).

---

### D05 — Placeholder support data (P1 before launch)

- **ORIGINAL NOTE** (D05): "info@khalisni.local وهاتف +962790000000 وعنوان Amman Jordan." Result: "ينشر المطور بيانات الدعم المعتمدة ويتحقق من عمل الروابط."
- **OWNER DECISIONS:** Dossier #1 (phone, email, WhatsApp, address AR/EN, hours) — **still pending**.
- **FINAL EXPECTED BEHAVIOUR:** only verified values published; blank → "معلومات التواصل غير منشورة حالياً."; reserved domains (`.local`, `.test`, …) refused on admin save and hidden on public read; `tel:` digits only.
- **LATEST STATUS:** **BLOCKED** (Release Unblocking §F; validation ready, values not supplied).
- **WHERE IMPLEMENTED (verified):** `backend/core/reserved_domains.py`; `backend/public_site/serializers.py:97-101` (public hide), `:208-211` (admin refuse); `frontend/src/layouts/PublicLayout.jsx:33,62-63,238,244`; `backend/public_site/management/commands/check_public_content.py` (`--strict`); `backend/public_site/defaults.py:27-31` (fresh defaults blank). `site.contact` setting retired (ODI §11E).
- **SPOT-CHECK DISCREPANCIES:** none in code. WhatsApp still rendered nowhere; no office-hours field; `/contact` shows no contact details (unchanged).
- **RUNTIME/UI PROOF NEEDED:** production/staging DB: `manage.py check_public_content --strict` exits 0; anonymous footer on `/`, `/contact` at 390 + 1366 AR/EN shows approved phone (tap `tel:`), email (`mailto:` reaches a monitored mailbox), address; no `.local`.
- **Open dependency:** OWNER DECISION / LEGAL CONTENT (business data), DEPLOYMENT GATE.

---

### D06 — Generic privacy information (P3)

- **ORIGINAL NOTE** (D06): "أربع مبادئ عامة دون بيان مدة الاحتفاظ أو طريقة طلب الحذف أو قناة محددة لمسائل البيانات." Result: "إضافة تفاصيل تشغيلية معتمدة ومعلومات تواصل مناسبة."
- **OWNER DECISIONS:** Dossier #2 (approved AR+EN text; 10 legal questions incl. retention, rights, consent wording) — **still pending**. Consent evidence storage was implemented anyway (ODI §10, FPH §3).
- **FINAL EXPECTED BEHAVIOUR:** `/privacy` renders approved CMS `privacy_policy_ar/en` (both required together); retention values drive `KHALSNI_BACKUP_KEEP` and purge policy.
- **LATEST STATUS:** **BLOCKED** (Release Unblocking §F).
- **WHERE IMPLEMENTED (verified):** `frontend/src/pages/public/PrivacyPolicyPage.jsx:10` (CMS text, fallback generic description at :31); `backend/orders/consent.py`, `orders/models.py` (`OrderConsent`), migrations `0018`, `0019` (append-only triggers); `backend/documents/retention.py`; `scripts/backup_scheduled.sh`, `scripts/verify_backup.sh`.
- **SPOT-CHECK DISCREPANCIES:** none in code. No policy version/effective-date mechanism (acknowledged).
- **RUNTIME/UI PROOF NEEDED:** after content supplied: anonymous `/privacy` AR and EN shows the approved text, not the generic fallback; order submission records `OrderConsent` (`order-consent-web-v1`).
- **Open dependency:** LEGAL CONTENT, OWNER DECISION (retention), DEPLOYMENT GATE.

---

### B01 — Provider assignment → delivery (P1)

- **ORIGINAL NOTE** (B01): "صفر روابط خدمات للمزود… الإسناد متعذر في التجهيز الحالي." Result: "يجهز المطور مزوداً تجريبياً مربوطاً بهذه الخدمة… ثم نختبر نفس رقم الطلب حتى التنزيل." (data/setup blocker, not proven engine defect).
- **OWNER DECISIONS:** B06 provider hidden from customer (affects what customer sees during this journey).
- **FINAL EXPECTED BEHAVIOUR:** eligible provider listed; assign → IN_PROGRESS → final upload → employee verifies → complete → customer downloads exact final file; final not visible before approval.
- **LATEST STATUS:** CLOSED (Original closure; lifecycle re-run in every later pass, incl. production-layout Compose stack in Release Unblocking).
- **WHERE IMPLEMENTED (exist):** `frontend/src/pages/provider/ProviderOrderDetailsPage.jsx`, `pages/employee/EmployeeVerifyDocumentsPage.jsx`, `components/DocumentList.jsx`; `backend/orders/services.py`, `documents/services.py`.
- **SPOT-CHECK DISCREPANCIES:** none.
- **RUNTIME/UI PROOF NEEDED:** deployed build: customer → employee → provider → employee → customer full journey (QA accounts), byte-compare download; AR 1366 + 390.
- **Open dependency:** DEPLOYMENT GATE.

---

### B02 — Upload / resubmit / document review (P1)

- **ORIGINAL NOTE** (B02): "حقل رفع واحد صحيح ظهر 0/1، لكن محاولة اختيار الملف رفضت بسبب إذن المتصفح." Result: "يجب اختبار PDF وصورة وحجم زائد وامتداد غير مسموح وتنزيل حسب الصلاحية."
- **OWNER DECISIONS:** F04 (reason visibility A).
- **FINAL EXPECTED BEHAVIOUR:** per-requirement extensions/size/content enforced server-side before any persistence or auto-resume; reject requires reason; downloads permission-scoped.
- **LATEST STATUS:** CLOSED (P1 FIXED; Final Release Closure §12).
- **WHERE IMPLEMENTED (verified):** `backend/documents/file_validation.py:60-79` (`requirement_upload_error`); `backend/orders/services.py:279-336` (called at :312 before `create_order_document` at :318 and `resume_review` at :336); `backend/orders/tests_p1_remediation.py`.
- **SPOT-CHECK DISCREPANCIES:** logic matches. Residuals: (1) `AdminDocumentViewSet` (`documents/views.py:167`, `/api/admin/documents/`) still bypasses requirement rules (admin-only, acknowledged). (2) Server rejection messages are English (see D03) — a spoofed-content upload shows "File content does not match its extension." in the Arabic UI.
- **RUNTIME/UI PROOF NEEDED:** customer on `/customer/orders/<id>/missing-docs` for a PDF-only requirement: upload PNG renamed `.pdf`, `.exe`, >limit file, valid PDF → only the PDF accepted, order moves to UNDER_REVIEW only then; message language; employee reject without reason blocked; other customer/provider download → 404. Mobile: same via mobile upload widget. Real iOS/Android file pickers (B09).
- **Open dependency:** CODE (localized messages, minor), DEPLOYMENT GATE (real devices).

---

### B03 — Re-login across roles (P1 coverage)

- **ORIGINAL NOTE** (B03): "المحاولة الجديدة أعادت No active account found with the given credentials." Result: "تأكيد حسابات QA النشطة وتوفير دخول آمن ناجح."
- **OWNER DECISIONS:** none.
- **FINAL EXPECTED BEHAVIOUR:** login/refresh/logout/re-login correct for all roles; invalid/expired tokens rejected; deactivated user's tokens invalid (`token_version`).
- **LATEST STATUS:** CLOSED (Original closure; re-login in later journeys).
- **WHERE IMPLEMENTED (exist):** `backend/accounts/authentication.py` (`token_version` check), `frontend/src/api/client.js`, `AuthContext.jsx`.
- **SPOT-CHECK DISCREPANCIES:** none. Live-site credential failure never reproduced (no live access).
- **RUNTIME/UI PROOF NEEDED:** deployed site: each QA role logs in at `/login`, reloads, logs out, protected URL redirects, logs back in; idle/close-browser persistence (client asked: "ثبات جلسة العميل بعد إغلاق المتصفح وفترة الخمول").
- **Open dependency:** DEPLOYMENT GATE.

---

### B04 — Registration / activation / password recovery (P2)

- **ORIGINAL NOTE** (B04): "لم ينشأ حساب جديد أو ترسل رسالة إعادة تعيين". Result: "يوفر المطور وسيلة بريد QA… ثم نفحص التفعيل والتكرار والاستعادة والجلسة."
- **OWNER DECISIONS:** Dossier #5 activation: **chosen A — no activation** (ODI §3). Consequence: registration reveals that an email/phone exists (accepted with A).
- **FINAL EXPECTED BEHAVIOUR:** account active immediately; validated phone; localized duplicate messages; reset email AR/EN by request language (mobile sends `ar`); reset link single-use; real SMTP delivery.
- **LATEST STATUS:** **BLOCKED** (Final Release Closure §12 — real SMTP unproven).
- **WHERE IMPLEMENTED (verified exist):** `backend/accounts/serializers.py`, `accounts/password_reset.py`, `accounts/templates/accounts/email/password_{reset,changed}_{ar,en}.txt`, `frontend/src/pages/public/ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx`, `mobile/src/api/client.ts`.
- **SPOT-CHECK DISCREPANCIES:** none in code. `DEFAULT_FROM_EMAIL` still defaults to `no-reply@khalisni.local` (must be overridden; W001 warns).
- **RUNTIME/UI PROOF NEEDED:** deployed site with real SMTP: register a new account at `/register`; `/forgot-password` in AR and EN → receive mail in a real mailbox, correct sender domain, link to deployed domain, reset works, old password rejected, link reuse rejected; password-changed email received; mobile forgot-password → Arabic mail.
- **Open dependency:** DEPLOYMENT GATE (SMTP), OWNER DECISION (brand/sender domain; written confirmation of "no activation").

---

### B05 — Payment / cancel / refund (P1 before payment)

- **ORIGINAL NOTE** (B05): "قائمة المدفوعات صفر، ولا عملية تجريبية مدفوعة أو sandbox مثبتة." Result: "يجهز المطور بوابة sandbox…"
- **OWNER DECISIONS:** Dossier #3: **chosen A — payment out of this release** (ODI §1).
- **FINAL EXPECTED BEHAVIOUR:** no customer payment write path (`POST /api/customer/payments/` → 405); admin manual ledger `/admin/payments` keeps working; no gateway.
- **LATEST STATUS:** NOT_APPLICABLE by owner decision (Final Release Closure §12).
- **WHERE IMPLEMENTED (verified):** `backend/payment/views.py:23` (`CustomerPaymentListAPIView` = `ListAPIView`), `payment/urls.py:12-13`; `frontend/src/pages/admin/PaymentsManagementPage.jsx`.
- **SPOT-CHECK DISCREPANCIES:** none.
- **RUNTIME/UI PROOF NEEDED:** customer `POST /api/customer/payments/` → 405; admin `/admin/payments` lists/creates manual records; no payment UI for customers. Order cancellation by admin (F05) works.
- **Open dependency:** OWNER DECISION (written confirmation only).

---

### B06 — Isolation of users, internal notes, files (P1)

- **ORIGINAL NOTE** (B06): "كل عميل يرى طلباته فقط، وكل مزود يرى المسند له، وتختفي الهوية الداخلية والملاحظات والملفات غير المسموحة." Result: "تجهيز عميلين ومزودين… اختبار قائمة وتفاصيل وتنزيل وتعديل مباشر بصلاحيات كل دور."
- **OWNER DECISIONS:** Dossier #6 provider identity to customers: **chosen B — hidden** (ODI §4).
- **FINAL EXPECTED BEHAVIOUR:** cross-object access 404/403; internal notes never to customer/provider/tracking; customer payloads contain no provider identity (order `assigned_provider` key dropped, note author/notification actor nulled unless the customer); tracking contains no reason/verification_note.
- **LATEST STATUS:** CLOSED (Final Release Closure §12).
- **WHERE IMPLEMENTED (verified):** `backend/orders/serializers.py:128-148,196-202,283-296`; `backend/notifications/serializers.py:56-60`; `backend/documents/serializers.py:34-47`; `backend/orders/selectors.py`.
- **SPOT-CHECK DISCREPANCIES:** none found; no notification text interpolates provider names (grep). Mobile customer screens do not show provider (only `EmployeeOrderDetailScreen.tsx:40`, staff — OK).
- **RUNTIME/UI PROOF NEEDED:** customer A/B, provider A/B, employee, admin (QA seed): direct URLs `/customer/orders/<B's id>` → not found; provider opens unassigned `/provider/orders/<id>` → refused; customer order JSON/notifications contain no "QA Provider A"; internal note invisible to customer/provider/tracking; download token for another's file → 404. Deployed re-run.
- **Open dependency:** DEPLOYMENT GATE; OWNER DECISION (written confirmation of B).

---

### B07 — Duplicate submission / draft persistence (P1)

- **ORIGINAL NOTE** (B07): "لم يصل الفحص إلى إرسال صالح أو حفظ مسودة". Result: "اختبار إرسال QA صالح مرة واحدة ثم ضغط مكرر وانقطاع اتصال وتحديث، والتحقق من رقم واحد وسجل واحد وإشعار واحد."
- **OWNER DECISIONS:** none (consent default unchecked was treated as a defect, fixed).
- **FINAL EXPECTED BEHAVIOUR:** one order per attempt (Idempotency-Key; replay 200, changed payload 409); draft survives reload, cleared on logout; consent unchecked by default and on draft restore; consent evidence recorded.
- **LATEST STATUS:** CLOSED.
- **WHERE IMPLEMENTED (verified):** `backend/orders/views.py:103-108`; `frontend/src/api/ordersApi.js:29`; `mobile/src/api/orders.api.ts:12`, `CreateOrderScreen.tsx:66`; `frontend/src/pages/customer/CustomerCreateOrderPage.jsx:112,212` (`consent: false`), `:287-288` consent version/source; `frontend/src/pages/customer/orderDrafts.js` (the closure's `utils/orderDrafts.js` path is wrong — actual file is under `pages/customer/`).
- **SPOT-CHECK DISCREPANCIES:** none functional. "انقطاع اتصال" (network drop mid-submit) was never explicitly tested in any report.
- **RUNTIME/UI PROOF NEEDED:** customer `/customer/orders/new`: double-click submit → 1 order; offline toggle in DevTools during submit then retry → still 1 order; reload success page → no new order; draft reload/logout; same on mobile app.
- **Open dependency:** none (optional: network-drop proof).

---

### B08 — External notification delivery (P1)

- **ORIGINAL NOTE** (B08): "لم يتحقق استلام بريد أو SMS أو web push". Result: "تجهيز بريد ورقم اختبار… اختبار created وmissing_docs… حسب القنوات المفعلة."
- **OWNER DECISIONS:** none explicit; scope from `docs/PRD.md:34` ("Notifications are logged in-system; no external gateway integration in this MVP").
- **FINAL EXPECTED BEHAVIOUR:** in-app notifications only; only password reset/changed emails go out.
- **LATEST STATUS:** NOT_APPLICABLE (Original closure; Final Release Closure).
- **WHERE IMPLEMENTED (verified):** `backend/notifications/utils.py:50-52` (`NOTIFICATION_EMAIL/SMS/WHATSAPP_ENABLED` default False).
- **SPOT-CHECK DISCREPANCIES:** none.
- **RUNTIME/UI PROOF NEEDED:** in-app bell for each lifecycle event (submitted, missing docs, assigned, in progress, completed, cancelled) without duplicates. The client should **confirm in writing** that external channels are out of scope (PRD statement only).
- **Open dependency:** OWNER DECISION (scope confirmation — not formally recorded).

---

### B09 — Mobile and other browsers (P2)

- **ORIGINAL NOTE** (B09): "لم تتوفر جلسة Safari أو Android أو محاكاة أحجام كاملة". Result: "إعادة اختبار 390 و430 و768 و1366 بكسل، Safari iOS وChrome Android، لوحة المفاتيح والرفع والتتبع والنوافذ والRTL."
- **OWNER DECISIONS:** none.
- **FINAL EXPECTED BEHAVIOUR:** no page overflow/clipping; touch targets ≥24px (footer fixed); works on real iOS Safari and Android Chrome incl. keyboard and file picker.
- **LATEST STATUS:** **BLOCKED** (real devices not executed).
- **WHERE IMPLEMENTED:** responsive across `frontend/src`; footer `layouts/PublicLayout.jsx:13` (`min-h-6`); `DataTable.jsx` focusable region; `DashboardLayout.jsx:22` `<main>`.
- **SPOT-CHECK DISCREPANCIES:** Topbar changed after the last matrix (`f396575`) — viewports 768–1920 need re-check (see U01).
- **RUNTIME/UI PROOF NEEDED:** physical iPhone Safari + Android Chrome: `/`, `/services`, `/services/<slug>`, `/track-order`, `/register`, `/login`, `/customer/orders/new` (file picker + keyboard), `/customer/orders/<id>/missing-docs` (upload), `/employee/orders/<id>`, `/provider/orders/<id>` (final upload), `/admin`, `/admin/orders/<id>` (modals) — AR RTL and EN; plus the Expo mobile app on both platforms.
- **Open dependency:** DEPLOYMENT GATE (devices), UI (re-check after topbar change).

---

### B10 — Form/admin data rules (P2) — parent item

- **ORIGINAL NOTE** (blocked/B10, verbatim): "سؤال معرفة القطعة والحوض من نوع رقم؛ البيانات مكررة؛ حقول القطعة والحوض والملاحظات مطلوبة. الموافقة على استخدام البيانات محددة مسبقاً. الإدارة أظهرت 20 خدمة بلا pagination ظاهر بينما المنشور 33، والفلترة جلبت خدمات أخرى. جدول المستخدمين يعرض تم التحقق بينما checkbox في التحرير غير محدد." Evidence: "بعض تعريفات المستندات متقاربة ومتكررة. فروق السعر الأساسي والعام قد تكون مجموع الرسوم فلا تصنف خطأ تسعير." Result: "يحسم المطور نوع سؤال نعم أو لا والإلزامية المشروطة وتكرار الحقول والموافقة الصريحة، ويؤكد pagination ومصدر verified وتفصيل الرسوم." Page "نموذج سند التسجيل وخدمات الإدارة وبيانات المستخدم".
- **LATEST STATUS:** OPEN (Final Release Closure §12): B10-1/2/3/4/6/7 done; B10-8 code done (meaning undecided); B10-9, B10-10 undecided; Release Unblocking: B10-10 BLOCKED.
- Note: "والفلترة جلبت خدمات أخرى" (filtering returned other services) is not separately tracked by any sub-item; P2 moved filters server-side (B10-6), which addresses it implicitly.

#### B10-1 — Parcel/basin "do you know?" question typed as number
- **ORIGINAL:** "سؤال معرفة القطعة والحوض من نوع رقم".
- **OWNER DECISION:** Dossier #8 (B10-1/2/3): **chosen A — yes/no gate with conditional fields** (ODI §6).
- **FINAL EXPECTED:** question "هل تعرف رقم القطعة والحوض؟" is a select نعم/لا with help text, placed before the numbers; in the 2 services having it (`request-property-registration-certificate`, `request-cadastral-map`).
- **STATUS:** DONE (ODI §6) / closure §12 "done".
- **WHERE:** `backend/services/catalogue_rules.py:83-95` (`apply_schema_rules`), migration `services/0014`, `service_import.py`; web `utils/serviceForms.js:119-131`, `components/DynamicServiceFields.jsx`, `CustomerCreateOrderPage.jsx`; mobile `utils/serviceForms.ts:131-145`, `CreateOrderScreen.tsx`.
- **DISCREPANCY:** none for the type.
- **RUNTIME PROOF:** legacy catalogue migrated: customer `/customer/orders/new?service=request-cadastral-map` (and mobile) → select with "نعم | لا", help text. AR + EN.
- **Dependency:** DEPLOYMENT GATE (migration on prod data); OWNER DECISION (written confirmation).

#### B10-2 — Duplicate fields
- **ORIGINAL:** "البيانات مكررة".
- **OWNER DECISION:** folded into Dossier #8 (A). The closure noted "no exact duplicate labels; parcel/basin coexist with the 'do you know them?' question". Oct-4 file asked whether parcel/basin repeat per property (repeatable group) — **never answered**.
- **FINAL EXPECTED:** question + parcel + basin form one gated group; no duplicate labels.
- **STATUS:** DONE (as part of A).
- **WHERE:** same as B10-1.
- **DISCREPANCY:** the "multiple properties / repeatable group" question from `KHALSNI_CLIENT_DECISIONS_REQUIRED.md` B10-2 is silently dropped.
- **RUNTIME PROOF:** inspect the land-service forms for repeated labels.
- **Dependency:** OWNER DECISION (repeatable property group — implicit "no").

#### B10-3 — Conditionally required fields (and conditional documents)
- **ORIGINAL:** "حقول القطعة والحوض… مطلوبة" / "الإلزامية المشروطة".
- **OWNER DECISION:** Dossier #8 A: parcel/basin required only if "نعم". **Pending:** whether the other **15** land services get the question (they keep both numbers always required). **Pending/unaddressed:** conditional *documents* ("إن وجد" documents, e.g. "تفويض إن وجد" required in 8 services — Dossier §12 group 3).
- **FINAL EXPECTED:** in the 2 services: "نعم" → parcel & basin visible + required (`text`, leading zeros kept); "لا" → hidden, not sent, no error.
- **STATUS:** DONE for the 2 services (ODI §6).
- **WHERE:** `catalogue_rules.py:86-89` (`visible_when: {field, equals: "yes"}`, parcel/basin `text`); validator `services/serializers.py:541-558`.
- **DISCREPANCY (CURRENT CODE):** the conditional requirement is **enforced client-side only (web + mobile)**. Order creation does not validate `required_information_schema` answers at all (no reference to the schema or `visible_when` in `backend/orders/*.py`); the backend test `test_parcel_and_basin_are_required_only_when_the_answer_is_yes` only asserts the schema shape. The dossier's work item for option A listed "server validation (required-if)". This matches pre-existing architecture (answers stored as notes text) but is a gap versus the dossier. Type: CODE.
- **RUNTIME PROOF:** `/customer/orders/new` for `request-cadastral-map`: before answer fields hidden; "نعم" + empty parcel → "الحقل رقم القطعة مطلوب"; "012" survives into the order notes; "لا" → submit OK. Same on mobile. One of the other 15 services: both numbers required, no question.
- **Dependency:** OWNER DECISION (15 services; conditional documents), CODE (server enforcement, optional).

#### B10-4 — Additional notes required
- **ORIGINAL:** "حقول … والملاحظات مطلوبة".
- **OWNER DECISION:** Dossier #9: **chosen A — optional** (ODI §7).
- **FINAL EXPECTED:** `additional_notes` / "ملاحظات إضافية" / "هل توجد ملاحظات إضافية؟" optional everywhere; other textareas unchanged.
- **STATUS:** DONE.
- **WHERE:** `catalogue_rules.py:83-84`; migration `0014`.
- **DISCREPANCY:** none (same client-only enforcement caveat as B10-3, but here it's relaxing).
- **RUNTIME PROOF:** submit a land service with empty notes → no error (web + mobile).
- **Dependency:** DEPLOYMENT GATE (migration), OWNER DECISION (written confirmation).

#### B10-5 — Consent preselected
- **ORIGINAL:** "الموافقة على استخدام البيانات محددة مسبقاً."
- **OWNER DECISION:** none (treated as defect). Approval of consent **wording** and legal sufficiency → D06 (pending).
- **FINAL EXPECTED:** checkbox unchecked on new form and restored draft; submission without consent → 400; consent evidence row (version, text, language, source, timestamp), append-only.
- **STATUS:** fixed (closure "A: fixed"); evidence storage DONE (ODI §10, FPH §3).
- **WHERE:** `CustomerCreateOrderPage.jsx:112,212`; `backend/orders/consent.py`, `orders/models.py`, migrations `0018`, `0019`; `frontend/src/utils/orderConsent.js`, `mobile/src/utils/orderConsent.ts`.
- **DISCREPANCY:** none.
- **RUNTIME PROOF:** `/customer/orders/new` consent unchecked; save draft, reload → unchecked; submit → order detail `consent.status = recorded`; legacy orders `legacy_unknown`. On prod PostgreSQL: trigger present, app role cannot disable it (Release Unblocking §B).
- **Dependency:** LEGAL CONTENT (consent text approval), DEPLOYMENT GATE (DB roles on prod).

#### B10-6 — Admin services pagination (20 of 38)
- **ORIGINAL:** "الإدارة أظهرت 20 خدمة بلا pagination ظاهر".
- **OWNER DECISION:** none.
- **FINAL EXPECTED:** `/admin/services` server-paginated with search/category/status filters and "عرض 1 - 20 من 38"; `/admin/rules` services and document-rules tabs show all records; other growing admin lists paginated server-side.
- **STATUS:** FIXED (P2) + latent lists DONE (ODI §11A).
- **WHERE:** `frontend/src/pages/admin/ServicesManagementPage.jsx:481` (`getAdminServicesPage`), `components/Pagination.jsx`, `api/client.js` (`fetchAllPages`, `fetchPage`); `backend/services/views.py:220` (`is_deleted` filter); ODI: `OrdersManagementPage`, `AdminUsersRolesPage`, `ProvidersManagementPage`, `NotificationsPage`, `MyOrdersPage`, `AssignedOrdersPage`.
- **DISCREPANCY:** the **user notification centre** `/api/notifications/` (bell) was not in the latent list and still reads page 1 only (see F01).
- **RUNTIME PROOF:** admin `/admin/services` on legacy copy (38): page 2 shows 21–38; search "جواز"; filter deleted; `/admin/rules` services 38 rows and document rules 153; EN layout; 390 overflow 0.
- **Dependency:** none (F01 latent bell pagination is CODE).

#### B10-7 — Public vs admin counts
- **ORIGINAL:** "الإدارة أظهرت 20 خدمة … بينما المنشور 33".
- **OWNER DECISION:** Dossier #10: **adopt labelled counts; don't force equality** (ODI §8). **Pending:** permission to clean up the 3 "????" debug services and duplicate civil-status category (Dossier §10).
- **FINAL EXPECTED:** admin services page shows "إجمالي الخدمات / نشطة / منشورة للعامة / ظاهرة للعميل" from `GET /api/admin/services/counts/`; `customer_visible` = public list length.
- **STATUS:** DONE.
- **WHERE:** `backend/services/selectors.py` (`service_counts`), `services/views.py:233-237`; `ServicesManagementPage.jsx:496,1171-1172`.
- **DISCREPANCY:** none.
- **RUNTIME PROOF:** legacy copy: admin `/admin/services` counts total 38 and published 32 (dossier figures; active probably 37 since only `request-zoning-certificate` is listed inactive — my estimate, not measured by any report) vs anonymous `/services` total. AR + EN.
- **Dependency:** OWNER DECISION/DATA (debug-service cleanup).

#### B10-8 — "Verified" label source
- **ORIGINAL:** "جدول المستخدمين يعرض تم التحقق بينما checkbox في التحرير غير محدد."
- **OWNER DECISION:** Dossier #11 (5 questions on meaning of `is_verified`, who sets it, workflow impact, email/phone flags) — **still pending**.
- **FINAL EXPECTED (current):** account status (نشط/غير نشط/محذوف) separate from three verification facts (الحساب موثّق / البريد مؤكَّد / الهاتف مؤكَّد) each Yes/No/غير متاح; email/phone flags read-only.
- **STATUS:** FIXED for the label (P2); meaning OPEN.
- **WHERE:** `frontend/src/pages/admin/AdminUsersRolesPage.jsx:142-144,480`; `backend/accounts/serializers.py` (read-only flags).
- **DISCREPANCY:** none (no "تم التحقق"/`VERIFIED` badge remains).
- **RUNTIME PROOF:** admin `/admin/users` (legacy copy, 13 users): no "تم التحقق"; each row shows active + three "لا"; edit dialog checkbox matches the "الحساب موثّق" column; mobile card at 390.
- **Dependency:** OWNER DECISION.

#### B10-9 — Near-duplicate document definitions
- **ORIGINAL:** evidence: "بعض تعريفات المستندات متقاربة ومتكررة."
- **OWNER DECISION:** Dossier #12 (merge groups 1,2,5,6,8; review authorization family; ID file types; approvals) — **pending; no merge done**. "تفويض إن وجد" required in all 8 services — pending.
- **FINAL EXPECTED:** per owner table.
- **STATUS:** OPEN/undecided (Release Unblocking "STILL REQUIRES OWNER INPUT").
- **WHERE:** data only (`RequiredDocumentDefinition`, `ServiceRequiredDocument`); no merge tool built.
- **RUNTIME PROOF:** after decision: `/admin/rules` document-rules tab and service pages show merged names; old orders keep snapshots.
- **Dependency:** OWNER DECISION, DATA.

#### B10-10 — Fee breakdown
- **ORIGINAL:** "فروق السعر الأساسي والعام قد تكون مجموع الرسوم فلا تصنف خطأ تسعير" / "ويؤكد … تفصيل الرسوم".
- **OWNER DECISION:** Dossier #13 (strategies 1–4) / Release Unblocking §E (A total only / B full breakdown / C restructured) — **pending**.
- **FINAL EXPECTED:** whatever is displayed sums to the displayed total.
- **STATUS:** **BLOCKED — OWNER PRICING DECISION REQUIRED** (Release Unblocking §E); Final Release Closure treats it as a release blocker.
- **WHERE:** unchanged (`total_fee = base_price + government_fee + service_fee`; public shows total/government/company fee per `show_*_public`, never `base_price`).
- **RUNTIME PROOF:** anonymous `/services/passport-renewal`-type fixed-price service (legacy copy): currently total 64 with parts 20 + 12 → contradiction visible; after decision verify sums.
- **Dependency:** OWNER DECISION, DATA.

---

## 2. Owner decisions register

Sources: Dossier = `KHALSNI_OWNER_DECISION_DOSSIER.md`; ODI = `KHALSNI_OWNER_DECISIONS_IMPLEMENTATION_REPORT.md`; FPH = `KHALSNI_FINAL_PRE_RELEASE_HARDENING.md`; FRC = `KHALSNI_FINAL_RELEASE_CLOSURE.md`; RU = `KHALSNI_RELEASE_UNBLOCKING_REPORT.md`; OAC = `KHALSNI_ORIGINAL_AUDIT_CLOSURE.md` table "ITEMS REQUIRING OWNER / CLIENT INPUT"; CDR = `KHALSNI_CLIENT_DECISIONS_REQUIRED.md`.

**Caveat:** every "chosen" below is recorded only as "implemented" by ODI; there is no owner-signed answer in the repository (Dossier answer column blank).

| # | ID | Question | Choice / state | Source |
|---|---|---|---|---|
| 1 | D05 | Official support phone, email, WhatsApp, address AR/EN, hours | **Still pending** | Dossier #1; OAC; RU §F |
| 2 | D06 | Approved privacy policy AR+EN (+10 legal sub-questions: controller, purposes, categories, recipients, retention, rights, consent wording, cross-border, security statement, version/date) | **Still pending** | Dossier #2; RU §F |
| 3 | B05 | Is payment in this release? | **A — out of release** (customer POST closed, 405) | Dossier #3; ODI §1 |
| 4 | F04 | What customer sees when a document is rejected | **A — exact staff reason**, box labelled "visible to customer" | Dossier #4; ODI §2 |
| 5 | B04 | Account activation | **A — none** this release | Dossier #5; ODI §3 |
| 6 | B06 | Provider identity shown to customers | **B — hidden** (API = UI) | Dossier #6; ODI §4 |
| 7 | D02 | Customer wording replacing "لوحة الإدارة" | **Approved proposed AR/EN texts** | Dossier #7; ODI §5 |
| 8 | B10-1/2/3 | Parcel/basin model | **A — yes/no gate, conditional fields** (+ parcel/basin as `text`) | Dossier #8; ODI §6 |
| 8a | B10-1/2/3 | Should the other 15 land services get the question? | **Still pending** | ODI "Remaining"; FPH; RU |
| 8b | B10-2 | Do parcel/basin repeat per property (repeatable group)? | **Never answered** (dropped after CDR) | CDR B10-2 |
| 8c | B10-3 | Triggers for conditionally required **documents** ("إن وجد") | **Still pending** (overlaps B10-9 group 3) | OAC; CDR B10-3; Dossier §12 |
| 9 | B10-4 | "ملاحظات إضافية" required? | **A — optional** | Dossier #9; ODI §7 |
| 10 | B10-7 | Public vs admin counts | **Adopt the four labelled counts** | Dossier #10; ODI §8 |
| 10a | B10-7 | Clean up 3 "????" debug services + duplicate civil-status category | **Still pending** | Dossier §10 |
| 11 | B10-8 | Meaning of "verified" user (5 questions) | **Still pending** | Dossier #11; RU |
| 12 | B10-9 | Merge near-duplicate document definitions (per group) | **Still pending** (no merge done) | Dossier #12; RU |
| 12a | B10-9 | "تفويض إن وجد" required in all 8 services — rename or make optional | **Still pending** | Dossier §12; FRC §2 |
| 12b | B10-9 | Personal-ID file types for merge | **Still pending** | ODI Remaining |
| 13 | B10-10 | Pricing model / meaning of `base_price` / display strategy | **Still pending** (release blocker per FRC) | Dossier #13; RU §E |
| 14 | Brand (D04) | Canonical AR/Latin spelling, domain, email domain | **Still pending** | Dossier #14; OAC; RU |
| 15 | Phone | Phone-number policy | **C — canonical E.164, default country +962** | Dossier #15; ODI §9 |
| 16 | verification_note | Approval/delivery note to customer: A customer-facing / B staff-only / C separate fields | **Still pending** (public-tracking leak closed) | FPH §2; RU |
| 17 | National ID | Official national-ID format (length, check digit, non-Jordanians); type of company-registration and trade-name numbers | **Still pending** (fields now `text`, no format rule) | FPH §5; RU |
| 18 | D03 content | Arabic text for 3 English help-manual guides and 2 English related-service messages | **Still pending** | RU §D |
| 19 | D06/retention | Retention periods (accounts, orders, documents, audit logs, backups) → `KHALSNI_BACKUP_KEEP`, purge policy | **Still pending** | ODI §11F/G; RU |
| 20 | B10-5 / D06 | Approve final consent text and required proof fields (legal sufficiency) | **Still pending** (evidence storage implemented) | CDR B10-4; ODI Remaining |
| 21 | F02 | How to remap legacy WAITING orders lacking requested types | **Not decided**; replaced by audited operator recovery per order (production action pending) | OAC table 3; P1 |
| 22 | B08 | External email/SMS notifications in scope? | **Not formally decided**; treated out of scope from `docs/PRD.md:34` | OAC B08 |
| 23 | Team log | `docs/final_review/TEAM_DECISION_LOG.md` rows (e.g. "Who can assign provider?", "Should payment be required before completion?") | **All "Final Decision" cells empty** | Dossier sources line |

---

## 3. Discrepancies found by code spot-check (current `main` HEAD `f396575`)

| # | Item | Finding | Evidence | Type |
|---|---|---|---|---|
| 1 | D03 / B02 / F05 | Server validation and workflow error messages are English-only and shown raw in Arabic UI (no `.po`, no `LocaleMiddleware`; `getDisplayError` passes `detail`/field message through). No report covered error paths. | `backend/documents/file_validation.py:55-57`; `backend/orders/services.py` (31 `ValidationError`s), `orders/serializers.py:448-495`; `frontend/src/api/client.js:278-287`; `backend/config/settings.py:201-202` | CODE |
| 2 | F02 / U03 (mobile) | Mobile missing-docs flow shows raw document codes and asks the customer to **type** the document code; ignores `missing_document_request_valid`. | `mobile/src/features/client/screens/MissingDocumentRequestsScreen.tsx:31`; `RespondToMissingDocumentScreen.tsx`; `mobile/src/features/documents/DocumentUploadWidget.tsx:66-71` | CODE/UI |
| 3 | D04 (mobile) | Mobile client dashboard shows "Khalisni / خلصني". | `mobile/src/features/client/screens/ClientDashboardScreen.tsx:125` | UI + OWNER DECISION |
| 4 | F01 | Bell/notification centre reads only page 1 of a 20-row paginated endpoint; unread count computed client-side from ≤20 rows. | `backend/notifications/views.py:78-83` + `config/settings.py:282-283`; `frontend/src/api/notificationsApi.js:50`; `NotificationPanel.jsx:14,79` | CODE (latent) |
| 5 | B10-3 | Conditional "required if yes" (and all schema `required` flags) enforced only in web/mobile clients; no server-side validation of schema answers at order creation. Dossier option A listed server required-if. | no schema reference in `backend/orders/*.py`; `services/tests_owner_decisions.py:120-125` checks shape only | CODE |
| 6 | U01 / B09 / F01 | `Topbar.jsx` changed after the last verification run (`f396575`); not re-verified. | `git show f396575` | UI (re-verify) |
| 7 | U04 | `/contact` phone has no example and no `type="tel"`/`inputMode`, although backend validates format. | `frontend/src/pages/public/ContactPage.jsx:69-70` | UI (minor) |
| 8 | Owner decisions | No owner sign-off recorded anywhere in repo for the 9 "implemented" decisions. | Dossier "Owner answer" column blank; `TEAM_DECISION_LOG.md` | OWNER DECISION |
| 9 | B10 numbering | `KHALSNI_CLIENT_DECISIONS_REQUIRED.md` uses a different B10-n numbering than all later reports. | file vs `KHALSNI_ORIGINAL_AUDIT_CLOSURE.md` B10 breakdown | documentation |
| 10 | B07 (doc path) | Closure traceability lists `utils/orderDrafts.js`; real file is `frontend/src/pages/customer/orderDrafts.js`. | `git ls-files` | documentation |

Verified as claimed (no discrepancy): B02 server-side requirement check before persistence; F05 admin cancel/request-documents/indirect notes/localized blocks; F02 web safe state + recovery endpoint + command; F04 reason gating + label; B06 provider identity removal (orders, notes, notifications); B05 405; U04 register phone/labels/password rules + E.164 +962; B10-6 server pagination; B10-7 counts endpoint/labels; B10-8 separate facts; D02 approved text + `priceShownAbove` dedup, no admin-panel phrase in public code; consent version/source sent by web and mobile; mobile `Accept-Language: ar`; `PublicHomepageTemplate.jsx` deleted; reserved-domain email validation + `check_public_content`; `db-init` role split in `docker-compose.yml`; `entrypoint.sh` waits on `migrate --check`; footer link `min-h-6`; staff `<main>`.

---

## 4. Status roll-up (latest report vs this review)

| ID | Latest report status (source) | This review |
|---|---|---|
| F01 | CLOSED (OAC/FRC) | Agree for the original symptom; latent >20 notifications defect; re-verify header after `f396575` |
| F02 | BLOCKED – prod data (FRC/RU) | Agree (web); **mobile flow not fixed** |
| F03 | CLOSED | Agree |
| F04 | CLOSED (FRC) | Agree; needs owner confirmation; verification_note pending |
| F05 | CLOSED (P1/FRC) | Agree; error toasts English (D03) |
| F06 | CLOSED | Agree |
| U01 | CLOSED (OAC 10-15) | **Needs re-verification** (Topbar changed after) |
| U02 | CLOSED | Agree |
| U03 | CLOSED | Agree (web); mobile shows codes |
| U04 | CLOSED (FRC) | Agree; minor contact hint gap |
| D01 | CLOSED | Agree |
| D02 | CLOSED (RU) | Agree; prod migration needed |
| D03 | CLOSED for defined residual (RU) | **Disagree on completeness**: English server error messages; English help guides (owner content) |
| D04 | CLOSED w/ owner value pending (FRC) | **Partial**: mobile shows "Khalisni"; brand decision pending |
| D05 | BLOCKED (RU) | Agree |
| D06 | BLOCKED (RU) | Agree |
| B01 | CLOSED | Agree locally; deployed proof pending |
| B02 | CLOSED | Agree; admin raw CRUD bypass + English messages residual |
| B03 | CLOSED | Agree locally |
| B04 | BLOCKED – SMTP (FRC) | Agree |
| B05 | NOT_APPLICABLE by decision | Agree (needs written owner confirmation) |
| B06 | CLOSED | Agree |
| B07 | CLOSED | Agree (network-drop not tested) |
| B08 | NOT_APPLICABLE (PRD) | Agree (scope confirmation advisable) |
| B09 | BLOCKED – devices | Agree; plus re-check after Topbar change |
| B10 | OPEN (FRC); B10-10 BLOCKED (RU) | Agree; B10-3 server enforcement gap |

Deployment gates still open (RU "STILL REQUIRES DEPLOYED ENVIRONMENT"): push/deploy exact SHA and record it; DB role variables on prod; backup cron + off-server copy + restore drill; `normalize_phones` on prod; real SMTP; real iOS/Android; deployed end-to-end + authz re-run; `check_public_content --strict` on prod; F02 production recovery of `KH-2026-000001`; migrations `services.0014/0015`, `orders.0017-0019` applied.
