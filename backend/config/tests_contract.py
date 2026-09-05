"""FE/BE contract verification (Gate 1R §16).

Asserts the response shapes the React client actually consumes: field presence,
enum membership, nested objects (pricing / delivery_time / required_documents /
allowed_actions), list envelope, and the error body shape. Runs against the real
serializers + a real DB -- not FE mock fixtures.
"""

from rest_framework.test import APITestCase

from accounts.models import CustomUser
from core.choices import OrderStatus
from orders.models import Order
from services.models import (
    RequiredDocumentDefinition, Service, ServiceCategory, ServiceRequiredDocument,
)


class ContractTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cat = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="ct-cat")
        cls.defn = RequiredDocumentDefinition.objects.create(code="national_id", name_ar="هوية", name_en="ID", is_active=True)
        cls.svc = Service.objects.create(
            category=cls.cat, name_ar="خ", name_en="S", slug="ct-svc", description_ar="d", description_en="d",
            estimated_duration=4, base_price="12.00", government_fee="3.00", service_fee="2.00",
            show_total_price_public=True, show_government_fee_public=False, show_company_fee_public=False,
        )
        ServiceRequiredDocument.objects.create(
            service=cls.svc, document_definition=cls.defn, document_type="national_id",
            name_ar="هوية", is_required=True, display_order=1,
        )
        cls.customer = CustomUser.objects.create_user(
            email="ct-cust@example.com", password="Password@123", full_name="Ct Cust",
            phone="0794400001", role=CustomUser.Role.CUSTOMER,
        )

    def test_public_service_list_envelope_and_item_shape(self):
        r = self.client.get("/api/services/")
        self.assertEqual(r.status_code, 200)
        rows = r.data if isinstance(r.data, list) else r.data["results"]
        item = next(x for x in rows if x["slug"] == "ct-svc")
        for key in ("id", "slug", "name_ar", "name_en", "pricing", "delivery_time"):
            self.assertIn(key, item, key)
        self.assertIn("total_price", item["pricing"])
        self.assertIn("label", item["delivery_time"])

    def test_public_service_detail_shape(self):
        r = self.client.get("/api/services/ct-svc/")
        self.assertEqual(r.status_code, 200)
        d = r.data
        for key in ("required_documents", "pricing", "delivery_time", "prerequisite_services",
                    "recommended_services", "related_services", "steps"):
            self.assertIn(key, d, key)
        self.assertTrue(d["required_documents"])
        rd = d["required_documents"][0]
        for key in ("name_ar", "is_required"):
            self.assertIn(key, rd, key)
        # D2 contract: hidden fee parts must be null, not raw values
        self.assertIsNone(d["pricing"]["government_fee"])
        self.assertIsNone(d["pricing"]["company_fee"])
        self.assertIsNotNone(d["pricing"]["total_price"])
        # related services must not carry raw fee columns
        for rel in d["related_services"]:
            self.assertNotIn("service_fee", rel)
            self.assertNotIn("government_fee", rel)

    def test_public_categories_shape(self):
        r = self.client.get("/api/public-site/service-categories/")
        self.assertEqual(r.status_code, 200)
        rows = r.data if isinstance(r.data, list) else r.data["results"]
        c = next(x for x in rows if x["slug"] == "ct-cat")
        for key in ("id", "slug", "name_ar", "name_en"):
            self.assertIn(key, c, key)

    def test_customer_order_detail_shape_and_status_enum(self):
        simple = Service.objects.create(
            category=self.cat, name_ar="بسيط", name_en="Simple", slug="ct-simple",
            description_ar="d", estimated_duration=1, base_price="1.00", provider_required=False,
        )
        self.client.force_authenticate(self.customer)
        cr = self.client.post(
            "/api/orders/",
            {"service": simple.id, "full_name": "x", "phone": self.customer.phone, "city": "Amman", "consent": True},
            format="json",
        )
        self.assertEqual(cr.status_code, 201, cr.data)
        oid = cr.data["id"]
        d = self.client.get(f"/api/customer/orders/{oid}/")
        self.assertEqual(d.status_code, 200)
        for key in ("id", "order_number", "status", "service_name_snapshot", "allowed_actions"):
            self.assertIn(key, d.data, key)
        self.assertIn(d.data["status"], OrderStatus.values)
        self.assertTrue(d.data["order_number"].startswith("KH-"))
        # allowed_actions is the contract the UI uses to render buttons
        for key in ("can_view", "can_cancel", "can_upload_customer_document", "available_status_transitions"):
            self.assertIn(key, d.data["allowed_actions"], key)

    def test_paginated_list_envelope_for_admin_orders(self):
        admin = CustomUser.objects.create_user(
            email="ct-admin@example.com", password="Password@123", full_name="A",
            phone="0794400002", role=CustomUser.Role.ADMIN, is_staff=True, is_superuser=True,
        )
        self.client.force_authenticate(admin)
        r = self.client.get("/api/admin/orders/")
        self.assertEqual(r.status_code, 200)
        # DRF PageNumberPagination envelope OR a bare list -- unwrapList handles both
        self.assertTrue(isinstance(r.data, list) or ("results" in r.data and "count" in r.data))

    def test_error_body_shape_is_detail_or_field_map(self):
        self.client.force_authenticate(self.customer)
        r = self.client.post("/api/orders/", {"consent": True}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertTrue(isinstance(r.data, dict))
        # FE reads error.response.data.detail or a {field: [msgs]} map
        self.assertTrue("detail" in r.data or any(isinstance(v, list) for v in r.data.values()))

    def test_login_response_contract(self):
        r = self.client.post(
            "/api/auth/login/", {"email": self.customer.email, "password": "Password@123"}, format="json"
        )
        self.assertEqual(r.status_code, 200)
        for key in ("access", "refresh", "user"):
            self.assertIn(key, r.data, key)
        self.assertIn("role", r.data["user"])
