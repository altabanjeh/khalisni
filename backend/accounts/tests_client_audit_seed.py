import os
import secrets
import tempfile
from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from accounts.models import CustomUser
from orders.models import Order
from services.models import Service, ServiceCategory


class ClientAuditSeedTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.media_dir = tempfile.TemporaryDirectory()
        cls.media_override = override_settings(MEDIA_ROOT=cls.media_dir.name, DEBUG=True)
        cls.media_override.enable()

    @classmethod
    def tearDownClass(cls):
        cls.media_override.disable()
        cls.media_dir.cleanup()
        super().tearDownClass()

    def test_seed_is_idempotent_and_preserves_unrelated_orders(self):
        customer = CustomUser.objects.create_user(
            email="unrelated@example.test", password=None, full_name="Unrelated customer",
            role=CustomUser.Role.CUSTOMER,
        )
        category = ServiceCategory.objects.create(name_ar="أخرى", name_en="Other", slug="unrelated")
        service = Service.objects.create(
            category=category, name_ar="خدمة أخرى", name_en="Other service",
            slug="unrelated", description_ar="أخرى",
        )
        unrelated = Order.objects.create(customer=customer, service=service, city="Amman")
        original_number = unrelated.order_number
        password = secrets.token_urlsafe(32)
        with patch.dict(os.environ, {"KHALSNI_QA_PASSWORD": password}):
            call_command("seed_client_audit_qa", verbosity=0)
            first = list(Order.objects.filter(customer_notes__startswith="[client-audit-qa-202610:").values_list("pk", flat=True))
            call_command("seed_client_audit_qa", verbosity=0)
            second = list(Order.objects.filter(customer_notes__startswith="[client-audit-qa-202610:").values_list("pk", flat=True))
        rotated_password = secrets.token_urlsafe(32)
        with patch.dict(os.environ, {"KHALSNI_QA_PASSWORD": rotated_password}):
            call_command("seed_client_audit_qa", verbosity=0)
        qa_admin = CustomUser.objects.get(email="client-audit-qa-202610-admin@example.test")
        self.assertTrue(qa_admin.check_password(rotated_password))

        unrelated.refresh_from_db()
        self.assertEqual(unrelated.order_number, original_number)
        self.assertEqual(unrelated.status, Order.Status.NEW)
        self.assertEqual(first, second)
        self.assertEqual(len(second), 4)

    def test_drift_is_reported_and_explicit_rebuild_touches_only_qa_orders(self):
        password = secrets.token_urlsafe(32)
        with patch.dict(os.environ, {"KHALSNI_QA_PASSWORD": password}):
            call_command("seed_client_audit_qa", verbosity=0)
            qa_order = Order.objects.get(customer_notes__startswith="[client-audit-qa-202610:missing]")
            original_pk = qa_order.pk
            qa_order.status = Order.Status.UNDER_REVIEW
            qa_order.save(update_fields=["status"])
            with self.assertRaises(CommandError):
                call_command("seed_client_audit_qa", verbosity=0)
            call_command("seed_client_audit_qa", rebuild_owned=True, verbosity=0)

        rebuilt = Order.objects.get(customer_notes__startswith="[client-audit-qa-202610:missing]")
        self.assertNotEqual(rebuilt.pk, original_pk)
        self.assertEqual(rebuilt.status, Order.Status.WAITING_CUSTOMER)
        self.assertEqual(Order.objects.filter(customer_notes__startswith="[client-audit-qa-202610:").count(), 4)
