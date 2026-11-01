"""Total-closure pass (2026-11-01): owner decisions CN-ACT-04, B10-1/2/3/4, B10-9, B10-10, C6, B10-7."""

import importlib
import json
import os
from decimal import Decimal
from io import StringIO
from types import SimpleNamespace
from unittest import mock

from django.apps import apps as django_apps
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from audit.models import AuditLog
from orders.models import Order
from services.catalogue_rules import (
    PARCEL_QUESTION_KEY,
    PARCEL_QUESTION_LABEL,
    apply_schema_rules,
)
from services.catalogue_translations import (
    DOCUMENT_NAMES_EN,
    FIELD_LABELS_EN,
    RELATION_MESSAGES_AR,
    SERVICE_TEXT_EN,
    apply_english_content,
)
from services.catalogue_validation import validate_catalogue
from services.client_categories import DEBUG_DELETE_REASON, PUBLIC_CATEGORY_SLUGS, apply_client_categories
from services.document_merges import normalize_document_definitions
from services.models import (
    RequiredDocumentDefinition,
    Service,
    ServiceCategory,
    ServiceRelation,
    ServiceRequiredDocument,
)
from services.pricing import displayed_components, pricing_invariant_problem, public_pricing
from services.schema_rules import schema_problems, validate_answers

CATEGORY_MIGRATION = importlib.import_module("services.migrations.0017_client_category_worlds")
PARCEL_MIGRATION = importlib.import_module("services.migrations.0018_parcel_gate_all_land_services")
MERGE_MIGRATION = importlib.import_module("services.migrations.0019_normalize_document_definitions")
ENGLISH_MIGRATION = importlib.import_module("services.migrations.0020_english_catalogue_content")

CLIENT_ORDER_AR = [
    "العقارات والأراضي", "خدمات الأعمال", "الضرائب والرسوم", "المركبات والنقل",
    "العمالة والإقامة", "الوثائق والتصديقات", "الخدمات الدولية", "طلب خاص",
]


def _land_schema(*, with_question=False):
    schema = [
        {"key": "full_name", "label_ar": "الاسم الكامل", "type": "text", "required": True, "display_order": 1, "options": []},
        {"key": "parcel_number", "label_ar": "رقم القطعة", "type": "text", "required": True, "display_order": 2, "options": []},
        {"key": "basin_number", "label_ar": "رقم الحوض", "type": "text", "required": True, "display_order": 3, "options": []},
        {"key": "additional_notes", "label_ar": "ملاحظات إضافية", "type": "textarea", "required": True, "display_order": 4, "options": []},
    ]
    if with_question:
        schema.insert(1, {"key": PARCEL_QUESTION_KEY, "label_ar": PARCEL_QUESTION_LABEL, "type": "select", "required": False,
                          "display_order": 2, "options": [{"value": "yes", "label_ar": "نعم"}, {"value": "no", "label_ar": "لا"}]})
        for order, field in enumerate(schema, start=1):
            field["display_order"] = order
    return schema


def _category(slug, name_ar, name_en, sort_order, *, published=True):
    # bulk_create: the real catalogue holds two categories with the same Arabic
    # name (created before that rule existed), which save() would refuse.
    return ServiceCategory.objects.bulk_create([ServiceCategory(
        slug=slug, name_ar=name_ar, name_en=name_en, sort_order=sort_order, display_order=sort_order,
        is_active=True, show_on_public_site=published,
    )])[0]


def build_real_categories():
    """The real catalogue's categories (ids, slugs and names as in the client database)."""
    return {
        "civil-status": _category("civil-status", "الأحوال المدنية والجوازات", "Civil Status", 1, published=False),
        "social-security": _category("social-security", "الضمان الاجتماعي", "Social Security", 7),
        "tax": _category("tax", "ضريبة الدخل والمبيعات", "Tax", 3),
        "general": _category("general", "الخدمات العامة السريعة", "General", 4, published=False),
        "category-debug": _category("category-debug", "???", "Category", 0, published=False),
        "civil-status-and-passports": _category("civil-status-and-passports", "الأحوال المدنية والجوازات", "Civil Status and Passports", 1),
        "ministry-of-labour": _category("ministry-of-labour", "وزارة العمل", "Ministry of Labour", 5),
        "municipal-services": _category("municipal-services", "الخدمات البلدية", "Municipal Services", 4),
        "land-and-survey": _category("land-and-survey", "العقارات والأراضي", "Land and Survey", 1),
        "quick-public-services": _category("quick-public-services", "خدمات عامة سريعة", "Quick Public Services", 2),
        "business_services": _category("business_services", "خدمات الأعمال والشركات", "Business Services", 2),
    }


def _service(category, slug, name_ar="خدمة", **extra):
    data = {"category": category, "slug": slug, "name_ar": name_ar, "name_en": slug, "description_ar": "وصف",
            "is_active": True, "show_on_public_site": True}
    data.update(extra)
    return Service.objects.create(**data)


class ClientCategoryWorldsTests(APITestCase):
    def setUp(self):
        self.categories = build_real_categories()
        c = self.categories
        self.license = _service(c["municipal-services"], "business-license-renewal", "تجديد رخصة مهن")
        self.certificate = _service(c["ministry-of-labour"], "no-criminal-record-certificate", "شهادة عدم محكومية")
        self.passport = _service(c["civil-status"], "passport-renewal", "تجديد جواز سفر")
        self.traffic = _service(c["quick-public-services"], "traffic-fines-payment", "دفع مخالفات السير")
        self.tax = _service(c["tax"], "tax-clearance", "براءة ذمة ضريبية")
        self.land = _service(c["land-and-survey"], "request-cadastral-map", "طلب مخطط أراضٍ")
        self.business = _service(c["business_services"], "business_trademark_services", "طلب خدمات العلامة التجارية")
        self.debug = _service(c["category-debug"], "service-debug", "????", show_on_public_site=False)
        customer = CustomUser.objects.create_user(email="tc-cat@example.test", password="x-Pass-2026!", full_name="C", phone="0791500001")
        self.order = Order.objects.create(customer=customer, service=self.license, city="Amman")
        self.order_snapshot = (self.order.service_name_snapshot, self.order.service_category_name_snapshot)
        self.ids = {slug: category.pk for slug, category in c.items()}
        CATEGORY_MIGRATION.forwards(django_apps, None)

    def public_categories(self):
        response = APIClient().get("/api/public-site/service-categories/")
        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_eight_client_categories_are_public_in_the_client_order(self):
        rows = self.public_categories()
        self.assertEqual([row["name_ar"] for row in rows], CLIENT_ORDER_AR)
        self.assertEqual([row["slug"] for row in rows], list(PUBLIC_CATEGORY_SLUGS))
        counts = {row["slug"]: row["service_count"] for row in rows}
        self.assertEqual(counts["international-services"], 0)
        self.assertEqual(counts["special-request"], 0)
        self.assertEqual(counts["ministry-of-labour"], 0)
        self.assertEqual(counts["civil-status-and-passports"], 2)  # certificate + passport
        self.assertEqual(counts["business_services"], 2)  # trademark + licence renewal

    def test_ids_and_slugs_are_kept_and_names_follow_the_client(self):
        for slug, pk in self.ids.items():
            self.assertTrue(ServiceCategory._base_manager.filter(pk=pk, slug=slug).exists(), slug)
        land = ServiceCategory.objects.get(slug="land-and-survey")
        self.assertEqual((land.name_ar, land.name_en), ("العقارات والأراضي", "Real Estate and Land"))
        self.assertEqual(ServiceCategory.objects.get(slug="quick-public-services").name_en, "Vehicles and Transport")
        self.assertEqual(ServiceCategory.objects.get(slug="civil-status-and-passports").name_ar, "الوثائق والتصديقات")

    def test_services_move_to_their_client_category(self):
        for service, slug in ((self.license, "business_services"), (self.certificate, "civil-status-and-passports"),
                              (self.passport, "civil-status-and-passports"), (self.traffic, "quick-public-services"),
                              (self.tax, "tax"), (self.land, "land-and-survey")):
            service.refresh_from_db()
            self.assertEqual(service.category.slug, slug, service.slug)

    def test_retired_categories_are_hidden_not_deleted_and_debug_records_soft_deleted(self):
        for slug in ("municipal-services", "social-security", "civil-status", "general"):
            category = ServiceCategory._base_manager.get(slug=slug)
            self.assertFalse(category.show_on_public_site, slug)
            self.assertFalse(category.is_deleted, slug)
        debug = ServiceCategory._base_manager.get(slug="category-debug")
        self.assertTrue(debug.is_deleted)
        self.assertEqual(debug.delete_reason, DEBUG_DELETE_REASON)
        self.debug.refresh_from_db()
        self.assertTrue(self.debug.is_deleted)
        self.assertNotIn("category-debug", [row["slug"] for row in self.public_categories()])

    def test_migration_is_idempotent_and_keeps_admin_edits(self):
        before = list(ServiceCategory._base_manager.order_by("pk").values("pk", "slug", "name_ar", "name_en", "sort_order", "show_on_public_site", "is_deleted"))
        self.assertEqual(apply_client_categories(ServiceCategory, Service), [])
        after = list(ServiceCategory._base_manager.order_by("pk").values("pk", "slug", "name_ar", "name_en", "sort_order", "show_on_public_site", "is_deleted"))
        self.assertEqual(before, after)
        # An admin renames a category afterwards: a re-run does not overwrite it.
        ServiceCategory._base_manager.filter(slug="tax").update(name_ar="الضرائب")
        apply_client_categories(ServiceCategory, Service)
        self.assertEqual(ServiceCategory.objects.get(slug="tax").name_ar, "الضرائب")
        self.assertEqual(ServiceCategory.objects.filter(slug__in=["international-services", "special-request"]).count(), 2)

    def test_orders_keep_their_snapshots(self):
        self.order.refresh_from_db()
        self.assertEqual((self.order.service_name_snapshot, self.order.service_category_name_snapshot), self.order_snapshot)
        self.assertEqual(self.order.service_category_name_snapshot, "الخدمات البلدية")


class ClientCategoryFreshDatabaseTests(TestCase):
    def test_nothing_happens_without_the_real_catalogue(self):
        _category("my-cat", "تصنيف", "Category", 1)
        self.assertEqual(apply_client_categories(ServiceCategory, Service), [])
        self.assertEqual(list(ServiceCategory.objects.values_list("slug", flat=True)), ["my-cat"])
        self.assertFalse(ServiceCategory.objects.filter(slug="special-request").exists())


class ParcelGateTests(APITestCase):
    def setUp(self):
        category = ServiceCategory.objects.create(name_ar="عقارات", name_en="Land", slug="tc-land", show_on_public_site=True)
        self.gated = _service(category, "tc-gated", required_information_schema=_land_schema(with_question=True))
        self.ungated = [
            _service(category, f"tc-land-{index}", required_information_schema=_land_schema()) for index in range(3)
        ]
        self.other = _service(category, "tc-other", required_information_schema=[
            {"key": "full_name", "label_ar": "الاسم الكامل", "type": "text", "required": True, "options": []},
        ])
        self.other_schema = self.other.required_information_schema
        PARCEL_MIGRATION.forwards(django_apps, None)

    def _fields(self, service):
        service.refresh_from_db()
        return service.required_information_schema

    def test_every_service_with_parcel_and_basin_fields_gets_the_gate(self):
        for service in [self.gated, *self.ungated]:
            schema = self._fields(service)
            keys = [field["key"] for field in schema]
            self.assertEqual(keys.count(PARCEL_QUESTION_KEY), 1, service.slug)
            question = schema[keys.index(PARCEL_QUESTION_KEY)]
            self.assertEqual(question["type"], "select")
            self.assertEqual([option["value"] for option in question["options"]], ["yes", "no"])
            self.assertEqual([option["label_ar"] for option in question["options"]], ["نعم", "لا"])
            self.assertLess(keys.index(PARCEL_QUESTION_KEY), keys.index("parcel_number"))
            for key in ("parcel_number", "basin_number"):
                field = schema[keys.index(key)]
                self.assertTrue(field["required"])
                self.assertEqual(field["visible_when"], {"field": PARCEL_QUESTION_KEY, "equals": "yes"})
            self.assertEqual([field["display_order"] for field in schema], list(range(1, len(schema) + 1)))
            self.assertEqual(schema_problems(schema), [], service.slug)

    def test_forms_without_parcel_fields_are_unchanged_and_migration_is_idempotent(self):
        self.assertEqual(self._fields(self.other), self.other_schema)
        before = list(Service.objects.order_by("pk").values_list("required_information_schema", flat=True))
        PARCEL_MIGRATION.forwards(django_apps, None)
        self.assertEqual(list(Service.objects.order_by("pk").values_list("required_information_schema", flat=True)), before)

    def test_old_rule_without_the_flag_is_unchanged(self):
        schema = apply_schema_rules(_land_schema())
        self.assertNotIn(PARCEL_QUESTION_KEY, [field["key"] for field in schema])

    def test_server_validation_follows_the_gate(self):
        schema = self._fields(self.ungated[0])
        cleaned, errors = validate_answers(schema, {"full_name": "س", PARCEL_QUESTION_KEY: "no", "parcel_number": "77"})
        self.assertEqual(errors, {})
        self.assertNotIn("parcel_number", cleaned)  # hidden answers are dropped
        _cleaned, errors = validate_answers(schema, {"full_name": "س", PARCEL_QUESTION_KEY: "yes"})
        self.assertEqual(set(errors), {"parcel_number", "basin_number"})
        cleaned, errors = validate_answers(schema, {"full_name": "س", PARCEL_QUESTION_KEY: "yes", "parcel_number": "012", "basin_number": "7"})
        self.assertEqual(errors, {})
        self.assertEqual(cleaned["parcel_number"], "012")
        _cleaned, errors = validate_answers(schema, {"full_name": "س", PARCEL_QUESTION_KEY: "maybe"})
        self.assertIn(PARCEL_QUESTION_KEY, errors)

    def test_order_api_enforces_the_gate(self):
        customer = CustomUser.objects.create_user(email="tc-parcel@example.test", password="x-Pass-2026!", full_name="عميل",
                                                  phone="+962791500010", role=CustomUser.Role.CUSTOMER)
        client = APIClient()
        client.force_authenticate(customer)
        service = self.ungated[1]
        data = {"service": service.id, "full_name": "عميل", "phone": "0791500010", "city": "عمّان", "consent": True}
        response = client.post("/api/orders/", {**data, "service_answers": {"full_name": "عميل", PARCEL_QUESTION_KEY: "yes"}}, format="json")
        self.assertEqual(response.status_code, 400, response.content)
        self.assertEqual(set(response.json()["service_answers"]), {"parcel_number", "basin_number"})
        response = client.post("/api/orders/", {**data, "service_answers": {"full_name": "عميل", PARCEL_QUESTION_KEY: "no"}}, format="json")
        self.assertEqual(response.status_code, 201, response.content)

    def test_additional_notes_are_optional(self):
        # B10-4 (services.0014): still true on every gated form.
        for service in [self.gated, *self.ungated]:
            notes = next(field for field in self._fields(service) if field["key"] == "additional_notes")
            self.assertFalse(notes["required"])


class DocumentMergeTests(TestCase):
    def setUp(self):
        category = ServiceCategory.objects.create(name_ar="عقارات", name_en="Land", slug="tc-docs")
        self.services = {slug: _service(category, slug) for slug in ("tc-a", "tc-b", "tc-c", "tc-early")}

        def definition(code, name_ar, name_en=""):
            return RequiredDocumentDefinition.objects.create(code=code, name_ar=name_ar, name_en=name_en, is_active=True)

        self.additional = definition("document_b0f143ad16", "أي وثائق إضافية تطلبها الجهة المختصة")
        self.additional_dup = definition("document_b03d952538", "أي مستندات إضافية تطلبها الجهة المختصة")
        self.poa = definition("legal_power_of_attorney", "وكالة قانونية (إن وجدت)", "Legal power of attorney")
        self.poa_dup = definition("document_e95445e836", "وكالة قانونية إن وجدت")
        self.legal = definition("legal_authorization", "وكالة عدلية أو تفويض خطي", "Legal authorization")
        self.legal_reversed = definition("document_f56c2e0812", "تفويض خطي أو وكالة عدلية")
        self.written = definition("document_11714fabf5", "تفويض خطي")
        self.notarized = definition("document_af883d59b3", "وكالة عدلية")
        self.company_letter = definition("document_5ca1add6b9", "كتاب تفويض من الشركة")
        self.seller_id = definition("seller_national_id_copy", "صورة هوية البائع", "Seller national ID copy")
        self.authorization = definition("authorization-letter", "تفويض إن وجد", "authorization-letter")

        def link(service, definition, required=False, order=1, active=True):
            return ServiceRequiredDocument.objects.create(service=self.services[service], document_definition=definition,
                                                          document_type=definition.code, name_ar=definition.name_ar,
                                                          is_required=required, display_order=order, is_active=active)

        self.a_dup = link("tc-a", self.additional_dup, order=4)
        self.b_canonical = link("tc-b", self.additional, order=5)
        self.b_dup = link("tc-b", self.additional_dup, required=True, order=2)  # same service: dedupe
        self.c_poa = link("tc-c", self.poa, order=3)
        self.c_poa_dup = link("tc-c", self.poa_dup, required=True, order=1, active=False)  # inactive duplicate
        self.c_reversed = link("tc-c", self.legal_reversed, order=6)
        self.c_written = link("tc-c", self.written, order=7)
        self.c_notarized = link("tc-c", self.notarized, order=8)
        self.c_company = link("tc-c", self.company_letter, order=9)
        self.c_seller = link("tc-c", self.seller_id, required=True, order=10)
        self.early_auth = link("tc-early", self.authorization, required=True, order=2)
        customer = CustomUser.objects.create_user(email="tc-docs@example.test", password="x-Pass-2026!", full_name="C", phone="0791500002")
        self.order = Order.objects.create(customer=customer, service=self.services["tc-a"], city="Amman")
        self.legacy_order = Order.objects.create(customer=customer, service=self.services["tc-c"], city="Amman")
        Order.objects.filter(pk=self.legacy_order.pk).update(requirements_snapshot=None)  # pre-snapshot order
        self.order_snapshot = json.dumps(Order.objects.get(pk=self.order.pk).requirements_snapshot, sort_keys=True)
        self.early_order = Order.objects.create(customer=customer, service=self.services["tc-early"], city="Amman")
        self.early_snapshot = Order.objects.get(pk=self.early_order.pk).requirements_snapshot
        self.log = normalize_document_definitions(RequiredDocumentDefinition, ServiceRequiredDocument, Order, apply=True)

    def refresh(self, *rows):
        for row in rows:
            row.refresh_from_db()

    def test_duplicate_is_repointed_to_the_canonical_definition_and_deactivated(self):
        self.refresh(self.a_dup, self.additional_dup)
        self.assertEqual(self.a_dup.document_definition_id, self.additional.pk)
        self.assertEqual(self.a_dup.document_type, self.additional.code)  # no order of tc-a reads the live catalogue
        self.assertEqual(self.a_dup.name_ar, self.additional.name_ar)
        self.assertFalse(self.additional_dup.is_active)
        self.assertFalse(self.additional_dup.is_deleted)  # kept, with its history

    def test_same_service_keeps_one_requirement_required_if_either_was(self):
        self.refresh(self.b_canonical, self.b_dup)
        self.assertTrue(self.b_dup.is_deleted)
        self.assertFalse(self.b_canonical.is_deleted)
        self.assertTrue(self.b_canonical.is_required)
        self.assertEqual(self.b_canonical.display_order, 2)
        live = ServiceRequiredDocument.objects.filter(service=self.services["tc-b"], is_deleted=False)
        self.assertEqual(live.count(), 1)

    def test_inactive_duplicate_does_not_change_the_kept_requirement(self):
        self.refresh(self.c_poa, self.c_poa_dup)
        self.assertTrue(self.c_poa_dup.is_deleted)
        self.assertFalse(self.c_poa.is_required)
        self.assertEqual(self.c_poa.display_order, 3)

    def test_document_code_is_kept_while_an_order_reads_the_live_catalogue(self):
        self.refresh(self.c_reversed)
        self.assertEqual(self.c_reversed.document_definition_id, self.legal.pk)
        self.assertEqual(self.c_reversed.document_type, "document_f56c2e0812")

    def test_legally_different_documents_are_not_merged(self):
        for row, definition in ((self.c_written, self.written), (self.c_notarized, self.notarized),
                                (self.c_company, self.company_letter), (self.c_seller, self.seller_id)):
            self.refresh(row, definition)
            self.assertEqual(row.document_definition_id, definition.pk)
            self.assertTrue(definition.is_active)
            self.assertFalse(row.is_deleted)
        self.assertTrue(self.c_seller.is_required)

    def test_authorization_if_any_is_optional(self):
        self.refresh(self.early_auth)
        self.assertFalse(self.early_auth.is_required)
        self.assertFalse(ServiceRequiredDocument.objects.filter(name_ar="تفويض إن وجد", is_required=True).exists())

    def test_order_snapshots_are_untouched(self):
        self.assertEqual(json.dumps(Order.objects.get(pk=self.order.pk).requirements_snapshot, sort_keys=True), self.order_snapshot)
        snapshot = Order.objects.get(pk=self.early_order.pk).requirements_snapshot
        self.assertEqual(snapshot, self.early_snapshot)
        self.assertTrue(next(row for row in snapshot if row["document_type"] == "authorization-letter")["is_required"])
        self.assertEqual(snapshot[0]["document_type"], self.early_snapshot[0]["document_type"])

    def test_normalization_is_idempotent_and_logged(self):
        self.assertTrue(any(row["action"] == "repoint" for row in self.log))
        self.assertTrue(any(row["action"] == "dedupe" for row in self.log))
        self.assertTrue(any(row["action"] == "make-optional" for row in self.log))
        self.assertEqual(normalize_document_definitions(RequiredDocumentDefinition, ServiceRequiredDocument, Order, apply=True), [])
        MERGE_MIGRATION.forwards(django_apps, None)  # the migration runs the same function

    def test_command_dry_run_changes_nothing(self):
        RequiredDocumentDefinition.objects.filter(pk=self.additional_dup.pk).update(is_active=True)
        row = ServiceRequiredDocument.objects.create(service=self.services["tc-c"], document_definition=self.additional_dup,
                                                     document_type=self.additional_dup.code, name_ar=self.additional_dup.name_ar)
        out = StringIO()
        call_command("normalize_document_definitions", "--dry-run", stdout=out)
        self.assertIn("DRY RUN", out.getvalue())
        self.assertIn("additional-authority-documents: repoint", out.getvalue())
        row.refresh_from_db()
        self.assertEqual(row.document_definition_id, self.additional_dup.pk)
        call_command("normalize_document_definitions", "--apply", stdout=StringIO())
        row.refresh_from_db()
        self.assertEqual(row.document_definition_id, self.additional.pk)


class PublicPricingInvariantTests(APITestCase):
    def setUp(self):
        self.category = ServiceCategory.objects.create(name_ar="تسعير", name_en="Pricing", slug="tc-price", show_on_public_site=True)
        flags = {"show_total_price_public": True, "show_government_fee_public": True, "show_company_fee_public": True}
        # The real catalogue's shape: base price equals the two components, so total = 2x components.
        self.double = _service(self.category, "tc-double", price_type="fixed", base_price=Decimal("18.00"),
                               government_fee=Decimal("7.00"), service_fee=Decimal("11.00"), **flags)
        self.exact = _service(self.category, "tc-exact", price_type="fixed", base_price=Decimal("0.00"),
                              government_fee=Decimal("7.00"), service_fee=Decimal("11.00"), **flags)
        self.one_flag = _service(self.category, "tc-one-flag", price_type="fixed", base_price=Decimal("0.00"),
                                 government_fee=Decimal("5.00"), service_fee=Decimal("12.00"),
                                 show_total_price_public=True, show_government_fee_public=True, show_company_fee_public=False)
        self.quotation = _service(self.category, "tc-quote", price_type="quotation", public_price_note_ar="",
                                  public_price_note_en="", **flags)
        self.stored = {s.pk: (s.base_price, s.government_fee, s.service_fee) for s in Service.objects.all()}

    def payloads(self):
        client = APIClient()
        rows = client.get("/api/services/").json()
        payloads = [(row["slug"], row["pricing"], row) for row in rows]
        for row in rows:
            detail = client.get(f"/api/services/{row['slug']}/").json()
            payloads.append((row["slug"], detail["pricing"], detail))
            payloads.extend((related["slug"], related["pricing"], None) for related in detail["related_services"])
        return payloads

    def test_displayed_total_equals_the_sum_of_displayed_components_everywhere(self):
        payloads = self.payloads()
        self.assertGreater(len(payloads), 8)
        for slug, pricing, row in payloads:
            components = displayed_components(pricing)
            if components:
                self.assertEqual(Decimal(str(pricing["total_price"])), sum((Decimal(str(c)) for c in components), Decimal("0")), slug)
            self.assertIsNone(pricing_invariant_problem({key: None if value is None else Decimal(str(value)) for key, value in pricing.items() if key in ("total_price", "government_fee", "company_fee")}), slug)
            if row is not None:
                # The flat fields mirror the pricing payload.
                self.assertEqual(row["government_fee"], pricing["government_fee"], slug)
                self.assertEqual(row["service_fee"], pricing["company_fee"], slug)
                self.assertEqual(row["total_fee"], pricing["total_price"], slug)

    def test_total_only_when_components_do_not_add_up(self):
        pricing = public_pricing(self.double)
        self.assertEqual(pricing["total_price"], Decimal("36.00"))
        self.assertIsNone(pricing["government_fee"])
        self.assertIsNone(pricing["company_fee"])
        self.assertIsNone(public_pricing(self.one_flag)["government_fee"])

    def test_breakdown_shown_when_it_adds_up(self):
        pricing = public_pricing(self.exact)
        self.assertEqual((pricing["total_price"], pricing["government_fee"], pricing["company_fee"]),
                         (Decimal("18.00"), Decimal("7.00"), Decimal("11.00")))

    def test_partner_price_hides_the_breakdown(self):
        self.exact._matched_partner_configs = [SimpleNamespace(custom_price=Decimal("25.00"))]
        pricing = public_pricing(self.exact)
        self.assertEqual(pricing["total_price"], Decimal("25.00"))
        self.assertIsNone(pricing["government_fee"])

    def test_quotation_shows_no_number_and_the_approved_note(self):
        pricing = public_pricing(self.quotation)
        self.assertEqual([pricing["total_price"], pricing["government_fee"], pricing["company_fee"]], [None, None, None])
        self.assertEqual(pricing["public_note_ar"], "يتم تأكيد الرسوم النهائية بعد مراجعة الوثائق.")

    def test_invariant_check_and_validator(self):
        problem = pricing_invariant_problem({"total_price": Decimal("36.00"), "government_fee": Decimal("7.00"), "company_fee": Decimal("11.00")})
        self.assertIn("do not add up", problem)
        self.assertIsNone(pricing_invariant_problem({"total_price": Decimal("18.00"), "government_fee": Decimal("7.00"), "company_fee": Decimal("11.00")}))
        report = validate_catalogue()
        self.assertFalse([finding for finding in report.findings if finding.where == "pricing"])
        with mock.patch("services.catalogue_validation.public_pricing", return_value={
            "total_price": Decimal("36.00"), "government_fee": Decimal("7.00"), "company_fee": Decimal("11.00"),
        }):
            report = validate_catalogue()
        self.assertTrue([finding for finding in report.errors if finding.where == "pricing"])

    def test_stored_financial_values_are_unchanged(self):
        self.payloads()
        validate_catalogue()
        self.assertEqual({s.pk: (s.base_price, s.government_fee, s.service_fee) for s in Service.objects.all()}, self.stored)


class EnglishCatalogueContentTests(TestCase):
    def setUp(self):
        category = ServiceCategory.objects.create(name_ar="عقارات", name_en="Land", slug="tc-en")
        self.slug = "request-cadastral-map"
        text = SERVICE_TEXT_EN[self.slug]
        self.service = _service(
            category, self.slug, short_description_ar=text["short_description"][0], description_ar=text["description"][0],
            delivery_note_ar=text["delivery_note"][0], delivery_time_mode="after_review",
            required_information_schema=[
                {"key": "parcel_number", "label_ar": "رقم القطعة", "type": "text", "required": True, "options": []},
                {"key": "region", "label_ar": "المنطقة", "type": "text", "required": True, "options": [], "label_en": "District"},
                {"key": "field_649c50d973", "label_ar": "هل العقار أرض أم بناء؟", "type": "select", "required": False,
                 "options": [{"value": "option-76a07fdf16", "label_ar": "أرض"}, {"value": "option-928e61dc61", "label_ar": "بناء"}]},
                {"key": "full_name", "label_ar": "اسم مختلف", "type": "text", "required": True, "options": []},
            ],
        )
        self.changed = _service(category, "request-zoning-plan", short_description_ar="نص عدّله المسؤول")
        self.definition = RequiredDocumentDefinition.objects.create(code="document_443aae22bf", name_ar="شهادة الوفاة", is_active=True)
        self.requirement = ServiceRequiredDocument.objects.create(service=self.service, document_definition=self.definition,
                                                                  document_type=self.definition.code, name_ar=self.definition.name_ar)
        admin = CustomUser.objects.create_user(email="tc-en-admin@example.test", password="x-Pass-2026!", full_name="A",
                                               phone="0791500004", role=CustomUser.Role.ADMIN, is_staff=True)
        self.relation = ServiceRelation.objects.create(
            created_by=admin,
            source_service=self.service, target_service=self.changed, relation_type=ServiceRelation.RelationType.RECOMMENDED_AFTER,
            message_to_customer=next(iter(RELATION_MESSAGES_AR)),
        )
        ENGLISH_MIGRATION.forwards(django_apps, None)

    def test_blank_english_labels_and_options_are_filled(self):
        self.service.refresh_from_db()
        fields = {field["key"]: field for field in self.service.required_information_schema}
        self.assertEqual(fields["parcel_number"]["label_en"], "Parcel number")
        self.assertEqual(fields["region"]["label_en"], "District")  # an existing English label is kept
        self.assertEqual([option["label_en"] for option in fields["field_649c50d973"]["options"]], ["Land", "Building"])
        self.assertNotIn("label_en", fields["full_name"])  # Arabic differs from the translated source

    def test_service_text_and_document_names_are_filled_only_from_matching_arabic(self):
        self.service.refresh_from_db()
        text = SERVICE_TEXT_EN[self.slug]
        self.assertEqual(self.service.short_description_en, text["short_description"][1])
        self.assertEqual(self.service.description_en, text["description"][1])
        self.assertEqual(self.service.delivery_note_en, text["delivery_note"][1])
        self.changed.refresh_from_db()
        self.assertEqual(self.changed.short_description_en, "")
        self.definition.refresh_from_db()
        self.requirement.refresh_from_db()
        self.assertEqual(self.definition.name_en, "Death certificate")
        self.assertEqual(self.requirement.name_en, "Death certificate")

    def test_english_relation_message_becomes_arabic(self):
        self.relation.refresh_from_db()
        self.assertEqual(self.relation.message_to_customer, next(iter(RELATION_MESSAGES_AR.values())))

    def test_idempotent(self):
        self.assertEqual(apply_english_content(Service, RequiredDocumentDefinition, ServiceRequiredDocument, ServiceRelation), [])

    def test_tables_are_complete(self):
        for key, value in {**FIELD_LABELS_EN, **DOCUMENT_NAMES_EN}.items():
            self.assertTrue(value.strip(), key)
            self.assertNotRegex(value, r"[؀-ۿ]", key)
        for slug, texts in SERVICE_TEXT_EN.items():
            for name, (arabic, english) in texts.items():
                self.assertRegex(arabic, r"[؀-ۿ]", (slug, name))
                self.assertNotRegex(english, r"[؀-ۿ]", (slug, name))


class HelpGuideContentTests(APITestCase):
    """help_guides.0007 ran when the test database was created."""

    def test_seeded_guides_are_arabic_and_placeholders_unpublished(self):
        from help_guides.models import HelpGuide, HelpGuideScreenshot

        titles = dict(HelpGuide.objects.filter(screen_key__in=["manual_navigation", "manual_account_access", "manual_add_screenshots"])
                      .values_list("screen_key", "title"))
        self.assertEqual(titles.get("manual_navigation"), "كيفية التنقل في النظام")
        self.assertEqual(titles.get("manual_account_access"), "تسجيل الدخول والوصول إلى الحساب")
        self.assertEqual(titles.get("manual_add_screenshots"), "كيفية إضافة لقطات الشاشة إلى الدليل")
        self.assertFalse(HelpGuideScreenshot.objects.filter(is_active=True, placeholder_label__startswith="Screenshot required").exists())
        internal = HelpGuide.objects.get(screen_key="manual_add_screenshots")
        self.assertEqual((internal.role, internal.permission_key), ("admin", "help_guides.manage_help_guides"))

    def test_internal_screenshot_guide_is_not_shown_to_customers(self):
        customer = CustomUser.objects.create_user(email="tc-help@example.test", password="x-Pass-2026!", full_name="C",
                                                  phone="0791500003", role=CustomUser.Role.CUSTOMER)
        self.client.force_authenticate(customer)
        response = self.client.get("/api/help/index/")
        self.assertEqual(response.status_code, 200)
        guides = list(response.data["guides"]) + list(response.data.get("quick_links") or [])
        self.assertTrue(guides)
        self.assertNotIn("manual_add_screenshots", [guide["screen_key"] for guide in guides])
        self.assertNotIn("Screenshot required", json.dumps(guides, ensure_ascii=False, default=str))


class DemoDataAuditTests(TestCase):
    def setUp(self):
        from providers.models import ProviderProfile
        from public_site.models import Advertisement
        from django.utils import timezone

        self.demo_admin = CustomUser.objects.create_superuser(email="admin@khalisni.local", password="x-Pass-2026!", full_name="Demo", phone="0791600001")
        self.debug_user = CustomUser.objects.create_user(email="provider-debug@example.com", password="x-Pass-2026!", full_name="P",
                                                         phone="0791600002", role=CustomUser.Role.PROVIDER)
        self.qa_user = CustomUser.objects.create_user(email="client-audit-qa-202610-customer@example.test", password="x-Pass-2026!",
                                                      full_name="QA", phone="0791600003")
        self.guest = CustomUser.objects.create_user(email="0791600004@guest.khalisni.local", password=None, full_name="Guest", phone="0791600004")
        self.real = CustomUser.objects.create_user(email="real.customer@khalsni.jo", password="x-Pass-2026!", full_name="R", phone="0791600005")
        category = ServiceCategory.objects.create(name_ar="???", name_en="Category", slug="category-debug", show_on_public_site=False)
        self.debug_service = _service(category, "service-debug", "????", show_on_public_site=False)
        self.real_category = ServiceCategory.objects.create(name_ar="حقيقي", name_en="Real", slug="tc-real")
        self.real_service = _service(self.real_category, "tc-real-service", "خدمة حقيقية")
        self.order = Order.objects.create(customer=self.real, service=self.debug_service, city="Amman")
        self.ad = Advertisement.objects.create(title_ar="تنبيه تجريبي", title_en="Demo alert", description_ar="و", start_date=timezone.now())
        self.real_ad = Advertisement.objects.create(title_ar="خدمة جديدة", title_en="New service", description_ar="و", start_date=timezone.now())
        self.provider = ProviderProfile.objects.create(user=self.debug_user, provider_type="Tester", city="Amman")

    def run_command(self, *args):
        out = StringIO()
        call_command("audit_demo_data", *args, stdout=out)
        return out.getvalue()

    def test_report_detects_without_changing_anything(self):
        output = self.run_command()
        for marker in ("admin@khalisni.local", "SUPERUSER", "provider-debug@example.com", "client-audit-qa-202610-customer",
                       "service-debug", "category-debug", "تنبيه تجريبي", "Tester", "guest-checkout customer"):
            self.assertIn(marker, output)
        self.assertNotIn("real.customer@khalsni.jo", output)
        self.assertNotIn("tc-real-service", output)
        self.assertNotIn("خدمة جديدة", output)
        self.demo_admin.refresh_from_db()
        self.assertTrue(self.demo_admin.is_active)
        with self.assertRaises(CommandError):
            self.run_command("--strict")

    def test_apply_soft_deactivates_logs_and_never_deletes_orders(self):
        order_before = Order.objects.filter(pk=self.order.pk).values().get()
        self.run_command("--apply")
        for user in (self.demo_admin, self.debug_user, self.qa_user):
            user.refresh_from_db()
            self.assertFalse(user.is_active, user.email)
        self.guest.refresh_from_db()
        self.real.refresh_from_db()
        self.assertTrue(self.guest.is_active)  # review only without --include-guests
        self.assertTrue(self.real.is_active)
        self.debug_service.refresh_from_db()
        self.assertTrue(self.debug_service.is_deleted)
        self.assertTrue(Service.objects.filter(pk=self.real_service.pk, is_deleted=False).exists())
        self.ad.refresh_from_db()
        self.real_ad.refresh_from_db()
        self.assertFalse(self.ad.is_active)
        self.assertTrue(self.real_ad.is_active)
        self.provider.refresh_from_db()
        self.assertFalse(self.provider.is_available)
        self.assertEqual(Order.objects.filter(pk=self.order.pk).values().get(), order_before)
        self.assertTrue(AuditLog.objects.filter(message__startswith="audit_demo_data --apply", entity_type="CustomUser").exists())
        self.run_command("--strict")  # nothing open any more: no error
        self.run_command("--apply", "--include-guests")
        self.guest.refresh_from_db()
        self.assertFalse(self.guest.is_active)


class SeedProductionGuardTests(TestCase):
    @override_settings(DEBUG=True)
    def test_demo_and_qa_seeds_refuse_a_declared_production_system(self):
        with mock.patch.dict(os.environ, {"KHALSNI_ENVIRONMENT": "production", "KHALSNI_QA_PASSWORD": "a-long-qa-password-1"}):
            with self.assertRaisesMessage(CommandError, "KHALSNI_ENVIRONMENT=production"):
                call_command("seed_demo")
            with self.assertRaisesMessage(CommandError, "KHALSNI_ENVIRONMENT=production"):
                call_command("seed_demo", allow_non_debug=True)
            with self.assertRaises(CommandError):
                call_command("seed_client_audit_qa", verbosity=0)
            with self.assertRaises(CommandError):
                call_command("seed_initial_data", include_demo_users=True, allow_non_debug=True)
        self.assertFalse(CustomUser.objects.filter(email__endswith="@khalisni.local").exists())
        self.assertFalse(CustomUser.objects.filter(email__startswith="client-audit-qa-").exists())
        self.assertFalse(Order.objects.exists())

    def test_non_debug_without_override_is_refused(self):
        with mock.patch.dict(os.environ, {"KHALSNI_ENVIRONMENT": ""}):
            with self.assertRaisesMessage(CommandError, "DJANGO_DEBUG is False"):
                call_command("seed_demo")
        self.assertFalse(CustomUser.objects.filter(email="admin@khalisni.local").exists())

    @override_settings(DEBUG=True)
    def test_development_flow_still_works(self):
        with mock.patch.dict(os.environ, {"KHALSNI_ENVIRONMENT": "development"}):
            call_command("seed_demo", stdout=StringIO())
        self.assertTrue(CustomUser.objects.filter(email="admin@khalisni.local").exists())


class CatalogueValidatorExtensionTests(TestCase):
    def test_required_if_any_document_is_an_error(self):
        category = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="tc-val", show_on_public_site=True)
        service = _service(category, "tc-val-service")
        definition = RequiredDocumentDefinition.objects.create(code="authorization-letter", name_ar="تفويض إن وجد", name_en="Authorization (if any)")
        ServiceRequiredDocument.objects.create(service=service, document_definition=definition, document_type=definition.code,
                                               name_ar=definition.name_ar, is_required=True)
        report = validate_catalogue()
        self.assertTrue([f for f in report.errors if "if any" in f.message])
        normalize_document_definitions(RequiredDocumentDefinition, ServiceRequiredDocument, Order, apply=True)
        self.assertFalse([f for f in validate_catalogue().errors if "if any" in f.message])


class ImporterAgreementTests(TestCase):
    """A re-import produces what the migrations produced (gate, merges, English)."""

    def test_importer_applies_the_gate_english_and_canonical_documents(self):
        from services.document_merges import canonical_document
        from services.service_import import _service_defaults

        category = ServiceCategory.objects.create(name_ar="عقارات", name_en="Land", slug="tc-import")
        text = SERVICE_TEXT_EN["request-zoning-plan"]
        defaults = _service_defaults({
            "slug": "request-zoning-plan", "name_ar": "طلب مخطط تنظيمي", "name_en": "Request Zoning Plan",
            "short_description_ar": text["short_description"][0], "description_ar": text["description"][0],
            "fields": _land_schema(),
        }, category)
        keys = [field["key"] for field in defaults["required_information_schema"]]
        self.assertLess(keys.index(PARCEL_QUESTION_KEY), keys.index("parcel_number"))
        self.assertEqual(defaults["short_description_en"], text["short_description"][1])
        parcel = next(field for field in defaults["required_information_schema"] if field["key"] == "parcel_number")
        self.assertEqual(parcel["label_en"], "Parcel number")
        self.assertEqual(canonical_document("document_f56c2e0812", "تفويض خطي أو وكالة عدلية"),
                         ("legal_authorization", "وكالة عدلية أو تفويض خطي"))
        self.assertEqual(canonical_document("x", "وكالة قانونية إن وجدت"), ("legal_power_of_attorney", "وكالة قانونية (إن وجدت)"))
        self.assertEqual(canonical_document("document_11714fabf5", "تفويض خطي"), ("document_11714fabf5", "تفويض خطي"))
