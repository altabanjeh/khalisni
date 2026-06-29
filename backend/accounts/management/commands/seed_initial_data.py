import os

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from accounts.models import CustomUser
from documents.services import create_order_document
from orders.models import Order, OrderStatusLog
from orders.services import (
    assign_provider_to_order,
    complete_provider_work,
    complete_order,
    provider_update_status,
    request_missing_documents,
    review_order,
)
from providers.models import ProviderProfile
from services.models import Service, ServiceCategory, ServiceRelation, ServiceRequiredDocument


DEMO_ACCOUNT_SPECS = {
    "admin": {
        "email_env": "DEMO_ADMIN_EMAIL",
        "password_env": "DEMO_ADMIN_PASSWORD",
        "default_email": "admin@khalisni.local",
        "default_password": "Admin@123",
        "defaults": {
            "full_name": "Khalisni Admin",
            "phone": "0790000001",
            "role": CustomUser.Role.ADMIN,
            "is_staff": True,
            "is_superuser": True,
            "is_active": True,
            "is_email_verified": True,
        },
    },
    "customer": {
        "email_env": "DEMO_CUSTOMER_EMAIL",
        "password_env": "DEMO_CUSTOMER_PASSWORD",
        "default_email": "customer@khalisni.local",
        "default_password": "Customer@123",
        "defaults": {
            "full_name": "Demo Customer",
            "phone": "0790000002",
            "role": CustomUser.Role.CUSTOMER,
            "is_active": True,
            "is_email_verified": True,
        },
    },
    "provider": {
        "email_env": "DEMO_PROVIDER_EMAIL",
        "password_env": "DEMO_PROVIDER_PASSWORD",
        "default_email": "provider@khalisni.local",
        "default_password": "Provider@123",
        "defaults": {
            "full_name": "Demo Provider",
            "phone": "0790000003",
            "role": CustomUser.Role.PROVIDER,
            "is_active": True,
            "is_email_verified": True,
        },
    },
    "employee": {
        "email_env": "DEMO_EMPLOYEE_EMAIL",
        "password_env": "DEMO_EMPLOYEE_PASSWORD",
        "default_email": "employee@khalisni.local",
        "default_password": "Employee@123",
        "defaults": {
            "full_name": "Employee Demo",
            "phone": "0790000004",
            "role": CustomUser.Role.EMPLOYEE,
            "is_active": True,
            "is_email_verified": True,
        },
    },
}


class Command(BaseCommand):
    help = "Seed baseline services and, optionally, explicit demo users and orders."

    def add_arguments(self, parser):
        parser.add_argument(
            "--include-demo-users",
            action="store_true",
            help="Create demo login accounts with predictable credentials.",
        )
        parser.add_argument(
            "--include-demo-orders",
            action="store_true",
            help="Create demo orders. Implies --include-demo-users.",
        )
        parser.add_argument(
            "--reset-demo-passwords",
            action="store_true",
            help="Reset existing demo account passwords back to the configured demo defaults.",
        )

    def _get_demo_account_config(self, key):
        spec = DEMO_ACCOUNT_SPECS[key]
        return {
            "email": os.getenv(spec["email_env"], spec["default_email"]).strip(),
            "password": os.getenv(spec["password_env"], spec["default_password"]).strip(),
            "defaults": dict(spec["defaults"]),
        }

    def _ensure_user(self, *, email, password, defaults, reset_password=False):
        user = CustomUser.objects.filter(email=email).first()
        if not user:
            return CustomUser.objects.create_user(email=email, password=password, **defaults), True

        for field, value in defaults.items():
            setattr(user, field, value)
        if reset_password:
            user.set_password(password)
        user.save()
        return user, False

    def _get_seed_actor(self):
        actor = (
            CustomUser.objects.filter(
                role__in=[CustomUser.Role.ADMIN, CustomUser.Role.SUPPORT],
            )
            .order_by("created_at")
            .first()
        )
        if actor:
            return actor

        actor = CustomUser.objects.filter(email="seed-system@internal.local").first()
        if not actor:
            actor = CustomUser.objects.create_user(
                email="seed-system@internal.local",
                password=None,
                full_name="Seed System",
                role=CustomUser.Role.ADMIN,
                is_staff=True,
                is_superuser=False,
                is_active=False,
                is_email_verified=True,
            )
        else:
            actor.full_name = "Seed System"
            actor.role = CustomUser.Role.ADMIN
            actor.is_staff = True
            actor.is_superuser = False
            actor.is_active = False
            actor.is_email_verified = True
            if actor.has_usable_password():
                actor.set_unusable_password()
            actor.save()
        return actor

    def _seed_demo_orders(self, *, customer_user, admin_user, employee_user, provider_profile):
        if Order.objects.exists():
            return

        services = list(Service.objects.order_by("service_id")[:3])
        if len(services) < 3:
            return

        waiting_customer = Order.objects.create(
            customer=customer_user,
            service=services[0],
            city="Amman",
            customer_notes="Demo order waiting for customer documents.",
        )
        OrderStatusLog.objects.get_or_create(
            order=waiting_customer,
            old_status="",
            new_status=waiting_customer.status,
            changed_by=customer_user,
        )
        review_order(order=waiting_customer, actor=employee_user, note="Initial employee review")
        request_missing_documents(
            order=waiting_customer,
            actor=employee_user,
            note_text="Please upload the missing authorization letter.",
        )

        in_progress = Order.objects.create(
            customer=customer_user,
            service=services[1],
            city="Amman",
            customer_notes="Demo order assigned to provider.",
        )
        OrderStatusLog.objects.get_or_create(
            order=in_progress,
            old_status="",
            new_status=in_progress.status,
            changed_by=customer_user,
        )
        self._ensure_required_documents_approved(order=in_progress, customer_user=customer_user, reviewer=employee_user)
        review_order(order=in_progress, actor=employee_user, note="Assigned for processing")
        assign_provider_to_order(
            order=in_progress,
            provider=provider_profile,
            actor=admin_user,
            note="Demo provider assignment",
        )
        provider_update_status(
            order=in_progress,
            actor=provider_profile.user,
            new_status=Order.Status.IN_PROGRESS,
            note="Provider started work",
        )

        completed = Order.objects.create(
            customer=customer_user,
            service=services[2],
            city="Amman",
            customer_notes="Demo completed order.",
        )
        OrderStatusLog.objects.get_or_create(
            order=completed,
            old_status="",
            new_status=completed.status,
            changed_by=customer_user,
        )
        self._ensure_required_documents_approved(order=completed, customer_user=customer_user, reviewer=employee_user)
        review_order(order=completed, actor=employee_user, note="Reviewed and assigned")
        assign_provider_to_order(
            order=completed,
            provider=provider_profile,
            actor=admin_user,
            note="Ready for completion",
        )
        provider_update_status(
            order=completed,
            actor=provider_profile.user,
            new_status=Order.Status.IN_PROGRESS,
            note="Provider is processing the order",
        )
        complete_provider_work(
            order=completed,
            actor=provider_profile.user,
            validated_data={
                "file": SimpleUploadedFile(
                    "final-report.pdf",
                    b"final demo document",
                    content_type="application/pdf",
                ),
                "document_type": "final-report",
                "verification_note": "Demo final document",
            },
        )
        final_document = completed.documents.filter(is_deleted=False, is_final_document=True).latest("created_at")
        final_document.mark_verified(user=employee_user, note="Verified by demo seed")
        complete_order(order=completed, actor=employee_user)

        Order.objects.create(
            customer=customer_user,
            service=services[0],
            city="Zarqa",
            customer_notes="Fresh new demo order.",
        )

    def _ensure_required_documents_approved(self, *, order, customer_user, reviewer):
        for requirement in order.service.document_requirements.filter(is_active=True, is_deleted=False, is_required=True):
            document = order.documents.filter(document_type=requirement.document_type, is_deleted=False).first()
            if not document:
                document = create_order_document(
                    order=order,
                    uploaded_by=customer_user,
                    file_obj=SimpleUploadedFile(
                        f"{requirement.document_type}.pdf",
                        b"demo document",
                        content_type="application/pdf",
                    ),
                    document_type=requirement.document_type,
                )
            if document.status != "approved" or not document.is_verified:
                document.mark_verified(user=reviewer, note="Approved by demo seed")

    def _seed_service_relations(self, *, actor):
        relation_definitions = [
            (
                "Passport Appointment Booking",
                "Passport Renewal",
                ServiceRelation.RelationType.PREREQUISITE,
                True,
                "Book the appointment first, then continue with the renewal request.",
            ),
            (
                "Tax Clearance",
                "Business License Renewal",
                ServiceRelation.RelationType.PREREQUISITE,
                True,
                "Your tax clearance should be completed before renewing the business license.",
            ),
            (
                "Business License Renewal",
                "No Criminal Record Certificate",
                ServiceRelation.RelationType.RECOMMENDED_AFTER,
                False,
                "After renewing the business license, you may also need an updated no-criminal-record certificate.",
            ),
            (
                "Business License Renewal",
                "Traffic Fines Payment",
                ServiceRelation.RelationType.OPTIONAL_BUNDLE,
                False,
                "Many clients also clear related traffic obligations during the same renewal cycle.",
            ),
            (
                "Passport Renewal",
                "Passport Appointment Booking",
                ServiceRelation.RelationType.ALTERNATIVE,
                False,
                "If you only need a time slot first, start with appointment booking instead of the full renewal.",
            ),
        ]

        for source_name, target_name, relation_type, is_required, message_to_customer in relation_definitions:
            source_service = Service.objects.filter(name_ar=source_name).first()
            target_service = Service.objects.filter(name_ar=target_name).first()
            if not source_service or not target_service:
                continue

            relation, created = ServiceRelation.objects.get_or_create(
                source_service=source_service,
                target_service=target_service,
                relation_type=relation_type,
                defaults={
                    "is_required": is_required,
                    "message_to_customer": message_to_customer,
                    "is_active": True,
                    "created_by": actor,
                },
            )
            if not created:
                relation.is_required = is_required
                relation.message_to_customer = message_to_customer
                relation.is_active = True
                relation.created_by = actor
                relation.save()

    def _seed_catalog(self):
        categories = [
            ("Civil Status and Passports", "civil-status-and-passports"),
            ("Social Security", "social-security"),
            ("Tax", "tax"),
            ("Ministry of Labour", "ministry-of-labour"),
            ("Municipal Services", "municipal-services"),
            ("Land and Survey", "land-and-survey"),
            ("Quick Public Services", "quick-public-services"),
        ]

        for display_name, slug in categories:
            ServiceCategory.objects.get_or_create(
                slug=slug,
                defaults={
                    "name_ar": display_name,
                    "name_en": display_name,
                    "description_ar": display_name,
                    "description_en": display_name,
                    "is_active": True,
                },
            )

        services = [
            ("No Criminal Record Certificate", "ministry-of-labour", 2, 5, 10),
            ("Passport Appointment Booking", "civil-status-and-passports", 1, 2, 5),
            ("Passport Renewal", "civil-status-and-passports", 5, 10, 15),
            ("Traffic Fines Payment", "quick-public-services", 1, 3, 6),
            ("Property Registration Deed", "land-and-survey", 4, 12, 18),
            ("Tax Clearance", "tax", 3, 7, 11),
            ("Business License Renewal", "municipal-services", 4, 9, 13),
        ]
        required_documents = ["National ID", "Authorization Letter"]

        for service_name, category_slug, days, government_fee, service_fee in services:
            category = ServiceCategory.objects.get(slug=category_slug)
            service, _ = Service.objects.get_or_create(
                slug=slugify(service_name),
                defaults={
                    "category": category,
                    "name_ar": service_name,
                    "name_en": service_name,
                    "description_ar": f"Service for {service_name}.",
                    "description_en": f"Service for {service_name}.",
                    "estimated_duration": days,
                    "base_price": government_fee + service_fee,
                    "government_fee": government_fee,
                    "service_fee": service_fee,
                    "is_featured": True,
                    "is_active": True,
                },
            )

            for display_order, document_name in enumerate(required_documents, start=1):
                ServiceRequiredDocument.objects.get_or_create(
                    service=service,
                    document_type=slugify(document_name),
                    defaults={
                        "name_ar": document_name,
                        "name_en": document_name,
                        "display_order": display_order,
                    },
                )

    def _seed_demo_users(self, *, reset_passwords):
        created = []
        users = {}
        for key in ("admin", "customer", "employee", "provider"):
            config = self._get_demo_account_config(key)
            user, was_created = self._ensure_user(
                email=config["email"],
                password=config["password"],
                defaults=config["defaults"],
                reset_password=reset_passwords,
            )
            users[key] = user
            if was_created:
                created.append(config["email"])

        provider_profile, _ = ProviderProfile.objects.get_or_create(
            user=users["provider"],
            defaults={
                "provider_type": "Government Services Specialist",
                "city": "Amman",
                "is_available": True,
                "is_approved": True,
                "approved_by": users["admin"],
            },
        )
        provider_profile.provider_type = "Government Services Specialist"
        provider_profile.city = "Amman"
        provider_profile.phone = users["provider"].phone
        provider_profile.is_available = True
        provider_profile.is_approved = True
        provider_profile.approved_by = users["admin"]
        provider_profile.save()
        provider_profile.service_categories.set(ServiceCategory.objects.all()[:3])

        return users, provider_profile, created

    def handle(self, *args, **options):
        include_demo_orders = bool(options["include_demo_orders"])
        include_demo_users = bool(options["include_demo_users"] or include_demo_orders)
        reset_demo_passwords = bool(options["reset_demo_passwords"])

        self._seed_catalog()
        seed_actor = self._get_seed_actor()
        self._seed_service_relations(actor=seed_actor)

        demo_summary = []
        if include_demo_users:
            demo_users, provider_profile, created_users = self._seed_demo_users(
                reset_passwords=reset_demo_passwords,
            )
            if created_users:
                demo_summary.append(f"created demo users: {', '.join(created_users)}")
            if include_demo_orders:
                self._seed_demo_orders(
                    customer_user=demo_users["customer"],
                    admin_user=demo_users["admin"],
                    employee_user=demo_users["employee"],
                    provider_profile=provider_profile,
                )
                demo_summary.append("demo orders ensured")

        message = "Baseline seed data ensured successfully."
        if demo_summary:
            message = f"{message} {'; '.join(demo_summary)}."
        self.stdout.write(self.style.SUCCESS(message))
