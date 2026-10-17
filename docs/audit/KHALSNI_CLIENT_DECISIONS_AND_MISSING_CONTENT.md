# KHALSNI — CLIENT DECISIONS AND MISSING CONTENT

DATE: 2026-10-17
BRANCH: `fix/client-acceptance-remediation`

Each item below is a client requirement the development team cannot finish without an answer, a value or legal text from the owner or client. Nothing in this list has been implemented by assumption, and **no item is marked out of scope**: that needs written approval.

Each item uses the same fields: SOURCE, ORIGINAL WORDING, CURRENT SYSTEM, WHY IMPLEMENTATION CANNOT BE SAFELY CHOSEN, OPTIONS, RECOMMENDED OPTION and OWNER / CLIENT ANSWER. The answer field is left blank for the owner to fill.

**Sources:**
- S1 = `Khalsni_Developer_Final_Action_Notes_AR_v2.docx` (2026-08-15)
- S2 = `Khalsni_Visual_Design_Notes_20.docx` (2026-08-30)
- S3 = `Khalsni_Website_Audit_AR.docx` (2026-10-01)
- S4 = the service sheets in `servese/`
- S5 = `Khalasni_SiteMap_Explanation_AR.pdf`
- S6 = `khalesni_system_flow.pdf`
- S7 = `Khalasni_Daily_Operations_AR.pdf`

Matrix IDs refer to `docs/audit/KHALSNI_FINAL_CLIENT_UI_MATRIX.csv`.

---

## A. Values that block customer ordering today

### A1. Company types for the business services (CN-BIZ-00, DEF-D01)
- SOURCE: S4 `Khalsni_Business_Services_Fields_and_Documents_Final.docx`, field `company_type` in services 1, 2, 3 and 9.
- ORIGINAL WORDING: «نوع الشركة | company_type | Dropdown | نعم | قائمة أنواع الشركات» ("company type, dropdown, required: list of company types").
- CURRENT SYSTEM:
  - The field is a required dropdown with no choices in four services: company registration, information amendment, add activities, and closure/liquidation.
  - These services now show «الطلب الإلكتروني لهذه الخدمة غير متاح حالياً» ("online requests for this service are not available yet") with a special-request button, and the server refuses orders for them.
  - The admin editor will not save such a field until it has choices.
- WHY NOT CHOSEN: the sheet names a list but does not give it. The legal company forms offered (and their exact Arabic names) are a business decision.
- OPTIONS:
  - A. The client supplies the list.
  - B. Allow a typed answer (text field) until the list exists.
  - C. Keep the services not orderable online.
- RECOMMENDED OPTION: A. B is acceptable as a temporary measure only with written approval.
- OWNER / CLIENT ANSWER:

### A2. Governorate / municipality list for business licences (CN-BIZ-00)
- SOURCE: S4, service 8 (رخص المهن, business licences), field `municipality`.
- ORIGINAL WORDING: «المحافظة / البلدية | municipality | Dropdown | نعم |» (required dropdown, no list given).
- CURRENT SYSTEM: required dropdown with no choices. The service shows the "not available online yet" notice and is refused by the server.
- WHY NOT CHOSEN: the sheet gives no list. Which governorates or municipalities Khalsni serves is a business choice.
- OPTIONS:
  - A. The client supplies the served list.
  - B. Use all governorates of Jordan.
  - C. Use a typed answer.
- RECOMMENDED OPTION: A.
- OWNER / CLIENT ANSWER:

### A3. Trademark goods/services classes (CN-BIZ-00)
- SOURCE: S4, service 7 (العلامات التجارية, trademarks), field `trademark_class`.
- ORIGINAL WORDING: «فئة السلع/الخدمات | trademark_class | Dropdown / Multi-select | حسب الخدمة | للتسجيل والخدمات المرتبطة بالفئات» ("goods/services class, dropdown or multi-select, required depending on the service: for registration and class-related services").
- CURRENT SYSTEM:
  - The field is optional and has no choices, so the service can be ordered and the field shows an empty list.
  - The catalogue validator reports it as a warning.
- WHY NOT CHOSEN: neither the class list (for example the 45 Nice classes) nor whether several can be chosen is given.
- OPTIONS:
  - A. A Nice-class list, multi-select.
  - B. A typed answer.
  - C. Remove the field.
- RECOMMENDED OPTION: A, confirmed by the client.
- OWNER / CLIENT ANSWER:

## B. Catalogue structure and pricing

### B1. The 8 category "worlds" (CN-ACT-04)
- SOURCE: S1 §4.
- ORIGINAL WORDING: «حافظ على التصنيفات: العقارات والأراضي، خدمات الأعمال، الضرائب والرسوم، المركبات والنقل، العمالة والإقامة، الوثائق والتصديقات، الخدمات الدولية، وطلب خاص.» ("keep the categories: real estate and land, business services, taxes and fees, vehicles and transport, labour and residency, documents and attestations, international services, and special request").
- CURRENT SYSTEM: the real catalogue has different categories (civil status and passports, land and survey, municipal, tax, social security, quick public services, labour ministry, business and companies). Five of the client's eight have no category and no services.
- WHY NOT CHOSEN: moving 38 services into new categories, and creating empty categories with no services, changes the public catalogue. The mapping of each service is the client's.
- OPTIONS:
  - A. The client maps every service to one of the 8 categories, and says which empty categories may be published.
  - B. Keep the current categories and record the change in writing.
- RECOMMENDED OPTION: A.
- OWNER / CLIENT ANSWER:

### B2. Pricing semantics (B10-10, CE5, DEF-D03, DEF-D04)
- SOURCE: S3 B10.
- ORIGINAL WORDING: «فروق السعر الأساسي والعام قد تكون مجموع الرسوم فلا تصنف خطأ تسعير… ويؤكد … تفصيل الرسوم.» ("differences between the base and general price may be the sum of the fees, so they are not a pricing error … confirm the fee breakdown").
- CURRENT SYSTEM: fixed-price services show a total next to two components that add up to half of it (for example 36.00 shown with 7.00 + 11.00). The 8 fixed prices come from early development data and were never confirmed. They also carry «يتم تأكيد الرسوم النهائية بعد مراجعة الوثائق» ("final fees are confirmed after document review").
- WHY NOT CHOSEN: what `base_price` means for customers, which parts are shown, and whether those prices are real are owner decisions. No financial value was changed.
- OPTIONS:
  - A. Show the total only.
  - B. Show a full breakdown with definitions that add up exactly.
  - C. A restructured breakdown.

  Separately: confirm or replace the 8 prices.
- RECOMMENDED OPTION: A until confirmed prices exist.
- OWNER / CLIENT ANSWER:

### B3. Document-definition merges and «تفويض إن وجد» (B10-9, CE1–CE3, DEF-D06)
- SOURCE: S3 B10 evidence.
- ORIGINAL WORDING: «بعض تعريفات المستندات متقاربة ومتكررة» ("some document definitions are near-duplicates").
- CURRENT SYSTEM: near-duplicate definitions still exist. «تفويض إن وجد» ("authorization, if any") is a *required* upload on 8 early services.
- WHY NOT CHOSEN:
  - Merging changes what customers must upload.
  - A document described as "if any" being required is contradictory, but whether to make it optional or rename it is a business choice.
- OPTIONS: per merge group, the owner approves A (merge), B (keep separate) or C (rename). For «تفويض إن وجد»: optional, or renamed to a required document.
- RECOMMENDED OPTION: merge the groups listed in the decision dossier, and make «تفويض إن وجد» optional.
- OWNER / CLIENT ANSWER:

### B4. Parcel/basin question for the other 15 land services (B10-3, DEF-D09)
- SOURCE: S3 B10; owner decision A was applied to 2 services.
- ORIGINAL WORDING: «سؤال معرفة القطعة والحوض… حقول القطعة والحوض… مطلوبة» ("the question whether the parcel and basin are known … the parcel and basin fields … are required").
- CURRENT SYSTEM: only `request-property-registration-certificate` and `request-cadastral-map` have the yes/no gate. The server now enforces it. The other 15 services always require both numbers.
- WHY NOT CHOSEN: the decision covered two services by name.
- OPTIONS:
  - A. Apply the gate to all land services.
  - B. Keep as is.
  - C. Per-service list.
- RECOMMENDED OPTION: A.
- OWNER / CLIENT ANSWER:

### B5. Repeatable partners / plots (CN-BIZ-01, CN-BIZ-04)
- SOURCE: S4 developer notes (company registration; consolidation).
- ORIGINAL WORDING: the developer notes ask for repeatable fields (several partners; plot numbers addable for more than two plots).
- CURRENT SYSTEM: no repeatable field type; imported as text or fixed fields.
- WHY NOT CHOSEN: it is a new form capability. The number of items, the required fields per item, and how staff read them need a specification.
- OPTIONS:
  - A. Build a repeatable group field.
  - B. Keep a free-text list.
- RECOMMENDED OPTION: A, after specification.
- OWNER / CLIENT ANSWER:

### B6. Coordinates / site photos (CN-BIZ-05) and files over 10 MB (CN-BIZ-09)
- SOURCE: S4 developer notes (boundary demarcation, land survey, building permit).
- ORIGINAL WORDING: «إتاحة إضافة إحداثيات الموقع… مع إمكانية إرفاق صور الموقع» ("allow adding the site coordinates … with the option to attach site photos"), and large engineering drawings.
- CURRENT SYSTEM: free text only; uploads are capped at 10 MB.
- WHY NOT CHOSEN: needs the map or coordinate format, the photo rules, and the size limit and storage budget.
- OPTIONS:
  - A. Coordinate field + optional photos + a higher limit for named services.
  - B. Keep as is.
- RECOMMENDED OPTION: A for building permits and surveys, with an agreed limit.
- OWNER / CLIENT ANSWER:

### B7. Original 31-service catalogue (CN-SVC-01)
- SOURCE: S8 `Khalasni_Detailed_Services_AR.pdf`.
- ORIGINAL WORDING: 31 services in 8 groups, including a special request.
- CURRENT SYSTEM: replaced in practice by the S4 sheets (27 services) plus early seed services. This was never recorded in writing.
- WHY NOT CHOSEN: only the client can confirm which catalogue is final.
- OPTIONS:
  - A. S4 is final.
  - B. Add the missing S8 services.
- RECOMMENDED OPTION: A, in writing.
- OWNER / CLIENT ANSWER:

### B8. Demo/debug catalogue records (B10-7, DEF-D05)
- SOURCE: owner decision dossier §10.
- CURRENT SYSTEM: the legacy database holds 3 `????` services, 3 `???` categories, debug admins and providers, and demo CMS contact data.
- WHY NOT CHOSEN: deleting records needs owner permission. The production data is not visible to the team.
- OPTIONS:
  - A. Soft-delete all debug and demo records before production use.
  - B. Keep.
- RECOMMENDED OPTION: A.
- OWNER / CLIENT ANSWER:

## C. Legal and public content

### C1. Terms & Conditions page and consent wording (CN-MAP-01, DEF-K09, B10-5)
- SOURCE: S5 §1.
- ORIGINAL WORDING: «سياسة الخصوصية والشروط والأحكام» ("privacy policy and terms and conditions").
- CURRENT SYSTEM: there is no Terms page. The mobile consent text refers to «الشروط» ("the terms"). The web and mobile consent statements differ (the mobile one omits «وإشعاري بأي نواقص», "and notifying me of any missing items").
- WHY NOT CHOSEN: legal text cannot be drafted by developers.
- OPTIONS:
  - A. The client supplies AR/EN Terms; a `/terms` page and one consent statement are published.
  - B. The consent wording drops the Terms reference until they exist.
- RECOMMENDED OPTION: A.
- OWNER / CLIENT ANSWER:

### C2. Privacy policy and retention periods (D06)
- SOURCE: S3 D06.
- CURRENT SYSTEM: generic fallback text. Retention periods are not set.
- WHY NOT CHOSEN: legal content.
- OPTIONS: the client supplies the policy and retention periods for accounts, orders, documents, audit logs and backups.
- RECOMMENDED OPTION: supply both.
- OWNER / CLIENT ANSWER:

### C3. Support contact data (D05)
- SOURCE: S3 D05.
- CURRENT SYSTEM: «معلومات التواصل غير منشورة حالياً.» ("contact details are not published yet"). Reserved domains are refused.
- WHY NOT CHOSEN: real business data.
- OPTIONS: phone, email, WhatsApp, address (AR/EN), hours.
- RECOMMENDED OPTION: supply them.
- OWNER / CLIENT ANSWER:

### C4. Brand spelling and sending domain (D04)
- SOURCE: S3 D04; S2 §3.
- CURRENT SYSTEM:
  - The web uses «خلصني | Khalsni».
  - Emails and catalogue text use «خلّصني».
  - The CMS/theme rows still say "Khalisni".
  - The sender address defaults to `khalisni.local`.
- WHY NOT CHOSEN: identity decision.
- OPTIONS: choose one Arabic and one Latin spelling, plus the domain.
- RECOMMENDED OPTION: «خلّصني» / "Khalsni", as in the client logo.
- OWNER / CLIENT ANSWER:

### C5. English wording of the approved slogan (CN-VIS-04)
- SOURCE: S2 §4.
- ORIGINAL WORDING: «السلوغن المعتمد: «ركّز على اللي بهمّك… وإحنا بنخلّص الباقي.»» ("approved slogan: focus on what matters to you… and we'll handle the rest").
- CURRENT SYSTEM: the Arabic slogan is now the default homepage headline, from one source (the CMS row). English screens show the existing developer translation "Focus on what matters… and we will handle the rest."
- WHY NOT CHOSEN: the client approved Arabic only.
- OPTIONS:
  - A. Approve the English wording.
  - B. Supply another.
- RECOMMENDED OPTION: A.
- OWNER / CLIENT ANSWER:

### C6. Arabic text for English help content (D03, CN-ACT-13, DEF-K02)
- SOURCE: S1 §13.
- ORIGINAL WORDING: «العربي عربي بالكامل والإنجليزي إنجليزي بالكامل» ("Arabic fully Arabic and English fully English").
- CURRENT SYSTEM:
  - Three help guides are English only.
  - Two related-service messages are English in the Arabic field.
  - 40 help screenshots are placeholders ("Screenshot required").
  - The help model has single-language fields.
- WHY NOT CHOSEN: authored content.
- OPTIONS:
  - A. The client or team writes Arabic text and real screenshots.
  - B. Unpublish the English-only guides and the placeholder screenshots.
- RECOMMENDED OPTION: B now, then A.
- OWNER / CLIENT ANSWER:

## D. Workflow features asked for but not specified

### D1. Customer ↔ support messaging (CN-MAP-02)
- SOURCE: S5 §2.
- ORIGINAL WORDING: «مراسلة الدعم الفني» ("message technical support").
- CURRENT SYSTEM: no messaging; the contact form only.
- WHY NOT CHOSEN: needs a defined channel, who answers, and service levels.
- OPTIONS:
  - A. A message thread per order.
  - B. A general ticket inbox.
  - C. WhatsApp/phone link only.
- RECOMMENDED OPTION: A.
- OWNER / CLIENT ANSWER:

### D2. Provider rating and earnings view (CN-MAP-04)
- SOURCE: S5 §4.
- ORIGINAL WORDING: «عرض تقييمه وأرباحه وتقاريره» ("show the provider's rating, earnings and reports").
- CURRENT SYSTEM: providers see their orders only. Payout models exist but are not shown to providers.
- WHY NOT CHOSEN: earnings depend on the pricing and payout model (B2) and payment being out of this release.
- OPTIONS:
  - A. Rating + completed-order counts now; earnings after payment.
  - B. Defer.
- RECOMMENDED OPTION: A.
- OWNER / CLIENT ANSWER:

### D3. Late-order supervisor alert (CN-MAP-05)
- SOURCE: S5 §5.
- ORIGINAL WORDING: «المشرف عند وجود طلب متأخر أو مشكلة» ("notify the supervisor when an order is late or has a problem").
- CURRENT SYSTEM: there are report counts, but no alert.
- WHY NOT CHOSEN: needs the meaning of "late" (many services have no fixed duration), who the supervisor is, and the channel.
- OPTIONS:
  - A. An in-app alert to admins when an order passes a per-service threshold.
  - B. A daily report only.
- RECOMMENDED OPTION: A, with thresholds from the client.
- OWNER / CLIENT ANSWER:

### D4. Paper delivery logistics (CN-OPS-05)
- SOURCE: S7 §6.
- ORIGINAL WORDING: «إذا كانت ورقية: ترتيب توصيل مندوب أو استلام من مكتب شريك» ("if paper: arrange courier delivery or pickup from a partner office").
- CURRENT SYSTEM: electronic delivery only.
- WHY NOT CHOSEN: needs partners, fees and statuses.
- OPTIONS:
  - A. A delivery-method field plus a status.
  - B. Out of release, in writing.
- RECOMMENDED OPTION: client to choose.
- OWNER / CLIENT ANSWER:

### D5. Complaints follow-up (CN-OPS-06)
- SOURCE: S7 §7.
- ORIGINAL WORDING: «متابعة شكاوى العملاء» ("follow up customer complaints").
- CURRENT SYSTEM: there is no complaints module. Order issues exist for staff.
- WHY NOT CHOSEN: needs a process definition.
- OPTIONS:
  - A. A customer complaint on an order, handled by staff.
  - B. Contact form only.
- RECOMMENDED OPTION: A.
- OWNER / CLIENT ANSWER:

### D6. Provider reassignment (TDL-11)
- SOURCE: team decision log.
- CURRENT SYSTEM: there is no dedicated reassignment flow.
- WHY NOT CHOSEN: the decision is empty in the log.
- OPTIONS:
  - A. Yes, with a reason.
  - B. No.
- RECOMMENDED OPTION: A.
- OWNER / CLIENT ANSWER:

## E. Account and data rules

| Item | Source | Current system | Options | Recommended | Owner / client answer |
|---|---|---|---|---|---|
| E1. Meaning of "verified" (B10-8) | S3 B10 | Three separate facts shown; meaning undecided | Dossier #11 questions | Answer the dossier questions | |
| E2. `verification_note` visibility (OD-16) | Hardening report §2 | Shown to the owning customer | A customer-facing / B staff-only / C separate fields | C | |
| E3. National-ID format (OD-17) | Hardening report §5 | Text, no format rule; a blank value on an order no longer erases the saved one | Length, check digit, non-Jordanians | Client to specify | |
| E4. Mobile registration (M-05) | Mobile proposal | Register on the web only | A add to the app / B web only | A | |
| E5. Mobile production API host (DEF-M04) | — | Builds refuse to run without a real https host | Supply the host | Supply | |
| E6. External notifications scope (B08) | PRD | In-app only | Confirm in writing | Confirm | |
| E7. Written sign-off of decisions already implemented: B05, F04, B04, B06, D02, B10-1/2/3/4/7, phone policy | Owner decisions report | Implemented; no signature stored | Sign | Sign | |

---

## F. Team decision log: proposed update (not filled in)

Every "Final Decision" cell in `docs/final_review/TEAM_DECISION_LOG.md` is still empty, and it has not been edited. For each row this table shows what the system does now and any later owner decision that supports it, so the owner can sign row by row.

| Row | Current implementation | Supporting later decision | Sign-off needed |
|---|---|---|---|
| Who can assign provider? | Admin and employee (`workflow/rules.py` assign_provider: internal roles) | None | Yes |
| Can employee complete order? | Only when the final result is verified; admin-only override (`orders/services.py`) | None | Yes |
| Can admin reopen completed order? | Yes, admin only, reason required | None | Yes |
| Can client cancel order? | Only while NEW (`workflow/transition_permissions.py`) | None | Yes |
| Which documents are required per service? | Per-service list from the document master table | None (B10-9 merges pending) | Yes |
| Should provider see client name? | No: provider screens show «غير متاح» ("not available") for the customer | B06 is the reverse direction (provider hidden from customer) | Yes |
| Should payment be required before completion? | Completion is not blocked by payment | B05: payment out of this release | Yes (row can close as "not in this release") |
| Who can cancel active orders? | Employee/support during review stages; admin any non-final stage | None | Yes |
| Should support role act like employee? | Support shares the employee portal, partly read-only; service categories and relations are support-only | None | Yes |
| Should emergency completion override remain? | Admin-only override with confirmation | None | Yes |
| Should provider reassignment be allowed? | No dedicated flow (see D6) | None | Yes |
| Should provider see client documents? | Only the order's documents allowed by `can_user_download_document` | None | Yes |
| Should completed orders be editable directly? | No; finalized orders are blocked from direct edits | None | Yes |
| Should audit logs ever be deletable? | Never through the UI (read-only API) | None | Yes |
| Should more business settings be editable by admin? | Whitelisted safe settings only | None | Yes |
