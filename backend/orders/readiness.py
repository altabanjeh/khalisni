"""Canonical document requirements and readiness for an order.

An order keeps the document requirements that applied when it was created
(``Order.requirements_snapshot``). Workflow, upload, download and presentation
rules all read them through ``order_requirements`` so a later catalog edit
cannot change what an existing order needs. Orders created before the snapshot
existed fall back to the live catalog.
"""

from types import SimpleNamespace

SNAPSHOT_FIELDS = (
    "id",
    "service",
    "definition_id",
    "document_definition",
    "code",
    "document_type",
    "name_ar",
    "name_en",
    "instructions_ar",
    "instructions_en",
    "is_required",
    "allowed_extensions",
    "max_file_size",
    "requires_verification",
    "client_can_replace_file",
    "provider_can_view_file",
    "display_order",
    "is_active",
    "is_deleted",
)


def snapshot_service_requirements(service):
    """Freeze the active document requirements of a service as plain data."""
    rows = []
    requirements = (
        service.document_requirements.filter(is_active=True, is_deleted=False)
        .select_related("document_definition")
        .order_by("display_order", "requirement_id")
    )
    for requirement in requirements:
        definition = requirement.document_definition
        rows.append(
            {
                "id": requirement.pk,
                "service": service.pk,
                "definition_id": requirement.document_definition_id,
                "document_definition": requirement.document_definition_id,
                "code": requirement.document_type,
                "document_type": requirement.document_type,
                "name_ar": requirement.name_ar or getattr(definition, "name_ar", "") or "",
                "name_en": requirement.name_en or getattr(definition, "name_en", "") or "",
                "instructions_ar": requirement.instructions_ar or "",
                "instructions_en": requirement.instructions_en or "",
                "is_required": requirement.is_required,
                "allowed_extensions": list(requirement.allowed_extensions or []),
                "max_file_size": requirement.max_file_size,
                "requires_verification": requirement.requires_verification,
                "client_can_replace_file": requirement.client_can_replace_file,
                "provider_can_view_file": requirement.provider_can_view_file,
                "display_order": requirement.display_order,
                "is_active": True,
                "is_deleted": False,
            }
        )
    return rows


def order_requirement_rows(order):
    """Return the order's requirements as serializable dictionaries."""
    snapshot = getattr(order, "requirements_snapshot", None)
    if snapshot is None:
        return snapshot_service_requirements(order.service)
    return [{field: row.get(field) for field in SNAPSHOT_FIELDS} for row in snapshot if row.get("document_type")]


def order_requirements(order):
    return [SimpleNamespace(**row) for row in order_requirement_rows(order)]


def order_requirement(order, document_type):
    for requirement in order_requirements(order):
        if requirement.document_type == document_type:
            return requirement
    return None


def evaluate_order_requirements(order):
    requirements = order_requirements(order)
    documents = list(order.documents.filter(is_deleted=False, is_final_document=False).order_by("-created_at", "-pk"))
    latest_by_type = {}
    for document in documents:
        latest_by_type.setdefault(document.document_type, document)

    rows = []
    blockers = []
    requested = set(order.missing_document_types or [])
    for requirement in requirements:
        document = latest_by_type.get(requirement.document_type)
        if document is None:
            state = "not_uploaded"
        elif document.status == "rejected":
            state = "rejected"
        elif document.status == "approved" and (document.is_verified or not requirement.requires_verification):
            state = "approved"
        else:
            state = "pending_review"
        row = {
            "document_type": requirement.document_type,
            "name_ar": requirement.name_ar,
            "name_en": requirement.name_en,
            "is_required": requirement.is_required,
            "state": state,
            "document_id": document.pk if document else None,
        }
        rows.append(row)
        if requirement.is_required and state != "approved":
            blockers.append({"code": state, "document_type": requirement.document_type})

    defined_types = {row["document_type"] for row in rows}
    for document_type in sorted(requested):
        blockers.append({
            "code": "requested_document_unresolved" if document_type in defined_types else "unknown_requested_document",
            "document_type": document_type,
        })

    return {
        "requirements_complete": not blockers,
        "documents": rows,
        "blocking_reasons": blockers,
    }


def unresolved_missing_request_types(order):
    """Return upload requirements outstanding in the current customer response cycle."""
    request = order.missing_document_requests.filter(is_resolved=False).order_by("-requested_at").first()
    if request is None or not request.document_types:
        return None
    return [
        document_type for document_type in request.document_types
        if not order.documents.filter(
            is_deleted=False,
            document_type=document_type,
            created_at__gte=request.requested_at,
        ).exclude(status="rejected").exists()
    ]
