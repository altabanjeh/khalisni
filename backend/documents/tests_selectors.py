from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from accounts.models import CustomUser
from documents.models import Document
from documents.selectors import get_documents_for_user
from orders.models import Order
from services.models import Service, ServiceCategory


class DocumentSelectorTests(TestCase):
    def setUp(self):
        category = ServiceCategory.objects.create(name_ar="Category", name_en="Category", slug="selector-category")
        service = Service.objects.create(
            category=category,
            name_ar="Service",
            name_en="Service",
            slug="selector-service",
            description_ar="Details",
            estimated_duration=2,
            base_price=10,
            government_fee=3,
            service_fee=4,
        )
        self.customer = CustomUser.objects.create_user(
            email="selector-customer@example.com",
            password="Password@123",
            full_name="Selector Customer",
            phone="0797000001",
            role=CustomUser.Role.CUSTOMER,
        )
        other_customer = CustomUser.objects.create_user(
            email="selector-other@example.com",
            password="Password@123",
            full_name="Selector Other",
            phone="0797000002",
            role=CustomUser.Role.CUSTOMER,
        )
        own_order = Order.objects.create(customer=self.customer, service=service, city="Amman")
        other_order = Order.objects.create(customer=other_customer, service=service, city="Irbid")
        self.own_document = Document.objects.create(
            order=own_order,
            uploaded_by=self.customer,
            document_type="national_id",
            file=SimpleUploadedFile("own.pdf", b"own", content_type="application/pdf"),
            original_filename="own.pdf",
            file_size=3,
            mime_type="application/pdf",
        )
        Document.objects.create(
            order=other_order,
            uploaded_by=other_customer,
            document_type="national_id",
            file=SimpleUploadedFile("other.pdf", b"other", content_type="application/pdf"),
            original_filename="other.pdf",
            file_size=5,
            mime_type="application/pdf",
        )

    def test_customer_only_gets_documents_for_owned_orders(self):
        queryset = get_documents_for_user(self.customer)
        self.assertEqual(list(queryset.values_list("pk", flat=True)), [self.own_document.pk])
