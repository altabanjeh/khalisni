"""Final pre-release hardening: national-ID form fields are text identifiers."""

import importlib

from django.apps import apps
from django.test import TestCase

from accounts.models import CustomUser
from orders.models import Order
from services.catalogue_rules import apply_identifier_rules
from services.models import Service, ServiceCategory

MIGRATION = importlib.import_module("services.migrations.0015_national_id_fields_as_text")


def legacy_identity_schema():
    """The shapes found in the real catalogue before this pass."""
    return [
        {"key": "national_id", "label_ar": "الرقم الوطني", "type": "number", "required": True, "display_order": 1, "options": []},
        {"key": "seller_national_id", "label_ar": "الرقم الوطني للبائع", "type": "number", "required": True, "display_order": 2, "options": []},
        {"key": "field_c67372ee55", "label_ar": "الرقم الوطني للواهب", "type": "number", "required": True, "display_order": 3, "options": []},
        {"key": "registration_number", "label_ar": "رقم التسجيل / الرقم الوطني للمنشأة", "type": "number", "required": True, "display_order": 4, "options": []},
        {"key": "partner_id", "label_ar": "الرقم الوطني / رقم الجواز للشريك", "type": "textarea", "required": True, "display_order": 5, "options": []},
        {"key": "parcel_area", "label_ar": "مساحة القطعة", "type": "number", "required": False, "display_order": 6, "options": []},
        {"key": "copies", "label_ar": "عدد النسخ", "type": "number", "required": True, "display_order": 7, "options": []},
    ]


class NationalIdFieldTypeTests(TestCase):
    def test_national_id_number_fields_become_text_and_nothing_else_changes(self):
        before = legacy_identity_schema()
        after = apply_identifier_rules(before)
        self.assertEqual(before, legacy_identity_schema(), "the input schema is not modified")
        types = {field["key"]: field["type"] for field in after}
        self.assertEqual(types["national_id"], "text")
        self.assertEqual(types["seller_national_id"], "text")
        self.assertEqual(types["field_c67372ee55"], "text")
        self.assertEqual(types["registration_number"], "text")
        self.assertEqual(types["partner_id"], "textarea")  # not a number field: untouched
        self.assertEqual(types["parcel_area"], "number")  # a real quantity stays numeric
        self.assertEqual(types["copies"], "number")
        for old, new in zip(before, after):
            self.assertEqual({k: v for k, v in old.items() if k != "type"}, {k: v for k, v in new.items() if k != "type"})
        self.assertEqual(apply_identifier_rules(after), after, "idempotent")

    def test_no_format_rule_is_invented(self):
        field = apply_identifier_rules(legacy_identity_schema())[0]
        self.assertEqual(set(field), {"key", "label_ar", "type", "required", "display_order", "options"})

    def test_data_migration_converts_stored_schemas_and_leaves_orders_alone(self):
        category = ServiceCategory.objects.create(name_ar="أحوال", name_en="Civil", slug="fph-civil")
        service = Service.objects.create(category=category, name_ar="خدمة", name_en="Service", slug="fph-service",
                                         description_ar="وصف", required_information_schema=legacy_identity_schema())
        untouched = Service.objects.create(category=category, name_ar="أخرى", name_en="Other", slug="fph-other",
                                           description_ar="وصف", required_information_schema=[legacy_identity_schema()[-1]])
        customer = CustomUser.objects.create_user(email="fph-nid@example.test", password="x-Pass-2026!", full_name="C", phone="0791400001")
        order = Order.objects.create(customer=customer, service=service, city="Amman",
                                     customer_notes="البيانات الإضافية المطلوبة:\nالرقم الوطني: 0123456789")
        prices = (service.base_price, service.total_fee, service.price_type)
        untouched_updated = Service.objects.get(pk=untouched.pk).updated_at

        MIGRATION.national_id_as_text(apps, None)
        service.refresh_from_db()
        self.assertEqual(service.required_information_schema, apply_identifier_rules(legacy_identity_schema()))
        self.assertEqual((service.base_price, service.total_fee, service.price_type), prices)
        self.assertEqual(Service.objects.get(pk=untouched.pk).updated_at, untouched_updated)
        order.refresh_from_db()
        self.assertIn("الرقم الوطني: 0123456789", order.customer_notes)

        snapshot = service.required_information_schema
        MIGRATION.national_id_as_text(apps, None)
        service.refresh_from_db()
        self.assertEqual(service.required_information_schema, snapshot, "a second run changes nothing")

    def test_importer_types_national_id_as_text(self):
        from services.service_import import _service_defaults

        category = ServiceCategory.objects.create(name_ar="أحوال", name_en="Civil", slug="fph-import")
        defaults = _service_defaults({"name_ar": "خ", "name_en": "", "fields": legacy_identity_schema()}, category)
        types = {field["key"]: field["type"] for field in defaults["required_information_schema"]}
        self.assertEqual(types["national_id"], "text")
        self.assertEqual(types["copies"], "number")
