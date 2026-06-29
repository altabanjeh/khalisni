from django.core.management.base import BaseCommand

from services.models import RequiredDocumentDefinition, ServiceRequiredDocument


class Command(BaseCommand):
    help = "Backfill master required document definitions and link existing service document rules."

    def handle(self, *args, **options):
        created_count = 0
        linked_count = 0

        definitions_by_code = {
            definition.code: definition
            for definition in RequiredDocumentDefinition.objects.all()
        }

        for requirement in ServiceRequiredDocument.objects.all().order_by("requirement_id"):
            code = (requirement.document_type or "").strip().lower().replace(" ", "_")
            if not code:
                code = f"document_{requirement.requirement_id}"

            definition = definitions_by_code.get(code)
            if definition is None:
                definition = RequiredDocumentDefinition.objects.create(
                    code=code,
                    name_ar=requirement.name_ar or code,
                    name_en=requirement.name_en or "",
                    allowed_extensions=requirement.allowed_extensions or [],
                    max_file_size=requirement.max_file_size or 10 * 1024 * 1024,
                    is_active=True,
                )
                definitions_by_code[code] = definition
                created_count += 1

            dirty = False
            if requirement.document_definition_id != definition.id:
                requirement.document_definition = definition
                dirty = True
            if requirement.document_type != definition.code:
                requirement.document_type = definition.code
                dirty = True
            if requirement.name_ar != definition.name_ar:
                requirement.name_ar = definition.name_ar
                dirty = True
            if requirement.name_en != definition.name_en:
                requirement.name_en = definition.name_en
                dirty = True
            if dirty:
                requirement.save()
                linked_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Normalized required documents. Created {created_count} definitions and updated {linked_count} rules."
            )
        )
