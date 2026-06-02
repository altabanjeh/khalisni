import json
import re
from pathlib import Path

from django.contrib.auth.models import Permission
from django.core.management.base import BaseCommand

from accounts.models import CustomUser
from documents.serializers import DocumentUploadSerializer
from help_guides.screen_registry import HELP_SCREEN_REGISTRY
from orders.models import Order
from orders.serializers import PublicOrderCreateSerializer
from services.models import Service
from services.serializers import ServiceDetailSerializer
from workflow.rules import WORKFLOW_TRANSITIONS


BUTTON_PATTERN = re.compile(r"<button[^>]*>(?P<label>.*?)</button>", re.DOTALL)


class Command(BaseCommand):
    help = "Generate a draft contextual help registry from routes, serializers, models, permissions, workflow rules, and frontend buttons."

    def handle(self, *args, **options):
        project_root = Path(__file__).resolve().parents[4]
        output_path = project_root / "docs" / "help_guide" / "draft_help_registry.json"
        output_path.parent.mkdir(parents=True, exist_ok=True)

        payload = {
            "generated_from": "python manage.py generate_help_registry",
            "screens": HELP_SCREEN_REGISTRY,
            "roles": [value for value, _label in CustomUser.Role.choices],
            "permissions": self._collect_permissions(),
            "status_values": [{"value": value, "label": label} for value, label in Order.Status.choices],
            "model_fields": self._collect_model_fields(),
            "serializer_fields": self._collect_serializer_fields(),
            "workflow_actions": self._collect_workflow_actions(),
            "frontend_buttons": self._collect_frontend_buttons(project_root / "frontend" / "src"),
        }

        output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"Draft help registry written to {output_path}"))

    def _collect_permissions(self):
        permissions = (
            Permission.objects.select_related("content_type")
            .order_by("content_type__app_label", "codename")
            .values("content_type__app_label", "codename", "name")
        )
        return [
            {
                "app_label": item["content_type__app_label"],
                "codename": item["codename"],
                "full_codename": f"{item['content_type__app_label']}.{item['codename']}",
                "name": item["name"],
            }
            for item in permissions
        ]

    def _collect_model_fields(self):
        rows = {}
        for model in (Order, Service):
            rows[model.__name__] = [
                {
                    "name": field.name,
                    "type": field.get_internal_type(),
                    "required": not getattr(field, "blank", False),
                    "null": getattr(field, "null", False),
                    "max_length": getattr(field, "max_length", None),
                }
                for field in model._meta.fields
            ]
        return rows

    def _collect_serializer_fields(self):
        serializer_rows = {}
        for serializer_class in (PublicOrderCreateSerializer, DocumentUploadSerializer, ServiceDetailSerializer):
            serializer = serializer_class()
            serializer_rows[serializer_class.__name__] = [
                {
                    "name": name,
                    "type": field.__class__.__name__,
                    "required": getattr(field, "required", False),
                    "allow_blank": getattr(field, "allow_blank", False),
                    "max_length": getattr(field, "max_length", None),
                }
                for name, field in serializer.fields.items()
            ]
        return serializer_rows

    def _collect_workflow_actions(self):
        rows = []
        for rule in WORKFLOW_TRANSITIONS:
            rows.append(
                {
                    "from_status": rule.from_status,
                    "to_status": rule.to_status,
                    "action": rule.action,
                    "allowed_roles": sorted(rule.allowed_roles),
                    "validation_checks": list(rule.validation_checks),
                    "reason_required": rule.reason_required,
                    "notification_trigger": rule.notification_trigger,
                    "generic_status_update": rule.generic_status_update,
                }
            )
        return rows

    def _collect_frontend_buttons(self, frontend_src: Path):
        rows = []
        page_files = sorted(frontend_src.glob("pages/**/*.jsx"))
        for file_path in page_files:
            text = file_path.read_text(encoding="utf-8")
            for match in BUTTON_PATTERN.finditer(text):
                raw_label = re.sub(r"<[^>]+>", " ", match.group("label"))
                label = " ".join(raw_label.split())
                if not label:
                    continue
                rows.append(
                    {
                        "file": str(file_path.relative_to(frontend_src.parent)),
                        "label": label,
                    }
                )
        return rows
