"""Read-only checks for obvious missing Arabic text in the public catalog."""

import re

from services.models import Service, ServiceCategory, ServiceRequiredDocument


ARABIC_SCRIPT = re.compile(r"[\u0600-\u06ff]")


def audit_public_catalog_arabic():
    findings = []

    def check(kind, record_id, field, value, *, counterpart="", required=False):
        text = str(value or "").strip()
        if (required or counterpart or text) and not ARABIC_SCRIPT.search(text):
            findings.append({"kind": kind, "id": record_id, "field": field, "value": text})

    categories = ServiceCategory.objects.filter(
        is_active=True, is_deleted=False, show_on_public_site=True,
    )
    for category in categories:
        check("category", category.pk, "name_ar", category.name_ar, required=True)
        check("category", category.pk, "description_ar", category.description_ar, counterpart=category.description_en)

    services = Service.objects.filter(
        is_active=True, is_deleted=False, show_on_public_site=True,
        category__is_active=True, category__is_deleted=False, category__show_on_public_site=True,
    )
    service_ids = []
    for service in services:
        service_ids.append(service.pk)
        for field in (
            "name", "short_description", "description", "delivery_note", "public_price_note", "terms",
        ):
            if hasattr(service, f"{field}_ar"):
                check("service", service.pk, f"{field}_ar", getattr(service, f"{field}_ar"), counterpart=getattr(service, f"{field}_en", ""), required=field in {"name", "description"})
        schema = service.required_information_schema or []
        if isinstance(schema, dict):
            schema = schema.get("fields", [])
        for index, field in enumerate(schema if isinstance(schema, list) else []):
            if not isinstance(field, dict):
                continue
            field_id = f"{service.pk}:{index}"
            check("service_field", field_id, "label_ar", field.get("label_ar"), counterpart=field.get("label_en"), required=True)
            check("service_field", field_id, "help_text_ar", field.get("help_text_ar"), counterpart=field.get("help_text_en"))
            options = field.get("options") or field.get("choices") or field.get("values") or []
            for option_index, option in enumerate(options if isinstance(options, list) else []):
                if isinstance(option, dict):
                    check("service_option", f"{field_id}:{option_index}", "label_ar", option.get("label_ar"), counterpart=option.get("label_en"), required=True)
                else:
                    check("service_option", f"{field_id}:{option_index}", "label_ar", option, required=True)

    for requirement in ServiceRequiredDocument.objects.filter(
        service_id__in=service_ids, is_active=True, is_deleted=False,
    ):
        check("document", requirement.pk, "name_ar", requirement.name_ar, required=True)
        check("document", requirement.pk, "instructions_ar", requirement.instructions_ar, counterpart=requirement.instructions_en)

    return findings
