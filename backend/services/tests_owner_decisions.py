"""Owner decisions on catalogue data: D02 wording, B10-1/2/3 parcel/basin, B10-4 notes, B10-7 counts."""

import importlib
import json
from decimal import Decimal
from io import StringIO

from django.apps import apps
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser, SystemSetting
from orders.models import Order
from services.catalogue_rules import (
    APPROVED_DELIVERY_NOTE,
    APPROVED_PRICE_NOTE,
    PARCEL_QUESTION_LABEL,
    apply_schema_rules,
)
from services.models import Service, ServiceCategory

MIGRATION = importlib.import_module("services.migrations.0014_apply_owner_catalogue_decisions")
OLD_PRICE_NOTE = "يحدد بعد المراجعة من لوحة الإدارة."
OLD_DELIVERY_NOTE = "تُحدد من لوحة الإدارة"
QUESTION_KEY = "field_2fa52c6cfa"


def legacy_land_schema(with_question=True):
    """The shape of the real land-service schemas before this pass."""
    schema = [
        {"key": "full_name", "label_ar": "الاسم الكامل", "type": "text", "required": True, "display_order": 1, "options": []},
        {"key": "parcel_number", "label_ar": "رقم القطعة", "type": "number", "required": True, "display_order": 2, "options": []},
        {"key": "basin_number", "label_ar": "رقم الحوض", "type": "number", "required": True, "display_order": 3, "options": []},
        {"key": "additional_notes", "label_ar": "ملاحظات إضافية", "type": "textarea", "required": True, "display_order": 4, "options": []},
        {"key": "request_reason", "label_ar": "سبب الطلب", "type": "textarea", "required": True, "display_order": 5, "options": []},
    ]
    if with_question:
        schema.append({"key": QUESTION_KEY, "label_ar": PARCEL_QUESTION_LABEL, "type": "number", "required": False,
                       "display_order": 6, "options": [], "source_type": "Yes/No"})
    return schema


class CatalogueDataMigrationTests(TestCase):
    def setUp(self):
        category = ServiceCategory.objects.create(name_ar="أراضي", name_en="Land", slug="odc-land", is_active=True, show_on_public_site=True)
        common = {"category": category, "description_ar": "وصف", "is_active": True, "show_on_public_site": True}
        self.quotation = Service.objects.create(
            name_ar="سند", name_en="Deed", slug="odc-deed", price_type="quotation",
            public_price_note_ar=OLD_PRICE_NOTE, public_price_note_en="Shared after review.",
            delivery_note_ar=OLD_DELIVERY_NOTE, delivery_note_en="",
            required_information_schema=legacy_land_schema(), **common,
        )
        self.other_delivery = Service.objects.create(
            name_ar="مخطط", name_en="Map", slug="odc-map", price_type="quotation",
            public_price_note_ar=OLD_PRICE_NOTE, public_price_note_en="Shared after review.",
            delivery_note_ar="حسب إجراءات دائرة الأراضي والمساحة.", delivery_note_en="",
            required_information_schema=legacy_land_schema(with_question=False), **common,
        )
        self.fixed = Service.objects.create(
            name_ar="جواز", name_en="Passport", slug="odc-passport", price_type="fixed",
            base_price=Decimal("32.00"), government_fee=Decimal("20.00"), service_fee=Decimal("12.00"),
            public_price_note_ar=APPROVED_PRICE_NOTE["ar"], public_price_note_en=APPROVED_PRICE_NOTE["en"],
            delivery_note_ar="سيتم إشعارك عند كل تحديث مهم على الطلب.", delivery_note_en="You will be notified at every important request update.",
            **common,
        )
        self.customer = CustomUser.objects.create_user(email="odc@example.test", password="x-Pass-2026!", full_name="C", phone="0791300001")
        self.order = Order.objects.create(customer=self.customer, service=self.quotation, city="Amman",
                                          customer_notes="البيانات الإضافية المطلوبة:\nرقم القطعة: 012")
        self.prices = {s.pk: (s.price_type, s.base_price, s.government_fee, s.service_fee, s.total_fee) for s in Service.objects.all()}
        MIGRATION.apply_decisions(apps, None)

    # Tests 10 and 11
    def test_admin_panel_wording_is_replaced_in_arabic_and_english(self):
        self.quotation.refresh_from_db()
        self.assertEqual((self.quotation.public_price_note_ar, self.quotation.public_price_note_en),
                         ("يتم تأكيد الرسوم النهائية بعد مراجعة الوثائق.", "Final fees are confirmed after document review."))
        self.assertEqual((self.quotation.delivery_note_ar, self.quotation.delivery_note_en),
                         ("تُحدَّد مدة الإنجاز بعد مراجعة الطلب.", "The completion time is confirmed after your request is reviewed."))
        self.other_delivery.refresh_from_db()
        self.assertEqual(self.other_delivery.public_price_note_en, APPROVED_PRICE_NOTE["en"])
        # A delivery note that does not mention the admin panel is not touched.
        self.assertEqual(self.other_delivery.delivery_note_ar, "حسب إجراءات دائرة الأراضي والمساحة.")

    def test_no_public_service_mentions_the_admin_panel(self):
        client = APIClient()
        listed = client.get("/api/services/")
        self.assertEqual(listed.status_code, 200)
        self.assertNotIn("لوحة الإدارة", json.dumps(listed.data, ensure_ascii=False, default=str))
        for service in Service.objects.all():
            detail = client.get(f"/api/services/{service.slug}/")
            self.assertEqual(detail.status_code, 200)
            self.assertNotIn("لوحة الإدارة", json.dumps(detail.data, ensure_ascii=False, default=str))

    def test_prices_and_price_types_are_unchanged(self):
        for service in Service.objects.all():
            self.assertEqual((service.price_type, service.base_price, service.government_fee, service.service_fee, service.total_fee),
                             self.prices[service.pk])

    def test_migration_is_idempotent(self):
        before = list(Service.objects.order_by("pk").values())
        MIGRATION.apply_decisions(apps, None)
        self.assertEqual(list(Service.objects.order_by("pk").values()), before)

    # Test 12
    def test_parcel_question_becomes_a_yes_no_select_asked_before_the_numbers(self):
        self.quotation.refresh_from_db()
        schema = self.quotation.required_information_schema
        keys = [field["key"] for field in schema]
        question = schema[keys.index(QUESTION_KEY)]
        self.assertEqual(question["type"], "select")
        self.assertEqual([option["value"] for option in question["options"]], ["yes", "no"])
        self.assertEqual([option["label_en"] for option in question["options"]], ["Yes", "No"])
        self.assertIn("فريقنا", question["help_text_ar"])
        self.assertIn("our team", question["help_text_en"])
        self.assertLess(keys.index(QUESTION_KEY), keys.index("parcel_number"))
        self.assertEqual([field["display_order"] for field in schema], list(range(1, len(schema) + 1)))

    # Tests 13 and 14
    def test_parcel_and_basin_are_required_only_when_the_answer_is_yes(self):
        self.quotation.refresh_from_db()
        fields = {field["key"]: field for field in self.quotation.required_information_schema}
        for key in ("parcel_number", "basin_number"):
            self.assertTrue(fields[key]["required"])
            self.assertEqual(fields[key]["visible_when"], {"field": QUESTION_KEY, "equals": "yes"})

    def test_services_without_the_question_keep_the_numbers_always_required(self):
        self.other_delivery.refresh_from_db()
        fields = {field["key"]: field for field in self.other_delivery.required_information_schema}
        self.assertTrue(fields["parcel_number"]["required"])
        self.assertNotIn("visible_when", fields["parcel_number"])

    # Test 15
    def test_parcel_and_basin_identifiers_are_text_so_leading_zeros_survive(self):
        for service in (self.quotation, self.other_delivery):
            service.refresh_from_db()
            fields = {field["key"]: field for field in service.required_information_schema}
            self.assertEqual(fields["parcel_number"]["type"], "text")
            self.assertEqual(fields["basin_number"]["type"], "text")

    # Test 16
    def test_additional_notes_are_optional_and_other_fields_unchanged(self):
        self.quotation.refresh_from_db()
        fields = {field["key"]: field for field in self.quotation.required_information_schema}
        self.assertFalse(fields["additional_notes"]["required"])
        self.assertTrue(fields["request_reason"]["required"])  # an unrelated textarea stays required
        self.assertTrue(fields["full_name"]["required"])

    def test_existing_order_snapshot_is_not_mutated(self):
        self.order.refresh_from_db()
        self.assertEqual(self.order.customer_notes, "البيانات الإضافية المطلوبة:\nرقم القطعة: 012")
        self.assertEqual(self.order.service_name_snapshot, "سند")


class SchemaRuleAndValidatorTests(APITestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_user(email="ods-admin@example.test", password="x-Pass-2026!", full_name="A",
                                                    phone="0791300002", role=CustomUser.Role.ADMIN, is_staff=True, is_superuser=True)
        category = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="ods-cat")
        self.service = Service.objects.create(category=category, name_ar="خ", name_en="S", slug="ods-svc", description_ar="و")
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def patch(self, schema):
        return self.client.patch(f"/api/admin/services/{self.service.pk}/", {"required_information_schema": schema}, format="json")

    def test_rules_do_not_modify_their_input(self):
        schema = legacy_land_schema()
        snapshot = json.dumps(schema, sort_keys=True)
        apply_schema_rules(schema)
        self.assertEqual(json.dumps(schema, sort_keys=True), snapshot)

    def test_converted_schema_is_accepted_by_the_admin_validator(self):
        self.assertEqual(self.patch(apply_schema_rules(legacy_land_schema())).status_code, 200)

    def test_visible_when_must_name_an_earlier_field_of_the_form(self):
        base = [{"key": "q", "label_ar": "س", "type": "select", "options": [{"value": "yes", "label_ar": "نعم"}]}]
        for condition in ({"field": "missing", "equals": "yes"}, {"field": "q"}, "q=yes", {"field": "q", "equals": "yes", "x": 1}):
            schema = base + [{"key": "n", "label_ar": "ن", "type": "text", "visible_when": condition}]
            self.assertEqual(self.patch(schema).status_code, 400, condition)
        self_reference = [{"key": "n", "label_ar": "ن", "type": "text", "visible_when": {"field": "n", "equals": "yes"}}]
        self.assertEqual(self.patch(self_reference).status_code, 400)

    def test_importer_produces_the_approved_shapes(self):
        from services.service_import import _field_from_label, _service_defaults

        question = _field_from_label(PARCEL_QUESTION_LABEL, source_type="Yes/No", required=False)
        self.assertEqual(question["type"], "checkbox")  # never "number"
        defaults = _service_defaults(
            {"name_ar": "خ", "name_en": "", "public_price_note_ar": OLD_PRICE_NOTE, "delivery_note_ar": OLD_DELIVERY_NOTE,
             "fields": legacy_land_schema()},
            self.service.category,
        )
        self.assertEqual(defaults["public_price_note_en"], APPROVED_PRICE_NOTE["en"])
        self.assertEqual(defaults["delivery_note_ar"], APPROVED_DELIVERY_NOTE["ar"])
        self.assertNotIn("لوحة الإدارة", json.dumps(defaults, ensure_ascii=False, default=str))
        notes = next(field for field in defaults["required_information_schema"] if field["key"] == "additional_notes")
        self.assertFalse(notes["required"])


class ServiceCountTests(APITestCase):
    """17: total / active / published / visible-to-customer follow the backend filters."""

    def setUp(self):
        self.admin = CustomUser.objects.create_user(email="cnt-admin@example.test", password="x-Pass-2026!", full_name="A",
                                                    phone="0791300003", role=CustomUser.Role.ADMIN, is_staff=True, is_superuser=True)
        shown = ServiceCategory.objects.create(name_ar="ظاهرة", name_en="Shown", slug="cnt-shown", is_active=True, show_on_public_site=True)
        hidden = ServiceCategory.objects.create(name_ar="مخفية", name_en="Hidden", slug="cnt-hidden", is_active=True, show_on_public_site=False)
        make = lambda slug, **kw: Service.objects.create(name_ar=slug, name_en=slug, slug=slug, description_ar="و", **kw)  # noqa: E731
        for index in range(3):
            make(f"cnt-pub-{index}", category=shown, is_active=True, show_on_public_site=True)
        make("cnt-hidden-service", category=shown, is_active=True, show_on_public_site=False)
        make("cnt-hidden-category", category=hidden, is_active=True, show_on_public_site=True)
        make("cnt-inactive", category=shown, is_active=False, show_on_public_site=True)
        deleted = make("cnt-deleted", category=shown, is_active=True, show_on_public_site=True)
        deleted.is_deleted = True
        deleted.save()
        self.client = APIClient()

    def test_counts_follow_backend_definitions(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/admin/services/counts/")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(
            {key: response.data[key] for key in ("total", "active", "published", "customer_visible")},
            {"total": 6, "active": 5, "published": 3, "customer_visible": 3},
        )
        self.assertEqual(response.data["customer_scope"], "platform")
        # The customer-visible number is exactly what the public catalogue lists.
        public = APIClient().get("/api/services/")
        rows = public.data["results"] if isinstance(public.data, dict) else public.data
        self.assertEqual(len(rows), response.data["customer_visible"])
        # And the total is what the admin list counts.
        admin_list = self.client.get("/api/admin/services/")
        self.assertEqual(admin_list.data["count"], response.data["total"])

    def test_counts_need_catalogue_permission(self):
        customer = CustomUser.objects.create_user(email="cnt-c@example.test", password="x-Pass-2026!", full_name="C", phone="0791300004")
        self.client.force_authenticate(customer)
        self.assertIn(self.client.get("/api/admin/services/counts/").status_code, (403, 404))


class RetiredContactSettingTests(APITestCase):
    def test_site_contact_setting_is_no_longer_listed_or_editable(self):
        admin = CustomUser.objects.create_user(email="set-admin@example.test", password="x-Pass-2026!", full_name="A",
                                               phone="0791300005", role=CustomUser.Role.ADMIN, is_staff=True, is_superuser=True)
        SystemSetting.objects.create(key="site.contact", value={"phone": "x", "email": "y@example.test"})
        SystemSetting.objects.create(key="site.homepage", value={"hero_title": "t"})
        client = APIClient()
        client.force_authenticate(admin)
        listed = client.get("/api/admin/system-settings/")
        self.assertEqual([row["key"] for row in listed.data], ["site.homepage"])
        created = client.post("/api/admin/system-settings/", {"key": "site.contact", "phone": "1"}, format="json")
        self.assertEqual(created.status_code, 400)
        # The old row is kept, untouched.
        self.assertEqual(SystemSetting.objects.get(key="site.contact").value["phone"], "x")


class RetentionReportTests(TestCase):
    def test_report_lists_soft_deleted_files_and_deletes_nothing(self):
        out = StringIO()
        call_command("report_document_retention", stdout=out)
        self.assertIn("Nothing was deleted", out.getvalue())
