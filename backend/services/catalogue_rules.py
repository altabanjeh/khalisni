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
"""

import copy

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


def apply_schema_rules(schema):
    """Return a new schema with the approved field rules applied. The input is not modified."""
    if not isinstance(schema, list):
        return schema
    fields = copy.deepcopy(schema)
    question = next((field for field in fields if isinstance(field, dict) and _is_parcel_question(field)), None)

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
