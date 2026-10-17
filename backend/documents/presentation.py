"""Human-readable document names for screens (audit D03).

A document's ``document_type`` is an internal code
(``client-audit-qa-202610-authorization``, ``FINAL_RESULT``). Screens show the
configured name instead: the order's requirement snapshot first, then the
master definition with that code, and a generic word when neither exists, so
no screen has to fall back to the raw code.
"""

from orders.readiness import order_requirement

FINAL_RESULT_TYPES = frozenset({"final_result", "final-result"})
FINAL_RESULT_LABEL = {"ar": "النتيجة النهائية", "en": "Final result"}
GENERIC_LABEL = {"ar": "مستند", "en": "Document"}


def _pair(name_ar, name_en):
    name_ar, name_en = (name_ar or "").strip(), (name_en or "").strip()
    if not (name_ar or name_en):
        return None
    return {"ar": name_ar or name_en, "en": name_en or name_ar}


def document_type_label(document):
    """``{"ar": ..., "en": ...}`` for the document's type."""
    code = (document.document_type or "").strip()
    if document.is_final_document or code.lower() in FINAL_RESULT_TYPES:
        return dict(FINAL_RESULT_LABEL)
    order = getattr(document, "order", None)
    if order is not None:
        requirement = order_requirement(order, code)
        label = requirement and _pair(requirement.name_ar, requirement.name_en)
        if label:
            return label
    from services.models import RequiredDocumentDefinition

    definition = RequiredDocumentDefinition.objects.filter(code=code, is_deleted=False).only("name_ar", "name_en").first()
    label = definition and _pair(definition.name_ar, definition.name_en)
    return label or dict(GENERIC_LABEL)


# System-written verification notes (audit D03). The English sentence stays in
# the database for text-only API clients; an Arabic request gets the Arabic
# sentence. Notes typed by staff or providers are never translated.
SYSTEM_VERIFICATION_NOTES = {
    "Approved automatically by service rule.": {
        "ar": "اعتُمد تلقائياً وفق قاعدة الخدمة.",
        "en": "Approved automatically by service rule.",
    },
}


def localized_verification_note(note, request):
    """The note in the request's language when it is an exact system sentence, else unchanged."""
    from core.i18n import request_language

    sentence = SYSTEM_VERIFICATION_NOTES.get((note or "").strip())
    if not sentence:
        return note
    return sentence[request_language(request)]
