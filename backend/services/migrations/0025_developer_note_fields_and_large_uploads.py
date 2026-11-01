"""Client developer notes CN-BIZ-05, CN-BIZ-08 and CN-BIZ-09.

* request-boundary-demarcation (CN-BIZ-05, «إتاحة إضافة ملاحظات أو إحداثيات
  الموقع لمزود الخدمة، مع إمكانية إرفاق صور للموقع عند الحاجة»): optional
  free-text field ``site_coordinates`` «إحداثيات الموقع (اختياري)» and an
  optional «صور الموقع» document (jpg/jpeg/png) the provider can view.
* request-mortgage-release (CN-BIZ-08, «... مع تسجيل تاريخ إصدار الموافقة»):
  optional date field ``release_approval_date``.
* «المخططات الهندسية» (request-building-permit, CN-BIZ-09, «إتاحة رفع المخططات
  الهندسية والملفات الكبيرة»): ``max_file_size_mb = 50`` on its definition and the
  same limit on the linked service requirements.

Everything is added only when absent (a field key already on the form, a
``site_photos`` requirement row, even a removed one, or a size override the
admin already set are left as they are), so the migration is idempotent and
never undoes an admin's decision. The importer applies the same rules
(``catalogue_rules``). Orders keep their frozen requirement snapshots and notes.
Reverse is a no-op.
"""

from django.db import migrations
from django.db.models import Max, Q

from services.catalogue_rules import DEVELOPER_NOTE_DOCUMENTS, LARGE_UPLOAD_DEFINITIONS, apply_developer_note_fields

MB = 1024 * 1024
DEFAULT_MAX = 10 * MB


def forwards(apps, schema_editor):
    Service = apps.get_model("services", "Service")
    Definition = apps.get_model("services", "RequiredDocumentDefinition")
    Requirement = apps.get_model("services", "ServiceRequiredDocument")

    for service in Service._base_manager.all().order_by("pk").iterator():
        schema = apply_developer_note_fields(service.required_information_schema, service.slug)
        if schema != service.required_information_schema:
            Service._base_manager.filter(pk=service.pk).update(required_information_schema=schema)

    for slug, documents in DEVELOPER_NOTE_DOCUMENTS.items():
        for service in Service._base_manager.filter(slug=slug, is_deleted=False):
            for document in documents:
                if Requirement._base_manager.filter(service=service, document_type=document["code"]).exists():
                    continue
                definition = (
                    Definition._base_manager.filter(code=document["code"], is_deleted=False).order_by("-is_active", "pk").first()
                    or Definition._base_manager.filter(name_ar=document["name_ar"], is_deleted=False, is_active=True).first()
                )
                if definition is None:
                    definition = Definition._base_manager.create(
                        code=document["code"],
                        name_ar=document["name_ar"],
                        name_en=document["name_en"],
                        allowed_extensions=list(document["allowed_extensions"]),
                        max_file_size=DEFAULT_MAX,
                        is_active=True,
                    )
                if Requirement._base_manager.filter(service=service, document_definition=definition, is_deleted=False).exists():
                    continue
                last = Requirement._base_manager.filter(service=service, is_deleted=False).aggregate(value=Max("display_order"))["value"]
                Requirement._base_manager.create(
                    service=service,
                    document_definition=definition,
                    document_type=definition.code,
                    name_ar=definition.name_ar,
                    name_en=definition.name_en or document["name_en"],
                    instructions_ar=document["instructions_ar"],
                    instructions_en=document["instructions_en"],
                    is_required=False,
                    allowed_extensions=list(document["allowed_extensions"]),
                    max_file_size=definition.max_file_size or DEFAULT_MAX,
                    requires_verification=True,
                    client_can_replace_file=True,
                    provider_can_view_file=True,
                    display_order=(last or 0) + 1,
                    is_active=True,
                )

    for code, size_mb in LARGE_UPLOAD_DEFINITIONS.items():
        for definition in Definition._base_manager.filter(code=code, is_deleted=False, max_file_size_mb__isnull=True):
            Definition._base_manager.filter(pk=definition.pk).update(max_file_size_mb=size_mb, max_file_size=size_mb * MB)
            Requirement._base_manager.filter(Q(document_definition=definition) | Q(document_type=code), is_deleted=False).update(
                max_file_size=size_mb * MB
            )


class Migration(migrations.Migration):
    dependencies = [
        ("services", "0024_requireddocumentdefinition_max_file_size_mb"),
    ]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
