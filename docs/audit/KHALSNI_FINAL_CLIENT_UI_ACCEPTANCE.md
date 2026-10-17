# KHALSNI — FINAL CLIENT REQUIREMENTS + UI/UX ACCEPTANCE AUDIT

AUDITED SHA: `f396575` (`main`, clean; includes the release-unblocking merge `ec5964b` and the topbar fix `f396575`)
DATE: 2026-10-17
TYPE: acceptance audit only. Nothing in the product was changed.
ENVIRONMENT: local. Playwright with Chrome; Django and a Vite production build.
- Fresh database for the screenshot set, axe and the UI journey: `seed_demo` + `seed_client_audit_qa`.
- A migrated copy of the real 38-service catalogue (`backend/db.sqlite3` → HEAD) for the catalogue checks.

No deployed site was tested. This report is not a deployment-readiness statement.

Evidence root: `docs/audit/evidence/client-ui-acceptance-2026-10-17/`

| Folder | Content |
|---|---|
| `screens/` | 232 screenshots, `role-page-language-width.png`, plus `_metrics.json` (overflow, raw codes, language leaks, duplicate lines, broken images, small targets, console/API errors per capture) |
| `evidence/` | UI journey, registration, keyboard, error-language, national-ID and real-catalogue probes (PNG + page text + JSON results) |
| `probes/` | the scripts that produced them (the QA password comes from the environment and appears nowhere) |
| `reports/` | the four supporting analyses: requirement history (`audit_history.md`), client-note map (`client_notes_map.md`), mobile audit (`mobile_audit.md`), data/content audit (`data_audit.md`) |
| `data-audit/` | raw query outputs on the real catalogue copy |
| `logs/` | axe and screenshot-run summaries |

Matrix: `docs/audit/KHALSNI_FINAL_CLIENT_UI_MATRIX.csv` (189 rows).

---

## SUMMARY

```
TOTAL CLIENT REQUIREMENTS: 189
PASS:            82
PARTIAL:         63
FAIL:             6
BLOCKED:         30
NOT_APPLICABLE:   8

ORIGINAL 26:
CLOSED:          15   (F01 F03 F04 F05 F06 U01 U02 U03 D01 D02 B01 B02 B03 B06 B07)
OPEN:             3   (U04 D03 B10)
BLOCKED:          6   (F02 D04 D05 D06 B04 B09)
NOT_APPLICABLE:   2   (B05 B08)

UI ACCEPTANCE:
PUBLIC:    PARTIAL
CUSTOMER:  PARTIAL
EMPLOYEE:  PARTIAL
ADMIN:     PARTIAL
PROVIDER:  PASS for provider screens; the shared-shell defects in §5 apply
MOBILE:    FAIL (3 FAIL items; nothing rendered or run on a device)
```

FINAL VERDICT: **CLIENT REQUIREMENTS & UI ACCEPTANCE PARTIAL**

These held in this run:
- The end-to-end workflow works through the UI.
- No page overflows at any captured width.
- No console or API errors appeared in 232 captures.
- axe is clean on 5 viewports.

PASS is still impossible:
- P1 defects remain. The most serious, confirmed in the browser: none of the 9 business services in the real catalogue can be submitted on the web.
- The mobile app has three P1 gaps against the web.
- The client's approved homepage slogan is not displayed.
- Arabic/English mixing remains on several surfaces.
- Ten owner, legal or deployment inputs are outstanding.

---

## 1. Source map

| # | Source | Date | Origin | Status of its requirements |
|---|---|---|---|---|
| S1 | `D:\ghassam moblie\Khalsni_Developer_Final_Action_Notes_AR_v2.docx` (outside repo) | 2026-08-15 | Client | 14 items CN-ACT-01..14. **Never cited in any repo document before this audit.** |
| S2 | `D:\ghassam moblie\Khalsni_Visual_Design_Notes_20.docx` (outside repo) | 2026-08-30 | Client | 20 items CN-VIS-01..20. **Never cited in any repo document before this audit.** |
| S3 | `Khalsni_Website_Audit_AR.docx` + `Khalsni_Audit_Evidence/audit_data.json` (outside repo) | 2026-10-01 | Client | The original 26 (F01–B10) |
| S4 | `D:\ghassam moblie\servese\*.docx` (22 service sheets) + `docs/service-import/*` | 2026-06-29 | Client | Service fields/documents; CN-BIZ-00..11 |
| S5–S8 | `Khalasni_SiteMap_Explanation_AR.pdf`, `khalesni_system_flow.pdf`, `Khalasni_Daily_Operations_AR.pdf`, `Khalasni_Detailed_Services_AR.pdf` (repo root) | 2026-04 | Client | CN-MAP, CN-FLOW, CN-OPS, CN-SVC |
| S9–S11 | Website proposal, mobile proposal, modules blueprint | 2026-04 | Developer → client | PROP-*, ARCH-01 |
| S12–S13 | `docs/PRD.md`, `docs/SRS.md` | 2026-04/05 | Baseline | PRD-*, FR1–10, NFR1–6, BR1–8 |
| S14–S16 | Owner prompts A1/A2 (catalogue, soft delete), A4 (UI transformation) | 2026-06/07 | Owner | CE*, SD*, UI-HP*, UI-TR* |
| S17 | `docs/final_review/TEAM_DECISION_LOG.md` | 2026-05 | Team/owner | TDL-01..15. **All decision cells empty.** |
| S18 | Owner decision dossier → implementation report | 2026-10-16 | Owner | Decided: B05, F04, B04, B06, D02, B10-1/2/3/4/7, phone. Pending: D05, D06, B10-8/9/10, brand, others (§19) |
| S19 | P1, P2, hardening, release-closure and release-unblocking reports | 2026-10-15..17 | Developer | Status history, re-checked here (statuses were not inherited) |

The full per-requirement source map is in `reports/client_notes_map.md` (§2). That covers SOURCE, ID, ORIGINAL CLIENT INTENT, IMPLEMENTED AREA, SUPERSEDED BY / WHY / FINAL RULE, and the runtime check. The history of the original 26 is in `reports/audit_history.md`.

Two governance facts affect acceptance:
1. **No written owner sign-off is stored in the repo for any "decided" item.** The dossier's answer column and the team decision log are blank. The decisions exist as the implementation report and commit `9b5335e`. Written confirmation is needed.
2. The October 4 file `KHALSNI_CLIENT_DECISIONS_REQUIRED.md` numbers B10 sub-items differently from every later report. This report uses the closure numbering (B10-1 … B10-10).

---

## 2. Traceability matrix

The matrix is the CSV. These rules were applied:
- PASS needs runtime proof plus UI proof.
- PASS needs both languages where the screen supports both.
- PASS needs desktop and mobile widths.
- PASS needs real migrated data where data matters.
- PASS needs no missing owner decision.
- Code inspection or unit tests alone give PARTIAL at best.
- Mobile items are at most PARTIAL, because no screen could be rendered (Expo web dependencies are absent; there's no device).

| Group | Rows | PASS | PARTIAL | FAIL | BLOCKED | N/A |
|---|---|---|---|---|---|---|
| Original 26 + B10 sub-items | 36 | 20 | 5 | 0 | 9 | 2 |
| CN-ACT (final action notes) | 14 | 6 | 6 | 0 | 1 | 1 |
| CN-VIS (visual notes) | 20 | 11 | 7 | 1 | 0 | 1 |
| Sitemap / flow / ops / services | 18 | 7 | 10 | 0 | 1 | 0 |
| CN-BIZ (service specs) | 12 | 2 | 8 | 2 | 0 | 0 |
| Proposals / blueprint | 10 | 2 | 5 | 0 | 0 | 3 |
| PRD / SRS | 27 | 22 | 5 | 0 | 0 | 0 |
| Owner prompts A1/A2/A4 | 24 | 12 | 11 | 0 | 1 | 0 |
| Team decision log | 15 | 0 | 0 | 0 | 14 | 1 |
| Other pending owner decisions | 4 | 0 | 0 | 0 | 4 | 0 |
| Mobile parity | 9 | 0 | 6 | 3 | 0 | 0 |
| **Total** | **189** | **82** | **63** | **6** | **30** | **8** |

---

## 3. The original 26 re-checked

Each item was checked against current code, current runtime and UI, the original note, and later owner decisions. Full history and spot-checks: `reports/audit_history.md`. Image paths below are under `screens/` or `evidence/`.

### F01 — Bell vs dashboard events
- ORIGINAL NOTE: «جرس الإشعارات لا يعرض أحداث لوحة العميل» (the bell doesn't show customer-dashboard events). The bell said «لا توجد إشعارات» (no notifications) while the dashboard listed a document request.
- FINAL EXPECTED BEHAVIOUR: the same events in the bell and the dashboard; the item opens the right order; read state is consistent.
- CURRENT BEHAVIOUR: in the UI journey, the bell showed the missing-document notice for `KH-2026-000009`. Clicking it opened `/customer/orders/9/missing-docs`, and the completion notice appeared later.
- Latent defect: the bell reads only the first 20 notifications and computes the unread count from them (code).
- UI RESULT: correct in AR/EN at 1440 and 390.
- STATUS: **CLOSED**. Latent defect DEF-C05.
- EVIDENCE: `evidence/J04-customer-bell.png`, `JOURNEY-run2-results.json`.

### F02 — Missing-document request with nothing to upload
- ORIGINAL NOTE: `KH-2026-000001` showed 0/0 with a resubmit button.
- FINAL EXPECTED BEHAVIOUR:
  - New requests name configured documents.
  - Legacy invalid requests show a safe state.
  - Staff can recover the order with a reason.
  - Production record recovered by an operator.
- CURRENT BEHAVIOUR:
  - Web: as expected; the journey's request listed the configured document.
  - Production record not yet recovered.
  - The mobile app reproduces the problem: the customer must type the document code (MOB-04).
- UI RESULT: web PASS; mobile FAIL (code).
- STATUS: **BLOCKED** (deployment gate: production recovery). Mobile defect DEF-M03.
- EVIDENCE: `evidence/J03-employee-after-request.png`, `reports/mobile_audit.md` M-04.

### F03 — Readiness contradicts missing documents
- ORIGINAL NOTE: «جاهز الآن» (ready now) shown while six documents were missing.
- FINAL EXPECTED BEHAVIOUR: readiness only when required documents are approved.
- CURRENT BEHAVIOUR: assignment is blocked with a numbered explanation until approval. The journey shows "ready" only after approval.
- UI RESULT: PASS.
- STATUS: **CLOSED**.
- EVIDENCE: `screens/employee-order-review-ar-1440.png`, journey step 9.

### F04 — "Not uploaded" shown as "rejected"
- ORIGINAL NOTE: an absent document was described as rejected.
- FINAL EXPECTED BEHAVIOUR: distinct states. Under decision A, the exact rejection reason is shown to the owning customer only.
- CURRENT BEHAVIOUR: "not uploaded" renders distinctly (`لا توجد مستندات مرفوعة` / «بانتظار التحقق»). Rejection-reason visibility was proven at runtime in the original-closure and owner-decision passes; the code is unchanged since.
- UI RESULT: PASS.
- STATUS: **CLOSED**. `verification_note` visibility is a separate pending decision (OD-16).
- EVIDENCE: `screens/customer-order-waiting-ar-1440.png`.

### F05 — Admin transitions vs displayed rules
- ORIGINAL NOTE: no transitions available while the rules page showed some.
- FINAL EXPECTED BEHAVIOUR: every server-allowed action is rendered; blocked actions are explained.
- CURRENT BEHAVIOUR: as expected. When a server action fails, the toast shows English server text (D03).
- UI RESULT: PASS.
- STATUS: **CLOSED**.
- EVIDENCE: `screens/admin-order-detail-ar-1440.png`.

### F06 — CMS preview vs published page
- FINAL EXPECTED BEHAVIOUR: the preview is the published page, labelled as such.
- CURRENT BEHAVIOUR: as expected (CMS acceptance spec passed in the 2026-10-17 full run).
- STATUS: **CLOSED**.
- EVIDENCE: `screens/admin-preview-ar-1440.png`.

### U01 — Admin tools stacked on mobile
- FINAL EXPECTED BEHAVIOUR: short header, with secondary tools in a menu.
- CURRENT BEHAVIOUR: re-verified after `f396575` changed the header.
  - At 390: menu, title, bell and "more".
  - At 1280–1440: compact header.
  - At 1536–1920: the title stays on one line, with the actions in one row below it.
  - Overflow 0 everywhere.
- STATUS: **CLOSED**.
- EVIDENCE: `screens/admin-overview-ar-390.png`, `screens/admin-overview-ar-1440.png`.

### U02 — Search results below categories
- CURRENT BEHAVIOUR: the category grid hides while a term is present (code unchanged since the closure runtime proof); suggestions are live on home.
- STATUS: **CLOSED**.
- EVIDENCE: `screens/public-services-ar-1440.png`.

### U03 — Technical document code on tracking
- CURRENT BEHAVIOUR: web tracking shows localized names and a login link to the missing-documents page. Mobile has no tracking screen, and its missing-documents screen shows codes (counted under mobile).
- STATUS: **CLOSED** (web scope of the note).
- EVIDENCE: `screens/public-track-ar-1440.png`.

### U04 — Required/optional not shown before submit
- ORIGINAL NOTE: asked for required/optional marks and **phone-format examples**, specifically on `/register` and `/contact`.
- CURRENT BEHAVIOUR:
  - `/register`: complete (labels, phone example, password rules).
  - `/contact`: phone has no example and no `type="tel"`, although the backend validates the format.
- STATUS: **OPEN** (P3 UI).
- EVIDENCE: `screens/public-contact-ar-390.png`, `ContactPage.jsx:69-70`.

### D01 — Technical field types on service pages
- CURRENT BEHAVIOUR: on the real catalogue, `business_company_registration` shows 0 SELECT/TEXT/NUMBER tokens.
- STATUS: **CLOSED**.
- EVIDENCE: `evidence/L-public-business_company_registration.png`.

### D02 — Admin-panel wording on service pages
- FINAL EXPECTED BEHAVIOUR: approved AR/EN sentences, shown once.
- CURRENT BEHAVIOUR: as expected on the real catalogue.
- Related data defect: the same pages show a placeholder «المدة المتوقعة: 1 يوم» ("expected duration: 1 day") next to the approved «تُحدَّد مدة الإنجاز بعد مراجعة الطلب» ("completion time is set after review"). Recorded as DEF-D02.
- STATUS: **CLOSED**.
- EVIDENCE: `evidence/L-public-business_company_registration.txt` lines 21–26.

### D03 — English content in the Arabic UI
- FINAL EXPECTED BEHAVIOUR: system-generated text in the screen language; authored text as typed.
- CURRENT BEHAVIOUR (runtime):
  - **Server error messages are English inside the Arabic UI.** An Arabic customer uploading a spoofed PDF sees "File content does not match its extension." No `.po` files and no `LocaleMiddleware` exist.
  - `/admin/help-guides` is English in Arabic mode: header, description, filters, column headings, Edit/Deactivate buttons.
  - In English mode, admin tables show Arabic category and service names.
  - Help guides from `help_guides.0004` are English only and are the first quick links for every role.
  - 311 of 311 real-catalogue form fields have no English label, so English mode shows "Requested information N".
- STATUS: **OPEN** (P2 code + content; Arabic help text is owner content).
- EVIDENCE: `evidence/E01-spoofed-upload-ar.png`, `screens/admin-help-guides-ar-1440.png`, `screens/_metrics.json`.

### D04 — Brand name inconsistent
- CURRENT BEHAVIOUR:
  - Web uses «خلصني | Khalsni».
  - The CMS/theme rows still say "Khalisni".
  - Mobile shows "Khalisni / خلصني" on the dashboard and "Khalsni / خلّصني" on login.
  - Email defaults use `khalisni.local`.
- STATUS: **BLOCKED** (owner brand/domain decision). Mobile string is DEF-M10.

### D05 — Placeholder support data
- CURRENT BEHAVIOUR: validation works. The footer shows «معلومات التواصل غير منشورة حالياً.» ("contact details not published yet"). Approved values not supplied.
- STATUS: **BLOCKED** (owner).
- EVIDENCE: `screens/public-contact-ar-1440.png`.

### D06 — Generic privacy information
- CURRENT BEHAVIOUR: generic fallback text; no approved policy or retention periods.
- STATUS: **BLOCKED** (legal).
- EVIDENCE: `screens/public-privacy-ar-1440.png`.

### B01 — Assignment through delivery
- CURRENT BEHAVIOUR: the UI journey passed all 21 checks: submit, review, missing document, bell, resubmit, verify, assign, provider progress, final upload, final verify, complete, notification, download (bytes identical to the provider's file), re-login, no duplicates.
- STATUS: **CLOSED** (the deployed re-run is a deployment gate).
- EVIDENCE: `evidence/JOURNEY-run2-results.json`, `JOURNEY2-results-KH-2026-000009.json`, `J*.png`.

### B02 — Upload, resubmit and review
- CURRENT BEHAVIOUR: a spoofed HTML-as-PDF upload is refused (400) before anything is stored; a valid PDF resubmits and moves the order to UNDER_REVIEW. The message language is the D03 defect.
- STATUS: **CLOSED**.
- EVIDENCE: `evidence/ERROR-LANGUAGE-results.json`.

### B03 — Re-login
- CURRENT BEHAVIOUR: journey re-login and keyboard-only login pass.
- STATUS: **CLOSED**.

### B04 — Registration, activation, recovery
- CURRENT BEHAVIOUR: registration through the UI passed (AR 1440, EN 390), landing on login and then the customer portal. Real SMTP delivery can't be proven locally.
- STATUS: **BLOCKED** (deployment gate: SMTP; brand/sender domain).
- EVIDENCE: `evidence/REGISTER-results.json`.

### B05 — Payment
- STATUS: **NOT_APPLICABLE** under owner decision A (payment out of release). Written confirmation pending.

### B06 — Isolation
- CURRENT BEHAVIOUR: the journey shows the internal note is hidden from both provider and customer, and the provider name is not visible to the customer.
- STATUS: **CLOSED**.

### B07 — Duplicate submission
- CURRENT BEHAVIOUR: consent is unchecked by default; a double-click creates one order; refreshing creates no extra order.
- STATUS: **CLOSED**.

### B08 — External notifications
- STATUS: **NOT_APPLICABLE** (PRD: in-system only). Written scope confirmation advisable.

### B09 — Mobile devices and other browsers
- CURRENT BEHAVIOUR: emulated 390/768/1024/1280/1440 only. No physical iOS/Android and no Expo app run.
- STATUS: **BLOCKED** (devices).

### B10 — Form and admin data rules
- ORIGINAL NOTE: yes/no type, duplicate fields, conditional requirement, preselected consent, pagination, verified label, document duplicates, fee breakdown.
- STATUS: **OPEN**.

| Sub | Current (runtime unless noted) | Status |
|---|---|---|
| B10-1 yes/no | Real catalogue `request-cadastral-map`: select «نعم / لا» | PASS |
| B10-2 duplicates | `request-land-survey` still shows two phone fields; the data audit finds ID, land plan and POA asked twice | PARTIAL |
| B10-3 conditional | Parcel field appears only on «نعم» (web); not enforced server-side (code); 15 land services undecided | PARTIAL |
| B10-4 notes optional | owner-decision pass runtime | PASS |
| B10-5 consent | unchecked; evidence stored | PASS |
| B10-6 pagination | «عرض 1 - 20 من 38» ("showing 1–20 of 38") | PASS |
| B10-7 counts | 38 / 37 / 32 labelled | PASS |
| B10-8 verified meaning | owner decision | BLOCKED |
| B10-9 document merges | owner decision | BLOCKED |
| B10-10 fees | `tax-clearance` shows 36.00 with components 7.00 + 11.00 (AR/EN) | BLOCKED (owner pricing) |

---

## 4. Client note verification (S1, S2 and the other client documents)

Full table: `reports/client_notes_map.md`; statuses in the CSV.

**Superseded notes (explicit or documented only):**

| Note | SUPERSEDED BY | WHY | FINAL RULE |
|---|---|---|---|
| CN-ACT-10 "الدفع الآن" (pay now), proposal payment channel, wizard payment step, "paid" provider step, TDL-07 | Owner decision B05 (2026-10-16) | No approved online payment | No customer payment write path; admin manual ledger only |
| External SMS/WhatsApp/Email (sitemap, flow, daily ops) | PRD constraint + B08 | MVP scope | In-system notifications only |
| Provider name shown on customer's order (CN-OPS-02, customer view) | Owner decision B06 | Privacy | Provider hidden from customer; internal record kept |
| Dark homepage mockup 2026-08-05 (C-VIS1) | CN-VIS-09 (2026-08-30) + 2026-08-24 light mockup | Newer written client note | Light identity |
| SRS FR2 public create | 2026-06 auth hardening | Security | Authenticated or guest customer only |
| Proposal tech (Django templates, Flutter) | Built architecture | Product evolved | React SPA + Expo |
| Original 31-service / 8-group catalogue (S8) | S4 service sheets, then the CN-ACT-04 category list | Newer client documents | **Not reconciled in data** (BLOCKED) |

**Not superseded and not met, with no out-of-scope record:**
- Terms & Conditions page (sitemap; the mobile consent text refers to «الشروط», "the terms").
- Customer-to-support messaging.
- Provider earnings/rating view.
- Late-order supervisor alert.
- Paper-delivery logistics.
- Complaints follow-up.
- Repeater fields, coordinates, and files over 10 MB (CN-BIZ-01/04/05/09).
- Upload preview/replace (CN-ACT-08).
- The client's 8-category set (CN-ACT-04).
- Language purity (CN-ACT-13).
- Provider reassignment (TDL-11).
- **The approved slogan (CN-VIS-04).** «ركّز على اللي بهمّك… وإحنا بنخلّص الباقي.» is coded in `HomePage.jsx:44`, but the default CMS `hero_title_ar` («خلّص معاملاتك الحكومية والإدارية بدون تعب», `public_site/defaults.py:15`) takes precedence. The approved slogan therefore appears in none of the captures.

---

## 5. Global UI/UX acceptance

Objective results over 232 captures (16 public, 9 customer, 8 employee, 22 admin and 3 provider pages; each at 1440 and 390, AR and EN):
- Horizontal overflow: **0**.
- Console errors: **0**. Failed API calls: **0**.
- Broken images: **0**.
- `????`: **0**. `undefined` / `NaN`: **0**.
- Light identity is consistent across public and portal. Cards, badges and buttons share tokens.

Shared defects (apply to every portal role):

| ID | Defect | Where / evidence | Class | Sev |
|---|---|---|---|---|
| DEF-U01 | Closed mobile/tablet sidebar leaves 9 off-screen links in the tab order (no `inert`/`aria-hidden`) | `evidence/OFFCANVAS-results.json` | UI (a11y) | P2 |
| DEF-U02 | Notification and help panels don't move focus into the panel or trap it. The notification panel is not `role="dialog"` despite `aria-haspopup="dialog"` | `evidence/KEYBOARD-results.json` | UI (a11y) | P2 |
| DEF-U03 | The first nav item ("لوحتي" / "لوحة الإدارة", the dashboard link) stays highlighted on every page, so two items look active | `screens/customer-order-waiting-ar-1440.png`, `screens/admin-rules-ar-1440.png` | UI | P3 |
| DEF-U04 | No skip link on public or portal pages | keyboard walk | UI (a11y) | P3 |
| DEF-U05 | Inline help "?" icons and the rating icon are 20×20 px (below the 24 px minimum) at 390 | `_metrics.json` smallTargets | UI | P3 |
| DEF-U06 | Header logo aria-label "Khalsni home" stays English in Arabic mode | keyboard walk | CONTENT | P3 |
| DEF-U07 | A signed-in employee opening a support-only route is sent to the public home, not their portal | `screens/employee-categories-*` | UI | P3 |

---

## 6. Public website

All public routes were captured at 1440 and 390 in AR and EN (`screens/public-*`): home, services, category, quotation service, fixed service, create-order (redirects to register), track, about, contact, FAQ, privacy, login, register, forgot, invalid reset, 404. Tablet 768 is covered by the axe run on 5 viewports.

| Check | Result |
|---|---|
| Branding / identity | Light, consistent; logo correct. Approved slogan missing (CN-VIS-04, FAIL). Brand spelling pending (D04) |
| Real content | Demo/seed data in the test DB. On the real catalogue: placeholder durations (DEF-D02), contradictory fees (B10-10), and live demo CMS contact data in the legacy DB (DEF-D05) |
| No internal wording | Clean on public pages (D02) |
| Prices | B10-10 contradiction visible (36 vs 7 + 11); fixed-price services also carry "final fees confirmed after review" (DEF-D03) |
| Contact details | "Not published" text (D05 BLOCKED) |
| CTA hierarchy | Clear: «ابدأ الطلب» ("start request") primary, «كل الخدمات» ("all services") secondary |
| Images | All present; one gradient-only category cover (P3) |
| Responsive | Overflow 0. EN hero eyebrow is clipped at 390 ("…SERVICES PLA", DEF-P01, P3) |
| Spacing | Home 1440 is 4278 px tall, with large empty card areas in "services by category" rows when a category has 1–2 services (DEF-P02, P3) |
| Duplication | Home has both a "main categories" rail and "services by category" rows (CN-ACT-03 PARTIAL). "Expected completion: 1 days" grammar (DEF-P03, P3) |
| Forms | Register: labels, rules, example. Contact: no phone example (U04) |

STATUS: **PARTIAL**.

---

## 7. Customer portal

Captures: dashboard, orders, waiting order, missing-documents page, ready order, completed order, new-order wizard, profile (`screens/customer-*`). Journey screenshots: `evidence/J0*`, `J13`, `J19`.

| State / screen | Result |
|---|---|
| WAITING_CUSTOMER | The required document is named, the upload is clear, and there's no false success. **But** the hero subtitle and the first banner repeat the same sentence, and the page offers three upload paths (DEF-C01, P2 UX) |
| Missing-documents page | Clear per-document card and progress; uploaded state obvious. At 390 the order number breaks across lines in RTL ("KH-" / "2026-000005", DEF-C02, P3) |
| Error during upload | Server message shown in English in the Arabic UI (D03 / DEF-C03, P2) |
| COMPLETED | Final result and Download obvious; provider not shown; timeline repeats «لا توجد ملاحظات إضافية لهذا التحديث.» ("no additional notes for this update") on every step (DEF-C04, P3); the rating input is a free-text "1 to 5" field (P3) |
| Wizard | From a service it skips the service step; consent unchecked; double submit gives one order |
| Real catalogue, 9 business services | **Cannot be submitted.** E.g. `business_company_registration` requires «نوع الشركة» ("company type"), but its select has no options; the wizard stops on «الحقل نوع الشركة مطلوب» ("company type is required"). Same for `business_trade_name_registration` (2 fields). Confirmed in the browser. **DEF-D01, P1 DATA** |
| Notifications | Bell correct; reads only the first 20 rows (DEF-C05, P3 latent) |
| Profile/order data | An order submitted with a blank national ID **erases the stored national ID** (runtime: `9901234567` → `""`; DEF-C06, P2 CODE). A phone that belongs to another user returns the raw text `Constraint “unique_non_empty_user_phone” is violated.` (DEF-C07, P2 CODE) |

STATUS: **PARTIAL**.

---

## 8. Employee / staff

Captures: dashboard, queue, order review, document verification, missing-service requests, reports (`screens/employee-*`); the journey ran every staff step through the UI.

- Every allowed action has a control. Unavailable actions are explained: assign is disabled with a numbered checklist, and the provider status shows «لا توجد حالة انتقال متاحة حالياً» ("no transition available right now").
- Customer-visible fields are labelled; the rejection box says «سيظهر هذا السبب للعميل» ("this reason will be shown to the customer").
- Internal note fields are labelled internal.
- **Raw code:** the queue's priority column prints `NORMAL` in both languages. `EmployeeReviewQueuePage.jsx:79` renders the raw value and uses a label only when it's empty (DEF-E01, P2 UI).
- The order-review page is long and dense at 1440 (about 3400 px, many stacked panels): P3 polish.
- In English mode, an email address is truncated on the wrong side in the customer card (P3).

STATUS: **PARTIAL**.

---

## 9. Admin

Captures: 22 routes in AR/EN at 1440/390 (`screens/admin-*`), plus real-catalogue services, rules and users (`evidence/L-admin-*`).

| Check | Result |
|---|---|
| Pagination / counts | Real catalogue: «عرض 1 - 20 من 38»; counts 38 / 37 / 32 |
| Filtering, create/edit | Screens render; create/edit not exercised in this pass |
| Data entry safety | The service editor allowed required select fields with no options, which caused DEF-D01 (code allows invalid config; P2 CODE) |
| Help guides admin | English UI in Arabic mode; raw category value `general` (DEF-A01, P2) |
| Rules page | Mojibake file-type labels in Arabic (`'Ù…Ù„Ù PDF'`, `AdminRuleManagementPage.jsx:290-300`, DEF-A02, P2). Currency shown "JOD 18.00" where public pages use «د.أ»; the column labelled «السعر الأساسي» ("base price") (P3) |
| Duplicate data source | Services and prices are editable both in `/admin/services` and in the `/admin/rules` "services and prices" tab (P3 UX; risk of conflicting edits) |
| English mode | Category/service names stay Arabic in admin tables (DEF-A03, P3) |
| Audit log / notifications | Raw codes (`mark_ready_for_delivery`, `notification_event_dispatched`, `provider_portal`, `success`, `sent`) (DEF-A04, P3) |
| Overview charts | Pie chart has no labels or legend; bar axis shows fractional counts (0.5, 1.5) and skips labels (DEF-A05, P3) |
| Debug records | Real catalogue copy: 3 `????` services, 3 `???` categories, active debug admins/providers (`admin-debug@…`, `provider-debug@…`), published `@khalisni.local` demo accounts incl. a superuser (DEF-D05; deployment gate) |

STATUS: **PARTIAL**.

---

## 10. Provider

Captures: dashboard, orders, order detail (`screens/provider-*`); the journey covered receipt, progress and final upload.
- Sees only assigned work (provider B gets 404, proven in earlier authorization runs).
- Internal notes hidden.
- The final-upload panel is clear, with the type preset to «النتيجة النهائية» ("final result").
- The customer's name shows as «غير متاح» ("not available"), matching the recommended TDL-06 answer. TDL-06 itself is undecided.
- Mobile width usable; no overflow.

STATUS: **PASS** for provider screens; the shared-shell defects in §5 apply.

---

## 11. Mobile app (Expo / React Native)

Evidence:
- `npm run typecheck` passes.
- A Node harness exercised the API client, form and status logic (`reports/mobile_harness_output.json`).
- **No screen was rendered.** Expo web needs `react-dom` and `react-native-web`, which aren't installed, and no device was available.
- Mobile is therefore never PASS here. Details: `reports/mobile_audit.md` (M-01..M-30).

| ID | Finding | Class | Sev |
|---|---|---|---|
| DEF-M01 | Logout and Profile are unreachable for every role (no navigation path) | CODE | P1 |
| DEF-M02 | No status timeline, so a rejected customer never sees the rejection reason | CODE/UI | P1 |
| DEF-M03 | The missing-document response asks the customer to type the internal document code; DOC/DOCX can't be picked | CODE/UI | P1 |
| DEF-M04 | The production build points at `https://api.example.com`; preview at `127.0.0.1` | DEPLOYMENT GATE / OWNER | P1 |
| DEF-M05 | No registration screen | OWNER DECISION | P1 |
| DEF-M06 | Orders and notifications read the first 20 only; dashboard counts are skewed | CODE | P2 |
| DEF-M07 | Document statuses and types shown as English codes | CONTENT | P2 |
| DEF-M08 | Network/timeout/500 errors shown as English axios text; no field-level server errors | CODE | P2 |
| DEF-M09 | Final download with an expired token saves the error body as the file | CODE | P2 |
| DEF-M10 | Brand spelled three ways; developer copy in customer UI (API URL, "JWT", "endpoint"); role shown as `client` | CONTENT | P3 |
| DEF-M11 | No tracking, rating, delivery date or notes; no safe-area handling (device check needed) | CODE/UI | P2 |

Web features missing or inconsistent on mobile:
- Missing: register, tracking, rating, manual/help, language switch (Arabic-only by decision), privacy page.
- Unreachable: profile, logout.
- Inconsistent: order detail, missing-documents, notifications.

Consistent (code):
- Consent capture.
- Idempotent submission.
- Provider hidden.
- Parcel/basin rule.
- Rejection reason in the document list.
- Secure token storage.

STATUS: **FAIL**.

---

## 12. Content quality

Full table C01–C28: `reports/data_audit.md`.

| ID | Surface | Text / problem | Class | Sev |
|---|---|---|---|---|
| DEF-D02 | Public service pages (27 quotation services) | «المدة المتوقعة: 1 يوم» placeholder next to «تُحدَّد مدة الإنجاز بعد مراجعة الطلب» | DATA | P2 |
| DEF-D03 | Fixed-price services | Fixed total shown with «يتم تأكيد الرسوم النهائية بعد مراجعة الوثائق» ("final fees are confirmed after document review") | DATA / OWNER (B10-10) | P2 |
| DEF-K01 | Server messages | English validation and workflow errors in the Arabic UI (runtime) | CODE | P2 |
| DEF-K02 | Help library | English-only guides first for every role; internal "How to Add Screenshots" guide published; 40 placeholder boxes «Screenshot required: …» visible to customers | CONTENT / OWNER | P2 |
| DEF-K03 | Real-catalogue forms in English mode | 311/311 fields have no English label ("Requested information N"); 76/153 documents lack English names | CONTENT | P2 |
| DEF-K04 | Related-service messages | English text in Arabic-only field | CONTENT / OWNER | P3 |
| DEF-K05 | Brand | خلصني vs خلّصني, Khalsni vs Khalisni across web/CMS/emails/mobile | OWNER DECISION | P3 |
| DEF-K06 | Grammar | "1 days", «من 1 إلى 3 يوم» (should be أيام), "1 available services", "Can not find" | CONTENT | P3 |
| DEF-K07 | Admin rules | Mojibake labels (DEF-A02) | CODE | P2 |
| DEF-K08 | Mobile | Developer copy and English statuses (DEF-M07/M10) | CONTENT | P2/P3 |
| DEF-K09 | Consent | Web and mobile consent texts differ; mobile refers to terms that don't exist | LEGAL CONTENT | P1 (with Terms) |

The shipped web code has no `????`, `lorem`, TODOs or `console.log`, and the AR/EN locale files match key for key.

---

## 13. Data quality (real 38-service catalogue, migrated copy)

Full table D01–D23 and raw queries: `reports/data_audit.md`, `data-audit/`.

**Composition:**
- 27 owner-imported services, 8 dev-seed services with invented fixed prices, 3 `????` debug services.
- 37 active; 33 flagged public; 32 actually served. `passport-renewal` sits in a hidden category and returns «تعذر تحميل الخدمة» ("couldn't load the service").
- **Every user, order, CMS row and ad in it is demo/debug data.**

| ID | Finding | Class | Sev |
|---|---|---|---|
| DEF-D01 | 9 business services have 17 required selects with no options, so they can't be submitted (browser-confirmed) | DATA (+ editor allows it) | **P1** |
| DEF-D04 | 8 fixed prices come from the dev seed and are unconfirmed; shown components sum to half the total | OWNER DECISION (B10-10) | P1 |
| DEF-D05 | Demo CMS row live (made-up address, unverified phone, `support@khalisni.local`, "Khalisni"), debug admins/providers active, `@khalisni.local` demo accounts incl. superuser can sign in; `audit_demo_accounts` misses `@example.com` | DATA / DEPLOYMENT GATE | P1 if this DB seeds production |
| DEF-D06 | «تفويض إن وجد» ("authorization, if any") required on 8 services; English document names are machine codes | OWNER (B10-9) | P2 |
| DEF-D07 | `request-land-survey` duplicates ID, land plan, POA, name and phone | DATA (B10-2) | P2 |
| DEF-D08 | 16 questions are single checkboxes but need a choice or text (e.g. «هل العقار أرض أم بناء؟», "is the property land or a building?") | DATA | P2 |
| DEF-D09 | Parcel/basin: only services 21/22 have the gate; 15 others always require both; consolidation has none | OWNER (B10-3) | P2 |
| DEF-D10 | National ID fields are all text (24) with no format; company-registration and trade-name numbers are still number fields | OWNER (OD-17) | P3 |
| DEF-D11 | Client's 8 categories (CN-ACT-04) not represented (Vehicles, International, Labour, Documents, Taxes & fees) | OWNER DECISION / DATA | P1 |
| DEF-D12 | Demo ads in the homepage API, one linking to the 404 passport page (latent: the web build doesn't render ads) | DATA | P3 |

---

## 14. Visual acceptance screenshots

- `screens/`: 232 PNGs named `role-page-language-width.png`. Roles: public, customer, employee, admin, provider; 1440 and 390; AR and EN.
- `evidence/`: journey (`J01`–`J19`), registration (`R01`–`R05`), error language (`E01`), real catalogue (`L-*`).

Inspected by eye: home AR 1440 and EN 390, fixed service AR 1440, customer waiting order AR 1440, missing-documents AR 390, completed order EN 1440, new-order wizard AR 390, employee order review AR 1440, admin overview AR 1440, admin help guides AR 1440, admin services and rules AR 1440, provider order detail AR 390.

Findings from that review are in §5–§10. The full-page captures of the wizard at 390 show the sticky header and footer bar over the content; this is a full-page-capture artefact, and the viewport journey at 390 worked.

---

## 15. Visual consistency scorecard (0–5)

| Area | Score | Why (scores below 4) |
|---|---|---|
| Brand consistency | 3 | Approved slogan not shown; brand spelled several ways (web/CMS/mobile/emails) |
| Navigation | 3 | Two items look active; hidden off-canvas links focusable; unauthorized route → public home |
| Typography | 4 | |
| Spacing | 3 | Empty card areas on home; dense staff order-review page |
| Forms | 2 | 9 business services blocked; raw DB-constraint message; English server errors; duplicate fields; checkbox-for-text questions |
| Tables | 3 | Raw `NORMAL` priority; Arabic names in English mode; raw audit codes |
| Cards | 4 | |
| Status presentation | 4 | |
| Mobile responsiveness | 3 | No overflow, but clipped EN eyebrow, 20 px targets, RTL break in order number; no real-device proof |
| RTL quality | 3 | English text inside Arabic screens (help admin, errors); bidi break |
| Accessibility | 3 | axe clean, but no focus management in panels, focusable hidden sidebar, no skip link |
| Error states | 2 | Server errors in English; raw constraint text |
| Empty states | 4 | |
| Content quality | 2 | Placeholder durations, contradictory fees, demo CMS data, English/placeholder help content |
| Overall SaaS polish | 3 | Public site premium; customer good; staff/admin dense and partly mixed-language |

---

## 16. Client-intent acceptance

Key: A exactly as requested · B different but later approved · C partial · D not implemented · E blocked by owner/client.

| Note | Expected | Actual | Difference | Accepted? |
|---|---|---|---|---|
| CN-ACT-02 light identity | Light, blue CTAs, never dark | As requested | — | A |
| CN-ACT-03 homepage order | Simple order, no duplicate sections | Categories appear twice (rail + rows) | Overlapping sections | C |
| CN-ACT-04 8 categories | Keep the 8 listed categories | Different category set | 5 categories missing | C / E |
| CN-ACT-05 search | Live suggestions + not-found option | As requested | — | A |
| CN-ACT-06 service intro | Docs, duration, price, CTA | Duration is a false 1-day placeholder on 27 services | Wrong data | C |
| CN-ACT-07 wizard | Skip service choice from a service | As requested | — | A |
| CN-ACT-08 upload | Status, preview, replace, delete | No preview/replace | Missing actions | C |
| CN-ACT-09 order status | «حالة طلبك الآن» + timeline | As requested (web) | Mobile has no timeline | A (web) |
| CN-ACT-10 customer action | Clear action button; pay now | Document action clear; payment removed | Payment out (B05) | B |
| CN-ACT-12 admin control | Manage without code | Present; allows invalid select config | Validation gap | C |
| CN-ACT-13 language purity | No mixing | Mixing on help/admin/errors/forms | Several surfaces | C |
| CN-ACT-14 real phone | Real device journey | Emulation only | Not executed | E (gate) |
| CN-VIS-04 slogan | Approved slogan in hero | CMS default headline shown | Slogan absent | D |
| CN-VIS-09 no dark | Light only | As requested | — | A |
| CN-VIS-10/15/20 polish | Fewer boxes, less spacing, premium | Public good; portal dense | Partial | C |
| CN-MAP-01 terms page | Terms & Conditions | None | Missing | D |
| CN-MAP-02 support messaging | Message support | None (contact form only) | Missing | D |
| CN-MAP-04 provider earnings | Rating/earnings view | None | Missing | D |
| CN-MAP-05 late alerts | Supervisor alert | None | Missing | D |
| CN-MAP-03/05 channels | SMS/WhatsApp/Email | In-app only | Scope | B |
| CN-OPS-02 provider on order | Provider name recorded/visible | Hidden from customer | B06 | B |
| CN-BIZ-01/04 repeaters | Repeatable groups | Not supported | Platform gap | D |
| CN-BIZ-00 service import | 27 services usable | 9 business services unusable | Data defect | C |
| D05 / D06 / B10-8/9/10 / brand | Owner values | Not supplied | — | E |
| TDL-01..15 | Recorded decisions | Code follows recommendations; nothing recorded | Governance | E |

**Answer to "Did we build what the client actually asked for?"**
- The core service-request product is there, and it works end to end through the UI.
- Most of the visual direction and the audit corrections are implemented.
- It does not yet match the client's intent in full:
  - the approved slogan;
  - the 8 categories;
  - the Terms page;
  - business-service ordering;
  - language purity;
  - several mobile parity gaps;
  - a set of explicit client asks with no out-of-scope record.

---

## 17. Workflow acceptance

Run through the UI on a fresh database, Arabic, 1366–1440 (journey) plus registration at AR 1440 and EN 390. Results: `evidence/REGISTER-results.json`, `JOURNEY-run2-results.json`, `JOURNEY2-results-KH-2026-000009.json`.

| Step | Result | Screenshot |
|---|---|---|
| Register (AR 1440, EN 390) → login → customer portal | PASS | `R01`–`R03` |
| Browse → service → «ابدأ الطلب» → wizard with service preselected | PASS | `R04`, `R05` |
| Submit (consent unchecked by default, double-click = 1 order, refresh = no extra) | PASS | `J01-customer-review-step`, `J01-customer-success` |
| Employee sees, starts review, requests missing document | PASS | `J02`, `J03` |
| Customer bell notice → opens missing-documents page | PASS | `J04-customer-bell` |
| Upload + resubmit → UNDER_REVIEW | PASS | `J06` |
| Employee verifies documents → readiness | PASS | `J07` |
| Employee assigns provider (readiness text shown first) | PASS | journey log |
| Provider receives, opens (internal note hidden), sets IN_PROGRESS | PASS | `J11` |
| Customer sees progress (no internal note, no provider name) | PASS | `J13` |
| Provider uploads final → READY_FOR_DELIVERY; customer can't see unapproved final | PASS | `J15` |
| Employee approves final, completes (confirm dialog) | PASS | `J16`, `J17b` |
| Customer completion notification, downloads final (bytes match) | PASS | `J18-customer-bell-completed`, `J19-customer-order-completed` |
| Re-login keeps COMPLETED; one order, no duplicate transitions/notifications | PASS | journey log |
| Same flow for a real-catalogue business service | **FAIL**: blocked at the details step (DEF-D01) | `L-business_company_registration-after-next.png` |

---

## 18. Accessibility

| Check | Result |
|---|---|
| axe (`a11y`, `axe-auth`, `p2-accessibility`) on 390/768/1024/1280/1440, fresh DB | **130 passed, 0 failed, 5 designed skips** (`logs/axe_5_viewports.summary.txt`) |
| Keyboard login (AR/EN, 1440/390) | PASS |
| Focus visibility | Every focused element in the walks had a visible ring |
| Focus order | Logical: header → content. Wizard: content first, then nav |
| Skip link | Missing (DEF-U04) |
| Focus traps / dialogs | Help panel and notification panel don't take or trap focus (DEF-U02); Escape behaviour couldn't be confirmed for the notification panel (not a dialog) |
| Hidden content | Closed off-canvas sidebar is focusable (DEF-U01) |
| Touch targets (390) | Inline text links exempt; 20 × 20 icon buttons below 24 px (DEF-U05) |
| Labels / aria names | Present; English "Khalsni home" in Arabic (DEF-U06) |
| Tables | DataTable region focusable (earlier pass) |
| RTL keyboard | Tab order follows RTL visual order in AR captures |
| Contrast | axe clean |

---

## 19. Final defect classification

No **P0** defects were found: no security hole or uncontrolled data loss was observed.

### OWNER DECISION (pending; written sign-off also missing for the 9 "decided" items)

| Item | Sev |
|---|---|
| B10-10 pricing model (visible contradiction) | P1 |
| CN-ACT-04 category set | P1 |
| D04 brand/domain | P2 |
| B10-8 meaning of "verified" | P2 |
| B10-9 document merges and «تفويض إن وجد» | P2 |
| B10-3 the other 15 land services | P2 |
| OD-16 `verification_note` visibility | P2 |
| OD-17 national-ID format | P3 |
| Mobile registration (DEF-M05) | P1 |
| Debug-service cleanup (B10-7a) | P3 |
| TDL-01..15 | P3 |
| Written confirmation of B05, F04, B04, B06, D02, B10-1/2/3/4/7, phone, B08 scope | P2 |

### LEGAL CONTENT

| Item | Sev |
|---|---|
| D06 privacy text and retention periods | P1 (before launch) |
| Terms & Conditions page and consent wording, incl. web/mobile mismatch (DEF-K09) | P1 |

### DEPLOYMENT GATE

| Item | Sev |
|---|---|
| Push and deploy the exact SHA | P1 |
| Database roles on production | P1 |
| Backups + restore drill | P1 |
| Phone normalization | P2 |
| SMTP (B04) | P1 |
| Real devices (B09, CN-ACT-14) | P1 |
| Deployed journey + authorization re-run | P1 |
| `check_public_content --strict` | P1 |
| F02 production recovery | P1 |
| Mobile API host (DEF-M04) | P1 |
| Clean demo/debug data before any production use (DEF-D05) | P1 |

### CODE DEFECT

| Item | Sev |
|---|---|
| DEF-M01 mobile logout/profile unreachable | P1 |
| DEF-M02 mobile timeline/rejection reason | P1 |
| DEF-M03 mobile missing-document code entry | P1 |
| DEF-K01 English server errors | P2 |
| DEF-C06 blank national ID erases profile value | P2 |
| DEF-C07 raw constraint message | P2 |
| B10-3 server-side required-if missing | P2 |
| Service editor allows required selects without options | P2 |
| DEF-M06..M09, M11 | P2 |
| DEF-C05 bell first 20 | P3 |

### UI DEFECT

| Item | Sev |
|---|---|
| DEF-U01 hidden sidebar focusable | P2 |
| DEF-U02 panel focus | P2 |
| DEF-E01 raw `NORMAL` | P2 |
| DEF-A01 help-guides admin English | P2 |
| DEF-A02 mojibake | P2 |
| DEF-C01 duplicated banners / three upload paths | P2 |
| CN-VIS-04 slogan overridden by CMS default | P2 |
| DEF-U03 double active nav | P3 |
| DEF-U04 skip link | P3 |
| DEF-U05 20 px targets | P3 |
| DEF-U07 unauthorized redirect | P3 |
| DEF-P01 clipped eyebrow | P3 |
| DEF-P02 empty areas | P3 |
| DEF-C02 bidi order number | P3 |
| DEF-C04 timeline filler | P3 |
| DEF-A03 Arabic names in EN tables | P3 |
| DEF-A04 raw audit codes | P3 |
| DEF-A05 charts | P3 |
| U04 contact phone example | P3 |
| Duplicate service/price editors | P3 |

### DATA DEFECT

| Item | Sev |
|---|---|
| DEF-D01 business services unsubmittable | **P1** |
| DEF-D02 placeholder durations | P2 |
| DEF-D03 fixed price + "confirmed after review" | P2 |
| DEF-D07 duplicate land-survey fields | P2 |
| DEF-D08 checkbox questions | P2 |
| DEF-K03 missing English labels | P2 |
| DEF-K02 help placeholders | P2 |
| DEF-D12 demo ads | P3 |
| DEF-K06 grammar | P3 |

---

## 20. Required summary

```
TOTAL CLIENT REQUIREMENTS: 189
PASS: 82
PARTIAL: 63
FAIL: 6
BLOCKED: 30
NOT_APPLICABLE: 8

ORIGINAL 26:
CLOSED: 15
OPEN: 3
BLOCKED: 6
NOT_APPLICABLE: 2

UI ACCEPTANCE:
PUBLIC: PARTIAL
CUSTOMER: PARTIAL
EMPLOYEE: PARTIAL
ADMIN: PARTIAL
PROVIDER: PASS (provider screens; shared-shell defects apply)
MOBILE: FAIL
```

## 21. Final verdict

**CLIENT REQUIREMENTS & UI ACCEPTANCE PARTIAL**

Every client requirement found is accounted for and traced, and every deviation is explained above. The bar for PASS is not met:
- P1 defects exist: business-service ordering, three mobile gaps, the Terms page, the category set, pricing.
- Some UI does not match approved client intent (slogan, language purity).
- Mobile is not consistent with web.
- Content on the real catalogue is not production-appropriate.

This report does not state deployment readiness.
