"""Repeater fields (CN-BIZ-01 partners, CN-BIZ-04 plots): definition, answers,
order notes, the data migration and the importer agreeing with it."""

import copy
import importlib
import json
from pathlib import Path

from django.apps import apps as django_apps
from django.conf import settings
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from core.errors import localize_payload
from orders.models import Order
from services.catalogue_rules import (
    PARCEL_QUESTION_KEY,
    PARCEL_QUESTION_LABEL,
    PARTNER_ITEM_SOURCES,
    apply_identifier_rules,
    apply_repeater_rules,
    apply_schema_rules,
)
from services.catalogue_translations import translate_schema
from services.models import Service, ServiceCategory
from services.schema_rules import (
    REPEATER_MAX_ITEMS,
    answers_notes_section,
    order_blockers,
    schema_problems,
    validate_answers,
)
from services.service_import import catalogue_schema

REPEATER_MIGRATION = importlib.import_module("services.migrations.0023_repeater_fields")
NORMALIZED = Path(settings.BASE_DIR).parent / "data" / "service-import" / "normalized-services.json"


def _source_services():
    """The client sheets as normalized by the importer (data/service-import)."""
    return {service["slug"]: service for service in json.loads(NORMALIZED.read_text(encoding="utf-8"))["services"]}


def _pre_repeater_schema(service_data):
    """The form an imported service had before 0023 (importer pipeline up to 0022)."""
    schema, _filled = translate_schema(
        apply_identifier_rules(apply_schema_rules(service_data["fields"], gate_all_parcel_fields=True))
    )
    return schema


def _repeater(**extra):
    field = {
        "key": "partners",
        "type": "repeater",
        "label_ar": "بيانات الشركاء",
        "label_en": "Partners' details",
        "required": True,
        "min_items": 1,
        "max_items": 3,
        "item_fields": [
            {"key": "name", "type": "text", "label_ar": "اسم كل شريك", "label_en": "Name", "required": True},
            {"key": "share", "type": "number", "label_ar": "حصة كل شريك", "label_en": "Share", "required": False},
            {"key": "role", "type": "select", "label_ar": "الصفة", "label_en": "Role", "required": False,
             "options": [{"value": "manager", "label_ar": "مدير", "label_en": "Manager"}]},
            {"key": "signs", "type": "checkbox", "label_ar": "يوقع", "label_en": "Signs", "required": False},
        ],
    }
    field.update(extra)
    return field


class RepeaterDefinitionTests(SimpleTestCase):
    def test_valid_repeater_has_no_problems(self):
        self.assertEqual(schema_problems([_repeater()]), [])
        self.assertEqual(schema_problems([_repeater(min_items=None, max_items=None)]), [])

    def test_bad_definitions_are_refused(self):
        cases = {
            "no items": _repeater(item_fields=[]),
            "items not a list": _repeater(item_fields="name"),
            "item without key": _repeater(item_fields=[{"type": "text", "label_ar": "اسم"}]),
            "item without label": _repeater(item_fields=[{"key": "name", "type": "text"}]),
            "unknown item type": _repeater(item_fields=[{"key": "name", "type": "file", "label_ar": "اسم"}]),
            "nested repeater": _repeater(item_fields=[_repeater()]),
            "item condition": _repeater(item_fields=[{"key": "a", "type": "text", "label_ar": "أ",
                                                      "visible_when": {"field": "b", "equals": "x"}}]),
            "duplicate item keys": _repeater(item_fields=[{"key": "a", "type": "text", "label_ar": "أ"},
                                                          {"key": "A", "type": "text", "label_ar": "ب"}]),
            "max above cap": _repeater(max_items=REPEATER_MAX_ITEMS + 1),
            "max zero": _repeater(max_items=0),
            "min above max": _repeater(min_items=4, max_items=3),
            "negative min": _repeater(min_items=-1),
            "boolean limit": _repeater(min_items=True),
            "text limit": _repeater(max_items="5"),
        }
        for name, field in cases.items():
            with self.subTest(name):
                self.assertTrue(schema_problems([field]), name)

    def test_unanswerable_repeaters_block_orders(self):
        self.assertTrue(order_blockers([_repeater(item_fields=[])]))
        no_options = _repeater(item_fields=[{"key": "role", "type": "select", "label_ar": "الصفة", "required": True, "options": []}])
        self.assertTrue(order_blockers([no_options]))
        self.assertEqual(order_blockers([_repeater()]), [])

    def test_a_condition_cannot_depend_on_a_repeater(self):
        schema = [_repeater(), {"key": "x", "type": "text", "label_ar": "س", "visible_when": {"field": "partners", "equals": "1"}}]
        self.assertIn("A condition cannot refer to a repeater field.", [problem[2] for problem in schema_problems(schema)])


class RepeaterAnswerTests(SimpleTestCase):
    schema = [{"key": "full_name", "type": "text", "label_ar": "الاسم", "required": True}, _repeater()]

    def test_valid_rows_are_cleaned_in_order(self):
        cleaned, errors = validate_answers(self.schema, {"full_name": "س", "partners": [
            {"name": " أحمد ", "share": "50", "role": "manager", "signs": True},
            {"name": "سارة", "share": "", "signs": "false"},
        ]})
        self.assertEqual(errors, {})
        self.assertEqual(cleaned["partners"], [
            {"name": "أحمد", "share": "50", "role": "manager", "signs": True},
            {"name": "سارة", "signs": False},
        ])

    def test_row_count_limits(self):
        _cleaned, errors = validate_answers(self.schema, {"full_name": "س"})
        self.assertEqual(errors, {"partners": "This field is required."})
        _cleaned, errors = validate_answers(self.schema, {"full_name": "س", "partners": []})
        self.assertEqual(errors, {"partners": "This field is required."})
        rows = [{"name": str(number)} for number in range(4)]
        _cleaned, errors = validate_answers(self.schema, {"full_name": "س", "partners": rows})
        self.assertEqual(errors, {"partners": "Add no more than 3 entries."})
        two_needed = [_repeater(min_items=2)]
        _cleaned, errors = validate_answers(two_needed, {"partners": [{"name": "أ"}]})
        self.assertEqual(errors, {"partners": "Add at least 2 entries."})
        _cleaned, errors = validate_answers(two_needed, {})
        self.assertEqual(errors, {"partners": "Add at least 2 entries."})

    def test_hard_cap_applies_without_max_items(self):
        schema = [_repeater(max_items=None)]
        rows = [{"name": str(number)} for number in range(REPEATER_MAX_ITEMS)]
        self.assertEqual(validate_answers(schema, {"partners": rows})[1], {})
        _cleaned, errors = validate_answers(schema, {"partners": rows + [{"name": "x"}]})
        self.assertEqual(errors, {"partners": f"Add no more than {REPEATER_MAX_ITEMS} entries."})

    def test_optional_repeater(self):
        schema = [_repeater(required=False, min_items=2)]
        cleaned, errors = validate_answers(schema, {})
        self.assertEqual((cleaned, errors), ({}, {}))
        _cleaned, errors = validate_answers(schema, {"partners": [{"name": "أ"}]})
        self.assertEqual(errors, {"partners": "Add at least 2 entries."})

    def test_per_row_errors_keep_the_row_index(self):
        _cleaned, errors = validate_answers(self.schema, {"full_name": "س", "partners": [
            {"name": "أحمد"},
            {"share": "خمسون", "role": "owner"},
            {"name": "ب", "unknown": "x"},
        ]})
        self.assertEqual(errors, {"partners": {
            "1": {"name": "This field is required.", "share": "Enter a number.", "role": "Choose one of the listed options."},
            "2": {"unknown": "This field is not part of the service form."},
        }})

    def test_wrong_shapes(self):
        self.assertEqual(validate_answers(self.schema, {"full_name": "س", "partners": "أحمد"})[1],
                         {"partners": "Enter the entries as a list."})
        self.assertEqual(validate_answers(self.schema, {"full_name": "س", "partners": ["أحمد"]})[1],
                         {"partners": {"0": {"__all__": "Each entry must be an object."}}})
        # A list sent to an ordinary field is refused instead of being stored as text.
        self.assertEqual(validate_answers(self.schema, {"full_name": ["س"], "partners": [{"name": "أ"}]})[1],
                         {"full_name": "Enter a single value."})

    def test_errors_are_localized(self):
        _cleaned, errors = validate_answers([_repeater(min_items=2)], {"partners": [{"name": "أ"}]})
        self.assertEqual(localize_payload(errors, "ar"), {"partners": "أضف إدخالات حتى تصل إلى الحد الأدنى: 2."})
        _cleaned, errors = validate_answers(self.schema, {"full_name": "س", "partners": [{"share": "x"}]})
        self.assertEqual(localize_payload(errors, "ar"), {"partners": {"0": {"name": "هذا الحقل مطلوب.", "share": "أدخل رقماً."}}})
        _cleaned, errors = validate_answers(self.schema, {"full_name": "س", "partners": [{"name": str(n)} for n in range(5)]})
        self.assertEqual(localize_payload(errors, "ar"), {"partners": "عدد الإدخالات أكبر من الحد الأقصى: 3."})

    def test_notes_list_each_row(self):
        cleaned, _errors = validate_answers(self.schema, {"full_name": "سامي", "partners": [
            {"name": "أحمد", "share": "60", "role": "manager", "signs": True},
            {"name": "سارة", "share": "40", "signs": False},
        ]})
        self.assertEqual(answers_notes_section(self.schema, cleaned), "\n".join([
            "البيانات الإضافية المطلوبة:",
            "الاسم: سامي",
            "بيانات الشركاء:",
            "  1. اسم كل شريك: أحمد؛ حصة كل شريك: 60؛ الصفة: مدير؛ يوقع: نعم",
            "  2. اسم كل شريك: سارة؛ حصة كل شريك: 40",
        ]))

    def test_gated_repeater_follows_the_parcel_question(self):
        schema = apply_repeater_rules(_pre_repeater_schema(_source_services()["request-property-consolidation"]),
                                      "request-property-consolidation")
        base = {"applicant_name": "س", "national_id": "0123", "phone_number": "0790000000", "region": "ع", "governorate": "ع"}
        cleaned, errors = validate_answers(schema, {**base, PARCEL_QUESTION_KEY: "no", "plots": [{"parcel_number": "1"}]})
        self.assertEqual(errors, {})
        self.assertNotIn("plots", cleaned)  # hidden answers are dropped
        _cleaned, errors = validate_answers(schema, {**base, PARCEL_QUESTION_KEY: "yes"})
        self.assertEqual(errors, {"plots": "Add at least 2 entries."})
        _cleaned, errors = validate_answers(schema, {**base, PARCEL_QUESTION_KEY: "yes", "plots": [
            {"parcel_number": "015", "basin_number": "3"}, {"parcel_number": "016"}]})
        self.assertEqual(errors, {"plots": {"1": {"basin_number": "This field is required."}}})
        cleaned, errors = validate_answers(schema, {**base, PARCEL_QUESTION_KEY: "yes", "plots": [
            {"parcel_number": "015", "basin_number": "3"}, {"parcel_number": "016", "basin_number": "3"}]})
        self.assertEqual(errors, {})
        self.assertEqual(cleaned["plots"][0]["parcel_number"], "015")  # text: the leading zero is kept
        notes = answers_notes_section(schema, cleaned)
        self.assertIn("أرقام القطع المطلوب توحيدها:\n  1. رقم القطعة: 015؛ رقم الحوض: 3\n  2. رقم القطعة: 016؛ رقم الحوض: 3", notes)


class RepeaterConversionTests(SimpleTestCase):
    def setUp(self):
        self.sources = _source_services()
        self.company = _pre_repeater_schema(self.sources["business_company_registration"])
        self.consolidation = _pre_repeater_schema(self.sources["request-property-consolidation"])

    def test_partner_fields_become_one_repeater_with_the_imported_labels(self):
        schema = apply_repeater_rules(self.company, "business_company_registration")
        keys = [field["key"] for field in schema]
        for source in PARTNER_ITEM_SOURCES:
            self.assertNotIn(source[0], keys)
        partners = schema[keys.index("partners")]
        self.assertEqual(keys.index("partners"), keys.index("partners_count") + 1)  # same place as before
        self.assertEqual(partners["type"], "repeater")
        self.assertTrue(partners["required"])
        self.assertEqual((partners["min_items"], partners["max_items"]), (1, 20))
        self.assertEqual(partners["help_text_ar"], "حسب عدد الشركاء")
        self.assertEqual(partners["help_text_en"], "Depending on the number of partners")
        self.assertEqual(
            [(item["key"], item["label_ar"], item["label_en"], item["type"], item["required"]) for item in partners["item_fields"]],
            [
                ("name", "اسم كل شريك", "Name of each partner", "text", True),
                ("id", "الرقم الوطني / رقم الجواز للشريك", "Partner's national ID / passport number", "text", True),
                ("nationality", "جنسية كل شريك", "Nationality of each partner", "text", True),
                ("share", "حصة كل شريك", "Share of each partner", "text", True),
            ],
        )
        self.assertEqual(partners["item_fields"][1]["help_text_ar"], "حسب الجنسية")
        # Fields that are not part of the group are unchanged.
        self.assertIn("authorized_signatories", keys)
        self.assertIn("partners_count", keys)
        self.assertEqual([field["display_order"] for field in schema], list(range(1, len(schema) + 1)))
        self.assertFalse([problem for problem in schema_problems(schema) if problem[1] == "partners"])

    def test_consolidation_plots_become_a_gated_repeater(self):
        schema = apply_repeater_rules(self.consolidation, "request-property-consolidation")
        keys = [field["key"] for field in schema]
        self.assertNotIn("field_56b1987951", keys)
        self.assertNotIn("field_7d9efcd6d5", keys)
        self.assertEqual(keys.index(PARCEL_QUESTION_KEY) + 1, keys.index("plots"))
        question = schema[keys.index(PARCEL_QUESTION_KEY)]
        self.assertEqual(question["label_ar"], PARCEL_QUESTION_LABEL)
        self.assertEqual([option["value"] for option in question["options"]], ["yes", "no"])
        plots = schema[keys.index("plots")]
        self.assertEqual(plots["visible_when"], {"field": PARCEL_QUESTION_KEY, "equals": "yes"})
        self.assertEqual((plots["required"], plots["min_items"], plots["max_items"]), (True, 2, 20))
        self.assertEqual(plots["label_en"], "Numbers of the plots to consolidate")
        self.assertEqual([(item["key"], item["label_ar"], item["type"], item["required"]) for item in plots["item_fields"]],
                         [("parcel_number", "رقم القطعة", "text", True), ("basin_number", "رقم الحوض", "text", True)])
        self.assertEqual(schema_problems(schema), [])

    def test_conversion_is_idempotent_and_leaves_other_forms_alone(self):
        once = apply_repeater_rules(self.company, "business_company_registration")
        self.assertEqual(apply_repeater_rules(once, "business_company_registration"), once)
        once = apply_repeater_rules(self.consolidation, "request-property-consolidation")
        self.assertEqual(apply_repeater_rules(once, "request-property-consolidation"), once)
        # The plot fields are converted only on the consolidation service.
        self.assertEqual(apply_repeater_rules(self.consolidation, "another-service"), self.consolidation)
        for slug, service in self.sources.items():
            if slug in ("business_company_registration", "request-property-consolidation"):
                continue
            schema = _pre_repeater_schema(service)
            self.assertEqual(apply_repeater_rules(schema, slug), schema, slug)

    def test_edited_forms_are_not_converted(self):
        edited = copy.deepcopy(self.company)
        next(field for field in edited if field["key"] == "partner_share")["label_ar"] = "نسبة كل شريك"
        self.assertEqual(apply_repeater_rules(edited, "business_company_registration"), edited)
        missing = [field for field in self.company if field["key"] != "partner_nationality"]
        self.assertEqual(apply_repeater_rules(missing, "business_company_registration"), missing)
        retyped = copy.deepcopy(self.consolidation)
        next(field for field in retyped if field["key"] == "field_56b1987951")["type"] = "select"
        self.assertEqual(apply_repeater_rules(retyped, "request-property-consolidation"), retyped)

    def test_input_is_not_modified(self):
        before = copy.deepcopy(self.company)
        apply_repeater_rules(self.company, "business_company_registration")
        self.assertEqual(self.company, before)


class RepeaterMigrationTests(TestCase):
    def setUp(self):
        self.sources = _source_services()
        category = ServiceCategory.objects.create(name_ar="أعمال", name_en="Business", slug="rp-biz", show_on_public_site=True)
        self.services = {}
        for slug in ("business_company_registration", "request-property-consolidation", "request-cadastral-map"):
            source = self.sources[slug]
            self.services[slug] = Service.objects.create(
                category=category, slug=slug, name_ar=source["name_ar"], name_en=source["name_en"] or slug,
                description_ar="وصف", is_active=True, show_on_public_site=True,
                required_information_schema=_pre_repeater_schema(source),
            )
        self.cadastral_before = self.services["request-cadastral-map"].required_information_schema

    def _schema(self, slug):
        return Service.objects.get(slug=slug).required_information_schema

    def test_migration_converts_the_imported_shape_and_matches_the_importer(self):
        REPEATER_MIGRATION.forwards(django_apps, None)
        company = self._schema("business_company_registration")
        consolidation = self._schema("request-property-consolidation")
        self.assertIn("partners", [field["key"] for field in company])
        self.assertIn("plots", [field["key"] for field in consolidation])
        self.assertEqual(self._schema("request-cadastral-map"), self.cadastral_before)
        # A fresh import produces the same forms (catalogue_schema also adds the
        # developer-note fields of other services; these two have none).
        self.assertEqual(catalogue_schema(self.sources["business_company_registration"]), company)
        self.assertEqual(catalogue_schema(self.sources["request-property-consolidation"]), consolidation)

    def test_migration_is_idempotent(self):
        REPEATER_MIGRATION.forwards(django_apps, None)
        before = list(Service.objects.order_by("pk").values_list("required_information_schema", flat=True))
        REPEATER_MIGRATION.forwards(django_apps, None)
        self.assertEqual(list(Service.objects.order_by("pk").values_list("required_information_schema", flat=True)), before)

    def test_orders_keep_their_notes(self):
        customer = CustomUser.objects.create_user(email="rp-old@example.test", password="x-Pass-2026!", full_name="عميل",
                                                  phone="+962791500001", role=CustomUser.Role.CUSTOMER)
        service = self.services["business_company_registration"]
        order = Order.objects.create(service=service, customer=customer, city="عمّان",
                                     customer_notes="البيانات الإضافية المطلوبة:\nاسم كل شريك: أحمد، سارة")
        REPEATER_MIGRATION.forwards(django_apps, None)
        order.refresh_from_db()
        self.assertEqual(order.customer_notes, "البيانات الإضافية المطلوبة:\nاسم كل شريك: أحمد، سارة")


class ImporterAgreementTests(SimpleTestCase):
    def test_repeaters_add_no_form_problems(self):
        # Some business selects still wait for the client's choices (a known,
        # separate gap); the repeater change must not add any problem.
        for slug, service in _source_services().items():
            with self.subTest(slug):
                before = {(key, message) for _n, key, message in schema_problems(_pre_repeater_schema(service))}
                after = {(key, message) for _n, key, message in schema_problems(catalogue_schema(service))}
                self.assertEqual(after, before)
                self.assertFalse([key for key, _message in after if key in ("partners", "plots")])

    def test_importer_equals_migrated_catalogue(self):
        """For every service: the pre-0023 form, migrated, equals a fresh import (developer-note fields aside)."""
        from services.catalogue_rules import apply_developer_note_fields

        for slug, service in _source_services().items():
            migrated = apply_developer_note_fields(apply_repeater_rules(_pre_repeater_schema(service), slug), slug)
            self.assertEqual(translate_schema(migrated)[0], catalogue_schema(service), slug)

    def test_repeater_item_labels_are_translated(self):
        schema, _filled = translate_schema([{
            "key": "partners", "type": "repeater", "label_ar": "بيانات الشركاء",
            "item_fields": [{"key": "name", "type": "text", "label_ar": "اسم كل شريك"}],
        }])
        self.assertEqual(schema[0]["label_en"], "Partners' details")
        self.assertEqual(schema[0]["item_fields"][0]["label_en"], "Name of each partner")


class RepeaterOrderTests(APITestCase):
    def setUp(self):
        category = ServiceCategory.objects.create(name_ar="أعمال", name_en="Business", slug="rp-orders", show_on_public_site=True)
        source = _source_services()["business_company_registration"]
        self.service = Service.objects.create(
            category=category, slug="rp-company", name_ar=source["name_ar"], name_en=source["name_en"],
            description_ar="وصف", is_active=True, show_on_public_site=True,
            # «نوع الشركة» still waits for the client's list of company types
            # (no options in the sheet), which would block ordering; it is not
            # part of what these tests check.
            required_information_schema=[field for field in catalogue_schema(source) if field["key"] != "company_type"],
        )
        self.customer = CustomUser.objects.create_user(email="rp-cust@example.test", password="x-Pass-2026!", full_name="عميل",
                                                       phone="+962791500002", role=CustomUser.Role.CUSTOMER)
        self.client = APIClient()
        self.client.force_authenticate(self.customer)
        self.answers = {
            "proposed_company_name_1": "أ", "proposed_company_name_2": "ب", "proposed_company_name_3": "ج",
            "company_objectives": "تجارة", "company_address": "عمّان", "capital_amount": "1000", "partners_count": "2",
            "authorized_signatories": "أحمد", "signing_authority": "منفرداً",
        }

    def post(self, answers, language="ar"):
        self.client.credentials(HTTP_ACCEPT_LANGUAGE=language)
        return self.client.post("/api/orders/", {
            "service": self.service.id, "full_name": "عميل", "phone": "0791500002", "city": "عمّان", "consent": True,
            "service_answers": answers,
        }, format="json")

    def test_order_with_partner_rows_is_created_with_readable_notes(self):
        response = self.post({**self.answers, "partners": [
            {"name": "أحمد", "id": "9901", "nationality": "أردني", "share": "60%"},
            {"name": "Sara", "id": "P123", "nationality": "Canadian", "share": "40%"},
        ]})
        self.assertEqual(response.status_code, 201, response.content)
        notes = Order.objects.get(pk=response.json()["id"]).customer_notes
        self.assertIn(
            "بيانات الشركاء:\n"
            "  1. اسم كل شريك: أحمد؛ الرقم الوطني / رقم الجواز للشريك: 9901؛ جنسية كل شريك: أردني؛ حصة كل شريك: 60%\n"
            "  2. اسم كل شريك: Sara؛ الرقم الوطني / رقم الجواز للشريك: P123؛ جنسية كل شريك: Canadian؛ حصة كل شريك: 40%",
            notes,
        )

    def test_row_errors_come_back_by_row_in_the_request_language(self):
        response = self.post({**self.answers, "partners": [{"name": "أحمد", "id": "1", "nationality": "أ", "share": "1"}, {"name": "سارة"}]})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["service_answers"]["partners"], {"1": {
            "id": "هذا الحقل مطلوب.", "nationality": "هذا الحقل مطلوب.", "share": "هذا الحقل مطلوب."}})
        response = self.post({**self.answers}, language="en")
        self.assertEqual(response.json()["service_answers"]["partners"], "This field is required.")
        self.assertFalse(Order.objects.exists())

    def test_old_partner_keys_are_refused_after_the_change(self):
        response = self.post({**self.answers, "partner_name": "أحمد", "partners": [
            {"name": "أحمد", "id": "1", "nationality": "أ", "share": "1"}]}, language="en")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["service_answers"], {"partner_name": "This field is not part of the service form."})

    def test_service_detail_exposes_the_repeater(self):
        self.client.force_authenticate(None)
        data = self.client.get(f"/api/services/{self.service.slug}/").json()
        self.assertTrue(data["orderable"])
        partners = next(field for field in data["required_information_schema"] if field["key"] == "partners")
        self.assertEqual([item["key"] for item in partners["item_fields"]], ["name", "id", "nationality", "share"])
