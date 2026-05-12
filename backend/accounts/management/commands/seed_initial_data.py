from django.core.management.base import BaseCommand
from django.utils.text import slugify

from accounts.models import CustomUser
from orders.models import Order, OrderStatusLog
from orders.services import (
    assign_provider_to_order,
    complete_order,
    provider_update_status,
    request_missing_documents,
    review_order,
)
from providers.models import ProviderProfile
from services.models import Service, ServiceCategory, ServiceRequiredDocument


class Command(BaseCommand):
    help = "Seed initial data for Khalisni MVP"

    def _ensure_user(self, *, email, password, defaults):
        user = CustomUser.objects.filter(email=email).first()
        if not user:
            return CustomUser.objects.create_user(email=email, password=password, **defaults)

        for field, value in defaults.items():
            setattr(user, field, value)
        user.set_password(password)
        user.save()
        return user

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
        provider_update_status(
            order=completed,
            actor=provider_profile.user,
            new_status=Order.Status.READY_FOR_DELIVERY,
            note="Provider marked the order ready for delivery",
        )
        complete_order(order=completed, actor=employee_user, admin_confirmation=True)

        Order.objects.create(
            customer=customer_user,
            service=services[0],
            city="Zarqa",
            customer_notes="Fresh new demo order.",
        )

    def handle(self, *args, **options):
        categories = [
            ("Civil Status and Passports", "civil-status-and-passports"),
            ("Social Security", "social-security"),
            ("Tax", "tax"),
            ("Ministry of Labour", "ministry-of-labour"),
            ("Municipal Services", "municipal-services"),
            ("Land and Survey", "land-and-survey"),
            ("Quick Public Services", "quick-public-services"),
        ]

        category_map = {}
        for display_name, slug in categories:
            category, _ = ServiceCategory.objects.get_or_create(
                slug=slug,
                defaults={
                    "name_ar": display_name,
                    "name_en": display_name,
                    "description_ar": display_name,
                    "description_en": display_name,
                    "is_active": True,
                },
            )
            category_map[display_name] = category

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

        admin_user = self._ensure_user(
            email="admin@khalisni.local",
            password="Admin@123",
            defaults={
                "full_name": "Khalisni Admin",
                "phone": "0790000001",
                "role": CustomUser.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
                "is_email_verified": True,
            },
        )

        customer_user = self._ensure_user(
            email="customer@khalisni.local",
            password="Customer@123",
            defaults={
                "full_name": "Demo Customer",
                "phone": "0790000002",
                "role": CustomUser.Role.CUSTOMER,
                "is_active": True,
                "is_email_verified": True,
            },
        )

        employee_user = self._ensure_user(
            email="employee@khalisni.local",
            password="Employee@123",
            defaults={
                "full_name": "Employee Demo",
                "phone": "0790000004",
                "role": CustomUser.Role.EMPLOYEE,
                "is_active": True,
                "is_email_verified": True,
            },
        )

        provider_user = self._ensure_user(
            email="provider@khalisni.local",
            password="Provider@123",
            defaults={
                "full_name": "Demo Provider",
                "phone": "0790000003",
                "role": CustomUser.Role.PROVIDER,
                "is_active": True,
                "is_email_verified": True,
            },
        )

        provider_profile, _ = ProviderProfile.objects.get_or_create(
            user=provider_user,
            defaults={
                "provider_type": "Government Services Specialist",
                "city": "Amman",
                "is_available": True,
                "is_approved": True,
                "approved_by": admin_user,
            },
        )
        provider_profile.provider_type = "Government Services Specialist"
        provider_profile.city = "Amman"
        provider_profile.phone = provider_user.phone
        provider_profile.is_available = True
        provider_profile.is_approved = True
        provider_profile.approved_by = admin_user
        provider_profile.save()
        provider_profile.service_categories.set(ServiceCategory.objects.all()[:3])

        self._seed_demo_orders(
            customer_user=customer_user,
            admin_user=admin_user,
            employee_user=employee_user,
            provider_profile=provider_profile,
        )

        self.stdout.write(self.style.SUCCESS("Seed data created successfully."))

