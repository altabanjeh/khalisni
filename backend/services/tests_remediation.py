"""Regression tests for catalog / data-integrity remediation (D2, D7, D-DB2)."""

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from services.models import (
    RequiredDocumentDefinition,
    Service,
    ServiceCategory,
    ServiceProviderAssignment,
    ServiceRelation,
)
from providers.models import ProviderProfile


def _make_service(slug, category, **overrides):
    data = dict(
        category=category,
        name_ar="خدمة",
        name_en="Service",
        slug=slug,
        description_ar="تفاصيل",
        estimated_duration=3,
        base_price="20.00",
        government_fee="5.00",
        service_fee="7.00",
    )
    data.update(overrides)
    return Service.objects.create(**data)


class RelatedServicePriceLeakTests(APITestCase):
    """Defect D2: public service detail must not leak related-service fee parts."""

    def setUp(self):
        self.category = ServiceCategory.objects.create(
            name_ar="تصنيف", name_en="Category", slug="d2-category"
        )
        self.service = _make_service("d2-main", self.category)
        # Related service in the same category with every fee field hidden.
        self.related = _make_service(
            "d2-related",
            self.category,
            show_total_price_public=False,
            show_government_fee_public=False,
            show_company_fee_public=False,
        )

    def test_related_services_hide_fee_components_by_default(self):
        response = self.client.get(f"/api/services/{self.service.slug}/")
        self.assertEqual(response.status_code, 200)
        related = response.data.get("related_services") or []
        self.assertTrue(related, "expected the related service to be listed")
        row = related[0]

        # The raw fee columns must no longer be present at all.
        self.assertNotIn("service_fee", row)
        self.assertNotIn("government_fee", row)

        # Pricing is exposed only through the visibility-gated payload.
        pricing = row["pricing"]
        self.assertIsNone(pricing["total_price"])
        self.assertIsNone(pricing["government_fee"])
        self.assertIsNone(pricing["company_fee"])

    def test_related_services_expose_only_flagged_fee(self):
        self.related.show_total_price_public = True
        self.related.save()
        response = self.client.get(f"/api/services/{self.service.slug}/")
        row = (response.data.get("related_services") or [])[0]
        self.assertIsNotNone(row["pricing"]["total_price"])
        self.assertIsNone(row["pricing"]["government_fee"])
        self.assertIsNone(row["pricing"]["company_fee"])


class RequiredDocumentDefinitionCodeUniquenessTests(APITestCase):
    """Defect D7: a code identifies at most one non-deleted definition."""

    def test_two_undeleted_definitions_cannot_share_a_code(self):
        RequiredDocumentDefinition.objects.create(code="national_id", name_ar="الهوية", is_active=True)
        # Even when the second one is inactive, the code is already taken.
        with self.assertRaises((IntegrityError, ValidationError)):
            with transaction.atomic():
                RequiredDocumentDefinition.objects.create(
                    code="national_id", name_ar="هوية أخرى", is_active=False
                )

    def test_code_can_be_reused_after_soft_delete(self):
        first = RequiredDocumentDefinition.objects.create(code="passport", name_ar="جواز", is_active=True)
        first.soft_delete()
        # Now the code is free again.
        RequiredDocumentDefinition.objects.create(code="passport", name_ar="جواز جديد", is_active=True)


class SoftDeleteFkProtectionTests(APITestCase):
    """Defect D-DB2: FKs to soft-deletable parents must PROTECT, not CASCADE."""

    def setUp(self):
        self.category = ServiceCategory.objects.create(
            name_ar="تصنيف", name_en="Category", slug="ddb2-category"
        )
        self.admin = CustomUser.objects.create_user(
            email="ddb2-admin@example.com",
            password="Password@123",
            full_name="DDB2 Admin",
            phone="0796000900",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )

    def test_service_relation_fk_protects_against_hard_delete(self):
        source = _make_service("ddb2-source", self.category)
        target = _make_service("ddb2-target", self.category)
        ServiceRelation.objects.create(
            source_service=source,
            target_service=target,
            relation_type=ServiceRelation.RelationType.RECOMMENDED_AFTER,
            created_by=self.admin,
        )
        with self.assertRaises(ProtectedError):
            source.delete()

    def test_provider_assignment_fk_protects_against_hard_delete(self):
        service = _make_service("ddb2-svc", self.category, provider_required=True)
        provider_user = CustomUser.objects.create_user(
            email="ddb2-provider@example.com",
            password="Password@123",
            full_name="DDB2 Provider",
            phone="0796000901",
            role=CustomUser.Role.PROVIDER,
        )
        provider = ProviderProfile.objects.create(
            user=provider_user, company_name="DDB2 Co", provider_type="individual", city="Amman"
        )
        ServiceProviderAssignment.objects.create(service=service, provider=provider)
        with self.assertRaises(ProtectedError):
            service.delete()
