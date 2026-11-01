"""Approved owner decisions applied to catalogue data (D02, B10-1/2/3, B10-4).

Used by the data migration ``services.0014`` and by the service importer, so
a fresh import cannot bring the old wording or field shapes back.

* D02: customer copy no longer mentions the admin panel. The two approved
  sentences replace the old ones in Arabic and English. No price or duration
  value changes.
* B10-1/2/3: "Do you know the parcel and basin numbers?" is a yes/no question.
  When the answer is "yes" the parcel and basin numbers are shown and required;
  otherwise they are hidden and staff resolve them during review. Parcel and
  basin identifiers are text, so a leading zero is kept.
* B10-4: a field whose meaning is "additional notes" is optional.

Final pre-release hardening (``services.0015``): national-ID fields are text,
not numbers. They are identifiers (some labels also accept a registration or
passport number), so a numeric input could alter or reject a valid value. No
format rule is added: the official format is an owner/domain decision.
"""

import copy
import hashlib

APPROVED_PRICE_NOTE = {
    "ar": "يتم تأكيد الرسوم النهائية بعد مراجعة الوثائق.",
    "en": "Final fees are confirmed after document review.",
}
APPROVED_DELIVERY_NOTE = {
    "ar": "تُحدَّد مدة الإنجاز بعد مراجعة الطلب.",
    "en": "The completion time is confirmed after your request is reviewed.",
}
ADMIN_PANEL_PHRASE = "لوحة الإدارة"

PARCEL_KEYS = ("parcel_number", "basin_number")
PARCEL_QUESTION_LABEL = "هل تعرف رقم القطعة والحوض؟"
PARCEL_QUESTION_LABEL_EN = "Do you know the parcel and basin numbers?"
# The importer's stable key for this label (``service_import._stable_slug``):
# the two services whose sheets ask the question already use it.
PARCEL_QUESTION_KEY = "field_" + hashlib.sha1(PARCEL_QUESTION_LABEL.encode("utf-8")).hexdigest()[:10]
PARCEL_FIELD_LABELS = ("رقم القطعة", "رقم الحوض")
YES_NO_OPTIONS = [
    {"value": "yes", "label_ar": "نعم", "label_en": "Yes"},
    {"value": "no", "label_ar": "لا", "label_en": "No"},
]
PARCEL_QUESTION_HELP = {
    "ar": "إذا لم تكن تعرف رقمي القطعة والحوض فاختر «لا»، ويساعدك فريقنا في تحديدهما أثناء مراجعة الطلب.",
    "en": "If you do not know the parcel and basin numbers, choose “No” and our team will help identify them while reviewing your request.",
}

ADDITIONAL_NOTES_KEYS = ("additional_notes",)
ADDITIONAL_NOTES_LABELS = ("ملاحظات إضافية", "هل توجد ملاحظات إضافية؟")


def _mentions_admin_panel(value):
    return ADMIN_PANEL_PHRASE in (value or "")


def approved_price_note(note_ar, note_en):
    """Return ``(ar, en)``: the approved sentence when the Arabic note mentions the admin panel."""
    if _mentions_admin_panel(note_ar):
        return APPROVED_PRICE_NOTE["ar"], APPROVED_PRICE_NOTE["en"]
    return note_ar, note_en


def approved_delivery_note(note_ar, note_en):
    if _mentions_admin_panel(note_ar):
        return APPROVED_DELIVERY_NOTE["ar"], APPROVED_DELIVERY_NOTE["en"]
    return note_ar, note_en


def _is_parcel_question(field):
    return (field.get("label_ar") or "").strip() == PARCEL_QUESTION_LABEL


def _is_additional_notes(field):
    return field.get("key") in ADDITIONAL_NOTES_KEYS or (field.get("label_ar") or "").strip() in ADDITIONAL_NOTES_LABELS


def _is_parcel_field(field):
    return field.get("key") in PARCEL_KEYS and (field.get("label_ar") or field.get("label") or "").strip() in PARCEL_FIELD_LABELS


def _parcel_question():
    return {
        "key": PARCEL_QUESTION_KEY,
        "label_ar": PARCEL_QUESTION_LABEL,
        "label_en": PARCEL_QUESTION_LABEL_EN,
        "type": "select",
        "required": False,
        "options": copy.deepcopy(YES_NO_OPTIONS),
        "help_text_ar": PARCEL_QUESTION_HELP["ar"],
        "help_text_en": PARCEL_QUESTION_HELP["en"],
        "source_section": "B10-1/2/3",
    }


def apply_schema_rules(schema, *, gate_all_parcel_fields=False):
    """Return a new schema with the approved field rules applied. The input is not modified.

    ``gate_all_parcel_fields`` (owner decision B4 option A, total-closure pass):
    a form that collects the parcel and basin numbers («رقم القطعة» / «رقم الحوض»)
    but does not ask «هل تعرف رقم القطعة والحوض؟» gets the question inserted
    right before the first of those fields, so every land service applies the
    same yes/no gate. Without the flag (migration ``services.0014``) only forms
    whose source sheet asks the question are gated.
    """
    if not isinstance(schema, list):
        return schema
    fields = copy.deepcopy(schema)
    question = next((field for field in fields if isinstance(field, dict) and _is_parcel_question(field)), None)
    if question is None and gate_all_parcel_fields:
        first_parcel = next(
            (index for index, field in enumerate(fields) if isinstance(field, dict) and _is_parcel_field(field)),
            None,
        )
        keys = {str(field.get("key")) for field in fields if isinstance(field, dict)}
        if first_parcel is not None and PARCEL_QUESTION_KEY not in keys:
            question = _parcel_question()
            fields.insert(first_parcel, question)
            for order, field in enumerate(fields, start=1):
                if isinstance(field, dict):
                    field["display_order"] = order

    for field in fields:
        if not isinstance(field, dict):
            continue
        if _is_additional_notes(field):
            field["required"] = False
        if field.get("key") in PARCEL_KEYS:
            field["type"] = "text"
            if question is not None:
                field["required"] = True
                field["visible_when"] = {"field": question["key"], "equals": "yes"}

    if question is not None:
        question["type"] = "select"
        question["options"] = copy.deepcopy(YES_NO_OPTIONS)
        question["help_text_ar"] = PARCEL_QUESTION_HELP["ar"]
        question["help_text_en"] = PARCEL_QUESTION_HELP["en"]
        # The question is asked before the fields it controls.
        first_parcel = next((index for index, field in enumerate(fields) if isinstance(field, dict) and field.get("key") in PARCEL_KEYS), None)
        if first_parcel is not None and fields.index(question) > first_parcel:
            fields.remove(question)
            fields.insert(first_parcel, question)
            for order, field in enumerate(fields, start=1):
                if isinstance(field, dict) and "display_order" in field:
                    field["display_order"] = order
    return fields


NATIONAL_ID_KEYS = ("national_id", "seller_national_id", "buyer_national_id")
NATIONAL_ID_LABEL = "الرقم الوطني"


def _is_national_id(field):
    return field.get("key") in NATIONAL_ID_KEYS or NATIONAL_ID_LABEL in (field.get("label_ar") or field.get("label") or "")


def apply_identifier_rules(schema):
    """Return a new schema where national-ID ``number`` fields are ``text``. Nothing else changes."""
    if not isinstance(schema, list):
        return schema
    fields = copy.deepcopy(schema)
    for field in fields:
        if isinstance(field, dict) and field.get("type") == "number" and _is_national_id(field):
            field["type"] = "text"
    return fields


# Question shapes in the client service sheets (section 8 of the client
# acceptance remediation). The sheets list dynamic questions as plain text; a
# question that asks for a description ("ما الغاية ...؟") cannot be answered
# with a yes/no checkbox, and a question that names its two answers
# ("هل العقار أرض أم بناء؟") is a choice between exactly those answers.
OPEN_QUESTION_PREFIX = "ما "
EITHER_OR_QUESTION_OPTIONS = {
    "هل الطلب للمالك أم لمفوض عنه؟": ["للمالك", "لمفوض عنه"],
    "هل العقار أرض أم بناء؟": ["أرض", "بناء"],
    "هل الإفراز لقطعة أرض أم لشقق/وحدات؟": ["قطعة أرض", "شقق/وحدات"],
    "هل الطلب للمالك أم بموجب وكالة؟": ["للمالك", "بموجب وكالة"],
    "هل الرهن لصالح بنك أم جهة أخرى؟": ["بنك", "جهة أخرى"],
    "هل الرخصة لبناء جديد أم إعادة بناء؟": ["بناء جديد", "إعادة بناء"],
}

# Two client sheets describe request-land-survey (same slug, version and date)
# with synonymous wording; merging them by key kept both wordings. Each alias
# below is the same data item as its canonical entry (the fuller sheet's wording).
MERGED_SOURCE_ALIASES = {
    "request-land-survey": {
        "fields": {
            "full_name": "applicant_name",  # الاسم = اسم مقدم الطلب
            "field_760c65a1fa": "phone_number",  # الهاتف = رقم الهاتف
            "field_d7fc96e29e": "survey_reason",  # سبب الكشف = سبب طلب الكشف
        },
        "documents": {
            "document_a4c4fed3af": "national_id_copy",  # الهوية = صورة الهوية
            "document_0cc19c2317": "cadastral_map",  # مخطط أراضٍ إن وجد = مخطط أراضٍ (إن وجد)
            "document_e95445e836": "legal_power_of_attorney",  # وكالة قانونية إن وجدت = وكالة قانونية (إن وجدت)
        },
    },
}


def drop_merged_aliases(slug, fields, documents):
    """Remove alias entries whose canonical entry is present (see MERGED_SOURCE_ALIASES)."""
    aliases = MERGED_SOURCE_ALIASES.get(slug)
    if not aliases:
        return fields, documents
    field_keys = {field.get("key") for field in fields}
    document_codes = {document.get("code") for document in documents}
    fields = [field for field in fields if aliases["fields"].get(field.get("key")) not in field_keys]
    documents = [document for document in documents if aliases["documents"].get(document.get("code")) not in document_codes]
    return fields, documents


# Brand (owner decision): visible text uses «خلصني» and "Khalsni". The client
# sheets write «خلّصني»; domains and e-mail addresses (khalisni.com) are not text
# and are never changed.
import re as _re

_LATIN_VARIANT = _re.compile(r"\bKhalisni\b(?![.@\w])")


def normalize_brand(text):
    if not isinstance(text, str) or not text:
        return text
    return _LATIN_VARIANT.sub("Khalsni", text.replace("خلّصني", "خلصني"))


# Repeater fields (CN-BIZ-01, CN-BIZ-04). The client sheets ask for per-partner
# data «حسب عدد الشركاء» (company registration, source type "Repeater") and
# for several plots on a consolidation request (developer note: «جعل حقول أرقام
# القطع قابلة للإضافة بشكل ديناميكي لأن الطلب قد يشمل أكثر من قطعتين»). Those
# fields were imported as separate free text fields; here they become one
# ``repeater`` field each. Only the known imported shape is converted (keys,
# Arabic labels and plain types unchanged), so an admin's later edit is never
# overwritten. No new data item is added: the item fields are the imported
# fields.
PARTNER_REPEATER_KEY = "partners"
PARTNER_REPEATER_LABEL = {"ar": "بيانات الشركاء", "en": "Partners' details"}
# (imported key, item key, imported Arabic label, English label)
PARTNER_ITEM_SOURCES = (
    ("partner_name", "name", "اسم كل شريك", "Name of each partner"),
    ("partner_id", "id", "الرقم الوطني / رقم الجواز للشريك", "Partner's national ID / passport number"),
    ("partner_nationality", "nationality", "جنسية كل شريك", "Nationality of each partner"),
    ("partner_share", "share", "حصة كل شريك", "Share of each partner"),
)

PLOT_REPEATER_KEY = "plots"
PLOT_REPEATER_SLUGS = ("request-property-consolidation",)
# (imported key, item key, imported Arabic label, item Arabic label, item English label)
PLOT_ITEM_SOURCES = (
    ("field_56b1987951", "parcel_number", "أرقام القطع المطلوب توحيدها", "رقم القطعة", "Parcel number"),
    ("field_7d9efcd6d5", "basin_number", "أرقام الأحواض", "رقم الحوض", "Basin number"),
)
PLOT_REPEATER_LABEL = {"ar": "أرقام القطع المطلوب توحيدها", "en": "Numbers of the plots to consolidate"}
# The sheet: «توحيد قطعتين أو أكثر» — a consolidation covers two or more plots.
PLOT_MIN_ITEMS = 2
REPEATER_MAX_ITEMS = 20
_PLAIN_TYPES = ("text", "textarea", "number")


def _field_by_key(fields, key):
    return next((field for field in fields if isinstance(field, dict) and field.get("key") == key), None)


def _help(field):
    """Help texts of an imported field, whichever key the import used."""
    result = {}
    arabic = (field.get("help_text_ar") or field.get("help_text") or "").strip()
    english = (field.get("help_text_en") or "").strip()
    if arabic:
        result["help_text_ar"] = arabic
    if english:
        result["help_text_en"] = english
    return result


def _imported_shape(fields, sources):
    """The imported fields, in source order, when all are present and unedited; else None."""
    found = []
    for source in sources:
        field = _field_by_key(fields, source[0])
        if (
            field is None
            or (field.get("label_ar") or "").strip() != source[2]
            or str(field.get("type") or "text").strip().lower() not in _PLAIN_TYPES
            or field.get("visible_when") is not None
        ):
            return None
        found.append(field)
    return found


def _renumber(fields):
    if any(isinstance(field, dict) and "display_order" in field for field in fields):
        for order, field in enumerate(fields, start=1):
            if isinstance(field, dict):
                field["display_order"] = order
    return fields


def _replace(fields, originals, repeater):
    """Put ``repeater`` where the first original field was and drop the originals."""
    ids = {id(field) for field in originals}
    position = min(index for index, field in enumerate(fields) if id(field) in ids)
    before = sum(1 for field in fields[:position] if id(field) not in ids)
    result = [field for field in fields if id(field) not in ids]
    result.insert(before, repeater)
    return result


def _partner_repeater(originals):
    first = originals[0]
    items = []
    for field, (_source, item_key, label_ar, label_en) in zip(originals, PARTNER_ITEM_SOURCES):
        item = {
            "key": item_key,
            "type": "text",
            "label_ar": label_ar,
            "label_en": (field.get("label_en") or "").strip() or label_en,
            "required": bool(field.get("required")),
        }
        if item_key != "name":  # «حسب عدد الشركاء» describes the whole group (below)
            item.update(_help(field))
        items.append(item)
    repeater = {
        "key": PARTNER_REPEATER_KEY,
        "type": "repeater",
        "label_ar": PARTNER_REPEATER_LABEL["ar"],
        "label_en": PARTNER_REPEATER_LABEL["en"],
        "required": any(field.get("required") for field in originals),
        "min_items": 1,
        "max_items": REPEATER_MAX_ITEMS,
        "item_fields": items,
        "source_section": first.get("source_section") or "",
        "source_type": "Repeater",
        "replaces_fields": [source[0] for source in PARTNER_ITEM_SOURCES],
    }
    repeater.update(_help(first))
    if "display_order" in first:
        repeater["display_order"] = first["display_order"]
    return repeater


def _plot_repeater(originals, gate_key):
    first = originals[0]
    items = [
        {"key": item_key, "type": "text", "label_ar": item_label_ar, "label_en": item_label_en, "required": True}
        for _source, item_key, _label, item_label_ar, item_label_en in PLOT_ITEM_SOURCES
    ]
    repeater = {
        "key": PLOT_REPEATER_KEY,
        "type": "repeater",
        "label_ar": PLOT_REPEATER_LABEL["ar"],
        "label_en": (first.get("label_en") or "").strip() or PLOT_REPEATER_LABEL["en"],
        # B10-1/2/3 / B4 option A: shown and required only when the customer
        # knows the parcel and basin numbers.
        "required": True,
        "min_items": PLOT_MIN_ITEMS,
        "max_items": REPEATER_MAX_ITEMS,
        "item_fields": items,
        "visible_when": {"field": gate_key, "equals": "yes"},
        "source_section": first.get("source_section") or "",
        "source_type": "Repeater",
        "replaces_fields": [source[0] for source in PLOT_ITEM_SOURCES],
    }
    if "display_order" in first:
        repeater["display_order"] = first["display_order"]
    return repeater


def apply_repeater_rules(schema, slug=""):
    """Return a new schema with the known imported multi-value fields as repeaters.

    * Any form with the four imported ``partner_*`` fields: one ``partners``
      repeater (items name / id / nationality / share, imported labels).
    * ``request-property-consolidation``: the imported plot and basin number
      fields become one ``plots`` repeater (items parcel_number / basin_number,
      at least two rows). The parcel yes/no gate (owner decision B4 option A:
      every land service asks «هل تعرف رقم القطعة والحوض؟») is asked right
      before it, and the repeater is shown and required only on "yes".

    Idempotent: a form that already has the repeater, or whose fields were
    edited away from the imported shape, is returned unchanged (as a copy).
    """
    if not isinstance(schema, list):
        return schema
    fields = copy.deepcopy(schema)
    keys = {field.get("key") for field in fields if isinstance(field, dict)}

    if PARTNER_REPEATER_KEY not in keys:
        originals = _imported_shape(fields, PARTNER_ITEM_SOURCES)
        if originals:
            fields = _renumber(_replace(fields, originals, _partner_repeater(originals)))

    if slug in PLOT_REPEATER_SLUGS and PLOT_REPEATER_KEY not in keys:
        originals = _imported_shape(fields, PLOT_ITEM_SOURCES)
        question = next((field for field in fields if isinstance(field, dict) and _is_parcel_question(field)), None)
        if originals and (question is not None or PARCEL_QUESTION_KEY not in keys):
            if question is None:
                question = _parcel_question()
            else:
                fields.remove(question)
            fields = _replace(fields, originals, _plot_repeater(originals, question["key"]))
            position = next(index for index, field in enumerate(fields) if isinstance(field, dict) and field.get("key") == PLOT_REPEATER_KEY)
            fields.insert(position, question)  # asked right before the plots
            fields = _renumber(fields)
    return fields


# Client developer notes (docs/service-import/DEVELOPER-NOTES-MAPPING.md) that
# need an optional field or document the sheets do not list as a data item.
# Each entry quotes its note. Fields are optional; existing answers and orders
# are unaffected (orders keep frozen snapshots).
#
# CN-BIZ-05 request-boundary-demarcation: «إتاحة إضافة ملاحظات أو إحداثيات الموقع
#   لمزود الخدمة، مع إمكانية إرفاق صور للموقع عند الحاجة» — free-text site
#   coordinates (no map) and optional site photos, both visible to the provider.
# CN-BIZ-08 request-mortgage-release: «إتاحة رفع كتاب فك الرهن وربطه بالطلب مع
#   تسجيل تاريخ إصدار الموافقة» — the release letter is already a required
#   document (document_d2024a06a1); the approval issue date is added (optional).
# CN-BIZ-07 request-property-mortgage-registration needs nothing new: the
#   mortgagee (field_08d94d2888 «اسم الجهة المستفيدة», field_d6467d46cf bank or
#   other party), the mortgage value (field_3ece488644 «قيمة الرهن (إن وجدت)»)
#   and the financing documents (document_5c2f8f95d1) are imported fields.
DEVELOPER_NOTE_FIELDS = {
    "request-boundary-demarcation": (
        {
            "key": "site_coordinates",
            "type": "text",
            "label_ar": "إحداثيات الموقع (اختياري)",
            "label_en": "Site coordinates (optional)",
            "required": False,
            "help_text_ar": "مثال: 31.9539, 35.9106",
            "help_text_en": "Example: 31.9539, 35.9106",
            "options": [],
            "source_section": "CN-BIZ-05 developer note",
        },
    ),
    "request-mortgage-release": (
        {
            "key": "release_approval_date",
            "type": "date",
            "label_ar": "تاريخ إصدار موافقة فك الرهن (اختياري)",
            "label_en": "Mortgage release approval issue date (optional)",
            "required": False,
            "options": [],
            "source_section": "CN-BIZ-08 developer note",
        },
    ),
}

IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"]
DEVELOPER_NOTE_DOCUMENTS = {
    "request-boundary-demarcation": (
        {
            "code": "site_photos",
            "name_ar": "صور الموقع",
            "name_en": "Site photos",
            "requirement_type": "optional",
            "is_required": False,
            "instructions_ar": "عند الحاجة",
            "instructions_en": "When needed",
            "allowed_extensions": IMAGE_EXTENSIONS,
            "provider_can_view_file": True,
            "source_section": "CN-BIZ-05 developer note",
        },
    ),
}

# CN-BIZ-09 request-building-permit: «إتاحة رفع المخططات الهندسية والملفات الكبيرة».
# Per-definition size override (RequiredDocumentDefinition.max_file_size_mb).
LARGE_UPLOAD_DEFINITIONS = {"document_3443627d36": 50}  # «المخططات الهندسية»


def apply_developer_note_fields(schema, slug=""):
    """Return a new schema with the developer-note fields of ``slug`` added when absent.

    A field is inserted right before «ملاحظات إضافية» (or appended). A form that
    already has a field with that key is left as it is.
    """
    if not isinstance(schema, list):
        return schema
    fields = copy.deepcopy(schema)
    keys = {field.get("key") for field in fields if isinstance(field, dict)}
    added = False
    for template in DEVELOPER_NOTE_FIELDS.get(slug, ()):
        if template["key"] in keys:
            continue
        position = next(
            (index for index, field in enumerate(fields) if isinstance(field, dict) and _is_additional_notes(field)),
            len(fields),
        )
        fields.insert(position, copy.deepcopy(template))
        added = True
    return _renumber(fields) if added else fields
