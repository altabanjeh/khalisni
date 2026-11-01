# Document definition merges (B10-9)

DATE: 2026-11-01. DATA: migrated working copy of the real catalogue (38 services, 6 orders).
TOOL: `python manage.py normalize_document_definitions --dry-run|--apply` (`backend/services/document_merges.py`).
Migration `services.0019_normalize_document_definitions` runs the same function. Raw log: `document_merges_dry_run.txt`, `document_merges.json`.

Rules applied (owner decision B10-9):
- Only the approved low-risk groups below are merged. Legally different documents are never merged.
- Merge = the service requirement points at the canonical definition (and its code, unless an order of that service has no frozen requirements); if the service already lists the canonical document, one requirement is kept (required if either active row was, the lower display order) and the other is soft-deleted; the duplicate definition is deactivated (kept, not deleted).
- «تفويض إن وجد» (authorization, if any) is made optional everywhere: no service sheet requires authorization (these are the 8 early seed services, which have no sheet).
- Existing orders keep their frozen `requirements_snapshot` and document codes. Verified: SHA-256 of every order row (snapshot, notes, name/category snapshots) is identical before and after the migrations (`d24576f0…a0e2`, 6 orders).

## Merge groups

| Group | Canonical (kept) | Duplicate (deactivated) | Why it is the same document |
|---|---|---|---|
| additional-authority-documents | `document_b0f143ad16` «أي وثائق إضافية تطلبها الجهة المختصة» | `document_b03d952538` «أي مستندات إضافية تطلبها الجهة المختصة» | «وثائق» and «مستندات» are synonyms; same catch-all request from the competent authority. |
| legal-power-of-attorney | `legal_power_of_attorney` «وكالة قانونية (إن وجدت)» | `document_e95445e836` «وكالة قانونية إن وجدت» | Same document; the wording differs only by parentheses. |
| company-registration-certificate | `document_322e004de0` «شهادة/بيانات تسجيل الشركة أو المنشأة» | `document_d7d63d7027` «شهادة/سجل الشركة أو المؤسسة» | Company/establishment registration certificate or record; «بيانات تسجيل» and «سجل» name the same extract. |
| amended-company-contract | `document_39a02bfad7` «عقد ونظام الشركة المعدلان أو النماذج المعتمدة» | `document_ec8d545fbf` «عقد/نظام معدل أو النموذج المعتمد» | Amended company contract and articles or the approved forms; singular/plural wording only. |
| cadastral-map | `cadastral_map` «مخطط أراضٍ» | `document_0cc19c2317` «مخطط أراضٍ إن وجد» | Same cadastral map; «إن وجد» is a condition already carried by the requirement being optional. |
| notarized-poa-or-written-authorization | `legal_authorization` «وكالة عدلية أو تفويض خطي» | `document_f56c2e0812` «تفويض خطي أو وكالة عدلية» | Same two alternatives in reversed order. |
| applicant-id-copy | `national_id_copy` «صورة الهوية» | `document_a4c4fed3af` «الهوية» | «الهوية» is the applicant's ID copy; already classified as a duplicate of «صورة الهوية» by services.0016 (request-land-survey second sheet). |

## Every change on the real catalogue

| # | Group | Action | Service | Requirement | From | To | Detail |
|---|---|---|---|---|---|---|---|
| 1 | additional-authority-documents | repoint | request-boundary-demarcation | 106 | `document_b03d952538` «أي مستندات إضافية تطلبها الجهة المختصة» | `document_b0f143ad16` «أي وثائق إضافية تطلبها الجهة المختصة» | repointed to the canonical definition |
| 2 | additional-authority-documents | repoint | request-land-survey | 114 | `document_b03d952538` «أي مستندات إضافية تطلبها الجهة المختصة» | `document_b0f143ad16` «أي وثائق إضافية تطلبها الجهة المختصة» | repointed to the canonical definition |
| 3 | additional-authority-documents | repoint | request-property-readjustment | 119 | `document_b03d952538` «أي مستندات إضافية تطلبها الجهة المختصة» | `document_b0f143ad16` «أي وثائق إضافية تطلبها الجهة المختصة» | repointed to the canonical definition |
| 4 | additional-authority-documents | repoint | request-zoning-certificate | 123 | `document_b03d952538` «أي مستندات إضافية تطلبها الجهة المختصة» | `document_b0f143ad16` «أي وثائق إضافية تطلبها الجهة المختصة» | repointed to the canonical definition |
| 5 | additional-authority-documents | repoint | request-land-use-classification-change | 129 | `document_b03d952538` «أي مستندات إضافية تطلبها الجهة المختصة» | `document_b0f143ad16` «أي وثائق إضافية تطلبها الجهة المختصة» | repointed to the canonical definition |
| 6 | additional-authority-documents | repoint | request-property-mortgage-registration | 142 | `document_b03d952538` «أي مستندات إضافية تطلبها الجهة المختصة» | `document_b0f143ad16` «أي وثائق إضافية تطلبها الجهة المختصة» | repointed to the canonical definition |
| 7 | additional-authority-documents | repoint | request-mortgage-release | 147 | `document_b03d952538` «أي مستندات إضافية تطلبها الجهة المختصة» | `document_b0f143ad16` «أي وثائق إضافية تطلبها الجهة المختصة» | repointed to the canonical definition |
| 8 | additional-authority-documents | deactivate-definition |  |  | `document_b03d952538` «أي مستندات إضافية تطلبها الجهة المختصة» | `document_b0f143ad16` «أي وثائق إضافية تطلبها الجهة المختصة» | «وثائق» and «مستندات» are synonyms; same catch-all request from the competent authority. |
| 9 | legal-power-of-attorney | dedupe | request-land-survey | 112 | `document_e95445e836` «وكالة قانونية إن وجدت» | `legal_power_of_attorney` «وكالة قانونية (إن وجدت)» | service already lists the canonical document (requirement 113); duplicate requirement soft-deleted |
| 10 | legal-power-of-attorney | deactivate-definition |  |  | `document_e95445e836` «وكالة قانونية إن وجدت» | `legal_power_of_attorney` «وكالة قانونية (إن وجدت)» | Same document; the wording differs only by parentheses. |
| 11 | company-registration-certificate | repoint | business_trademark_services | 45 | `document_d7d63d7027` «شهادة/سجل الشركة أو المؤسسة» | `document_322e004de0` «شهادة/بيانات تسجيل الشركة أو المنشأة» | repointed to the canonical definition |
| 12 | company-registration-certificate | deactivate-definition |  |  | `document_d7d63d7027` «شهادة/سجل الشركة أو المؤسسة» | `document_322e004de0` «شهادة/بيانات تسجيل الشركة أو المنشأة» | Company/establishment registration certificate or record; «بيانات تسجيل» and «سجل» name the same extract. |
| 13 | amended-company-contract | repoint | business_company_add_activities | 30 | `document_ec8d545fbf` «عقد/نظام معدل أو النموذج المعتمد» | `document_39a02bfad7` «عقد ونظام الشركة المعدلان أو النماذج المعتمدة» | repointed to the canonical definition |
| 14 | amended-company-contract | deactivate-definition |  |  | `document_ec8d545fbf` «عقد/نظام معدل أو النموذج المعتمد» | `document_39a02bfad7` «عقد ونظام الشركة المعدلان أو النماذج المعتمدة» | Amended company contract and articles or the approved forms; singular/plural wording only. |
| 15 | cadastral-map | dedupe | request-land-survey | 110 | `document_0cc19c2317` «مخطط أراضٍ إن وجد» | `cadastral_map` «مخطط أراضٍ» | service already lists the canonical document (requirement 111); duplicate requirement soft-deleted |
| 16 | cadastral-map | deactivate-definition |  |  | `document_0cc19c2317` «مخطط أراضٍ إن وجد» | `cadastral_map` «مخطط أراضٍ» | Same cadastral map; «إن وجد» is a condition already carried by the requirement being optional. |
| 17 | notarized-poa-or-written-authorization | repoint | business_license_services | 56 | `document_f56c2e0812` «تفويض خطي أو وكالة عدلية» | `legal_authorization` «وكالة عدلية أو تفويض خطي» | repointed to the canonical definition |
| 18 | notarized-poa-or-written-authorization | deactivate-definition |  |  | `document_f56c2e0812` «تفويض خطي أو وكالة عدلية» | `legal_authorization` «وكالة عدلية أو تفويض خطي» | Same two alternatives in reversed order. |
| 19 | applicant-id-copy | dedupe | request-land-survey | 107 | `document_a4c4fed3af` «الهوية» | `national_id_copy` «صورة الهوية» | service already lists the canonical document (requirement 108); duplicate requirement soft-deleted |
| 20 | applicant-id-copy | deactivate-definition |  |  | `document_a4c4fed3af` «الهوية» | `national_id_copy` «صورة الهوية» | «الهوية» is the applicant's ID copy; already classified as a duplicate of «صورة الهوية» by services.0016 (request-land-survey second sheet). |
| 21 | authorization-if-any | make-optional | no-criminal-record | 2 | `authorization-letter` «تفويض إن وجد» |  | «إن وجد» (if any) cannot be a required upload |
| 22 | authorization-if-any | make-optional | passport-renewal | 4 | `authorization-letter` «تفويض إن وجد» |  | «إن وجد» (if any) cannot be a required upload |
| 23 | authorization-if-any | make-optional | tax-clearance | 6 | `authorization-letter` «تفويض إن وجد» |  | «إن وجد» (if any) cannot be a required upload |
| 24 | authorization-if-any | make-optional | no-criminal-record-certificate | 8 | `authorization-letter` «تفويض إن وجد» |  | «إن وجد» (if any) cannot be a required upload |
| 25 | authorization-if-any | make-optional | passport-appointment-booking | 10 | `authorization-letter` «تفويض إن وجد» |  | «إن وجد» (if any) cannot be a required upload |
| 26 | authorization-if-any | make-optional | traffic-fines-payment | 12 | `authorization-letter` «تفويض إن وجد» |  | «إن وجد» (if any) cannot be a required upload |
| 27 | authorization-if-any | make-optional | property-registration-deed | 14 | `authorization-letter` «تفويض إن وجد» |  | «إن وجد» (if any) cannot be a required upload |
| 28 | authorization-if-any | make-optional | business-license-renewal | 16 | `authorization-letter` «تفويض إن وجد» |  | «إن وجد» (if any) cannot be a required upload |

Totals: repoint 10, deactivate-definition 7, dedupe 3, make-optional 8 (28 log rows). A second run reports 0 changes.

## Deliberately not merged

| Document | Compared with | Reason |
|---|---|---|
| «تفويض خطي» | «وكالة عدلية» | written authorization vs notarized power of attorney: legally different |
| «تفويض خطي أو وكالة» | «وكالة عدلية أو تفويض خطي» | «وكالة» is not «وكالة عدلية» (notarized): different legal requirement |
| «كتاب تفويض من الشركة» | «تفويض خطي» | company authorization letter vs personal written authorization |
| «تفويض أو وكالة للشخص الذي يتابع الإجراءات» | «وكالة عدلية أو تفويض خطي» | names a specific person and accepts any authorization |
| «صورة هوية البائع / المشتري / الواهب / الموهوب له / الورثة / الشركاء» | «صورة الهوية» | party-specific IDs |
| «هوية شخصية» | «صورة الهوية» | not in the approved merge list (early seed services); left for a later decision |
| «إثبات شخصية مقدم الطلب / صاحب الطلب / صاحب العلاقة» | «صورة الهوية» | not in the approved merge list |
| «مخطط موقع تنظيمي» | «مخطط أراضٍ» | zoning site plan is a different document |
| «موافقات مسبقة على الغايات/الأنشطة» | «موافقات مسبقة على الغاية الجديدة» | different scope (all objectives vs the new objective) |
| «موافقات الجهات المختصة» | «موافقات الجهات المختصة بالنشاط» | different scope |

## Validator effect

`validate_catalogue` now reports a required document described as «إن وجد» (if any) as an error: 6 errors before (customer-visible services; 2 more as warnings on hidden services), 0 after.
