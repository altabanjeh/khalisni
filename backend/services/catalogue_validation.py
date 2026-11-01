"""Release check for the service catalogue (``manage.py validate_catalogue``).

Run it before a catalogue import is published and before every release. It
reads the database only. Errors are things a customer would hit (a form that
cannot be submitted, a broken condition, a contradictory duration); warnings
are gaps a person should look at.
"""

import re
from dataclasses import dataclass, field

from services.catalogue_rules import APPROVED_DELIVERY_NOTE
from services.pricing import is_quotation, pricing_invariant_problem, public_pricing
from services.schema_rules import (
    field_key,
    field_label,
    field_options,
    field_type,
    optional_select_warnings,
    schema_problems,
)

ERROR = "error"
WARNING = "warning"
NO_FIXED_DURATION = re.compile(r"^\s*(حسب|تُحدَّد|تحدد|يُحدد|يحدد)")
IF_ANY = re.compile(r"إن\s+وجد")


@dataclass
class Finding:
    level: str
    service: str
    where: str
    message: str


@dataclass
class CatalogueReport:
    services: int = 0
    customer_visible: int = 0
    findings: list = field(default_factory=list)

    @property
    def errors(self):
        return [item for item in self.findings if item.level == ERROR]

    @property
    def warnings(self):
        return [item for item in self.findings if item.level == WARNING]


def _service_label(service):
    return f"{service.pk} {service.slug}"


def validate_service(service, report, *, visible):
    label = _service_label(service)
    # Hidden or inactive services are reported, but only as warnings.
    level = ERROR if visible else WARNING

    def add(severity, where, message):
        report.findings.append(Finding(severity, label, where, message))

    schema = service.required_information_schema
    for number, key, message in schema_problems(schema):
        add(level, f"field {key or number}", message)
    for _number, key, message in optional_select_warnings(schema):
        add(WARNING, f"field {key}", message)

    if isinstance(schema, list):
        for index, item in enumerate(schema):
            if not isinstance(item, dict):
                continue
            key = field_key(item, index)
            if not field_label(item, "ar"):
                add(WARNING, f"field {key}", "No Arabic label.")
            if not str(item.get("label_en") or "").strip():
                add(WARNING, f"field {key}", "No English label (English screens show a generic name).")
            if field_type(item) == "checkbox" and item.get("required") and field_label(item, "ar").startswith("هل "):
                add(level, f"field {key}", "A required yes/no checkbox can only be answered 'yes'.")
            if field_type(item) == "select":
                for option in field_options(item):
                    if option["value"] and not option["label_ar"]:
                        add(WARNING, f"field {key}", f"Option {option['value']} has no Arabic label.")

    requirements = service.document_requirements.filter(is_active=True, is_deleted=False).select_related("document_definition")
    seen_types = set()
    for requirement in requirements:
        where = f"document {requirement.document_type}"
        if requirement.document_type in seen_types:
            add(level, where, "Document type is listed more than once.")
        seen_types.add(requirement.document_type)
        definition = requirement.document_definition
        if definition is not None and (definition.is_deleted or not definition.is_active):
            add(level, where, "Linked document definition is inactive or deleted.")
        if not (requirement.name_ar or "").strip():
            add(level, where, "Document has no Arabic name.")
        if not (requirement.name_en or "").strip() or re.fullmatch(r"[a-z0-9_\-]+", requirement.name_en or ""):
            add(WARNING, where, "Document has no readable English name.")
        if not requirement.allowed_extensions:
            add(WARNING, where, "No allowed file types (the global list applies).")

        if requirement.is_required and IF_ANY.search(requirement.name_ar or ""):
            add(level, where, "A document described as 'if any' (إن وجد) is marked required.")

    note = (service.delivery_note_ar or "").strip()
    if service.delivery_time_mode == "duration" and (
        note == APPROVED_DELIVERY_NOTE["ar"] or NO_FIXED_DURATION.match(note)
    ):
        add(level, "delivery", f"Shows a fixed duration ({service.estimated_duration} {service.estimated_duration_unit}) while the note says it depends: '{note}'.")
    elif (
        service.delivery_time_mode == "duration"
        and service.estimated_duration == 1
        and service.estimated_duration_unit == "days"
        and not note
    ):
        add(WARNING, "delivery", "Shows the default duration (1 day) with no note; confirm it is a real duration (placeholder?).")
    if service.delivery_time_mode == "after_review" and not note:
        add(WARNING, "delivery", "Completion time is 'after review' but no sentence is set (customers see the generic wording).")

    # Owner decision B10-10: a public price breakdown must add up to the shown total.
    pricing = public_pricing(service)
    problem = pricing_invariant_problem(pricing)
    if problem:
        add(level, "pricing", problem)
    if is_quotation(service) and any(pricing.get(name) is not None for name in ("total_price", "government_fee", "company_fee")):
        add(level, "pricing", "A quotation service shows a numeric fee.")


def validate_catalogue():
    from services.models import Service
    from services.selectors import visible_services_queryset

    report = CatalogueReport()
    visible_ids = set(visible_services_queryset(organization=None).values_list("pk", flat=True))
    services = Service.objects.filter(is_deleted=False).select_related("category").order_by("pk")
    for service in services:
        report.services += 1
        visible = service.pk in visible_ids
        report.customer_visible += int(visible)
        validate_service(service, report, visible=visible)
    return report
