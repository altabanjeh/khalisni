"""Objective catalogue corrections from the client acceptance remediation.

Every change is traced to the client service sheets
(D:/ghassam moblie/servese/*.docx, data/service-import/normalized-services.json)
and recorded in docs/audit/KHALSNI_CATALOGUE_VALIDATION_REPORT.md.

Each step only touches a value that is still in its known imported state, so the
migration is idempotent and never overwrites an admin's later edit. Orders are
not touched: they keep their own notes and requirement snapshots.

1. Business dropdowns: the sheet lists the choices in its note column
   ("شركة / مؤسسة فردية"); the importer only split comma lists. Fields whose
   sheet lists no choices ("نوع الشركة", "المحافظة / البلدية", "فئة السلع/الخدمات")
   are left alone: the client must supply them.
2. "Text / Dropdown" fields with no listed choices become text, as the sheet allows.
3. Questions: "ما ...؟" questions become text; "هل A أم B؟" questions become a
   choice between A and B. A required yes/no question ("Yes/No", required in
   the sheet) becomes a required نعم/لا choice: a single checkbox could only be
   answered "yes". Optional yes/no questions are unchanged.
4. request-land-survey: drop the duplicate wording of the same field/document
   that came from its second sheet.
5. The 27 imported services had a placeholder 1-day duration; the sheets give
   none. They switch to "confirmed after review" and keep their own sentence.
"""

from django.db import migrations, models

BUSINESS_OPTIONS = {
    ("business_commercial_registration_certificate", "entity_type"): [("option-1454010c52", "شركة"), ("option-4ec31d2a1e", "مؤسسة فردية")],
    ("business_commercial_registration_certificate", "certificate_copy_type"): [("option-e733144159", "عادية"), ("option-4ec75f75be", "مصدقة")],
    ("business_trade_name_certificate", "certificate_copy_type"): [("option-e733144159", "عادية"), ("option-4ec75f75be", "مصدقة")],
    ("business_trade_name_registration", "applicant_type"): [("option-ff4dfb290b", "فرد"), ("option-1454010c52", "شركة"), ("option-ab118c07c4", "مؤسسة")],
    ("business_trademark_services", "trademark_service_type"): [
        ("option-5824a2950c", "تسجيل جديد"), ("option-3cd6ab5a19", "تحري"), ("option-c0dfca2308", "تجديد"),
        ("option-b4f76c3aa2", "تعديل"), ("option-584bf3e58a", "نقل ملكية"), ("option-32bacf63ef", "إصدار أو تصديق وثائق"),
        ("option-83b4b55adb", "أخرى"),
    ],
    ("business_trademark_services", "trademark_owner_type"): [("option-ff4dfb290b", "فرد"), ("option-1454010c52", "شركة")],
    ("business_license_services", "business_license_action"): [
        ("option-25ed5f934a", "إصدار"), ("option-c0dfca2308", "تجديد"), ("option-b4f76c3aa2", "تعديل"), ("option-e776b0209b", "إلغاء"),
    ],
    ("business_license_services", "occupancy_status"): [("option-d8884e62da", "مالك"), ("option-0b2ff0c3f8", "مستأجر"), ("option-32a2f9e50e", "غير ذلك")],
    ("business_company_closure_liquidation", "closure_or_liquidation_type"): [("option-48287071e7", "شطب"), ("option-9ece42b994", "تصفية")],
}

TEXT_ALTERNATIVE = {
    ("business_trade_name_registration", "business_activity"),
    ("business_license_services", "business_activity_type"),
}

EITHER_OR = {
    "هل الطلب للمالك أم لمفوض عنه؟": [("option-b6842e3fc8", "للمالك"), ("option-48dcbd0d5b", "لمفوض عنه")],
    "هل العقار أرض أم بناء؟": [("option-76a07fdf16", "أرض"), ("option-928e61dc61", "بناء")],
    "هل الإفراز لقطعة أرض أم لشقق/وحدات؟": [("option-7d77b845a5", "قطعة أرض"), ("option-519c3ae76d", "شقق/وحدات")],
    "هل الطلب للمالك أم بموجب وكالة؟": [("option-b6842e3fc8", "للمالك"), ("option-eeccba9b94", "بموجب وكالة")],
    "هل الرهن لصالح بنك أم جهة أخرى؟": [("option-f879f70ca6", "بنك"), ("option-1062abbb31", "جهة أخرى")],
    "هل الرخصة لبناء جديد أم إعادة بناء؟": [("option-9dc5524944", "بناء جديد"), ("option-c6e00d2349", "إعادة بناء")],
}

YES_NO = [
    {"value": "yes", "label_ar": "نعم", "label_en": "Yes"},
    {"value": "no", "label_ar": "لا", "label_en": "No"},
]

LAND_SURVEY_DUPLICATE_FIELDS = {"full_name": "applicant_name", "field_760c65a1fa": "phone_number", "field_d7fc96e29e": "survey_reason"}
LAND_SURVEY_DUPLICATE_DOCUMENTS = {
    "document_a4c4fed3af": "national_id_copy",
    "document_0cc19c2317": "cadastral_map",
    "document_e95445e836": "legal_power_of_attorney",
}

IMPORTED_SLUGS = [
    "business_commercial_registration_certificate", "business_company_add_activities", "business_company_closure_liquidation",
    "business_company_information_amendment", "business_company_registration", "business_license_services",
    "business_trade_name_certificate", "business_trade_name_registration", "business_trademark_services",
    "request-boundary-demarcation", "request-building-permit", "request-cadastral-map", "request-change-statement",
    "request-inheritance-registration", "request-land-survey", "request-land-use-classification-change",
    "request-mortgage-release", "request-property-consolidation", "request-property-gift-transfer",
    "request-property-mortgage-registration", "request-property-ownership-transfer", "request-property-readjustment",
    "request-property-registration-certificate", "request-property-subdivision", "request-termination-of-co-ownership",
    "request-zoning-certificate", "request-zoning-plan",
]


def _key(field):
    for name in ("name", "key", "field", "id"):
        if field.get(name) is not None:
            return str(field[name])
    return ""


def _options(pairs):
    return [{"value": value, "label": label, "label_ar": label} for value, label in pairs]


def forwards(apps, schema_editor):
    Service = apps.get_model("services", "Service")
    ServiceRequiredDocument = apps.get_model("services", "ServiceRequiredDocument")

    for service in Service.objects.filter(slug__in=IMPORTED_SLUGS):
        schema = service.required_information_schema if isinstance(service.required_information_schema, list) else []
        changed = False
        new_schema = []
        for field in schema:
            if not isinstance(field, dict):
                new_schema.append(field)
                continue
            key = _key(field)
            kind = str(field.get("type") or "").lower()
            label = str(field.get("label_ar") or "")
            options = field.get("options") or []
            pair = (service.slug, key)
            if pair in BUSINESS_OPTIONS and kind == "select" and not options:
                field = {**field, "options": _options(BUSINESS_OPTIONS[pair])}
                changed = True
            elif pair in TEXT_ALTERNATIVE and kind == "select" and not options:
                field = {**field, "type": "text"}
                changed = True
            elif label in EITHER_OR and kind == "checkbox":
                field = {**field, "type": "select", "options": _options(EITHER_OR[label])}
                changed = True
            elif label.startswith("ما ") and kind == "checkbox":
                field = {**field, "type": "text"}
                changed = True
            elif kind == "checkbox" and field.get("required") and label.startswith("هل "):
                field = {**field, "type": "select", "options": [dict(option) for option in YES_NO]}
                changed = True
            if service.slug == "request-land-survey" and key in LAND_SURVEY_DUPLICATE_FIELDS:
                if any(_key(other) == LAND_SURVEY_DUPLICATE_FIELDS[key] for other in schema if isinstance(other, dict)):
                    changed = True
                    continue
            new_schema.append(field)
        updates = {}
        if changed:
            updates["required_information_schema"] = new_schema
        if (
            service.delivery_time_mode == "duration"
            and service.estimated_duration == 1
            and service.estimated_duration_unit == "days"
        ):
            updates["delivery_time_mode"] = "after_review"
        if updates:
            Service.objects.filter(pk=service.pk).update(**updates)

    for alias, canonical in LAND_SURVEY_DUPLICATE_DOCUMENTS.items():
        requirements = ServiceRequiredDocument.objects.filter(service__slug="request-land-survey", is_deleted=False)
        if requirements.filter(document_type=canonical).exists():
            requirements.filter(document_type=alias).update(is_active=False)


class Migration(migrations.Migration):
    dependencies = [
        ("services", "0015_national_id_fields_as_text"),
    ]

    operations = [
        migrations.AlterField(
            model_name="service",
            name="delivery_time_mode",
            field=models.CharField(
                choices=[
                    ("duration", "Expected duration"),
                    ("duration_range", "Expected duration range"),
                    ("date_range", "Date range"),
                    ("after_review", "Confirmed after review"),
                ],
                default="duration",
                max_length=20,
            ),
        ),
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
