# KHALSNI — CATALOGUE VALIDATION REPORT

DATE: 2026-10-17
DATA: a migrated copy of the real catalogue database (`backend/db.sqlite3` → copy, 38 services, 32 shown to customers). This is the same source the client acceptance audit used. The user's database was not modified.
TOOL: `python manage.py validate_catalogue [--strict] [--json] [--no-warnings]`. It is read-only and reusable: run it before every catalogue import and every release. `--strict` exits non-zero while any error exists.

The same rules are applied in four places (`backend/services/schema_rules.py`):
1. the admin service editor, which refuses to save an unusable form;
2. the importer (`import_production_services`), which stops unless `--allow-incomplete-forms` is passed;
3. order creation, which validates the answers server-side and refuses forms no customer could complete;
4. this validator.

Raw output: `docs/audit/evidence/client-acceptance-remediation/catalogue/before.txt|json` (database before migration `services.0016`) and `after.txt|json` (after it).

## Result

| | Before | After |
|---|---|---|
| Errors | **45** | **5** |
| Warnings | 417 | 408 |
| Business services orderable on the web | 0 of 9 | **4 of 9** |
| Services showing a placeholder "1 يوم" ("1 day") duration | 27 | **0** |

**What the checks look for.** Errors are things a customer hits:
- a required dropdown with no choices;
- a broken or impossible condition;
- duplicate field keys or duplicate option values;
- a default value that is not one of the options;
- an unknown field type;
- a missing label;
- a required yes/no checkbox (it can only be answered "yes");
- duplicate or inactive document links;
- a fixed duration shown next to a note saying the duration depends.

These rules apply in full to customer-visible services. Hidden services are reported as warnings.

**Errors by type:**

| Error | Before | After |
|---|---|---|
| Fixed duration shown while the note says it depends | 26 (+1 on a hidden service) | 0 |
| Required dropdown with no choices | 14 | 5 (client values needed) |
| Required yes/no checkbox (only "yes" possible) | 5 | 0 |

**Warnings remaining (408):**
- **308:** form fields with no English label. English screens show "Requested information N". No English source text exists.
- **89:** documents with no readable English name.
- **10:** documents with no file-type list (the global list applies).
- **1:** an optional dropdown with no choices (`trademark_class`).

All four need authored content and are listed in `KHALSNI_CLIENT_DECISIONS_AND_MISSING_CONTENT.md` (A3, C6).

## Errors that remain (all waiting on client values)

| Service | Field | Why | Decision item |
|---|---|---|---|
| 12 business_company_registration | company_type | Sheet says «قائمة أنواع الشركات» ("list of company types") but gives no list | A1 |
| 13 business_company_information_amendment | company_type | same | A1 |
| 14 business_company_add_activities | company_type | same | A1 |
| 20 business_company_closure_liquidation | company_type | same | A1 |
| 19 business_license_services | municipality | Sheet lists no governorates or municipalities | A2 |

These five services show «الطلب الإلكتروني لهذه الخدمة غير متاح حالياً» ("online requests for this service are not available yet") with a special-request button, and the server refuses orders for them. They don't present a form that can't be submitted.

## Field-by-field classification (traced to the client service sheets)

Source: `D:\ghassam moblie\servese\Khalsni_Business_Services_Fields_and_Documents_Final.docx` and the 21 real-estate sheets. The applied change is in migration `services.0016_client_acceptance_catalogue_fixes` (idempotent; only touches values still in their imported state; orders untouched). The same rules are in the importer, so a re-import produces the same result.

### Business dropdowns (17 fields with no choices)

| Service | Field | Sheet note column | Classification | Applied |
|---|---|---|---|---|
| 12, 13, 14, 20 | company_type (نوع الشركة, company type) | «قائمة أنواع الشركات» (list not given) | OWNER INPUT REQUIRED | none |
| 15 | entity_type (نوع صاحب السجل, record holder type) | «شركة / مؤسسة فردية» | CORRECT (choices from sheet) | 2 choices |
| 15, 16 | certificate_copy_type (نوع النسخة المطلوبة, copy type) | «عادية / مصدقة عند توفر الخيار» | CORRECT (choices from sheet; qualifier dropped) | عادية, مصدقة (normal, certified) |
| 17 | applicant_type (صفة مقدم الطلب, applicant capacity) | «فرد / شركة / مؤسسة» | CORRECT (choices from sheet) | 3 choices |
| 17 | business_activity (طبيعة النشاط, business activity) | type «Text / Dropdown», no list | CHANGE FIELD TYPE → text (sheet allows text) | text |
| 18 | trademark_service_type (نوع الخدمة, service type) | «تسجيل جديد / تحري / تجديد / تعديل / نقل ملكية / إصدار أو تصديق وثائق / أخرى» | CORRECT (choices from sheet) | 7 choices |
| 18 | trademark_owner_type (نوع مالك العلامة, trademark owner type) | «فرد / شركة» | CORRECT (choices from sheet) | 2 choices |
| 18 | trademark_class (فئة السلع/الخدمات, goods/services class; optional) | no list | OWNER INPUT REQUIRED | none (warning) |
| 19 | business_license_action (نوع الخدمة, service type) | «إصدار / تجديد / تعديل / إلغاء» | CORRECT (choices from sheet) | 4 choices |
| 19 | business_activity_type (نوع النشاط, activity type) | type «Searchable Dropdown / Text», no list | CHANGE FIELD TYPE → text | text |
| 19 | municipality (المحافظة / البلدية, governorate / municipality) | no list | OWNER INPUT REQUIRED | none |
| 19 | occupancy_status (صفة إشغال العقار, property occupancy) | «مالك / مستأجر / غير ذلك» | CORRECT (choices from sheet) | 3 choices |
| 20 | closure_or_liquidation_type (نوع الإجراء, action type) | «شطب / تصفية» | CORRECT (choices from sheet) | 2 choices |

**Root cause:** the importer split choice lists only on commas, and skipped any note containing «عند» ("when"). It now also reads " / " lists for dropdowns, drops the known trailing qualifier «عند توفر الخيار» ("when the option is available"), and uses text when the sheet allows "Text". Option codes use the importer's stable hash, so a re-import keeps the same codes.

### request-land-survey duplicates

The service is described by two sheets (`خدمة_10_طلب_كشف_مساحي_خلصني.docx` and `خدمة_10_طلب_كشف_مساحي.docx`, same slug, version 1.0, 2026-06-29). Merging them by key kept both wordings of the same items.

| Entry | Duplicate of | Classification |
|---|---|---|
| field `full_name` «الاسم» ("name") | `applicant_name` «اسم مقدم الطلب» ("applicant name") | REMOVE DUPLICATE |
| field «الهاتف» ("phone") | `phone_number` «رقم الهاتف» ("phone number") | REMOVE DUPLICATE |
| field «سبب الكشف» ("survey reason") | `survey_reason` «سبب طلب الكشف» ("reason for the survey request") | REMOVE DUPLICATE |
| document «الهوية» ("ID") | «صورة الهوية» ("ID copy") | REMOVE DUPLICATE (requirement deactivated) |
| document «مخطط أراضٍ إن وجد» ("land plan, if any") | «مخطط أراضٍ (إن وجد)» | REMOVE DUPLICATE |
| document «وكالة قانونية إن وجدت» ("legal power of attorney, if any") | «وكالة قانونية (إن وجدت)» | REMOVE DUPLICATE |
| every other field and document | — | CORRECT |

The fuller sheet's wording is kept. Existing orders keep their own notes and requirement snapshots.

### Questions rendered as a single checkbox (74)

| Group | Count | Example | Classification |
|---|---|---|---|
| Open question «ما …؟» ("what …?") | 10 | «ما الغاية من الكشف المساحي؟» ("what is the purpose of the land survey?") | CHANGE FIELD TYPE → text |
| Either/or «هل A أم B؟» ("A or B?") | 6 | «هل العقار أرض أم بناء؟» ("is the property land or a building?") | CHANGE FIELD TYPE → choice between the two answers the question names |
| Required yes/no (sheet: Yes/No, required) | 5 | «هل لدى الشركة موجودات؟» ("does the company have assets?") | CHANGE FIELD TYPE → required نعم/لا (yes/no) choice |
| Optional yes/no | 53 | «هل يوجد وكيل قانوني؟» ("is there a legal agent?") | CORRECT (unchanged) |

The six either/or choices, verbatim from the questions:
- «للمالك / لمفوض عنه» (for the owner / for an authorised representative)
- «أرض / بناء» (land / building)
- «قطعة أرض / شقق/وحدات» (land plot / flats or units)
- «للمالك / بموجب وكالة» (for the owner / under a power of attorney)
- «بنك / جهة أخرى» (bank / other party)
- «بناء جديد / إعادة بناء» (new building / rebuilding)

### Durations (27 imported services)

The sheets give no durations; their «مدة الإنجاز» ("completion time") is a sentence such as «حسب إجراءات دائرة الأراضي والمساحة» ("per the Department of Lands and Survey procedures"). The importer stored a placeholder of 1 day, so customers saw «المدة المتوقعة: 1 يوم» ("expected duration: 1 day") next to «تُحدَّد مدة الإنجاز بعد مراجعة الطلب» ("the completion time is set after the request is reviewed").

**Change:**
- New delivery mode `after_review`. The customer sees only the service's own approved or source sentence, with no number, and orders promise no date.
- The 27 services still holding the placeholder were moved to it; an admin-set duration is kept.
- The importer now uses this mode.
- The admin editor offers it as «تُحدَّد بعد مراجعة الطلب (بدون مدة)» ("set after review (no duration)").

## Before future imports or releases

```
python manage.py validate_catalogue --strict          # must exit 0 for a clean release
python manage.py import_production_services --source <dir> --dry-run   # lists form problems before importing
```
