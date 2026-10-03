"""Create isolated, repeatable records for the October 2026 client audit."""

import os

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import CustomUser
from documents.models import Document
from documents.services import create_order_document
from orders.models import Order, OrderNote
from orders.services import (
    assign_provider_to_order,
    complete_provider_work,
    provider_update_status,
    request_missing_documents,
    review_order,
)
from providers.models import ProviderProfile
from services.models import (
    RequiredDocumentDefinition,
    Service,
    ServiceCategory,
    ServiceProviderAssignment,
    ServiceRequiredDocument,
)


PREFIX = "client-audit-qa-202610"
DOCUMENT_CODE = f"{PREFIX}-authorization"
PDF = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"


def qa_file(name):
    return SimpleUploadedFile(name, PDF, content_type="application/pdf")


class Command(BaseCommand):
    help = "Seed namespaced client-audit QA identities and workflow scenarios (DEBUG only)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--rebuild-owned", action="store_true",
            help="Recreate only the four namespaced QA scenario orders.",
        )

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("The client-audit QA seed is available only with DJANGO_DEBUG=True.")
        password = os.getenv("KHALSNI_QA_PASSWORD", "")
        if len(password) < 12:
            raise CommandError("Set KHALSNI_QA_PASSWORD to a noncommitted value of at least 12 characters.")

        call_command("setup_roles", verbosity=0)
        with transaction.atomic():
            users = self._users(password)
            service, document = self._catalog()
            providers = self._providers(users, service)
            if options["rebuild_owned"]:
                self._delete_owned_orders(users, service)
            orders = self._orders(users, providers, service, document)
        self.stdout.write(self.style.SUCCESS("Client-audit QA records ready: " + ", ".join(
            f"{key}={order.order_number}" for key, order in orders.items()
        )))

    def _users(self, password):
        specs = {
            "admin": (CustomUser.Role.ADMIN, "QA Admin", "0798800101"),
            "employee": (CustomUser.Role.EMPLOYEE, "QA Employee", "0798800102"),
            "customer_a": (CustomUser.Role.CUSTOMER, "QA Customer A", "0798800103"),
            "customer_b": (CustomUser.Role.CUSTOMER, "QA Customer B", "0798800104"),
            "provider_a": (CustomUser.Role.PROVIDER, "QA Provider A", "0798800105"),
            "provider_b": (CustomUser.Role.PROVIDER, "QA Provider B", "0798800106"),
        }
        users = {}
        for key, (role, name, phone) in specs.items():
            email = f"{PREFIX}-{key}@example.test"
            user = CustomUser.objects.filter(email=email).first()
            if user is None:
                user = CustomUser.objects.create_user(
                    email=email, password=password, full_name=name, phone=phone,
                    role=role, is_active=True, is_email_verified=True,
                    is_staff=role == CustomUser.Role.ADMIN,
                    is_superuser=role == CustomUser.Role.ADMIN,
                )
            elif user.role != role or user.is_deleted:
                raise CommandError(f"Existing QA identity {email} has a conflicting role or is deleted.")
            else:
                updates = []
                if not user.check_password(password):
                    user.set_password(password)
                    updates.append("password")
                for field, expected in (
                    ("is_active", True),
                    ("is_email_verified", True),
                    ("is_staff", role == CustomUser.Role.ADMIN),
                    ("is_superuser", role == CustomUser.Role.ADMIN),
                ):
                    if getattr(user, field) != expected:
                        setattr(user, field, expected)
                        updates.append(field)
                if updates:
                    user.save(update_fields=updates)
            users[key] = user
        return users

    def _catalog(self):
        category, _ = ServiceCategory.objects.update_or_create(
            slug=PREFIX, defaults={
                "name_ar": "خدمة اختبار قبول خلصني", "name_en": "Khalsni audit QA",
                "is_active": True, "show_on_public_site": True,
            },
        )
        service, _ = Service.objects.update_or_create(
            slug=f"{PREFIX}-service",
            defaults={
                "category": category,
                "name_ar": "خدمة اختبار رحلة الطلب",
                "name_en": "Client audit QA journey",
                "description_ar": "خدمة اختبار داخلية بلا بيانات شخصية.",
                "description_en": "Internal QA service without personal data.",
                "provider_required": True,
                "is_online": True,
                "is_active": True,
                "show_on_public_site": True,
            },
        )
        definition, _ = RequiredDocumentDefinition.objects.update_or_create(
            code=DOCUMENT_CODE,
            defaults={
                "name_ar": "تفويض تجريبي", "name_en": "QA authorization",
                "allowed_extensions": [".pdf"], "allowed_mime_types": ["application/pdf"],
                "is_active": True,
            },
        )
        requirement, _ = ServiceRequiredDocument.objects.update_or_create(
            service=service, document_definition=definition,
            defaults={
                "document_type": definition.code, "name_ar": definition.name_ar,
                "name_en": definition.name_en, "is_required": True,
                "requires_verification": True, "allowed_extensions": [".pdf"],
                "is_active": True,
            },
        )
        if not requirement.is_active or not requirement.is_required or requirement.is_deleted:
            raise CommandError("The namespaced QA requirement was changed; restore it before seeding orders.")
        return service, definition

    def _providers(self, users, service):
        providers = {}
        for key in ("provider_a", "provider_b"):
            profile, _ = ProviderProfile.objects.get_or_create(
                user=users[key],
                defaults={
                    "provider_type": "QA service provider", "city": "Amman",
                    "is_available": True, "is_approved": True, "approved_by": users["admin"],
                },
            )
            if profile.is_deleted or not profile.is_available or not profile.is_approved:
                raise CommandError(f"QA {key} is not eligible.")
            profile.service_categories.add(service.category)
            link, _ = ServiceProviderAssignment.objects.get_or_create(
                service=service, provider=profile, defaults={"is_active": True},
            )
            if link.is_deleted or not link.is_active:
                raise CommandError(f"QA {key} service link is inactive.")
            providers[key] = profile
        return providers

    def _new_order(self, *, customer, service, scenario):
        marker = f"[{PREFIX}:{scenario}] Synthetic audit scenario; no personal data."
        return Order.objects.get_or_create(
            customer=customer, service=service, customer_notes=marker,
            defaults={"city": "Amman"},
        )

    def _delete_owned_orders(self, users, service):
        scenarios = {
            "missing": users["customer_a"],
            "uploaded": users["customer_a"],
            "provider-b": users["customer_b"],
            "final-result": users["customer_a"],
        }
        for scenario, customer in scenarios.items():
            marker = f"[{PREFIX}:{scenario}] Synthetic audit scenario; no personal data."
            owned = Order.objects.filter(customer=customer, service=service, customer_notes=marker)
            for order in owned:
                if order.payments.exists() or order.invoices.exists() or order.provider_payouts.exists():
                    raise CommandError(f"QA scenario {scenario} has financial records and cannot be rebuilt.")
            Document.objects.filter(order__in=owned).delete()
            owned.delete()

    def _assert_existing_scenario(self, order, *, scenario, status):
        if order.status != status:
            raise CommandError(
                f"QA scenario {scenario} drifted to {order.status}. "
                "Use --rebuild-owned to recreate only the namespaced QA orders."
            )

    def _approved_document(self, order, customer, employee):
        document = order.documents.filter(
            document_type=DOCUMENT_CODE, is_deleted=False, status="approved",
        ).first()
        if document is None:
            document = create_order_document(
                order=order, uploaded_by=customer,
                file_obj=qa_file("qa-authorization.pdf"), document_type=DOCUMENT_CODE,
            )
            document.mark_verified(user=employee, note="QA approval")
        return document

    def _orders(self, users, providers, service, definition):
        orders = {}
        missing, created = self._new_order(customer=users["customer_a"], service=service, scenario="missing")
        if created:
            review_order(order=missing, actor=users["employee"], note="QA review")
            request_missing_documents(
                order=missing, actor=users["employee"],
                note_text="Please upload the QA authorization PDF.",
                missing_document_types=[definition.code],
            )
            OrderNote.objects.create(
                order=missing, user=users["employee"],
                note="INTERNAL QA NOTE: must remain private", visibility=OrderNote.Visibility.INTERNAL,
            )
        else:
            self._assert_existing_scenario(missing, scenario="missing", status=Order.Status.WAITING_CUSTOMER)
        orders["missing"] = missing

        uploaded, created = self._new_order(customer=users["customer_a"], service=service, scenario="uploaded")
        if created:
            review_order(order=uploaded, actor=users["employee"], note="QA upload review")
            create_order_document(
                order=uploaded, uploaded_by=users["customer_a"],
                file_obj=qa_file("qa-upload-pending.pdf"), document_type=definition.code,
            )
        else:
            self._assert_existing_scenario(uploaded, scenario="uploaded", status=Order.Status.UNDER_REVIEW)
        orders["uploaded"] = uploaded

        other, created = self._new_order(customer=users["customer_b"], service=service, scenario="provider-b")
        if created:
            self._approved_document(other, users["customer_b"], users["employee"])
            review_order(order=other, actor=users["employee"], note="QA second customer")
            assign_provider_to_order(order=other, provider=providers["provider_b"], actor=users["admin"])
        else:
            self._assert_existing_scenario(other, scenario="provider-b", status=Order.Status.ASSIGNED)
        orders["provider_b"] = other

        result, created = self._new_order(customer=users["customer_a"], service=service, scenario="final-result")
        if created:
            self._approved_document(result, users["customer_a"], users["employee"])
            review_order(order=result, actor=users["employee"], note="QA final result")
            assign_provider_to_order(order=result, provider=providers["provider_a"], actor=users["admin"])
            provider_update_status(
                order=result, actor=users["provider_a"], new_status=Order.Status.IN_PROGRESS,
                note="QA progress update",
            )
            complete_provider_work(
                order=result, actor=users["provider_a"],
                validated_data={"file": qa_file("qa-final-result.pdf"), "document_type": "final-result"},
            )
        else:
            self._assert_existing_scenario(result, scenario="final-result", status=Order.Status.READY_FOR_DELIVERY)
        orders["final_result"] = result
        return orders
