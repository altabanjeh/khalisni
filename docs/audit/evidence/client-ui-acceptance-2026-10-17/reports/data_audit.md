# Khalsni data and content quality audit (read-only)

Date: 2026-10-17 · HEAD `f396575` (main) · Auditor: Claude (read-only pass)

Evidence folder: `C:\Users\LENOVO\AppData\Local\Temp\claude\d--ghassan\dc81cbcb-b135-455f-8bd2-a381931b3af1\scratchpad\data_audit\` (all files named below are in it). Scripts: `...\scratchpad\scripts\`.

Nothing in the repository was changed. `backend/db.sqlite3` was only copied. Its SHA-256 is `a44e30e4…7e949ae` before and after the audit (`00_source_hash.txt`). The untracked items in `git status` (`docs/audit/evidence/client-ui-acceptance-2026-10-17/` and `frontend/e2e/zz-acceptance-shots.spec.js`) were not created by this audit.

---

## 0. Which database was audited, and why

| Candidate | Services | Migrations | Verdict |
|---|---|---|---|
| `backend/db.sqlite3` (user dev DB) | **38 (37 active)** | 99 (behind HEAD) | **Used, as a migrated copy** |
| `backend/db.sqlite3.bak-20260907-145024` | 38 | 99 | Older byte-level twin |
| `frontend/e2e-results/client_audit_snapshot_copy.sqlite3` | 38 | 108 | Same catalogue, partly migrated |
| `frontend/e2e-results/e2e_db.sqlite3` | 7 | 115 | seed_demo data. Rejected |
| `e2e_final_*`, `e2e_postdeploy_local`, `final_closure_20261004` | 1 (`client-audit-qa-202610-service`) | 108 | QA seed. Rejected |

The previous gates describe their source like this:
- `KHALSNI_P2_OBJECTIVE_REMEDIATION_REPORT.md:11`: "Q / Q2: a migrated *copy* of the legacy `backend/db.sqlite3` (38 services…)".
- Owner-decisions environment **S**, then **T** (`KHALSNI_FINAL_PRE_RELEASE_HARDENING.md:14`) and the release closure (`KHALSNI_FINAL_RELEASE_CLOSURE.md:6`): each is a copy of that same legacy DB.

I copied `backend/db.sqlite3` to `data_audit/legacy_copy.sqlite3` and ran `manage.py migrate` against the copy (`DJANGO_SQLITE_NAME`). The copy now runs up to `services.0015_national_id_fields_as_text`, which is HEAD (`01_migrate.txt`).

**Key provenance fact:** this "real" catalogue is a mix of three things:
- 27 services imported from the owner's source documents (`backend/service-import-source/*.docx`, ids 12–38).
- 8 early dev-seed services with invented fixed prices and boilerplate descriptions (ids 1–3, 7–11).
- 3 debug services named `????` (ids 4–6).

Every user, order, notification and CMS row in it is demo, debug or guest data. **No real customer data exists in this DB** (§B-data).

---

## A. Catalogue (migrated legacy copy)

### A1. Counts
Sources: `10_catalogue_dump.txt` (SUMMARY) and `20_public_api_probe.txt`.

| Measure | Count |
|---|---|
| Services total | 38 (none soft-deleted) |
| `is_active` | 37 active / 1 inactive (`request-zoning-certificate`) |
| `show_on_public_site` | 33 public / 5 hidden |
| **Actually served by the public API** `/api/services/` | **32**. `passport-renewal` is active and public, but its category `civil-status` (id 1) has `show_on_public_site=0`, so it returns 404 |
| Price type | 11 `fixed`, 27 `quotation` |
| Categories | 13 total: 7 shown publicly, 3 debug (`???`), 2 hidden legacy duplicates, plus `social-security` (public but 0 services) |

**Per category (customer-visible / total):**

| Category | Visible | Total |
|---|---|---|
| العقارات والأراضي (land-and-survey) | 18 | 19 |
| خدمات الأعمال والشركات (business_services) | 9 | 9 |
| الأحوال المدنية والجوازات (civil-status-and-passports) | 1 | 1 |
| الأحوال المدنية والجوازات (civil-status, hidden category) | 0 | 2 |
| ضريبة الدخل والمبيعات | 1 | 1 |
| الخدمات البلدية | 1 | 1 |
| وزارة العمل | 1 | 1 |
| خدمات عامة سريعة | 1 | 1 |
| ??? (category-debug 1–3) | 0 | 3 |

### A2. Per-service table

Durations are in days. "Shown" means the parts the public API exposes. Base price is never shown.

| id | slug | name_ar / name_en | category | act/pub | price (type: base+gov+fee = total) | shown on public page | duration | parcel gate |
|---|---|---|---|---|---|---|---|---|
| 1 | no-criminal-record | شهادة عدم محكومية / No Criminal Record | civil-status (hidden) | 1/0 | fixed 0+5+12=17 | hidden | 2 | – |
| 2 | passport-renewal | تجديد جواز سفر / Passport Renewal | civil-status (hidden cat) | 1/1 → 404 | fixed **32+20+12=64** | total 64, gov 20, fee 12 (**components sum 32**) | 2–4 | – |
| 3 | tax-clearance | براءة ذمة ضريبية / Tax Clearance | tax | 1/1 | fixed 18+7+11=36 | 36 / 7 / 11 (sum 18) | 4–6 | – |
| 4–6 | service-debug(-2,-3) | `????` / Service | category-debug (`???`) | 1/0 | fixed 10+5+5=20 | hidden | 3 | – |
| 7 | no-criminal-record-certificate | شهادة عدم محكومية / No Criminal Record Certificate | **ministry-of-labour** | 1/1 | fixed 15+5+10=30 | 30 / 5 / 10 (sum 15) | 7–9 | – |
| 8 | passport-appointment-booking | حجز موعد جواز سفر | civil-status-and-passports | 1/1 | fixed 8+3+5=16 | 16 / 3 / 5 (sum 8) | 1–3 | – |
| 9 | traffic-fines-payment | دفع مخالفات السير | quick-public-services | 1/1 | fixed 6+0+6=12 | 12 / 0 / 6 (sum 6) | 3–5 | – |
| 10 | property-registration-deed | إصدار سند تسجيل عقار | land-and-survey | 1/1 | fixed 28+12+16=56 | 56 / 12 / 16 (sum 28) | 6–8 | none (no parcel fields) |
| 11 | business-license-renewal | تجديد رخصة مهن | municipal-services | 1/1 | fixed 24+9+15=48 | 48 / 9 / 15 (sum 24) | 5–7 | – |
| 12–20 | business_* (9 services) | طلب تأسيس شركة … طلب إغلاق أو تصفية شركة | business_services | 1/1 | quotation 0 | "يتم تأكيد الرسوم النهائية بعد مراجعة الوثائق." | **"1 يوم"** placeholder | – |
| 21 | request-property-registration-certificate | طلب سند تسجيل | land | 1/1 | quotation | note | "1 يوم" | **yes/no gate** |
| 22 | request-cadastral-map | طلب مخطط أراضٍ | land | 1/1 | quotation | note | "1 يوم" | **yes/no gate** |
| 23–27, 29–31, 33–38 | 14 land services | (see dump) | land | 1/1 | quotation | note | "1 يوم" | **no gate: parcel and basin always required** |
| 28 | request-property-consolidation | طلب توحيد عقار | land | 1/1 | quotation | note | "1 يوم" | no parcel fields |
| 32 | request-zoning-certificate | طلب كشف تنظيم | land | **0/0** | quotation | – | "1 يوم" | no gate (inactive) |

The full per-service dump is in `10_catalogue_dump.txt`: notes, description excerpts, every document and every field.

### A3. Pricing

- **The shown parts never add up to the total.** On all 7 visible fixed-price services (plus the hidden `passport-renewal`), the public page shows "السعر الظاهر" (total), "رسوم حكومية" and "رسوم خدمة". The serializer computes total = base + gov + fee (`services/serializers.py:43-57`) and never exposes the base price. The total is therefore exactly **twice** the visible parts on every one: 64 vs 20+12, 36 vs 7+11, 30 vs 5+10, 16 vs 3+5, 12 vs 0+6, 56 vs 12+16, 48 vs 9+15.
- These 8 fixed prices (base, gov and fee) come from the early dev seed, not from the owner's source documents. Their descriptions repeat the seed boilerplate "تشمل الخدمة مراجعة أولية للوثائق، إشعارات حالة الطلب، وتسليم النتيجة النهائية عبر النظام" (7×).
- Every fixed-price service also carries the note "يتم تأكيد الرسوم النهائية بعد مراجعة الوثائق." A fixed price plus "final fees confirmed later" is a mixed message (34 of 38 rows carry this note, 4 are blank).
- The label "السعر الظاهر" / "Public price" (`ServiceDetailsPage.jsx:79`) is internal wording.

### A4. Durations

- **All 27 quotation services show "المدة المتوقعة: 1 يوم" / "Expected completion: 1 days".** 1 is the importer's numeric fallback (`service_import.py:848`), and the same card shows "تُحدَّد مدة الإنجاز بعد مراجعة الطلب." or "حسب إجراءات دائرة الأراضي…" (`21_service_detail_samples.txt`). The page promises one day and says "decided later" at the same time.
- Grammar in `services/models.py:365,398-416`:
  - Arabic uses the singular يوم for any number ("من 1 إلى 3 يوم", "7 إلى 9 يوم").
  - English is always plural ("1 days").
- The delivery note "سيتم إشعارك عند كل تحديث مهم على الطلب." (7 seed services) is not about time at all.
- `delivery_note_en` is empty on 22 services.

### A5. Required documents

These checks run on the documents in `11_field_doc_analysis.txt` §C–E and `10_catalogue_dump.txt` §FLAGS.

- **Conditional documents marked mandatory.** "تفويض إن وجد" ("authorization, if any") is `is_required=1` on all 8 seed services (req 2,4,6,8,10,12,14,16). The customer must upload a document that by its own name may not exist. The same rows use **machine codes as the English name**: `national-id`, `authorization-letter` (16 rows). The definitions are def1/def2, and their `name_en` also holds the code.
- **Unresolved "if any" definitions** stored as separate definitions are not deduplicated:
  - def28 "وكالة قانونية (إن وجدت)" vs def65 "وكالة قانونية إن وجدت"
  - def60 "مخطط أراضٍ" vs def64 "مخطط أراضٍ إن وجد"
  - def63 "الهوية" vs def49 "صورة الهوية"
- **Duplicates inside one public service.** `request-land-survey` asks for:
  - الهوية + صورة الهوية (both required)
  - مخطط أراضٍ إن وجد + مخطط أراضٍ (إن وجد)
  - وكالة قانونية إن وجدت + وكالة قانونية (إن وجدت)
- **Missing English names.** 76 of 153 document rows have an empty `name_en`, and 59 of 69 definitions do (all `document_<hash>` codes). In English mode these render as "Required document" (`serviceForms.js:77`).
- **Catch-all items** "أي وثائق/مستندات إضافية تطلبها الجهة المختصة" appear as optional uploads on 15 services. "أي بيانات تساعد في تحديد العقار" is a **required** upload on services 21 and 22. Both are open-ended and not real documents.

### A6. Dynamic fields

The 27 imported services have 311 fields in total; the 11 seed and debug services have an **empty schema**. Field types:

| text | checkbox | textarea | select | tel | number |
|---|---|---|---|---|---|
| 153 | 75 | 33 | 20 | 17 | 13 |

Sources: `11_field_doc_analysis.txt` and `12_raw_field_samples.txt`.

- **P1: required dropdowns with no options.** 17 `select` fields have `options: []`; the source said "Dropdown" but no list was imported. Examples: `company_type` (required) on 4 services, plus `entity_type`, `certificate_copy_type`, `applicant_type`, `business_activity`, `trademark_service_type`, `trademark_owner_type`, `trademark_class`, `business_license_action`, `business_activity_type`, `municipality`, `occupancy_status` and `closure_or_liquidation_type`. These sit on **all 9 business services**.
  - The web wizard renders a `<select>` holding only "اختر القيمة" (`DynamicServiceFields.jsx:38-46`) and validates `required`. **A customer cannot complete any of the 9 business services on the web.**
  - The `required` flags were confirmed in data (e.g. `company_type required:true options:[]`). I traced the code path but did not click through in a browser.
- **Questions rendered as a single checkbox.** 74 checkbox fields have a question label. Of these:
  - 6 are either/or questions, e.g. "هل الطلب للمالك أم لمفوض عنه؟", "هل العقار أرض أم بناء؟", "هل الرهن لصالح بنك أم جهة أخرى؟". A checkbox cannot answer them.
  - 10 are open questions, e.g. "ما الغاية من الكشف المساحي؟", "ما اسم الجهة المرتهنة؟", "ما صفة التنظيم المطلوبة؟". These need text.
  - 58 are yes/no questions, where unchecked silently means "no".
- **Duplicate fields:**
  - `request-land-survey`: الاسم + اسم مقدم الطلب; الهاتف + رقم الهاتف; سبب الكشف + سبب طلب الكشف (all required).
  - `request-property-readjustment` and `request-land-use-classification-change`: الاسم الكامل + اسم مقدم الطلب.
  - Services 26 and 27: "عدد الشركاء" + "كم عدد الشركاء؟", and "عدد القطع…" + "كم عدد القطع…؟".
- **English labels.** No field has a `label_en` (311 of 311). In English mode every label falls back to "Requested information N" (`serviceForms.js:105-108`).
- **97 generated keys** (`field_<hex>`) appear in stored order answers.
- **Notes fields** are all optional after B10-4, as expected (no "ملاحظ" field is required).
- **National ID fields.** 24 fields in total:
  - 23 are `text` and 1 is `textarea` (`partner_id`, "الرقم الوطني / رقم الجواز للشريك", one value per partner).
  - No `number` type remains (0015 applied). No format rule exists, which is an owner decision.
  - The "number" types left (13) are counts, capital and registration numbers. `company_registration_number` and `trade_name_number` are identifiers stored as `number` (leading zeros and spinner risk, same reasoning as 0015).

### A7. Parcel/basin rule (B10-1/2/3)

- **2 services have the yes/no gate:** 21 `request-property-registration-certificate` and 22 `request-cadastral-map`. The question "هل تعرف رقم القطعة والحوض؟" is a yes/no select; parcel and basin are `text`, required only when the answer is "yes".
- **The remaining 15 land services have parcel_number and basin_number always required, with no gate:** 23, 24, 25, 26, 27, 29, 30, 31, 32 (inactive), 33, 34, 35, 36, 37, 38. That is 14 visible + 1 inactive. They are already `text`, so leading zeros are kept.
- `request-property-consolidation` (28) has no parcel fields at all, even though it consolidates several parcels. Its document "سندات تسجيل جميع القطع" has no `name_en`.
- **The open owner decision on "the remaining 15 land services" stands.** A customer who does not know the numbers cannot submit 14 public land services.

### A8. Related services (ServiceRelation)

There are 2 relations, both on `business-license-renewal`, and both `message_to_customer` values are **English text in an Arabic-only field** (`22_relation_messages_public.txt`):
- rel1 → `no-criminal-record-certificate` (recommended_after): "After renewing the business license, you may also need an updated no-criminal-record certificate."
- rel2 → `traffic-fines-payment` (optional_bundle): "Many clients also clear related traffic obligations during the same renewal cycle."

The public detail API returns both under `recommended_services`. The current web page renders `message_to_customer` only for prerequisites (`ServiceDetailsPage.jsx:401`), so this is latent on the web but exposed through the API and to any client that uses it. The other "related" cards on land and business services are computed, not stored relations.

---

## B. Content quality across surfaces

### B1. Brand spelling, counted by surface

Source: `40_brand_counts.txt`. Counts are case-sensitive display forms; tests, node_modules, dist and evidence are excluded.

| Surface | Khalsni | Khalisni | Khalasni | KHALSNI | خلّصني | خلصني | files |
|---|---|---|---|---|---|---|---|
| Public web UI | 53 | 0 | 0 | 4 | **0** | 23 | 17 |
| Portal web UI | 11 | 0 | 0 | 0 | 0 | 5 | 8 |
| Emails (reset/changed templates + subjects) | 6 | 0 | 0 | 0 | **6** | 0 | 5 |
| Backend defaults/other code | 10 | 2 | 0 | 2 | 0 | 1 | 10 |
| Mobile app | 5 | **1** | 0 | 0 | 1 | 1 | 5 |
| Docs (excl. evidence) | 165 | 16 | 2 | 200 | 6 | 65 | 85 |
| Root manuals/prompts | 48 | 8 | 0 | 2 | 8 | 1 | 7 |
| **DB data (live CMS, catalogue)** | 0 | **8** | 0 | 0 | **13** | 2 | – |

Observations:
- Latin script: the code has standardised on **Khalsni**. The **live CMS row and theme still say "Khalisni"**: the English footer, `office_address_en` ("Khalisni Services Building"), `version_name` and theme names, and help guide 34's text. Mobile `ClientDashboardScreen.tsx:125` says "Khalisni / خلصني" while `LoginScreen.tsx:33` says "Khalsni / خلّصني".
- Arabic script: the **web UI writes خلصني**, while **emails and catalogue descriptions write خلّصني** (with shadda).
- Identifiers still say `khalisni` (storage keys, events, `@khalisni.local` seed and guest emails, `DEFAULT_FROM_EMAIL`). Customers don't see them, but they are inconsistent.
- Docs use 5 spellings. The root files `Khalasni_*.pdf/docx`, `Khalisni_User_Manual*` and `khalesni_system_flow.pdf` use 4.

### B2. Content-defect table

Classes: OWNER DECISION, LEGAL CONTENT, CONTENT, DATA DEFECT, CODE. Severity runs P0 (blocker) to P3 (polish).

| ID | Surface | Where | Text / evidence | Problem | Class | Sev |
|---|---|---|---|---|---|---|
| C01 | Public service page + web wizard (9 business services) | `services_service.required_information_schema`; `DynamicServiceFields.jsx:38-46` | `company_type` "نوع الشركة" required, `options: []` (+16 more selects) | A required dropdown with no choices blocks order submission | DATA DEFECT (owner supplies lists) | **P1** |
| C02 | Public service page (6 fixed services) | API `pricing`; `ServiceDetailsPage.jsx:76-87`; `serializers.py:43-57` | "السعر الظاهر 16 · رسوم حكومية 3 · رسوم خدمة 5" | Shown parts sum to half the total; the hidden base price is not explained | OWNER DECISION (show base / relabel) + CODE | **P1** |
| C03 | Public service cards/detail (27 services) | `models.py:415-416`; `estimated_duration=1` | "المدة المتوقعة: 1 يوم" next to "تُحدَّد مدة الإنجاز بعد مراجعة الطلب." | Placeholder duration shown as a promise; contradicts the note | DATA DEFECT / CODE (hide when unknown) | **P1** |
| C04 | Public footer (all public pages) | `public_site_publicpagecontent` row 2; `PublicLayout.jsx:77-78,237-240` | "عمان - الشميساني، شارع الملكة نور، مبنى خلصني للخدمات"; phone "+962 6 560 9000"; footer_en "Khalisni is…" | Demo or unverified address and phone, old brand spelling; `check_public_content` flags it for the owner | OWNER DECISION | **P1** |
| C05 | Privacy page | `PrivacyPolicyPage.jsx:10-23`; CMS `privacy_policy_ar/en` empty | 4 built-in generic principles | No approved policy (D06) | LEGAL CONTENT | **P1** |
| C06 | Order consent (web vs mobile) | `frontend/src/utils/orderConsent.js:7-10`; `mobile/src/utils/orderConsent.ts:7`; mobile `CreateOrderScreen.tsx:105` | web: "…بياناتي ومستنداتي لإنجاز هذه الخدمة فقط، وإشعاري بأي نواقص." / mobile: "…بياناتي ووثائقي لأغراض تنفيذ الخدمة فقط." Mobile error: "يجب الموافقة على **الشروط**" | Two different consent statements; mobile refers to terms that don't exist; no Terms page | LEGAL CONTENT | **P1** |
| C07 | Required docs (8 seed services, 7 public) | `services_servicerequireddocument` req 2…16 | "تفويض إن وجد" `is_required=1` | "If any" document made mandatory | DATA DEFECT / OWNER DECISION | P2 |
| C08 | Help panel (customer, provider, employee) | `help_guides_helpguidescreenshot` 40 rows; `HelpGuidePanel.jsx:115-123` | Amber box "Screenshot required: لوحة العميل", caption "لوحة العميل screenshot", "الخطوة: overview" | Placeholder screenshots shown to end users, mixed English in an Arabic UI | CONTENT (+CODE: hide placeholders for non-admins) | P2 |
| C09 | Help library | migration `help_guides/0004_manual_guide_library.py`; guides 34, 35, 36 | "How to Navigate the System", "Login and Account Access" (all roles; the first 2 quick links for every role); "How to Add Screenshots to the Manual" (admin, marked "Internal instructions") | English-only guides in an Arabic product; an internal how-to published as a quick link | CONTENT | P2 |
| C10 | Admin UI (Arabic mode) | `frontend/src/pages/admin/AdminRuleManagementPage.jsx:290-300` | `'Ù…Ù„Ù PDF'`, `'ØµÙˆØ±Ø© JPG'`, `'ØºÙŠØ± Ù…Ø­Ø¯Ø¯'` | **Mojibake** (double-encoded UTF-8) in Arabic file-type labels and in "Not set" | CODE | P2 |
| C11 | Public detail API (and any client) | `services_servicerelation` rel1, rel2 | "After renewing the business license, you may also need…" | English in an Arabic-only customer message | CONTENT | P3 (latent on web) |
| C12 | Public API `/public-site/homepage/` | `public_site_advertisement` 1–5 | "تنبيه تجريبي: جهز وثائقك قبل الطلب", "متابعة فورية للطلبات التجريبية", "جرب طلب خدمة غير موجودة"; ad 2 button → `/services/passport-renewal` (404) | Demo ads are `is_currently_public=true`; one links to a hidden service. The current web build doesn't render ads (latent) | DATA DEFECT | P2 |
| C13 | Public service cards | `models.py:365,398-399,415` | "من 1 إلى 3 يوم", "Expected completion: 1 days" | Arabic number agreement (أيام), English plural | CODE | P2 |
| C14 | Public service detail (English mode) | 30/38 `description_en` empty; 311/311 field `label_en` empty; 76 of 153 doc `name_en` empty | "Service details are being prepared.", "Requested information 1…14", "Required document" | The English UI is mostly placeholders | CONTENT / OWNER DECISION (is English in scope?) | P2 |
| C15 | Public service page | `ServiceDetailsPage.jsx:79` | "السعر الظاهر" / "Public price" | Internal term on a customer screen | CONTENT | P3 |
| C16 | Public service page (7 seed services) | `description_ar` | "تشمل الخدمة مراجعة أولية للوثائق، إشعارات حالة الطلب، وتسليم النتيجة النهائية عبر النظام." (7×); business: "يقوم فريق خلّصني بمراجعة…" (9×) | Duplicate boilerplate sentences | CONTENT | P3 |
| C17 | Public service page | `delivery_note_ar` (7 rows) | "سيتم إشعارك عند كل تحديث مهم على الطلب." shown as the duration note | Wrong field for the sentence | CONTENT | P3 |
| C18 | Docs on required documents (English mode) | def1/def2 + 16 rows | name_en = `national-id`, `authorization-letter` | Machine codes as English names | DATA DEFECT | P3 |
| C19 | Brand (public + mobile + email + CMS) | §B1 | Khalsni/Khalisni; خلصني/خلّصني | Inconsistent brand spelling; the live CMS still says "Khalisni" | OWNER DECISION (approve one form per script) + CONTENT | P2 |
| C20 | Mobile client dashboard | `mobile/src/features/client/screens/ClientDashboardScreen.tsx:125` | "Khalisni / خلصني" (login screen says "Khalsni / خلّصني") | Two spellings inside one app | CONTENT | P3 |
| C21 | Admin help-guide manager | `HelpGuideManagementPage.jsx:241-340` (about 150 strings) | 'Title', 'Placeholder label', 'Internal notes', 'Show as quick link'… | English-only form and table labels in the Arabic admin | CODE | P3 |
| C22 | Admin service editor | `ServicesManagementPage.jsx:343` | placeholder "Passport number" | English-only placeholder | CODE | P3 |
| C23 | Inactive service text | `request-zoning-certificate.description_ar` | "…تم الإبقاء على هذه الخدمة في النظام لحين المراجعة النهائية والتأكد من عدم تداخلها مع خدمة طلب مخطط موقع تنظيمي." | Internal note inside a customer description (shows if reactivated) | CONTENT | P3 |
| C24 | Help API labels | `help_guides/screen_registry.py` (`screen_label` "Customer Dashboard") | English screen labels in the help payload | Mixed language if rendered | CODE | P3 |
| C25 | In-app notifications (stored title) | `notifications/services.py:57-79,163`; `notifications_notificationtemplate` = **0 rows** | 13/17 legacy titles English ("Order received", "New assigned order"); new rows store the English fallback in `title`/`message`, Arabic only in `context_data.localized` | No approved templates exist; admin lists and exports show English; Arabic depends on the localized render | OWNER DECISION (templates) / CODE | P3 |
| C26 | Mock and test data in the shipped bundle | `frontend/src/api/services.js:78-140` (mojibake mock users, `@khalisni.local`), `utils/mockData.js` | Used only when `MODE==='test'` | Dead mojibake and demo emails ship in the source | CODE | P3 |
| C27 | Sender email | `config/settings.py:365` | `no-reply@khalisni.local` (reserved domain) | Mail cannot be delivered (D05, still open on env) | OWNER DECISION (env) | P2 |
| C28 | Docs/manuals | `docs/**`, root `Khalasni_*`, `Khalisni_User_Manual*`, `khalesni_system_flow.pdf` | 5 brand spellings | Customer-facing manuals inconsistent with the product | CONTENT | P3 |

Not found in the shipped code or locales: `'???'` literals, TODO/FIXME, lorem ipsum, `console.log`, English values in `ar.json` (`51_locales_check.txt`: 177/177 keys match, only `language.en='English'`). Note: the first `???` grep in `50_frontend_mobile_scan.txt` was an invalid regex. Re-run with `-F` it gives 0 hits.

### B3. Data-defect table

| ID | Table / row | Evidence | Problem | Class | Sev |
|---|---|---|---|---|---|
| D01 | `services_service` 4,5,6 + `services_servicecategory` 5,6,7 | name_ar `????`, desc `???`, slug `service-debug*`, category `???`; all `is_active=1` | Debug catalogue rows (mojibake names) appear in admin service and category lists and in the rules screen (prior pass: 3 services named `????`) | DATA DEFECT | P2 |
| D02 | `accounts_customuser` 5–8, 10, 11, 13 | `admin-debug@example.com`, `admin-debug-2@…`, `admin-debug-3@…` (role admin, active), `provider-debug(-2,-3)@example.com`, `audit-login@example.com` | Debug and QA accounts are active and listed in admin users; 3 are admins. `audit_demo_accounts` covers only `@khalisni.local` and **misses these** | DATA DEFECT (+CODE: widen the audit) | **P1** before any data carry-over |
| D03 | `accounts_customuser` 1–4 | `admin@ / customer@ / provider@ / employee@khalisni.local`, published passwords still work (`70_builtin_audit_commands.txt`) | Published demo accounts can sign in (admin is a superuser) | DATA DEFECT | **P1** (env) |
| D04 | `providers_providerprofile` 2,3,4 | `provider_type='Tester'`, `is_approved=1`, `is_available=1` | Test providers are approved and assignable | DATA DEFECT | P2 |
| D05 | `providers_providerprofile_service_categories` | provider 1 (`provider@khalisni.local`) linked only to categories 5,6,7 (`???`) | The demo provider is mapped to debug categories | DATA DEFECT | P3 |
| D06 | `orders_order` 1–6 | KH-2026-000001…4 (demo customer, on seed services 1, 2 (both not publicly reachable) and 3), 000005/000006 on `service-debug-2/3` with guest customers `0799100003@ and 0799200003@guest.khalisni.local`; `check_system_consistency`: 000002/000003 lack required docs | Stale demo and debug orders in admin queues | DATA DEFECT | P2 |
| D07 | `public_site_publicpagecontent` 2 (active) | version "Khalisni Public Demo Homepage"; email `support@khalisni.local`; WhatsApp `+962 79 000 0000`; privacy empty | Demo CMS row is live | OWNER DECISION | P1 (same as C04/C05) |
| D08 | `public_site_advertisement` 1–5 | demo ads active, no end date | see C12 | DATA DEFECT | P2 |
| D09 | `public_site_sitetheme` 1,2 | "Default Khalisni Theme", **active: "Khalisni Public Demo Theme"** | Demo theme name live | CONTENT | P3 |
| D10 | `public_site_missingservicerequest` 1 + `notifications_notification` 14–17 | "Demo unlisted service" / "Demo public page request verification"; notifications sent to debug admins | QA record in the support queue | DATA DEFECT | P3 |
| D11 | `orders_orderstatuslog` / `orderassignmenthistory` | notes `wait`, `start`, `review`, `assign`, "Order under review", "Provider completed work and uploaded final result" | Debug and English notes on order timelines (customer-visible on tracking if surfaced) | DATA DEFECT | P3 |
| D12 | `services_service` 1 vs 7 | both "شهادة عدم محكومية"; 1 hidden with 2 orders, 7 public | Duplicate service | OWNER DECISION | P3 |
| D13 | `services_service` 7 | no-criminal-record-certificate in **وزارة العمل** | Miscategorised (not a labour-ministry service) | OWNER DECISION | P3 |
| D14 | `services_servicecategory` 1/8, 4/12 | "الأحوال المدنية والجوازات" ×2 (civil-status hidden, civil-status-and-passports public); "الخدمات العامة السريعة" vs "خدمات عامة سريعة" | Duplicate categories; `passport-renewal` is stranded in the hidden one (active+public flag → 404) | DATA DEFECT / OWNER DECISION | P2 |
| D15 | `services_service` 1–3, 7–11 | Fixed prices 12–64 JOD, durations 1–9 days from the dev seed; no import source | Unverified prices and durations are live | OWNER DECISION | **P1** |
| D16 | land services 23–27, 29–38 | parcel/basin required, no gate | §A7, open decision | OWNER DECISION | P2 |
| D17 | `services_service` 12–38 | `estimated_duration=1` fallback | §A4 / C03 | DATA DEFECT | P1 (same as C03) |
| D18 | schema: 6 either/or + 10 open questions as `checkbox`; 5 duplicate-field groups; 17 empty selects | `11_field_doc_analysis.txt` | Unanswerable or misleading form controls | DATA DEFECT | P1 (selects) / P2 (others) |
| D19 | `services_servicerequireddocument` land-survey 107/108, 110/111, 112/113; definitions 28/65, 60/64, 49/63 | duplicates | Customer asked for the same document twice | DATA DEFECT | P2 |
| D20 | `services_service` `terms_ar` empty on 13; `short_description_en` 30 empty; `public_price_note_*` empty on 4 | `13_catalogue_text_qa.txt` | Gaps | CONTENT | P3 |
| D21 | `notifications_notificationtemplate` | 0 rows | No approved notification templates; only in-app (SYSTEM) notifications, no email or SMS for order events | OWNER DECISION | P3 |
| D22 | `organizations_organization` 1 | name "Platform Owner", no legal name, tax or CR number | Placeholder organization | OWNER DECISION | P3 |
| D23 | `frontend/e2e-results/*.sqlite3` | QA users `client-audit-qa-202610-*@example.test`, service "خدمة اختبار رحلة الطلب" | Stale QA DBs on disk (git-ignored, not tracked: verified) | hygiene | P3 |

### B4. Tool gaps found while auditing
- `audit_public_catalog_locale` reports `{"findings": [], "count": 0}` on this catalogue. It misses the English relation messages, the code-like `name_en` values and the empty dropdowns.
- `audit_demo_accounts` checks only `@khalisni.local`, so it misses the 7 `@example.com` debug and QA accounts.

---

## Recommended handling (short)
1. **Before release (P1):**
   - Owner supplies the dropdown lists for the business services (C01), or they switch to text.
   - Hide "1 يوم" when duration is unknown (C03/D17).
   - Decide the price display rule and confirm or replace the 8 seed prices (C02/D15).
   - Approve contact details, privacy text and a single consent text, plus a Terms page (C04–C06).
   - Disable or delete the demo and debug accounts on any environment that inherits this DB (D02/D03).
2. Do **not** carry users, orders, notifications, CMS rows, ads or debug services from `backend/db.sqlite3` into production. Only the 27 imported services (plus any approved seed services) are catalogue candidates.
3. Content pass (P2):
   - Help guides 34–36 in Arabic, or unpublish 36; replace or hide the placeholder screenshots.
   - Fix the land-survey duplicates and the checkbox questions.
   - Approve the brand spelling per script: Khalsni / خلصني or خلّصني.
   - Fix the mojibake in `AdminRuleManagementPage.jsx`.
