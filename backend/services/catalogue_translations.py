"""English text for catalogue content that exists only in Arabic (D03 / C6).

Every entry is a faithful translation of the client's own Arabic text
(service sheets in ``servese/``). Nothing here adds a business fact, price,
duration or condition. Each entry carries the Arabic source it translates and
is applied only while the English value is blank (or an unreadable code) and
the Arabic value still equals that source, so an admin's later edit is never
overwritten and a changed Arabic text never gets a stale translation.

Used by migration ``services.0020`` (historical models) and by the importer.
"""

import re

# (field key, Arabic label) -> English label
FIELD_LABELS_EN = {
    ("company_type", "نوع الشركة"): "Company type",
    ("proposed_company_name_1", "الاسم المقترح الأول للشركة"): "First proposed company name",
    ("proposed_company_name_2", "الاسم المقترح الثاني للشركة"): "Second proposed company name",
    ("proposed_company_name_3", "الاسم المقترح الثالث للشركة"): "Third proposed company name",
    ("company_objectives", "غايات الشركة"): "Company objectives",
    ("company_address", "المركز الرئيسي / العنوان"): "Head office / address",
    ("capital_amount", "رأس مال الشركة"): "Company capital",
    ("partners_count", "عدد الشركاء"): "Number of partners",
    ("partner_name", "اسم كل شريك"): "Name of each partner",
    ("partner_id", "الرقم الوطني / رقم الجواز للشريك"): "Partner's national ID / passport number",
    ("partner_nationality", "جنسية كل شريك"): "Nationality of each partner",
    ("partner_share", "حصة كل شريك"): "Share of each partner",
    # CN-BIZ-01: the four partner fields as one repeater (catalogue_rules.apply_repeater_rules).
    ("partners", "بيانات الشركاء"): "Partners' details",
    ("name", "اسم كل شريك"): "Name of each partner",
    ("id", "الرقم الوطني / رقم الجواز للشريك"): "Partner's national ID / passport number",
    ("nationality", "جنسية كل شريك"): "Nationality of each partner",
    ("share", "حصة كل شريك"): "Share of each partner",
    ("authorized_signatories", "المفوض/المفوضون بالتوقيع"): "Authorized signatory/signatories",
    ("signing_authority", "صلاحيات التوقيع"): "Signing powers",
    ("company_registration_number", "رقم تسجيل الشركة"): "Company registration number",
    ("company_name", "اسم الشركة"): "Company name",
    ("amendment_type", "نوع التعديل المطلوب"): "Type of amendment requested",
    ("amendment_details", "تفاصيل التعديل المطلوب"): "Details of the amendment requested",
    ("current_business_activities", "الغايات الحالية"): "Current objectives",
    ("new_business_activities", "الغايات/الأنشطة المطلوب إضافتها"): "Objectives/activities to add",
    ("additional_details", "تفاصيل إضافية"): "Additional details",
    ("entity_type", "نوع صاحب السجل"): "Record holder type",
    ("registration_number", "رقم التسجيل / الرقم الوطني للمنشأة"): "Registration number / establishment national number",
    ("registered_entity_name", "اسم الشركة / المنشأة"): "Company / establishment name",
    ("certificate_copy_type", "نوع النسخة المطلوبة"): "Type of copy requested",
    ("trade_name_number", "رقم الاسم التجاري"): "Trade name number",
    ("trade_name", "اسم الاسم التجاري"): "Trade name",
    ("trade_name_owner", "اسم صاحب الاسم التجاري / المنشأة"): "Trade name owner / establishment name",
    ("applicant_type", "صفة مقدم الطلب"): "Applicant capacity",
    ("applicant_registration_number", "الرقم الوطني / رقم التسجيل"): "National ID / registration number",
    ("proposed_trade_name_1", "الاسم التجاري المقترح الأول"): "First proposed trade name",
    ("proposed_trade_name_2", "الاسم التجاري المقترح الثاني"): "Second proposed trade name",
    ("proposed_trade_name_3", "الاسم التجاري المقترح الثالث"): "Third proposed trade name",
    ("business_activity", "طبيعة النشاط المرتبط بالاسم"): "Nature of the activity linked to the name",
    ("trademark_service_type", "نوع الخدمة"): "Service type",
    ("trademark_name", "اسم العلامة التجارية"): "Trademark name",
    ("trademark_owner_type", "نوع مالك العلامة"): "Trademark owner type",
    ("trademark_owner_name", "اسم مالك العلامة"): "Trademark owner name",
    ("trademark_class", "فئة السلع/الخدمات"): "Goods/services class",
    ("goods_services_description", "وصف السلع/الخدمات"): "Description of the goods/services",
    ("trademark_description", "وصف العلامة"): "Trademark description",
    ("business_license_action", "نوع الخدمة"): "Service type",
    ("business_name", "اسم المنشأة"): "Establishment name",
    ("business_registration_number", "الرقم الوطني للمنشأة / رقم التسجيل"): "Establishment national number / registration number",
    ("business_activity_type", "نوع النشاط"): "Activity type",
    ("municipality", "المحافظة / البلدية"): "Governorate / municipality",
    ("business_location", "عنوان موقع المهنة"): "Business premises address",
    ("occupancy_status", "صفة إشغال العقار"): "Property occupancy status",
    ("closure_or_liquidation_type", "نوع الإجراء"): "Procedure type",
    ("has_operated", "هل مارست الشركة نشاطاً؟"): "Has the company carried out any activity?",
    ("has_assets", "هل لدى الشركة موجودات؟"): "Does the company have assets?",
    ("has_liabilities", "هل على الشركة التزامات أو ديون؟"): "Does the company have obligations or debts?",
    ("has_employees", "هل لديها موظفون؟"): "Does it have employees?",
    ("has_trade_name", "هل لديها اسم تجاري؟"): "Does it have a trade name?",
    ("authorized_followup_person", "اسم الشخص المفوض بمتابعة الإجراءات"): "Name of the person authorized to follow up the procedures",
    ("full_name", "الاسم"): "Name",
    ("full_name", "الاسم الكامل"): "Full name",
    ("national_id", "الرقم الوطني"): "National ID number",
    ("phone_number", "رقم الهاتف"): "Phone number",
    ("field_2fa52c6cfa", "هل تعرف رقم القطعة والحوض؟"): "Do you know the parcel and basin numbers?",
    ("parcel_number", "رقم القطعة"): "Parcel number",
    ("basin_number", "رقم الحوض"): "Basin number",
    ("region", "المنطقة"): "Area",
    ("governorate", "المحافظة"): "Governorate",
    ("additional_notes", "ملاحظات إضافية"): "Additional notes",
    ("field_3b752a334c", "هل مالك العقار هو مقدم الطلب؟"): "Is the property owner the applicant?",
    ("field_307ab61eb9", "هل يوجد وكيل قانوني؟"): "Is there a legal representative?",
    ("field_ccc9901249", "هل الطلب للمالك أم لمفوض عنه؟"): "Is the request for the owner or for an authorized representative?",
    ("seller_name", "اسم البائع"): "Seller name",
    ("seller_national_id", "الرقم الوطني للبائع"): "Seller national ID number",
    ("buyer_name", "اسم المشتري"): "Buyer name",
    ("buyer_national_id", "الرقم الوطني للمشتري"): "Buyer national ID number",
    ("phone_numbers", "أرقام الهواتف"): "Phone numbers",
    ("field_498ac74dd1", "هل البائع والمشتري داخل الأردن؟"): "Are the seller and the buyer in Jordan?",
    ("field_23afc22be9", "هل يوجد وكالة قانونية؟"): "Is there a legal power of attorney?",
    ("field_2013716fdf", "هل يوجد أكثر من مالك أو أكثر من مشتري؟"): "Is there more than one owner or more than one buyer?",
    ("applicant_name", "اسم مقدم الطلب"): "Applicant name",
    ("field_b8a0419109", "اسم المتوفى"): "Name of the deceased",
    ("field_a4c0cc56df", "عدد الورثة"): "Number of heirs",
    ("field_ac120aaeaa", "هل صدرت حجة حصر الإرث؟"): "Has the inheritance certificate been issued?",
    ("field_6dd0ca5286", "نوع حجة حصر الإرث (شرعية/كنسية)"): "Inheritance certificate type (Sharia/ecclesiastical)",
    ("field_45a27f6310", "هل يوجد وكيل قانوني يمثل جميع الورثة؟"): "Is there a legal representative for all the heirs?",
    ("field_da11e8ca0f", "هل جميع الورثة داخل الأردن؟"): "Are all the heirs in Jordan?",
    ("field_44b3e07432", "هل يوجد قاصر ضمن الورثة؟"): "Is there a minor among the heirs?",
    ("field_3cd1e5af3a", "اسم الواهب"): "Donor name",
    ("field_c67372ee55", "الرقم الوطني للواهب"): "Donor national ID number",
    ("field_11eb543426", "اسم الموهوب له"): "Recipient name",
    ("field_fdba9f39a6", "الرقم الوطني للموهوب له"): "Recipient national ID number",
    ("field_e2f57bbb81", "هل توجد صلة قرابة بين الواهب والموهوب له؟"): "Are the donor and the recipient related?",
    ("field_f105f02706", "هل جميع الأطراف داخل الأردن؟"): "Are all the parties in Jordan?",
    ("field_41624b6665", "هل العقار مملوك بالكامل للواهب؟"): "Is the property wholly owned by the donor?",
    ("field_224269de21", "عدد الشركاء"): "Number of co-owners",
    ("field_4bca17a629", "هل جميع الشركاء موافقون على إزالة الشيوع؟"): "Do all co-owners agree to end the co-ownership?",
    ("field_5c6164c551", "إذا لا، هل يوجد حكم قضائي أو دعوى؟"): "If not, is there a court ruling or a lawsuit?",
    ("field_3c7283fc39", "كم عدد الشركاء؟"): "How many co-owners are there?",
    ("field_e9352003cb", "هل جميع الشركاء داخل الأردن؟"): "Are all the co-owners in Jordan?",
    ("field_2085c3cabf", "عدد القطع أو الوحدات المطلوب إفرازها"): "Number of plots or units to subdivide",
    ("field_649c50d973", "هل العقار أرض أم بناء؟"): "Is the property land or a building?",
    ("field_e7d765ce63", "هل الإفراز لقطعة أرض أم لشقق/وحدات؟"): "Is the subdivision for a land plot or for flats/units?",
    ("field_5ebd0dedc5", "كم عدد القطع أو الوحدات المطلوب إفرازها؟"): "How many plots or units are to be subdivided?",
    ("field_b18f129f12", "هل يوجد مخطط إفراز معتمد؟"): "Is there an approved subdivision plan?",
    ("field_9fe181a6e8", "هل جميع الملاك موافقون؟"): "Do all the owners agree?",
    ("field_56b1987951", "أرقام القطع المطلوب توحيدها"): "Numbers of the plots to consolidate",
    ("field_7d9efcd6d5", "أرقام الأحواض"): "Basin numbers",
    # CN-BIZ-04: plot and basin numbers as one repeater.
    ("plots", "أرقام القطع المطلوب توحيدها"): "Numbers of the plots to consolidate",
    # CN-BIZ-05 / CN-BIZ-08 developer-note fields (catalogue_rules.DEVELOPER_NOTE_FIELDS).
    ("site_coordinates", "إحداثيات الموقع (اختياري)"): "Site coordinates (optional)",
    ("release_approval_date", "تاريخ إصدار موافقة فك الرهن (اختياري)"): "Mortgage release approval issue date (optional)",
    ("field_b8d4677c65", "كم عدد القطع المطلوب توحيدها؟"): "How many plots are to be consolidated?",
    ("field_da334d766f", "هل جميع القطع مملوكة لنفس المالك؟"): "Are all the plots owned by the same owner?",
    ("field_b07ae7100c", "هل القطع متجاورة؟"): "Are the plots adjacent?",
    ("field_bbea5e4459", "سبب طلب تثبيت الحدود"): "Reason for the boundary demarcation request",
    ("field_57847bd284", "هل يوجد نزاع على حدود العقار؟"): "Is there a dispute over the property boundaries?",
    ("field_44f22ef962", "هل سبق تثبيت حدود العقار؟"): "Have the property boundaries been demarcated before?",
    ("field_8946eb1107", "هل يوجد تقرير مساحي سابق؟"): "Is there a previous survey report?",
    ("field_2525256bd4", "هل يمكن الوصول إلى موقع العقار بسهولة؟"): "Can the property site be reached easily?",
    ("survey_reason", "سبب طلب الكشف"): "Reason for the survey request",
    ("field_225e3741b4", "ما الغاية من الكشف المساحي؟"): "What is the purpose of the land survey?",
    ("field_711abf9b11", "هل يوجد مخطط أراضٍ حديث؟"): "Is there a recent cadastral map?",
    ("readjustment_reason", "سبب طلب إعادة التنظيم"): "Reason for the readjustment request",
    ("field_536eddb5ee", "اسم البلدية"): "Municipality name",
    ("field_b0926cf796", "ما سبب طلب إعادة التنظيم؟"): "Why is the readjustment requested?",
    ("field_da897ff7ee", "هل المنطقة مشمولة بمشروع إعادة تنظيم؟"): "Is the area covered by a readjustment project?",
    ("field_05c9a7346b", "هل توجد مخططات تنظيم معتمدة؟"): "Are there approved zoning plans?",
    ("field_729ed5c96d", "ما الغاية من الطلب؟"): "What is the purpose of the request?",
    ("field_d25b82bf60", "هل سبق تقديم طلب مشابه؟"): "Has a similar request been submitted before?",
    ("field_c7eea7fb68", "هل توجد ملاحظات إضافية؟"): "Are there any additional notes?",
    ("field_2a8f1a87c6", "ما الغاية من كشف التنظيم؟"): "What is the purpose of the zoning certificate?",
    ("field_c5251821b3", "هل سبق إصدار كشف تنظيم للعقار؟"): "Has a zoning certificate been issued for the property before?",
    ("current_land_use_classification", "صفة التنظيم الحالية"): "Current zoning classification",
    ("requested_land_use_classification", "صفة التنظيم المطلوبة"): "Requested zoning classification",
    ("request_reason", "سبب الطلب"): "Reason for the request",
    ("field_937cc4d5d6", "ما صفة التنظيم الحالية؟"): "What is the current zoning classification?",
    ("field_e825ca6266", "ما صفة التنظيم المطلوبة؟"): "What zoning classification is requested?",
    ("field_02572f19a1", "هل سبق تقديم طلب مماثل؟"): "Has a similar request been submitted before?",
    ("field_088e60f563", "ما سبب طلب التغيير؟"): "Why is the change requested?",
    ("request_purpose", "الغاية من الطلب"): "Purpose of the request",
    ("field_5dded7dd47", "ما الغاية من المخطط؟"): "What is the purpose of the plan?",
    ("field_c3bd9f38ed", "هل يوجد سند تسجيل؟"): "Is there a registration deed?",
    ("field_9702f3b4ac", "هل الطلب للمالك أم بموجب وكالة؟"): "Is the request for the owner or under a power of attorney?",
    ("field_54143bc9fe", "هل سبق إصدار مخطط سابق؟"): "Has a plan been issued before?",
    ("field_22e7ac2cd2", "ما الغاية من بيان التغيير؟"): "What is the purpose of the change statement?",
    ("field_bc07ea41c3", "هل الطلب للمالك؟"): "Is the request for the owner?",
    ("field_08d94d2888", "اسم الجهة المستفيدة"): "Name of the beneficiary party",
    ("field_3ece488644", "قيمة الرهن (إن وجدت)"): "Mortgage amount (if any)",
    ("field_d6467d46cf", "هل الرهن لصالح بنك أم جهة أخرى؟"): "Is the mortgage in favour of a bank or another party?",
    ("field_6ff5e81d0f", "هل يوجد تمويل قائم؟"): "Is there existing financing?",
    ("field_9209f03252", "هل جميع الملاك موافقون على الرهن؟"): "Do all the owners agree to the mortgage?",
    ("field_8a38c4158a", "اسم الجهة المرتهنة"): "Mortgagee name",
    ("field_e70300dbb6", "هل تم سداد كامل الالتزامات؟"): "Have all obligations been paid in full?",
    ("field_646f133865", "ما اسم الجهة المرتهنة؟"): "What is the mortgagee's name?",
    ("field_acf5f0c3dd", "هل يوجد كتاب رسمي بفك الرهن؟"): "Is there an official mortgage release letter?",
    ("field_530e3b26a8", "اسم المكتب الهندسي"): "Engineering office name",
    ("field_e021559e7a", "هل يوجد مكتب هندسي معتمد؟"): "Is there an accredited engineering office?",
    ("field_51b3ed7839", "هل الرخصة لبناء جديد أم إعادة بناء؟"): "Is the permit for a new building or a rebuild?",
    ("field_4874b04e76", "كم عدد الطوابق؟"): "How many floors?",
    ("field_65bdb1ffad", "هل توجد وكالة قانونية؟"): "Is there a legal power of attorney?",
}

# (option value, Arabic label) -> English label
OPTION_LABELS_EN = {
    ("option-0a92494ea1", "الاسم"): "Name",
    ("option-baffa49c77", "العنوان"): "Address",
    ("option-9847728b58", "رأس المال"): "Capital",
    ("option-4a70a21c85", "الشركاء"): "Partners",
    ("option-ea1d1a555e", "الحصص"): "Shares",
    ("option-b95f941f9f", "الإدارة"): "Management",
    ("option-8f81238d8b", "المفوضون وغيرها"): "Authorized signatories and other",
    ("option-1454010c52", "شركة"): "Company",
    ("option-4ec31d2a1e", "مؤسسة فردية"): "Sole proprietorship",
    ("option-e733144159", "عادية"): "Normal",
    ("option-4ec75f75be", "مصدقة"): "Certified",
    ("option-ff4dfb290b", "فرد"): "Individual",
    ("option-ab118c07c4", "مؤسسة"): "Establishment",
    ("option-5824a2950c", "تسجيل جديد"): "New registration",
    ("option-3cd6ab5a19", "تحري"): "Search",
    ("option-c0dfca2308", "تجديد"): "Renewal",
    ("option-b4f76c3aa2", "تعديل"): "Amendment",
    ("option-584bf3e58a", "نقل ملكية"): "Transfer of ownership",
    ("option-32bacf63ef", "إصدار أو تصديق وثائق"): "Issue or attest documents",
    ("option-83b4b55adb", "أخرى"): "Other",
    ("option-25ed5f934a", "إصدار"): "Issue",
    ("option-e776b0209b", "إلغاء"): "Cancellation",
    ("option-d8884e62da", "مالك"): "Owner",
    ("option-0b2ff0c3f8", "مستأجر"): "Tenant",
    ("option-32a2f9e50e", "غير ذلك"): "Other",
    ("option-48287071e7", "شطب"): "Deregistration",
    ("option-9ece42b994", "تصفية"): "Liquidation",
    ("option-b6842e3fc8", "للمالك"): "For the owner",
    ("option-48dcbd0d5b", "لمفوض عنه"): "For an authorized representative",
    ("option-76a07fdf16", "أرض"): "Land",
    ("option-928e61dc61", "بناء"): "Building",
    ("option-7d77b845a5", "قطعة أرض"): "Land plot",
    ("option-519c3ae76d", "شقق/وحدات"): "Flats/units",
    ("option-eeccba9b94", "بموجب وكالة"): "Under a power of attorney",
    ("option-f879f70ca6", "بنك"): "Bank",
    ("option-1062abbb31", "جهة أخرى"): "Another party",
    ("option-9dc5524944", "بناء جديد"): "New building",
    ("option-c6e00d2349", "إعادة بناء"): "Rebuild",
}

# (document code, Arabic name) -> English name
DOCUMENT_NAMES_EN = {
    ("national-id", "هوية شخصية"): "Personal ID",
    ("authorization-letter", "تفويض إن وجد"): "Authorization (if any)",
    ("document_b84500235f", "صورة هوية/جواز سفر الشركاء"): "Partners' ID or passport copies",
    ("document_a7c41b216c", "موافقات مسبقة على الغايات/الأنشطة"): "Prior approvals for the objectives/activities",
    ("document_d6f5694849", "وثائق الحصص العينية"): "In-kind share documents",
    ("document_6a5fef1088", "وثائق الشركة الأجنبية مصدقة ومترجمة"): "Foreign company documents, attested and translated",
    ("document_bf9b841bf1", "وثائق المستفيد الحقيقي"): "Beneficial owner documents",
    ("document_cb35245bcf", "محضر/قرار الهيئة العامة أو هيئة المديرين أو مجلس الإدارة"): "Minutes/resolution of the general assembly, board of managers or board of directors",
    ("document_39a02bfad7", "عقد ونظام الشركة المعدلان أو النماذج المعتمدة"): "Amended company contract and articles of association, or the approved forms",
    ("document_e6d6a52927", "عقد/وثائق تحويل الحصص"): "Share transfer contract/documents",
    ("document_bb343bc1a7", "هوية الأطراف المعنية بالتعديل"): "IDs of the parties concerned by the amendment",
    ("document_04defb9ccb", "موافقات الجهات المختصة"): "Approvals of the competent authorities",
    ("document_cdd8ce3328", "محضر/قرار الجهة المختصة في الشركة بالموافقة على تعديل الغايات"): "Minutes/resolution of the company's competent body approving the change of objectives",
    ("document_ec8d545fbf", "عقد/نظام معدل أو النموذج المعتمد"): "Amended contract/articles of association or the approved form",
    ("document_cc8affb2cc", "موافقات مسبقة على الغاية الجديدة"): "Prior approvals for the new objective",
    ("document_85697877bb", "إثبات شخصية مقدم الطلب"): "Applicant's proof of identity",
    ("document_5ca1add6b9", "كتاب تفويض من الشركة"): "Authorization letter from the company",
    ("document_af883d59b3", "وكالة عدلية"): "Notarized power of attorney",
    ("document_11714fabf5", "تفويض خطي"): "Written authorization",
    ("document_197c7d7fc0", "إثبات شخصية صاحب الطلب"): "Requester's proof of identity",
    ("document_322e004de0", "شهادة/بيانات تسجيل الشركة أو المنشأة"): "Company or establishment registration certificate/details",
    ("document_d038474c7a", "تفويض خطي أو وكالة"): "Written authorization or power of attorney",
    ("document_1b1707d621", "مستند يبرر استخدام اسم خاص/أجنبي"): "Document justifying the use of a proper/foreign name",
    ("document_5eb4193ba1", "صورة واضحة للعلامة / الشعار"): "Clear image of the trademark / logo",
    ("document_fd135ce03f", "إثبات شخصية مالك العلامة"): "Trademark owner's proof of identity",
    ("document_d7d63d7027", "شهادة/سجل الشركة أو المؤسسة"): "Company or establishment certificate/record",
    ("document_7672fa9fbe", "شهادة تسجيل العلامة السابقة"): "Previous trademark registration certificate",
    ("document_fb697280d9", "وثائق نقل الملكية ونماذج التنازل/النقل"): "Ownership transfer documents and assignment/transfer forms",
    ("document_56caf9c71a", "مستندات داعمة للتعديل"): "Supporting documents for the amendment",
    ("document_b7393c5318", "إثبات شخصية صاحب العلاقة/مقدم الطلب"): "Proof of identity of the concerned party/applicant",
    ("document_1c40b3e58a", "عقد إيجار ساري أو سند ملكية"): "Valid lease contract or ownership deed",
    ("document_602b0a206b", "إذن إشغال"): "Occupancy permit",
    ("document_69e9a26d6e", "رخصة/مخططات إنشائية أو شهادة ترخيص إنشائي"): "Construction licence/plans or construction licensing certificate",
    ("document_3df268a71b", "موافقات الجهات المختصة بالنشاط"): "Approvals of the authorities responsible for the activity",
    ("document_ef81fa254a", "رخصة المهن الحالية"): "Current business licence",
    ("document_f56c2e0812", "تفويض خطي أو وكالة عدلية"): "Written authorization or notarized power of attorney",
    ("document_5375b03f66", "موافقة مالك العقار"): "Property owner's consent",
    ("document_f0fbb87902", "قرار/طلب الشطب أو التصفية موقع حسب الأصول"): "Duly signed deregistration or liquidation resolution/request",
    ("document_3bee74c311", "تفويض أو وكالة للشخص الذي يتابع الإجراءات"): "Authorization or power of attorney for the person following up the procedures",
    ("document_ddc0c08e82", "براءة ذمة من الضمان الاجتماعي"): "Social security clearance",
    ("document_7713142b41", "براءة ذمة من ضريبة الدخل والمبيعات"): "Income and sales tax clearance",
    ("document_8e430fe32b", "شهادة شطب الاسم التجاري"): "Trade name deregistration certificate",
    ("document_6192cecaba", "براءات ذمة/موافقات إضافية من الجهات المختصة"): "Additional clearances/approvals from the competent authorities",
    ("document_37e2d6c45c", "تقرير المصفي وتقارير التصفية"): "Liquidator's report and liquidation reports",
    ("document_652dd91fc4", "موافقات/قرارات الشركاء على التصفية والتقرير النهائي"): "Partners' approvals/resolutions on the liquidation and the final report",
    ("document_c82005f833", "إذن المحكمة المختصة"): "Permission of the competent court",
    ("document_74a2f98299", "أي بيانات تساعد في تحديد العقار"): "Any information that helps identify the property",
    ("document_b0f143ad16", "أي وثائق إضافية تطلبها الجهة المختصة"): "Any additional documents requested by the competent authority",
    ("document_b03d952538", "أي مستندات إضافية تطلبها الجهة المختصة"): "Any additional documents requested by the competent authority",
    ("document_443aae22bf", "شهادة الوفاة"): "Death certificate",
    ("document_c3a3aa1c50", "صور هويات الورثة"): "Copies of the heirs' IDs",
    ("document_564406e175", "صورة هوية الواهب"): "Donor's ID copy",
    ("document_11667481fd", "صورة هوية الموهوب له"): "Recipient's ID copy",
    ("document_7c6a69c2f4", "سندات تسجيل جميع القطع"): "Registration deeds of all the plots",
    ("document_a4c4fed3af", "الهوية"): "ID",
    ("document_0cc19c2317", "مخطط أراضٍ إن وجد"): "Cadastral map, if any",
    ("document_e95445e836", "وكالة قانونية إن وجدت"): "Legal power of attorney, if any",
    ("document_3775124a52", "مخطط موقع تنظيمي"): "Zoning site plan",
    ("document_3775124a52", "مخطط موقع تنظيمي (إن وجد)"): "Zoning site plan (if any)",
    ("document_5c2f8f95d1", "عقد التمويل أو اتفاقية الرهن (إن وجدت)"): "Financing contract or mortgage agreement (if any)",
    ("document_d2024a06a1", "كتاب أو موافقة فك الرهن من الجهة المرتهنة"): "Mortgage release letter or consent from the mortgagee",
    ("document_3443627d36", "المخططات الهندسية"): "Engineering drawings",
    ("site_photos", "صور الموقع"): "Site photos",
}

_BUSINESS_SUFFIX_AR = (
    " يقوم فريق خلّصني بمراجعة البيانات والوثائق ومتابعة الإجراءات لدى الجهات المختصة، "
    "مع طلب أي مستند إضافي عند الحاجة حسب حالة المعاملة."
)
_BUSINESS_SUFFIX_EN = (
    " The Khalsni team reviews the details and documents and follows up the procedures with the "
    "competent authorities, requesting any additional document when needed depending on the case."
)


def _business(summary_ar, summary_en):
    return {
        "short_description": (summary_ar, summary_en),
        "description": (summary_ar + _BUSINESS_SUFFIX_AR, summary_en + _BUSINESS_SUFFIX_EN),
    }


# slug -> {text field: (Arabic source, English translation)}
SERVICE_TEXT_EN = {
    "business_company_registration": _business(
        "تقديم طلب تأسيس شركة جديدة ومتابعة إجراءات التسجيل حتى اكتمال المعاملة.",
        "Submit a request to establish a new company and follow up the registration procedures until the transaction is complete.",
    ),
    "business_company_information_amendment": _business(
        "تقديم طلب لتعديل بيانات شركة قائمة ومتابعة إجراءات التعديل حتى اكتمالها.",
        "Submit a request to amend the details of an existing company and follow up the amendment procedures until they are complete.",
    ),
    "business_company_add_activities": _business(
        "تقديم طلب لإضافة غايات أو أنشطة جديدة إلى شركة قائمة ومتابعة إجراءات التعديل.",
        "Submit a request to add new objectives or activities to an existing company and follow up the amendment procedures.",
    ),
    "business_commercial_registration_certificate": _business(
        "طلب استخراج/إصدار شهادة سجل تجاري ومتابعة الطلب حتى التسليم.",
        "Request the extraction/issue of a commercial registration certificate and follow up the request until delivery.",
    ),
    "business_trade_name_certificate": _business(
        "طلب إصدار شهادة لاسم تجاري مسجل ومتابعة استخراجها حتى التسليم.",
        "Request a certificate for a registered trade name and follow up its issue until delivery.",
    ),
    "business_trade_name_registration": _business(
        "تقديم طلب تسجيل اسم تجاري جديد ومتابعة الإجراءات حتى اكتمال التسجيل.",
        "Submit a request to register a new trade name and follow up the procedures until the registration is complete.",
    ),
    "business_trademark_services": _business(
        "تقديم طلب متعلق بعلامة تجارية ومتابعة الإجراء المطلوب حتى اكتمال المعاملة.",
        "Submit a trademark-related request and follow up the required procedure until the transaction is complete.",
    ),
    "business_license_services": _business(
        "طلب إصدار أو تجديد أو تعديل أو إلغاء رخصة مهن حسب نوع النشاط والبلدية.",
        "Request the issue, renewal, amendment or cancellation of a business licence according to the activity type and the municipality.",
    ),
    "business_company_closure_liquidation": _business(
        "تقديم طلب شطب أو تصفية شركة قائمة ومتابعة الإجراءات حتى اكتمالها.",
        "Submit a request to deregister or liquidate an existing company and follow up the procedures until they are complete.",
    ),
    "request-property-registration-certificate": {
        "short_description": (
            "تقديم طلب لاستخراج سند تسجيل رسمي للعقار من دائرة الأراضي والمساحة.",
            "Submit a request for an official property registration deed from the Department of Lands and Survey.",
        ),
        "description": (
            "تتيح هذه الخدمة للعميل تقديم طلب لاستخراج سند تسجيل رسمي للعقار، مع قيام فريق خلّصني بمتابعة الطلب لدى دائرة الأراضي والمساحة حتى استلام سند التسجيل وتسليمه للعميل.",
            "This service lets the customer request an official registration deed for a property, with the Khalsni team following up the request with the Department of Lands and Survey until the registration deed is received and delivered to the customer.",
        ),
        "delivery_note": ("حسب إجراءات دائرة الأراضي والمساحة.", "According to the Department of Lands and Survey procedures."),
    },
    "request-cadastral-map": {
        "short_description": (
            "تقديم طلب للحصول على مخطط أراضٍ رسمي يوضح بيانات قطعة الأرض.",
            "Submit a request for an official cadastral map showing the land plot details.",
        ),
        "description": (
            "تتيح هذه الخدمة للعميل تقديم طلب للحصول على مخطط أراضٍ رسمي صادر عن دائرة الأراضي والمساحة، ويحتوي على بيانات القطعة والحوض والموقع وحدود الأرض وفق السجلات الرسمية. يتولى فريق خلّصني متابعة الطلب حتى إصدار المخطط وتسليمه للعميل.",
            "This service lets the customer request an official cadastral map issued by the Department of Lands and Survey, showing the parcel, basin, location and land boundaries according to the official records. The Khalsni team follows up the request until the map is issued and delivered to the customer.",
        ),
        "delivery_note": ("حسب إجراءات دائرة الأراضي والمساحة.", "According to the Department of Lands and Survey procedures."),
    },
    "request-property-ownership-transfer": {
        "short_description": (
            "تقديم طلب لنقل ملكية عقار وفقًا للإجراءات المعتمدة لدى دائرة الأراضي والمساحة.",
            "Submit a request to transfer the ownership of a property according to the approved procedures of the Department of Lands and Survey.",
        ),
        "description": (
            "تتيح هذه الخدمة للعميل تقديم طلب لنقل ملكية عقار بين البائع والمشتري، مع قيام فريق خلّصني بمتابعة جميع الإجراءات لدى دائرة الأراضي والمساحة حتى إتمام عملية نقل الملكية وإصدار سند التسجيل باسم المالك الجديد.",
            "This service lets the customer request the transfer of a property's ownership between the seller and the buyer, with the Khalsni team following up all procedures with the Department of Lands and Survey until the transfer is completed and the registration deed is issued in the new owner's name.",
        ),
        "delivery_note": (
            "حسب إجراءات دائرة الأراضي والمساحة واستكمال الوثائق.",
            "According to the Department of Lands and Survey procedures and the completion of the documents.",
        ),
    },
    "request-inheritance-registration": {
        "short_description": (
            "تقديم طلب لتسجيل الإرث ونقل ملكية العقار من المتوفى إلى الورثة وفقًا لحجة حصر الإرث.",
            "Submit a request to register an inheritance and transfer the property from the deceased to the heirs according to the inheritance certificate.",
        ),
        "description": (
            "تتيح هذه الخدمة للعميل تقديم طلب لتسجيل الإرث ونقل ملكية العقار من المتوفى إلى الورثة الشرعيين أو القانونيين استنادًا إلى حجة حصر الإرث الصادرة عن المحكمة المختصة، مع متابعة جميع الإجراءات لدى دائرة الأراضي والمساحة حتى إصدار سندات التسجيل بأسماء الورثة.",
            "This service lets the customer request the registration of an inheritance and the transfer of a property from the deceased to the legal heirs based on the inheritance certificate issued by the competent court, following up all procedures with the Department of Lands and Survey until the registration deeds are issued in the heirs' names.",
        ),
        "delivery_note": (
            "حسب إجراءات دائرة الأراضي والمساحة واستكمال الوثائق.",
            "According to the Department of Lands and Survey procedures and the completion of the documents.",
        ),
    },
    "request-property-gift-transfer": {
        "short_description": (
            "تقديم طلب لنقل ملكية عقار عن طريق الهبة وفقًا للإجراءات والأنظمة المعمول بها.",
            "Submit a request to transfer the ownership of a property as a gift according to the applicable procedures and regulations.",
        ),
        "description": (
            "تتيح هذه الخدمة تقديم طلب لنقل ملكية عقار عن طريق الهبة بين الأطراف المستحقة وفقًا للتشريعات المعمول بها، مع متابعة جميع الإجراءات لدى دائرة الأراضي والمساحة حتى استكمال نقل الملكية وإصدار سند التسجيل باسم الموهوب له.",
            "This service lets you request the transfer of a property's ownership as a gift between the eligible parties according to the applicable legislation, following up all procedures with the Department of Lands and Survey until the transfer is completed and the registration deed is issued in the recipient's name.",
        ),
        "delivery_note": (
            "حسب إجراءات دائرة الأراضي والمساحة واستكمال الوثائق.",
            "According to the Department of Lands and Survey procedures and the completion of the documents.",
        ),
    },
    "request-termination-of-co-ownership": {
        "short_description": (
            "تقديم طلب لإنهاء حالة الشيوع بين المالكين وفقًا للإجراءات المعتمدة.",
            "Submit a request to end the co-ownership between the owners according to the approved procedures.",
        ),
        "description": (
            "تتيح هذه الخدمة تقديم طلب إزالة الشيوع للعقارات المملوكة على الشيوع بين أكثر من مالك، مع متابعة جميع الإجراءات لدى الجهات المختصة حتى إنهاء الملكية المشتركة وفقًا للأنظمة والتعليمات المعمول بها.",
            "This service lets you request the termination of co-ownership for properties jointly owned by more than one owner, following up all procedures with the competent authorities until the joint ownership is ended according to the applicable regulations and instructions.",
        ),
        "delivery_note": (
            "حسب إجراءات دائرة الأراضي والمساحة وطبيعة المعاملة.",
            "According to the Department of Lands and Survey procedures and the nature of the transaction.",
        ),
    },
    "request-property-subdivision": {
        "short_description": (
            "تقديم طلب لتقسيم العقار أو قطعة الأرض إلى قطع أو وحدات مستقلة.",
            "Submit a request to divide a property or land plot into separate plots or units.",
        ),
        "description": (
            "تتيح هذه الخدمة تقديم طلب إفراز لعقار أو قطعة أرض بهدف تقسيمها إلى قطع أو وحدات مستقلة وفقًا لمتطلبات الجهات المختصة. يتولى فريق خلّصني متابعة جميع الإجراءات مع الجهات ذات العلاقة حتى استكمال المعاملة وإصدار المستندات اللازمة.",
            "This service lets you request the subdivision of a property or land plot into separate plots or units according to the requirements of the competent authorities. The Khalsni team follows up all procedures with the relevant authorities until the transaction is complete and the necessary documents are issued.",
        ),
        "delivery_note": (
            "حسب إجراءات الجهات المختصة وطبيعة العقار.",
            "According to the procedures of the competent authorities and the nature of the property.",
        ),
    },
    "request-property-consolidation": {
        "short_description": (
            "تقديم طلب لتوحيد قطعتين أو أكثر ضمن عقار واحد وفق الأنظمة المعمول بها.",
            "Submit a request to consolidate two or more plots into one property according to the applicable regulations.",
        ),
        "description": (
            "تتيح هذه الخدمة تقديم طلب لتوحيد قطعتين أو أكثر لتصبح قطعة عقارية واحدة، مع متابعة جميع الإجراءات لدى دائرة الأراضي والمساحة والجهات المختصة حتى استكمال عملية التوحيد وإصدار سند التسجيل الجديد.",
            "This service lets you request the consolidation of two or more plots into a single plot, following up all procedures with the Department of Lands and Survey and the competent authorities until the consolidation is complete and the new registration deed is issued.",
        ),
        "delivery_note": (
            "حسب إجراءات دائرة الأراضي والمساحة وطبيعة المعاملة.",
            "According to the Department of Lands and Survey procedures and the nature of the transaction.",
        ),
    },
    "request-boundary-demarcation": {
        "short_description": (
            "تقديم طلب لتحديد وتثبيت حدود العقار على أرض الواقع وفق السجلات الرسمية.",
            "Submit a request to identify and demarcate the property boundaries on site according to the official records.",
        ),
        "description": (
            "تتيح هذه الخدمة تقديم طلب لتثبيت حدود العقار من خلال تحديد حدوده ميدانياً بالاستناد إلى المخططات والسجلات الرسمية، مع متابعة الإجراءات لدى دائرة الأراضي والمساحة والتنسيق مع مكتب المساحة والجهات المختصة حتى استكمال المعاملة.",
            "This service lets you request the demarcation of a property's boundaries by identifying them on site based on the official plans and records, following up the procedures with the Department of Lands and Survey and coordinating with the survey office and the competent authorities until the transaction is complete.",
        ),
        "delivery_note": (
            "حسب إجراءات دائرة الأراضي والمساحة وطبيعة المعاملة.",
            "According to the Department of Lands and Survey procedures and the nature of the transaction.",
        ),
    },
    "request-land-survey": {
        "short_description": (
            "تقديم طلب لإجراء كشف مساحي على قطعة أرض بواسطة مسّاح معتمد لتحديد الموقع أو إعداد تقرير مساحي حسب الغاية المطلوبة.",
            "Submit a request for a land survey of a plot by an accredited surveyor to locate the site or prepare a survey report for the required purpose.",
        ),
        "description": (
            "تتيح هذه الخدمة للعميل طلب كشف مساحي لقطعة أرض من خلال مسّاح معتمد، مع متابعة إجراءات التنسيق حتى استلام التقرير أو المخطط المساحي وفق الأنظمة والتعليمات النافذة.",
            "This service lets the customer request a land survey of a plot by an accredited surveyor, following up the coordination until the survey report or plan is received according to the regulations and instructions in force.",
        ),
        "delivery_note": (
            "حسب إجراءات دائرة الأراضي والمساحة وطبيعة المعاملة.",
            "According to the Department of Lands and Survey procedures and the nature of the transaction.",
        ),
    },
    "request-property-readjustment": {
        "short_description": (
            "تقديم طلب لمتابعة إجراءات إعادة تنظيم قطعة أرض وفق الأنظمة والتعليمات المعمول بها.",
            "Submit a request to follow up the readjustment procedures of a land plot according to the applicable regulations and instructions.",
        ),
        "description": (
            "تتيح هذه الخدمة للعميل تقديم طلب لإعادة تنظيم قطعة أرض ومتابعة الإجراءات لدى الجهات المختصة حتى استكمال المعاملة، بالتنسيق مع مزود الخدمة والجهات الرسمية.",
            "This service lets the customer request the readjustment of a land plot and follow up the procedures with the competent authorities until the transaction is complete, in coordination with the service provider and the official authorities.",
        ),
        "delivery_note": (
            "حسب إجراءات الجهات المختصة وطبيعة المعاملة.",
            "According to the procedures of the competent authorities and the nature of the transaction.",
        ),
    },
    "request-zoning-certificate": {
        "short_description": (
            "تقديم طلب للحصول على كشف يوضح الوضع والتنظيم المعتمد للعقار.",
            "Submit a request for a certificate showing the status and approved zoning of a property.",
        ),
        "description": (
            "تتيح هذه الخدمة تقديم طلب للحصول على كشف تنظيم يبين المعلومات التنظيمية الأساسية للعقار وفق السجلات والجهة المختصة. تم الإبقاء على هذه الخدمة في النظام لحين المراجعة النهائية والتأكد من عدم تداخلها مع خدمة طلب مخطط موقع تنظيمي.",
            "This service lets you request a zoning certificate showing the basic zoning information of a property according to the records and the competent authority. This service is kept in the system until the final review confirms it does not overlap with the zoning site plan service.",
        ),
        "delivery_note": (
            "حسب إجراءات البلدية أو الجهة المختصة.",
            "According to the procedures of the municipality or the competent authority.",
        ),
    },
    "request-land-use-classification-change": {
        "short_description": (
            "تقديم طلب لمتابعة إجراءات تغيير صفة تنظيم العقار لدى الجهات المختصة.",
            "Submit a request to follow up the procedures for changing a property's zoning classification with the competent authorities.",
        ),
        "description": (
            "تتيح هذه الخدمة للعميل تقديم طلب لتغيير صفة تنظيم قطعة أرض أو عقار وفق التشريعات النافذة، مع متابعة المعاملة لدى الجهات المختصة حتى اكتمال الإجراءات.",
            "This service lets the customer request a change in the zoning classification of a land plot or property according to the legislation in force, following up the transaction with the competent authorities until the procedures are complete.",
        ),
        "delivery_note": (
            "حسب إجراءات الجهات المختصة وطبيعة المعاملة.",
            "According to the procedures of the competent authorities and the nature of the transaction.",
        ),
    },
    "request-zoning-plan": {
        "short_description": (
            "تقديم طلب لاستخراج أو الحصول على مخطط تنظيمي للعقار من الجهة المختصة.",
            "Submit a request to obtain a zoning plan of a property from the competent authority.",
        ),
        "description": (
            "تمكن هذه الخدمة العميل من طلب مخطط تنظيمي يوضح صفة التنظيم والارتدادات والطرق والتنظيم المعتمد للعقار، مع متابعة الطلب لدى الجهات المختصة حتى استلام المخطط.",
            "This service lets the customer request a zoning plan showing the zoning classification, setbacks, roads and approved zoning of a property, following up the request with the competent authorities until the plan is received.",
        ),
        "delivery_note": (
            "حسب مدة إصدار المخطط من الجهة المختصة.",
            "According to the time the competent authority takes to issue the plan.",
        ),
    },
    "request-change-statement": {
        "short_description": (
            "تقديم طلب للحصول على بيان تغيير خاص بالعقار وفق سجلات الجهات المختصة.",
            "Submit a request for a change statement for a property according to the records of the competent authorities.",
        ),
        "description": (
            "تمكن هذه الخدمة العميل من طلب إصدار بيان تغيير يوضح التعديلات أو التغييرات المسجلة على العقار، مع متابعة المعاملة لدى الجهات المختصة حتى استلام الوثيقة.",
            "This service lets the customer request a change statement showing the amendments or changes recorded on a property, following up the transaction with the competent authorities until the document is received.",
        ),
        "delivery_note": ("حسب إجراءات الجهة المختصة.", "According to the competent authority's procedures."),
    },
    "request-property-mortgage-registration": {
        "short_description": (
            "تقديم طلب لتسجيل رهن على عقار لصالح جهة ممولة أو مستفيدة.",
            "Submit a request to register a mortgage on a property in favour of a financing or beneficiary party.",
        ),
        "description": (
            "تتيح هذه الخدمة تقديم طلب لتسجيل رهن رسمي على عقار لدى دائرة الأراضي والمساحة لصالح بنك أو مؤسسة تمويل أو أي جهة مستفيدة، مع متابعة جميع الإجراءات حتى تسجيل الرهن وإصدار المستندات الرسمية.",
            "This service lets you request the registration of an official mortgage on a property with the Department of Lands and Survey in favour of a bank, a financing institution or any beneficiary party, following up all procedures until the mortgage is registered and the official documents are issued.",
        ),
        "delivery_note": (
            "حسب إجراءات دائرة الأراضي والمساحة واستكمال الوثائق.",
            "According to the Department of Lands and Survey procedures and the completion of the documents.",
        ),
    },
    "request-mortgage-release": {
        "short_description": (
            "تقديم طلب لإلغاء وفك الرهن المسجل على العقار بعد استيفاء المتطلبات.",
            "Submit a request to cancel and release the mortgage registered on a property once the requirements are met.",
        ),
        "description": (
            "تتيح هذه الخدمة تقديم طلب لفك الرهن المسجل على العقار بعد سداد الالتزامات أو تحقق شروط فك الرهن، مع متابعة جميع الإجراءات لدى دائرة الأراضي والمساحة والجهة المرتهنة حتى إصدار إشعار فك الرهن وتحديث السجلات.",
            "This service lets you request the release of the mortgage registered on a property after the obligations are paid or the release conditions are met, following up all procedures with the Department of Lands and Survey and the mortgagee until the release notice is issued and the records are updated.",
        ),
        "delivery_note": (
            "حسب إجراءات دائرة الأراضي والمساحة والجهة المرتهنة.",
            "According to the procedures of the Department of Lands and Survey and the mortgagee.",
        ),
    },
    "request-building-permit": {
        "short_description": (
            "تقديم طلب للحصول على رخصة بناء جديدة وفق الأنظمة المعمول بها.",
            "Submit a request for a new building permit according to the applicable regulations.",
        ),
        "description": (
            "تتيح هذه الخدمة تقديم طلب للحصول على رخصة بناء لعقار أو قطعة أرض، مع متابعة الطلب لدى البلدية أو أمانة عمان والجهات المختصة حتى إصدار رخصة البناء بعد استكمال المتطلبات الفنية والتنظيمية.",
            "This service lets you request a building permit for a property or land plot, following up the request with the municipality or the Greater Amman Municipality and the competent authorities until the building permit is issued once the technical and zoning requirements are complete.",
        ),
        "delivery_note": (
            "حسب إجراءات البلدية أو أمانة عمان والجهات المختصة.",
            "According to the procedures of the municipality or the Greater Amman Municipality and the competent authorities.",
        ),
    },
}


# slug -> (Arabic terms as imported from the client sheet, English translation)
TERMS_EN = {
    'request-property-registration-certificate': (
        'الشروط: • تقديم بيانات العقار بشكل صحيح.• تقديم الوثائق المطلوبة.• تخضع الخدمة لإجراءات ورسوم دائرة الأراضي والمساحة.\nمعلومات التشغيل: الجهة المنفذة: دائرة الأراضي والمساحة.مزود الخدمة: معقب معاملات معتمد.يمكن تنفيذها بوكالة: نعم.تحتاج حضور العميل: حسب الحالة.تصنيف التشغيل: خدمة وثائق عقارية.',
        'Conditions: • Provide the property details correctly. • Provide the required documents. • The service is subject to the procedures and fees of the Department of Lands and Survey.\nOperational information: Executing authority: Department of Lands and Survey. Service provider: accredited transaction agent. Can be carried out under a power of attorney: yes. Customer attendance required: depending on the case. Operational category: property documents service.',
    ),
    'request-cadastral-map': (
        'الشروط: • تقديم بيانات العقار بشكل صحيح.• توفير الوثائق المطلوبة.• تخضع الخدمة لإجراءات ورسوم دائرة الأراضي والمساحة.\nمعلومات التشغيل: الجهة المنفذة: دائرة الأراضي والمساحة.مزود الخدمة: معقب معاملات معتمد.يمكن تنفيذها بوكالة: نعم.تحتاج حضور العميل: غالبًا لا.تصنيف التشغيل: خدمة وثائق ومخططات عقارية.',
        'Conditions: • Provide the property details correctly. • Provide the required documents. • The service is subject to the procedures and fees of the Department of Lands and Survey.\nOperational information: Executing authority: Department of Lands and Survey. Service provider: accredited transaction agent. Can be carried out under a power of attorney: yes. Customer attendance required: usually not. Operational category: property documents and plans service.',
    ),
    'request-property-ownership-transfer': (
        'الشروط: • حضور الأطراف أو من يمثلهم قانونيًا عند الحاجة.• تقديم جميع الوثائق المطلوبة.• تخضع المعاملة للأنظمة والرسوم الرسمية.\nمعلومات التشغيل: الجهة المنفذة: دائرة الأراضي والمساحة.مزود الخدمة: معقب معاملات عقارية.يمكن تنفيذها بوكالة: نعم.قد تتطلب حضور الأطراف: حسب الحالة.تصنيف التشغيل: معاملات نقل الملكية.',
        'Conditions: • Attendance of the parties or their legal representatives when needed. • Submission of all the required documents. • The transaction is subject to the official regulations and fees.\nOperational information: Executing authority: Department of Lands and Survey. Service provider: property transaction agent. Can be carried out under a power of attorney: yes. May require the attendance of the parties: depending on the case. Operational category: ownership transfer transactions.',
    ),
    'request-inheritance-registration': (
        'الشروط: • صدور حجة حصر إرث من المحكمة المختصة.• تقديم جميع الوثائق المطلوبة.• حضور الورثة أو من يمثلهم قانونيًا عند الحاجة.• قد تختلف المتطلبات حسب طبيعة العقار وعدد الورثة.\nمعلومات التشغيل: الجهة المنفذة: دائرة الأراضي والمساحة.الجهة المرجعية: المحكمة الشرعية أو المحكمة الكنسية لإصدار حجة حصر الإرث.مزود الخدمة: معقب معاملات عقارية.يمكن تنفيذها بوكالة: نعم.تصنيف التشغيل: معاملات نقل الملكية بالإرث.',
        'Conditions: • An inheritance limitation deed issued by the competent court. • Submission of all the required documents. • Attendance of the heirs or their legal representatives when needed. • Requirements may differ depending on the nature of the property and the number of heirs.\nOperational information: Executing authority: Department of Lands and Survey. Reference authority: the Sharia court or the ecclesiastical court, which issues the inheritance limitation deed. Service provider: property transaction agent. Can be carried out under a power of attorney: yes. Operational category: ownership transfer by inheritance.',
    ),
    'request-property-gift-transfer': (
        'الشروط: • أن يكون الواهب مالكًا للعقار.• حضور الأطراف أو من يمثلهم قانونيًا عند الحاجة.• تقديم جميع الوثائق المطلوبة.• تخضع المعاملة للأنظمة والرسوم الرسمية.\nمعلومات التشغيل: الجهة المنفذة: دائرة الأراضي والمساحة.مزود الخدمة: معقب معاملات عقارية.يمكن تنفيذها بوكالة: نعم.قد تتطلب حضور الأطراف حسب الحالة.تصنيف التشغيل: معاملات نقل الملكية - هبة.',
        'Conditions: • The donor must own the property. • Attendance of the parties or their legal representatives when needed. • Submission of all the required documents. • The transaction is subject to the official regulations and fees.\nOperational information: Executing authority: Department of Lands and Survey. Service provider: property transaction agent. Can be carried out under a power of attorney: yes. May require the attendance of the parties depending on the case. Operational category: ownership transfer transactions - gift.',
    ),
    'request-termination-of-co-ownership': (
        'الشروط: • أن يكون العقار مملوكًا على الشيوع.• تقديم الوثائق المطلوبة.• قد تتطلب المعاملة موافقة جميع الشركاء أو قرارًا من الجهة المختصة.• تخضع المعاملة للأنظمة النافذة.\nمعلومات التشغيل: الجهة المنفذة: دائرة الأراضي والمساحة.مزود الخدمة: مكتب مساحة/معقب معاملات عقارية.يمكن تنفيذها بوكالة: نعم.قد تتطلب حضور الشركاء حسب الحالة.تصنيف التشغيل: خدمات مكتب المساحة.',
        'Conditions: • The property must be jointly owned. • Submission of the required documents. • The transaction may require the approval of all co-owners or a decision by the competent authority. • The transaction is subject to the regulations in force.\nOperational information: Executing authority: Department of Lands and Survey. Service provider: survey office / property transaction agent. Can be carried out under a power of attorney: yes. May require the attendance of the co-owners depending on the case. Operational category: survey office services.',
    ),
    'request-property-subdivision': (
        'الشروط: • أن يستوفي العقار شروط الإفراز.• تقديم جميع الوثائق المطلوبة.• قد تتطلب المعاملة مخططات أو تقارير فنية.• تخضع لموافقة الجهات المختصة.\nمعلومات التشغيل: الجهة المنفذة: دائرة الأراضي والمساحة.مزود الخدمة: مكتب مساحة معتمد.يمكن تنفيذها بوكالة: نعم.قد تتطلب كشفًا ميدانيًا.تصنيف التشغيل: خدمات مكتب المساحة.',
        'Conditions: • The property must meet the subdivision requirements. • Submission of all the required documents. • The transaction may require plans or technical reports. • Subject to the approval of the competent authorities.\nOperational information: Executing authority: Department of Lands and Survey. Service provider: accredited survey office. Can be carried out under a power of attorney: yes. May require a site inspection. Operational category: survey office services.',
    ),
    'request-property-consolidation': (
        'الشروط: • أن تستوفي القطع شروط التوحيد.• تقديم جميع الوثائق المطلوبة.• تخضع المعاملة لموافقة الجهات المختصة.\nمعلومات التشغيل: الجهة المنفذة: دائرة الأراضي والمساحة.مزود الخدمة: مكتب مساحة معتمد.يمكن تنفيذها بوكالة: نعم.قد تتطلب كشفًا ميدانيًا.تصنيف التشغيل: خدمات مكتب المساحة.',
        'Conditions: • The plots must meet the consolidation requirements. • Submission of all the required documents. • The transaction is subject to the approval of the competent authorities.\nOperational information: Executing authority: Department of Lands and Survey. Service provider: accredited survey office. Can be carried out under a power of attorney: yes. May require a site inspection. Operational category: survey office services.',
    ),
    'request-boundary-demarcation': (
        'الشروط: • تقديم بيانات العقار بشكل صحيح.• توفير الوثائق المطلوبة.• قد يتطلب الأمر كشفاً ميدانياً.• تخضع المعاملة للأنظمة والتعليمات النافذة.\nمعلومات التشغيل: الجهة المنفذة: دائرة الأراضي والمساحة.مزود الخدمة: مكتب مساحة معتمد.يمكن تنفيذها بوكالة: نعم.قد تتطلب كشفاً ميدانياً.تصنيف التشغيل: خدمات مكتب المساحة.',
        'Conditions: • Provide the property details correctly. • Provide the required documents. • A site inspection may be required. • The transaction is subject to the regulations and instructions in force.\nOperational information: Executing authority: Department of Lands and Survey. Service provider: accredited survey office. Can be carried out under a power of attorney: yes. May require a site inspection. Operational category: survey office services.',
    ),
    'request-land-survey': (
        'الشروط: • تقديم بيانات العقار بشكل صحيح.• توفير الوثائق المطلوبة.• قد يتطلب الأمر كشفاً ميدانياً.• تخضع الخدمة للأنظمة والتعليمات النافذة.\nمعلومات التشغيل: الجهة المنفذة: دائرة الأراضي والمساحة.مزود الخدمة: مكتب مساحة معتمد.يمكن تنفيذها بوكالة: نعم.قد تتطلب كشفاً ميدانياً.تصنيف التشغيل: خدمات مكتب المساحة.',
        'Conditions: • Provide the property details correctly. • Provide the required documents. • A site inspection may be required. • The service is subject to the regulations and instructions in force.\nOperational information: Executing authority: Department of Lands and Survey. Service provider: accredited survey office. Can be carried out under a power of attorney: yes. May require a site inspection. Operational category: survey office services.',
    ),
    'request-property-readjustment': (
        'الشروط: • تقديم بيانات العقار بشكل صحيح.• توفير الوثائق المطلوبة.• تخضع الخدمة للأنظمة والتعليمات النافذة.• قد تتطلب موافقات من الجهات المختصة.\nمعلومات التشغيل: الجهة المنفذة: الجهات المختصة ودائرة الأراضي والمساحة.مزود الخدمة: مكتب هندسي/مزود خدمة معتمد.يمكن تنفيذها بوكالة: نعم.قد تتطلب مراجعات ميدانية.تصنيف التشغيل: خدمات تنظيم الأراضي.',
        'Conditions: • Provide the property details correctly. • Provide the required documents. • The service is subject to the regulations and instructions in force. • Approvals from the competent authorities may be required.\nOperational information: Executing authority: the competent authorities and the Department of Lands and Survey. Service provider: engineering office / accredited service provider. Can be carried out under a power of attorney: yes. May require site follow-ups. Operational category: land organisation services.',
    ),
    'request-zoning-certificate': (
        'الشروط: • تقديم بيانات العقار.• توفير الوثائق المطلوبة.• تخضع لإجراءات الجهة المختصة.\nمعلومات التشغيل: الجهة المنفذة: البلدية أو الجهة التنظيمية المختصة.مزود الخدمة: معقب معاملات/مكتب هندسي حسب الحالة.التصنيف: خدمات التنظيم.',
        'Conditions: • Provide the property details. • Provide the required documents. • Subject to the procedures of the competent authority.\nOperational information: Executing authority: the municipality or the competent planning authority. Service provider: transaction agent / engineering office depending on the case. Category: planning services.',
    ),
    'request-land-use-classification-change': (
        'الشروط: • تقديم بيانات العقار بشكل صحيح.• توفير الوثائق المطلوبة.• تخضع الخدمة لموافقة الجهات المختصة.• قد تتطلب دراسة فنية أو تنظيمية.\nمعلومات التشغيل: الجهة المنفذة: الجهات التنظيمية المختصة.مزود الخدمة: مكتب هندسي/مزود خدمة معتمد.يمكن تنفيذها بوكالة: نعم.قد تتطلب كشفاً أو دراسة فنية.تصنيف التشغيل: خدمات التنظيم.',
        'Conditions: • Provide the property details correctly. • Provide the required documents. • The service is subject to the approval of the competent authorities. • A technical or planning study may be required.\nOperational information: Executing authority: the competent planning authorities. Service provider: engineering office / accredited service provider. Can be carried out under a power of attorney: yes. May require an inspection or a technical study. Operational category: planning services.',
    ),
    'request-zoning-plan': (
        'الشروط: • تقديم بيانات العقار بشكل صحيح.• توفر رقم القطعة والحوض.• قد يطلب إثبات ملكية أو وكالة قانونية.• تخضع الخدمة للأنظمة والتعليمات النافذة.\nمعلومات التشغيل: الجهة المنفذة: البلدية أو أمانة عمان أو الجهة التنظيمية المختصة.مزود الخدمة: ممثل معاملات معتمد.يمكن تنفيذها بوكالة: نعم.تصنيف التشغيل: خدمات التنظيم.',
        'Conditions: • Provide the property details correctly. • The plot and basin numbers must be available. • Proof of ownership or a legal power of attorney may be requested. • The service is subject to the regulations and instructions in force.\nOperational information: Executing authority: the municipality, the Greater Amman Municipality or the competent planning authority. Service provider: accredited transaction representative. Can be carried out under a power of attorney: yes. Operational category: planning services.',
    ),
    'request-change-statement': (
        'الشروط: • إدخال بيانات العقار بشكل صحيح.• توفر الوثائق المطلوبة.• تخضع الخدمة للأنظمة والتعليمات النافذة.\nمعلومات التشغيل: الجهة المنفذة: دائرة الأراضي والمساحة أو الجهة المختصة.مزود الخدمة: معقب معاملات معتمد.يمكن تنفيذها بوكالة: نعم.تصنيف التشغيل: خدمات السجلات العقارية.',
        'Conditions: • Enter the property details correctly. • The required documents must be available. • The service is subject to the regulations and instructions in force.\nOperational information: Executing authority: the Department of Lands and Survey or the competent authority. Service provider: accredited transaction agent. Can be carried out under a power of attorney: yes. Operational category: property records services.',
    ),
    'request-property-mortgage-registration': (
        'الشروط: • أن يكون العقار قابلاً للرهن.• تقديم جميع الوثائق المطلوبة.• حضور الأطراف أو من يمثلهم قانونياً عند الحاجة.• تخضع المعاملة للأنظمة والرسوم الرسمية.\nمعلومات التشغيل: الجهة المنفذة: دائرة الأراضي والمساحة.مزود الخدمة: معقب معاملات عقارية.يمكن تنفيذها بوكالة: نعم.التصنيف: الرهون والحقوق.',
        'Conditions: • The property must be mortgageable. • Submission of all the required documents. • Attendance of the parties or their legal representatives when needed. • The transaction is subject to the official regulations and fees.\nOperational information: Executing authority: Department of Lands and Survey. Service provider: property transaction agent. Can be carried out under a power of attorney: yes. Category: mortgages and rights.',
    ),
    'request-mortgage-release': (
        'الشروط: • استكمال متطلبات الجهة المرتهنة.• تقديم جميع الوثائق المطلوبة.• تخضع المعاملة للأنظمة والرسوم الرسمية.\nمعلومات التشغيل: الجهة المنفذة: دائرة الأراضي والمساحة.مزود الخدمة: معقب معاملات عقارية.يمكن تنفيذها بوكالة: نعم.التصنيف: الرهون والحقوق.',
        "Conditions: • Complete the mortgagee's requirements. • Submission of all the required documents. • The transaction is subject to the official regulations and fees.\nOperational information: Executing authority: Department of Lands and Survey. Service provider: property transaction agent. Can be carried out under a power of attorney: yes. Category: mortgages and rights.",
    ),
    'request-building-permit': (
        'الشروط: • تقديم المخططات الهندسية المعتمدة.• مطابقة متطلبات التنظيم.• استكمال الوثائق المطلوبة وسداد الرسوم.\nمعلومات التشغيل: الجهة المنفذة: البلدية أو أمانة عمان.مزود الخدمة: مكتب هندسي ومعقب معاملات.التصنيف: رخص وإنشاءات.',
        'Conditions: • Submit the approved engineering plans. • Comply with the planning requirements. • Complete the required documents and pay the fees.\nOperational information: Executing authority: the municipality or the Greater Amman Municipality. Service provider: engineering office and transaction agent. Category: licences and construction.',
    ),
}
for _slug, _pair in TERMS_EN.items():
    SERVICE_TEXT_EN.setdefault(_slug, {})["terms"] = _pair

# Field help text (Arabic as imported) -> English
HELP_TEXTS_EN = {
    'إصدار / تجديد / تعديل / إلغاء': 'Issue / renew / amend / cancel',
    'اختياري': 'Optional',
    'الاسم، العنوان، رأس المال، الشركاء، الحصص، الإدارة، المفوضون وغيرها': 'Name, address, capital, partners, shares, management, authorized signatories, etc.',
    'الغايات/الأنشطة المطلوبة': 'The required objectives/activities',
    'تسجيل جديد / تحري / تجديد / تعديل / نقل ملكية / إصدار أو تصديق وثائق / أخرى': 'New registration / search / renewal / amendment / ownership transfer / issuing or certifying documents / other',
    'حسب الجنسية': 'Depending on nationality',
    'حسب الصفة': 'Depending on capacity',
    'حسب عدد الشركاء': 'Depending on the number of partners',
    'شركة / مؤسسة فردية': 'Company / sole proprietorship',
    'شطب / تصفية': 'Deregistration / liquidation',
    'عادية / مصدقة عند توفر الخيار': 'Regular / certified, when the option is available',
    'فرد / شركة': 'Individual / company',
    'فرد / شركة / مؤسسة': 'Individual / company / establishment',
    'قائمة أنواع الشركات': 'List of company types',
    'للتسجيل والخدمات المرتبطة بالفئات': 'For registration and class-related services',
    'مالك / مستأجر / غير ذلك': 'Owner / tenant / other',
    'يفضل ربطها بقائمة الغايات الرسمية': 'Preferably linked to the official objectives list',
}

# ServiceRelation.message_to_customer has one (customer-facing, Arabic) field:
# the two English development messages are replaced by their Arabic translation.
RELATION_MESSAGES_AR = {
    "Many clients also clear related traffic obligations during the same renewal cycle.":
        "يسدّد كثير من العملاء أيضاً المخالفات المرورية المرتبطة خلال دورة التجديد نفسها.",
    "After renewing the business license, you may also need an updated no-criminal-record certificate.":
        "بعد تجديد رخصة المهن، قد تحتاج أيضاً إلى شهادة عدم محكومية محدّثة.",
}

_CODE_LIKE = re.compile(r"^[a-z0-9_\-]+$")


def _blank_english(value, code=""):
    value = (value or "").strip()
    return not value or value == code or bool(_CODE_LIKE.fullmatch(value))


def translate_schema(schema):
    """Return ``(new_schema, filled_count)`` with blank English labels and help texts filled from the tables.

    Repeater item fields are translated with the same tables.
    """
    if not isinstance(schema, list):
        return schema, 0
    filled = 0
    result = []
    for field in schema:
        if not isinstance(field, dict):
            result.append(field)
            continue
        field = dict(field)
        key = str(field.get("key") or field.get("name") or "")
        label_ar = (field.get("label_ar") or field.get("label") or "").strip()
        english = FIELD_LABELS_EN.get((key, label_ar))
        if english and not (field.get("label_en") or "").strip():
            field["label_en"] = english
            filled += 1
        help_en = HELP_TEXTS_EN.get((field.get("help_text_ar") or field.get("help_text") or "").strip())
        if help_en and not (field.get("help_text_en") or "").strip():
            field["help_text_en"] = help_en
            filled += 1
        options = field.get("options")
        if isinstance(options, list):
            new_options = []
            for option in options:
                if isinstance(option, dict) and not (option.get("label_en") or "").strip():
                    english = OPTION_LABELS_EN.get((str(option.get("value") or ""), (option.get("label_ar") or option.get("label") or "").strip()))
                    if english:
                        option = {**option, "label_en": english}
                        filled += 1
                new_options.append(option)
            field["options"] = new_options
        items = field.get("item_fields")
        if isinstance(items, list):
            field["item_fields"], item_filled = translate_schema(items)
            filled += item_filled
        result.append(field)
    return result, filled


def document_name_en(code, name_ar):
    return DOCUMENT_NAMES_EN.get((code or "", (name_ar or "").strip()))


def apply_english_content(Service, RequiredDocumentDefinition, ServiceRequiredDocument, ServiceRelation, *, log=None):
    """Fill blank English catalogue text. Returns human-readable change lines."""
    changes = [] if log is None else log
    for service in Service._base_manager.all().order_by("pk"):
        updates = {}
        schema, filled = translate_schema(service.required_information_schema)
        if filled:
            updates["required_information_schema"] = schema
        for name, (arabic, english) in SERVICE_TEXT_EN.get(service.slug, {}).items():
            if (getattr(service, f"{name}_ar") or "").strip() == arabic and _blank_english(getattr(service, f"{name}_en")):
                updates[f"{name}_en"] = english
        if updates:
            Service._base_manager.filter(pk=service.pk).update(**updates)
            changes.append(f"service {service.pk} {service.slug}: {filled} field/option label(s); " + ", ".join(sorted(k for k in updates if k != "required_information_schema")))

    for definition in RequiredDocumentDefinition._base_manager.filter(is_deleted=False).order_by("pk"):
        english = document_name_en(definition.code, definition.name_ar)
        if english and _blank_english(definition.name_en, definition.code):
            RequiredDocumentDefinition._base_manager.filter(pk=definition.pk).update(name_en=english)
            changes.append(f"document definition {definition.pk} {definition.code}: name_en -> {english!r}")
    for requirement in ServiceRequiredDocument._base_manager.filter(is_deleted=False).order_by("pk"):
        english = document_name_en(requirement.document_type, requirement.name_ar)
        if english is None and requirement.document_definition_id:
            definition = RequiredDocumentDefinition._base_manager.filter(pk=requirement.document_definition_id).first()
            if definition is not None and definition.name_ar == requirement.name_ar:
                english = document_name_en(definition.code, definition.name_ar)
        if english and _blank_english(requirement.name_en, requirement.document_type):
            ServiceRequiredDocument._base_manager.filter(pk=requirement.pk).update(name_en=english)
            changes.append(f"requirement {requirement.pk} ({requirement.document_type}): name_en -> {english!r}")

    for relation in ServiceRelation._base_manager.filter(message_to_customer__in=list(RELATION_MESSAGES_AR)):
        arabic = RELATION_MESSAGES_AR[relation.message_to_customer]
        ServiceRelation._base_manager.filter(pk=relation.pk).update(message_to_customer=arabic)
        changes.append(f"service relation {relation.pk}: English message replaced by its Arabic translation")
    return changes
