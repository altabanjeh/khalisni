"""Canonical document readiness for order workflow and API presentation."""


def evaluate_order_requirements(order):
    requirements = list(
        order.service.document_requirements.filter(is_active=True, is_deleted=False)
        .select_related("document_definition")
        .order_by("display_order", "requirement_id")
    )
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
            "name_ar": requirement.name_ar or getattr(requirement.document_definition, "name_ar", ""),
            "name_en": requirement.name_en or getattr(requirement.document_definition, "name_en", ""),
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
