"""Merge near-duplicate master document definitions (owner decision B10-9).

Only the low-risk groups the owner approved are merged: the same document
written two ways (punctuation, parentheses, word order, synonyms such as
«وثائق» / «مستندات»). Legally different documents are never merged:
a written authorization («تفويض خطي»), a notarized power of attorney
(«وكالة عدلية»), a company authorization letter («كتاب تفويض من الشركة») and the
ID of a specific party (seller, buyer, donor, heirs …) stay separate.

A merge:
1. points every service requirement of the duplicate definition at the
   canonical definition (and at its document code where that is safe: no
   order of that service still reads the live catalogue instead of its own
   frozen requirements);
2. when the service already has the canonical document, keeps one requirement
   (required if either active row was required, the lower display order) and
   soft-deletes the other;
3. deactivates the duplicate definition (it is kept, with its history).

Also: «تفويض إن وجد» ("authorization, if any") is never a required upload,
unless a service sheet explicitly requires authorization (none does).

Existing orders are not touched: each order keeps its frozen
``requirements_snapshot`` and its uploaded documents keep their codes.

Used by migration ``services.0019`` (historical models) and by
``manage.py normalize_document_definitions --dry-run|--apply``.
"""

from django.utils import timezone

MERGE_REASON = "Merged into the canonical document definition (owner decision B10-9, total-closure pass)."

# Each group: canonical (code, Arabic name) and the duplicates (code, Arabic name).
# The canonical entry is the earliest definition of the group (lowest id in the
# real catalogue), which is also the wording most services already use.
MERGE_GROUPS = (
    {
        "group": "additional-authority-documents",
        "why": "«وثائق» and «مستندات» are synonyms; same catch-all request from the competent authority.",
        "canonical": ("document_b0f143ad16", "أي وثائق إضافية تطلبها الجهة المختصة"),
        "duplicates": (("document_b03d952538", "أي مستندات إضافية تطلبها الجهة المختصة"),),
    },
    {
        "group": "legal-power-of-attorney",
        "why": "Same document; the wording differs only by parentheses.",
        "canonical": ("legal_power_of_attorney", "وكالة قانونية (إن وجدت)"),
        "duplicates": (("document_e95445e836", "وكالة قانونية إن وجدت"),),
    },
    {
        "group": "company-registration-certificate",
        "why": "Company/establishment registration certificate or record; «بيانات تسجيل» and «سجل» name the same extract.",
        "canonical": ("document_322e004de0", "شهادة/بيانات تسجيل الشركة أو المنشأة"),
        "duplicates": (("document_d7d63d7027", "شهادة/سجل الشركة أو المؤسسة"),),
    },
    {
        "group": "amended-company-contract",
        "why": "Amended company contract and articles or the approved forms; singular/plural wording only.",
        "canonical": ("document_39a02bfad7", "عقد ونظام الشركة المعدلان أو النماذج المعتمدة"),
        "duplicates": (("document_ec8d545fbf", "عقد/نظام معدل أو النموذج المعتمد"),),
    },
    {
        "group": "cadastral-map",
        "why": "Same cadastral map; «إن وجد» is a condition already carried by the requirement being optional.",
        "canonical": ("cadastral_map", "مخطط أراضٍ"),
        "duplicates": (("document_0cc19c2317", "مخطط أراضٍ إن وجد"),),
    },
    {
        "group": "notarized-poa-or-written-authorization",
        "why": "Same two alternatives in reversed order.",
        "canonical": ("legal_authorization", "وكالة عدلية أو تفويض خطي"),
        "duplicates": (("document_f56c2e0812", "تفويض خطي أو وكالة عدلية"),),
    },
    {
        "group": "applicant-id-copy",
        "why": "«الهوية» is the applicant's ID copy; already classified as a duplicate of «صورة الهوية» by services.0016 (request-land-survey second sheet).",
        "canonical": ("national_id_copy", "صورة الهوية"),
        "duplicates": (("document_a4c4fed3af", "الهوية"),),
    },
)

# Kept separate on purpose (listed in the audit table).
NOT_MERGED = (
    ("تفويض خطي", "وكالة عدلية", "written authorization vs notarized power of attorney: legally different"),
    ("تفويض خطي أو وكالة", "وكالة عدلية أو تفويض خطي", "«وكالة» is not «وكالة عدلية» (notarized): different legal requirement"),
    ("كتاب تفويض من الشركة", "تفويض خطي", "company authorization letter vs personal written authorization"),
    ("تفويض أو وكالة للشخص الذي يتابع الإجراءات", "وكالة عدلية أو تفويض خطي", "names a specific person and accepts any authorization"),
    ("صورة هوية البائع / المشتري / الواهب / الموهوب له / الورثة / الشركاء", "صورة الهوية", "party-specific IDs"),
    ("هوية شخصية", "صورة الهوية", "not in the approved merge list (early seed services); left for a later decision"),
    ("إثبات شخصية مقدم الطلب / صاحب الطلب / صاحب العلاقة", "صورة الهوية", "not in the approved merge list"),
    ("مخطط موقع تنظيمي", "مخطط أراضٍ", "zoning site plan is a different document"),
    ("موافقات مسبقة على الغايات/الأنشطة", "موافقات مسبقة على الغاية الجديدة", "different scope (all objectives vs the new objective)"),
    ("موافقات الجهات المختصة", "موافقات الجهات المختصة بالنشاط", "different scope"),
)

AUTHORIZATION_IF_ANY = "تفويض إن وجد"
# Service slugs whose client sheet explicitly requires the authorization. None does.
SHEETS_REQUIRING_AUTHORIZATION = ()

# Importer: a re-import maps a duplicate wording onto its canonical definition.
CANONICAL_BY_DUPLICATE_CODE = {
    duplicate_code: group["canonical"] for group in MERGE_GROUPS for duplicate_code, _name in group["duplicates"]
}
CANONICAL_BY_DUPLICATE_NAME = {
    duplicate_name: group["canonical"] for group in MERGE_GROUPS for _code, duplicate_name in group["duplicates"]
}


def canonical_document(code, name_ar):
    """``(code, name_ar)`` of the canonical definition for an imported document."""
    canonical = CANONICAL_BY_DUPLICATE_CODE.get(code) or CANONICAL_BY_DUPLICATE_NAME.get((name_ar or "").strip())
    return canonical if canonical else (code, name_ar)


def _row(group, action, requirement=None, *, service_slug="", from_code="", from_name="", to_code="", to_name="", detail=""):
    return {
        "group": group,
        "action": action,
        "service": service_slug,
        "requirement_id": getattr(requirement, "pk", None),
        "from_code": from_code,
        "from_name": from_name,
        "to_code": to_code,
        "to_name": to_name,
        "detail": detail,
    }


def normalize_document_definitions(RequiredDocumentDefinition, ServiceRequiredDocument, Order=None, *, apply=False):
    """Apply (or, with ``apply=False``, only plan) the merges. Returns the merge log rows."""
    log = []
    now = timezone.now()
    definitions = RequiredDocumentDefinition._base_manager
    requirements = ServiceRequiredDocument._base_manager

    def orders_read_live_catalogue(service_id):
        if Order is None:
            return True
        return Order._base_manager.filter(service_id=service_id, requirements_snapshot__isnull=True).exists()

    for group in MERGE_GROUPS:
        name = group["group"]
        canonical_code, canonical_name = group["canonical"]
        canonical = definitions.filter(code=canonical_code, name_ar=canonical_name, is_deleted=False).first()
        for duplicate_code, duplicate_name in group["duplicates"]:
            duplicate = definitions.filter(code=duplicate_code, name_ar=duplicate_name, is_deleted=False, is_active=True).first()
            if duplicate is None:
                continue
            if canonical is None or not canonical.is_active:
                log.append(_row(name, "skipped", from_code=duplicate_code, from_name=duplicate_name, to_code=canonical_code,
                                to_name=canonical_name, detail="canonical definition missing or inactive"))
                continue
            rows = requirements.filter(document_definition=duplicate, is_deleted=False).select_related("service").order_by("pk")
            for requirement in rows:
                service = requirement.service
                kept = (
                    requirements.filter(service_id=service.pk, is_deleted=False)
                    .exclude(pk=requirement.pk)
                    .filter(document_definition=canonical)
                    .first()
                ) or (
                    requirements.filter(service_id=service.pk, is_deleted=False, document_type=canonical_code)
                    .exclude(pk=requirement.pk)
                    .first()
                )
                if kept is not None:
                    updates = {}
                    if requirement.is_active and kept.is_active:
                        if requirement.is_required and not kept.is_required:
                            updates["is_required"] = True
                        if requirement.display_order < kept.display_order:
                            updates["display_order"] = requirement.display_order
                    elif requirement.is_active and not kept.is_active:
                        # The duplicate is the live row: the kept row takes over its settings.
                        updates.update(is_active=True, is_required=requirement.is_required, display_order=requirement.display_order)
                    detail = f"service already lists the canonical document (requirement {kept.pk}); duplicate requirement soft-deleted"
                    if updates:
                        detail += "; kept row: " + ", ".join(f"{key}={value}" for key, value in sorted(updates.items()))
                    log.append(_row(name, "dedupe", requirement, service_slug=service.slug, from_code=requirement.document_type,
                                    from_name=duplicate_name, to_code=kept.document_type, to_name=canonical_name, detail=detail))
                    if apply:
                        if updates:
                            requirements.filter(pk=kept.pk).update(**updates)
                        requirements.filter(pk=requirement.pk).update(
                            is_deleted=True, is_active=False, deleted_at=now, delete_reason=MERGE_REASON,
                        )
                    continue
                code_is_safe = not orders_read_live_catalogue(service.pk)
                new_code = canonical_code if code_is_safe else requirement.document_type
                detail = "repointed to the canonical definition"
                if not code_is_safe:
                    detail += f"; document code kept as {requirement.document_type} (an order of this service has no frozen requirements)"
                log.append(_row(name, "repoint", requirement, service_slug=service.slug, from_code=requirement.document_type,
                                from_name=duplicate_name, to_code=new_code, to_name=canonical_name, detail=detail))
                if apply:
                    requirements.filter(pk=requirement.pk).update(
                        document_definition=canonical,
                        document_type=new_code,
                        name_ar=canonical.name_ar,
                        name_en=canonical.name_en or requirement.name_en,
                    )
            log.append(_row(name, "deactivate-definition", from_code=duplicate_code, from_name=duplicate_name,
                            to_code=canonical_code, to_name=canonical_name, detail=group["why"]))
            if apply:
                definitions.filter(pk=duplicate.pk).update(is_active=False)

    optional = requirements.filter(name_ar=AUTHORIZATION_IF_ANY, is_required=True, is_deleted=False).exclude(
        service__slug__in=SHEETS_REQUIRING_AUTHORIZATION
    ).select_related("service").order_by("service_id")
    for requirement in optional:
        log.append(_row("authorization-if-any", "make-optional", requirement, service_slug=requirement.service.slug,
                        from_code=requirement.document_type, from_name=AUTHORIZATION_IF_ANY,
                        detail="«إن وجد» (if any) cannot be a required upload"))
    if apply:
        optional.update(is_required=False)
    return log


def format_log(rows):
    lines = []
    for row in rows:
        target = f" -> {row['to_code']} «{row['to_name']}»" if row["to_code"] else ""
        service = f" [{row['service']} req {row['requirement_id']}]" if row["service"] else ""
        lines.append(f"{row['group']}: {row['action']}{service} {row['from_code']} «{row['from_name']}»{target}. {row['detail']}")
    return lines
