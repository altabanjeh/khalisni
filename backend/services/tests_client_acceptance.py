"""Client acceptance remediation: form rules, server-side answers, catalogue data
fixes, order-form data protection, error language, slogan default, validator.

Matrix IDs: DEF-D01, B10-3, B10-2, DEF-D07/D08, DEF-D02, DEF-C06, DEF-C07,
D03/DEF-K01, CN-VIS-04 (docs/audit/KHALSNI_CLIENT_ACCEPTANCE_REMEDIATION.md).
"""

import importlib
import json
from io import StringIO

from django.apps import apps as django_apps
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import CommandError, call_command
from django.test import TestCase
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from orders.models import Order
from public_site.defaults import DEFAULT_PUBLIC_PAGE_CONTENT
from public_site.models import PublicPageContent
from services.catalogue_rules import APPROVED_DELIVERY_NOTE
from services.models import RequiredDocumentDefinition, Service, ServiceCategory, ServiceRequiredDocument
from services.schema_rules import answers_notes_section, order_blockers, schema_problems, validate_answers

PDF = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
SLOGAN_AR = "ركّز على اللي بهمّك… وإحنا بنخلّص الباقي."

YES_NO = [{"value": "yes", "label_ar": "نعم", "label_en": "Yes"}, {"value": "no", "label_ar": "لا", "label_en": "No"}]
COMPANY = [{"value": "llc", "label_ar": "ذات مسؤولية محدودة"}, {"value": "sole", "label_ar": "مؤسسة فردية"}]
PARCEL_FORM = [
    {"key": "kind", "label_ar": "نوع الشركة", "type": "select", "required": True, "options": COMPANY},
    {"key": "knows", "label_ar": "هل تعرف رقم القطعة والحوض؟", "type": "select", "required": False, "options": YES_NO},
    {"key": "parcel", "label_ar": "رقم القطعة", "type": "text", "required": True, "visible_when": {"field": "knows", "equals": "yes"}},
    {"key": "basin", "label_ar": "رقم الحوض", "type": "text", "required": True, "visible_when": {"field": "knows", "equals": "yes"}},
    {"key": "notes_extra", "label_ar": "ملاحظات إضافية", "type": "textarea", "required": False},
    {"key": "agree", "label_ar": "هل يوجد وكيل قانوني؟", "type": "checkbox", "required": False},
]


class SchemaRulesTests(TestCase):
    def test_required_select_without_options_is_a_problem_and_blocks_ordering(self):
        schema = [{"key": "company_type", "label_ar": "نوع الشركة", "type": "select", "required": True, "options": []}]
        self.assertEqual([p[2] for p in schema_problems(schema)], ["A select field needs at least one option."])
        self.assertEqual(len(order_blockers(schema)), 1)

    def test_valid_select_and_full_form_have_no_problems(self):
        self.assertEqual(schema_problems(PARCEL_FORM), [])
        self.assertEqual(order_blockers(PARCEL_FORM), [])

    def test_duplicate_options_default_and_condition_answers_are_rejected(self):
        duplicate = [{"key": "a", "label_ar": "أ", "type": "select", "options": [{"value": "x", "label_ar": "س"}, {"value": "x", "label_ar": "ص"}]}]
        self.assertIn("Option values must be unique.", [p[2] for p in schema_problems(duplicate)])
        default = [{"key": "a", "label_ar": "أ", "type": "select", "default": "z", "options": COMPANY}]
        self.assertIn("The default value is not one of the field options.", [p[2] for p in schema_problems(default)])
        condition = [
            {"key": "q", "label_ar": "س", "type": "select", "options": YES_NO},
            {"key": "n", "label_ar": "ن", "type": "text", "visible_when": {"field": "q", "equals": "maybe"}},
        ]
        self.assertIn("The condition refers to an answer that the controlling field does not offer.", [p[2] for p in schema_problems(condition)])
        unknown_type = [{"key": "a", "label_ar": "أ", "type": "colour"}]
        self.assertIn("Unknown field type.", [p[2] for p in schema_problems(unknown_type)])

    def test_answers_conditional_fields_follow_the_controlling_answer(self):
        cleaned, errors = validate_answers(PARCEL_FORM, {"kind": "llc", "knows": "yes"})
        self.assertEqual(set(errors), {"parcel", "basin"})
        cleaned, errors = validate_answers(PARCEL_FORM, {"kind": "llc", "knows": "yes", "parcel": "012", "basin": "7"})
        self.assertEqual(errors, {})
        self.assertEqual(cleaned["parcel"], "012")  # leading zeros kept
        # "No": parcel and basin are not required, and stale hidden values are dropped.
        cleaned, errors = validate_answers(PARCEL_FORM, {"kind": "llc", "knows": "no", "parcel": "999"})
        self.assertEqual(errors, {})
        self.assertNotIn("parcel", cleaned)

    def test_answers_reject_unknown_option_unknown_key_and_missing_required(self):
        cleaned, errors = validate_answers(PARCEL_FORM, {"kind": "corp", "ghost": "x"})
        self.assertEqual(errors["kind"], "Choose one of the listed options.")
        self.assertEqual(errors["ghost"], "This field is not part of the service form.")
        _cleaned, errors = validate_answers(PARCEL_FORM, {})
        self.assertEqual(errors["kind"], "This field is required.")

    def test_notes_section_uses_arabic_labels_and_option_labels(self):
        cleaned, _ = validate_answers(PARCEL_FORM, {"kind": "llc", "knows": "no", "agree": True})
        section = answers_notes_section(PARCEL_FORM, cleaned)
        self.assertIn("نوع الشركة: ذات مسؤولية محدودة", section)
        self.assertIn("هل يوجد وكيل قانوني؟: نعم", section)
        self.assertNotIn("رقم القطعة:", section)


class AdminEditorRejectsUnusableFormsTests(APITestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_user(email="ca-admin@example.test", password="x-Pass-2026!", full_name="A",
                                                    phone="0791400001", role=CustomUser.Role.ADMIN, is_staff=True, is_superuser=True)
        category = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="ca-cat")
        self.service = Service.objects.create(category=category, name_ar="خ", name_en="S", slug="ca-svc", description_ar="و")
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def patch(self, schema, language="ar"):
        self.client.credentials(HTTP_ACCEPT_LANGUAGE=language)
        return self.client.patch(f"/api/admin/services/{self.service.pk}/", {"required_information_schema": schema}, format="json")

    def test_required_select_with_no_options_cannot_be_saved(self):
        bad = [{"key": "company_type", "label_ar": "نوع الشركة", "type": "select", "required": True, "options": []}]
        response = self.patch(bad)
        self.assertEqual(response.status_code, 400)
        self.assertIn("حقل القائمة يحتاج إلى خيار واحد على الأقل", json.dumps(response.json(), ensure_ascii=False))
        response = self.patch(bad, "en")
        self.assertIn("Field 'company_type': A select field needs at least one option.", json.dumps(response.json()))

    def test_valid_select_is_accepted(self):
        self.assertEqual(self.patch(PARCEL_FORM).status_code, 200)


class OrderAnswersAndDataProtectionTests(APITestCase):
    def setUp(self):
        self.category = ServiceCategory.objects.create(name_ar="أعمال", name_en="Business", slug="ca-biz", show_on_public_site=True)
        self.service = Service.objects.create(
            category=self.category, name_ar="خدمة نموذجية", name_en="Form service", slug="ca-form",
            description_ar="و", show_on_public_site=True, required_information_schema=PARCEL_FORM,
        )
        self.blocked = Service.objects.create(
            category=self.category, name_ar="خدمة ناقصة", name_en="Blocked", slug="ca-blocked", description_ar="و",
            show_on_public_site=True,
            required_information_schema=[{"key": "company_type", "label_ar": "نوع الشركة", "type": "select", "required": True, "options": []}],
        )
        self.customer = CustomUser.objects.create_user(email="ca-cust@example.test", password="x-Pass-2026!", full_name="عميل",
                                                       phone="+962791400002", national_id="9901234567", role=CustomUser.Role.CUSTOMER)
        self.other = CustomUser.objects.create_user(email="ca-other@example.test", password="x-Pass-2026!", full_name="آخر",
                                                    phone="+962791400003", role=CustomUser.Role.CUSTOMER)  # canonical, as stored
        self.client = APIClient()
        self.client.force_authenticate(self.customer)

    def post(self, service, answers=None, language="ar", **extra):
        self.client.credentials(HTTP_ACCEPT_LANGUAGE=language)
        data = {"service": service.id, "full_name": "عميل", "phone": "0791400002", "city": "عمّان", "consent": True, **extra}
        if answers is not None:
            data["service_answers"] = answers
        return self.client.post("/api/orders/", data, format="json")

    def test_service_detail_reports_orderability(self):
        self.client.force_authenticate(None)
        self.assertTrue(self.client.get(f"/api/services/{self.service.slug}/").json()["orderable"])
        blocked = self.client.get(f"/api/services/{self.blocked.slug}/").json()
        self.assertFalse(blocked["orderable"])
        self.assertEqual(blocked["order_blockers"][0]["key"], "company_type")

    def test_unusable_form_is_refused_in_the_request_language(self):
        response = self.post(self.blocked, {})
        self.assertEqual(response.status_code, 400)
        self.assertIn("تحتاج إلى استكمال إعدادها", json.dumps(response.json(), ensure_ascii=False))
        response = self.post(self.blocked, {}, language="en")
        self.assertIn("needs configuration", json.dumps(response.json()))

    def test_server_requires_answers_and_conditional_fields(self):
        response = self.post(self.service, None)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["service_answers"]["kind"], "هذا الحقل مطلوب.")
        response = self.post(self.service, {"kind": "llc", "knows": "yes"}, language="en")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.json()["service_answers"]), {"parcel", "basin"})

    def test_valid_answers_are_stored_from_the_server_side_and_hidden_values_dropped(self):
        response = self.post(self.service, {"kind": "sole", "knows": "no", "parcel": "999"}, notes="ملاحظتي")
        self.assertEqual(response.status_code, 201, response.content)
        order = Order.objects.get(pk=response.json()["id"])
        self.assertTrue(order.customer_notes.startswith("ملاحظتي\nالبيانات الإضافية المطلوبة:"))
        self.assertIn("نوع الشركة: مؤسسة فردية", order.customer_notes)
        self.assertNotIn("999", order.customer_notes)

    def test_multipart_answers_json_string_is_accepted(self):
        self.client.credentials(HTTP_ACCEPT_LANGUAGE="ar")
        response = self.client.post("/api/orders/", {
            "service": self.service.id, "full_name": "عميل", "phone": "0791400002", "city": "عمّان", "consent": "true",
            "service_answers": json.dumps({"kind": "llc", "knows": "yes", "parcel": "012", "basin": "3"}),
        }, format="multipart")
        self.assertEqual(response.status_code, 201, response.content)
        self.assertIn("رقم القطعة: 012", Order.objects.get(pk=response.json()["id"]).customer_notes)

    def test_blank_national_id_on_an_order_keeps_the_saved_one(self):
        response = self.post(self.service, {"kind": "llc", "knows": "no"}, national_id="")
        self.assertEqual(response.status_code, 201, response.content)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.national_id, "9901234567")
        # An explicit new value still updates it.
        self.post(self.service, {"kind": "llc", "knows": "no"}, national_id="9907654321")
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.national_id, "9907654321")

    def test_phone_of_another_account_is_a_localized_field_error(self):
        for language, expected in (("ar", "رقم الهاتف مستخدم في حساب آخر."), ("en", "This phone number is already used by another account.")):
            self.client.credentials(HTTP_ACCEPT_LANGUAGE=language)
            response = self.client.post("/api/orders/", {
                "service": self.service.id, "full_name": "عميل", "phone": "0791400003", "city": "عمّان", "consent": True,
                "service_answers": {"kind": "llc", "knows": "no"},
            }, format="json")
            self.assertEqual(response.status_code, 400)
            body = json.dumps(response.json(), ensure_ascii=False)
            self.assertIn(expected, body)
            self.assertNotIn("Constraint", body)
            self.assertNotIn("unique_non_empty", body)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.phone, "+962791400002")

    def test_national_id_of_another_account_is_a_localized_field_error(self):
        self.other.national_id = "9905555555"
        self.other.save()
        response = self.post(self.service, {"kind": "llc", "knows": "no"}, national_id="9905555555")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["national_id"], ["الرقم الوطني مستخدم في حساب آخر."])


class ErrorLanguageTests(APITestCase):
    def setUp(self):
        category = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="el-cat", show_on_public_site=True)
        self.service = Service.objects.create(category=category, name_ar="خ", name_en="S", slug="el-svc", description_ar="و", show_on_public_site=True)
        definition = RequiredDocumentDefinition.objects.create(code="el-id", name_ar="هوية", name_en="ID", is_active=True)
        ServiceRequiredDocument.objects.create(service=self.service, document_definition=definition, document_type="el-id",
                                               name_ar="هوية", is_required=True, allowed_extensions=[".pdf"], display_order=1)
        self.customer = CustomUser.objects.create_user(email="el-c@example.test", password="x-Pass-2026!", full_name="ع",
                                                       phone="0791400010", role=CustomUser.Role.CUSTOMER)
        self.client = APIClient()
        self.client.force_authenticate(self.customer)

    def submit(self, language, content=b"<html><script>x</script></html>"):
        self.client.credentials(HTTP_ACCEPT_LANGUAGE=language)
        return self.client.post("/api/orders/", {
            "service": self.service.id, "full_name": "ع", "phone": "0791400010", "city": "عمّان", "consent": "true",
            "document_types": ["el-id"], "documents": [SimpleUploadedFile("fake.pdf", content, content_type="application/pdf")],
        }, format="multipart")

    def test_upload_validation_message_follows_the_request_language(self):
        arabic = json.dumps(self.submit("ar").json(), ensure_ascii=False)
        self.assertIn("محتوى الملف لا يطابق امتداده", arabic)
        self.assertNotIn("does not match", arabic)
        english = json.dumps(self.submit("en").json())
        self.assertIn("does not match its extension", english)

    def test_missing_documents_and_consent_messages_are_arabic(self):
        self.client.credentials(HTTP_ACCEPT_LANGUAGE="ar")
        body = json.dumps(self.client.post("/api/orders/", {
            "service": self.service.id, "full_name": "ع", "phone": "0791400010", "city": "عمّان", "consent": False,
        }, format="json").json(), ensure_ascii=False)
        self.assertIn("الموافقة على استخدام البيانات مطلوبة.", body)

    def test_framework_messages_follow_the_language_and_typed_text_is_untouched(self):
        self.client.credentials(HTTP_ACCEPT_LANGUAGE="en")
        english = self.client.post("/api/orders/", {"consent": True}, format="json").json()
        self.assertEqual(english["service"], ["This field is required."])
        self.client.credentials(HTTP_ACCEPT_LANGUAGE="ar")
        arabic = self.client.post("/api/orders/", {"consent": True}, format="json").json()
        self.assertNotEqual(arabic["service"], ["This field is required."])
        from core.errors import localize_message
        self.assertEqual(localize_message("Approved by Sara after a call", "ar"), "Approved by Sara after a call")
        self.assertEqual(localize_message("Missing required documents: هوية.", "ar"), "المستندات المطلوبة ناقصة: هوية.")


class DeliveryAfterReviewTests(TestCase):
    def test_after_review_shows_only_the_sentence_and_promises_no_date(self):
        category = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="dr-cat")
        service = Service.objects.create(category=category, name_ar="خ", name_en="S", slug="dr-svc", description_ar="و",
                                         delivery_time_mode=Service.DeliveryTimeMode.AFTER_REVIEW,
                                         delivery_note_ar=APPROVED_DELIVERY_NOTE["ar"])
        payload = service.delivery_time_payload()
        self.assertEqual(payload["label_ar"], APPROVED_DELIVERY_NOTE["ar"])
        self.assertIsNone(payload["expected_duration"])
        self.assertNotIn("1", payload["label_ar"])
        customer = CustomUser.objects.create_user(email="dr@example.test", password="x-Pass-2026!", full_name="ع",
                                                  phone="0791400020", role=CustomUser.Role.CUSTOMER)
        order = Order.objects.create(customer=customer, service=service, city="عمّان")
        self.assertIsNone(order.expected_delivery_date)


class CatalogueMigrationTests(TestCase):
    """services.0016 on rows in their imported state; idempotent; edits kept."""

    def setUp(self):
        self.migration = importlib.import_module("services.migrations.0016_client_acceptance_catalogue_fixes")
        self.category = ServiceCategory.objects.create(name_ar="أعمال", name_en="B", slug="mig-cat")

    def make(self, slug, schema, **extra):
        return Service.objects.create(category=self.category, name_ar=slug, name_en=slug, slug=slug, description_ar="و",
                                      required_information_schema=schema, **extra)

    def run_migration(self):
        self.migration.forwards(django_apps, None)
        self.migration.forwards(django_apps, None)  # idempotent

    def test_source_defined_choices_text_alternatives_and_question_shapes(self):
        business = self.make("business_trademark_services", [
            {"key": "trademark_owner_type", "label_ar": "نوع مالك العلامة", "type": "select", "required": True, "options": []},
            {"key": "trademark_class", "label_ar": "فئة السلع/الخدمات", "type": "select", "required": False, "options": []},
        ])
        licence = self.make("business_license_services", [
            {"key": "business_activity_type", "label_ar": "نوع النشاط", "type": "select", "required": True, "options": []},
            {"key": "municipality", "label_ar": "المحافظة / البلدية", "type": "select", "required": True, "options": []},
        ])
        closure = self.make("business_company_closure_liquidation", [
            {"key": "has_assets", "label_ar": "هل لدى الشركة موجودات؟", "type": "checkbox", "required": True},
        ])
        land = self.make("request-property-subdivision", [
            {"key": "field_649c50d973", "label_ar": "هل العقار أرض أم بناء؟", "type": "checkbox", "required": False},
            {"key": "field_x", "label_ar": "ما الغاية من الطلب؟", "type": "checkbox", "required": False},
            {"key": "field_y", "label_ar": "هل يوجد وكيل قانوني؟", "type": "checkbox", "required": False},
        ])
        untouched = self.make("not-imported", [{"key": "a", "label_ar": "ما الغاية؟", "type": "checkbox"}])
        self.run_migration()
        fields = lambda service: {f["key"]: f for f in Service.objects.get(pk=service.pk).required_information_schema}
        owner = fields(business)["trademark_owner_type"]
        self.assertEqual([o["label_ar"] for o in owner["options"]], ["فرد", "شركة"])
        self.assertEqual(fields(business)["trademark_class"]["options"], [])  # not listed in the sheet: client input
        self.assertEqual(fields(licence)["business_activity_type"]["type"], "text")
        self.assertEqual(fields(licence)["municipality"]["options"], [])  # client input
        self.assertEqual(fields(closure)["has_assets"]["type"], "select")
        self.assertEqual([o["value"] for o in fields(closure)["has_assets"]["options"]], ["yes", "no"])
        self.assertEqual([o["label_ar"] for o in fields(land)["field_649c50d973"]["options"]], ["أرض", "بناء"])
        self.assertEqual(fields(land)["field_x"]["type"], "text")
        self.assertEqual(fields(land)["field_y"]["type"], "checkbox")  # genuine yes/no unchanged
        self.assertEqual(fields(untouched)["a"]["type"], "checkbox")  # only imported services

    def test_placeholder_duration_becomes_after_review_and_admin_edit_is_kept(self):
        placeholder = self.make("request-cadastral-map", [], estimated_duration=1, estimated_duration_unit="days")
        edited = self.make("request-zoning-plan", [], estimated_duration=5, estimated_duration_unit="days")
        self.run_migration()
        self.assertEqual(Service.objects.get(pk=placeholder.pk).delivery_time_mode, "after_review")
        self.assertEqual(Service.objects.get(pk=edited.pk).delivery_time_mode, "duration")

    def test_land_survey_duplicates_removed_and_orders_untouched(self):
        survey = self.make("request-land-survey", [
            {"key": "full_name", "label_ar": "الاسم", "type": "text", "required": True},
            {"key": "applicant_name", "label_ar": "اسم مقدم الطلب", "type": "text", "required": True},
            {"key": "field_760c65a1fa", "label_ar": "الهاتف", "type": "tel", "required": True},
            {"key": "phone_number", "label_ar": "رقم الهاتف", "type": "tel", "required": True},
        ])
        definition = RequiredDocumentDefinition.objects.create(code="national_id_copy", name_ar="صورة الهوية", is_active=True)
        alias = RequiredDocumentDefinition.objects.create(code="document_a4c4fed3af", name_ar="الهوية", is_active=True)
        ServiceRequiredDocument.objects.create(service=survey, document_definition=definition, document_type="national_id_copy", name_ar="صورة الهوية")
        ServiceRequiredDocument.objects.create(service=survey, document_definition=alias, document_type="document_a4c4fed3af", name_ar="الهوية")
        customer = CustomUser.objects.create_user(email="mig@example.test", password="x-Pass-2026!", full_name="ع",
                                                  phone="0791400030", role=CustomUser.Role.CUSTOMER)
        order = Order.objects.create(customer=customer, service=survey, city="عمّان", customer_notes="الاسم: x")
        snapshot = order.requirements_snapshot
        self.run_migration()
        keys = [f["key"] for f in Service.objects.get(pk=survey.pk).required_information_schema]
        self.assertEqual(keys, ["applicant_name", "phone_number"])
        active = set(survey.document_requirements.filter(is_active=True).values_list("document_type", flat=True))
        self.assertEqual(active, {"national_id_copy"})
        order.refresh_from_db()
        self.assertEqual(order.customer_notes, "الاسم: x")
        self.assertEqual(order.requirements_snapshot, snapshot)


class ImporterRulesTests(TestCase):
    def test_importer_reads_source_choice_lists_and_question_shapes(self):
        from services.service_import import _field_from_label

        entity = _field_from_label("نوع صاحب السجل", source_type="Dropdown", note="شركة / مؤسسة فردية")
        self.assertEqual([o["label_ar"] for o in entity["options"]], ["شركة", "مؤسسة فردية"])
        copy = _field_from_label("نوع النسخة المطلوبة", source_type="Dropdown", required=False, note="عادية / مصدقة عند توفر الخيار")
        self.assertEqual([o["label_ar"] for o in copy["options"]], ["عادية", "مصدقة"])
        typed = _field_from_label("طبيعة النشاط المرتبط بالاسم", source_type="Text / Dropdown")
        self.assertEqual(typed["type"], "text")
        unlisted = _field_from_label("نوع الشركة", source_type="Dropdown", note="قائمة أنواع الشركات")
        self.assertEqual((unlisted["type"], unlisted["options"]), ("select", []))
        self.assertTrue(unlisted["import_warnings"])
        either = _field_from_label("هل العقار أرض أم بناء؟", source_type="Yes/No", required=False)
        self.assertEqual(either["type"], "select")
        open_question = _field_from_label("ما الغاية من المخطط؟", source_type="Yes/No", required=False)
        self.assertEqual(open_question["type"], "text")
        required_yes_no = _field_from_label("هل لديها موظفون؟", source_type="Yes/No", required=True)
        self.assertEqual([o["value"] for o in required_yes_no["options"]], ["yes", "no"])

    def test_merged_land_survey_aliases_are_dropped(self):
        from services.catalogue_rules import drop_merged_aliases

        fields, documents = drop_merged_aliases(
            "request-land-survey",
            [{"key": "full_name"}, {"key": "applicant_name"}, {"key": "national_id"}],
            [{"code": "document_a4c4fed3af"}, {"code": "national_id_copy"}],
        )
        self.assertEqual([f["key"] for f in fields], ["applicant_name", "national_id"])
        self.assertEqual([d["code"] for d in documents], ["national_id_copy"])


class CatalogueValidatorTests(TestCase):
    def test_validator_flags_unusable_forms_and_placeholder_durations(self):
        category = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="cv-cat", show_on_public_site=True)
        Service.objects.create(category=category, name_ar="خ", name_en="S", slug="cv-bad", description_ar="و", show_on_public_site=True,
                               delivery_note_ar=APPROVED_DELIVERY_NOTE["ar"],
                               required_information_schema=[
                                   {"key": "company_type", "label_ar": "نوع الشركة", "type": "select", "required": True, "options": []},
                                   {"key": "q", "label_ar": "هل لديها موظفون؟", "type": "checkbox", "required": True},
                               ])
        out = StringIO()
        call_command("validate_catalogue", "--no-warnings", stdout=out)
        text = out.getvalue()
        self.assertIn("A select field needs at least one option.", text)
        self.assertIn("can only be answered 'yes'", text)
        self.assertIn("Shows a fixed duration", text)
        with self.assertRaises(CommandError):
            call_command("validate_catalogue", "--strict", stdout=StringIO())

    def test_clean_catalogue_passes_strict(self):
        category = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="cv-ok", show_on_public_site=True)
        Service.objects.create(category=category, name_ar="خ", name_en="S", slug="cv-ok-svc", description_ar="و", show_on_public_site=True,
                               required_information_schema=PARCEL_FORM)
        call_command("validate_catalogue", "--strict", stdout=StringIO())


class ApprovedSloganTests(TestCase):
    def test_default_content_carries_the_approved_slogan(self):
        self.assertEqual(DEFAULT_PUBLIC_PAGE_CONTENT["hero_title_ar"], SLOGAN_AR)

    def test_migration_replaces_only_the_untouched_previous_default(self):
        migration = importlib.import_module("public_site.migrations.0008_approved_homepage_slogan")
        values = {**DEFAULT_PUBLIC_PAGE_CONTENT, "version_name": "v", "active_content": False}
        untouched = PublicPageContent.objects.create(**{**values, "hero_title_ar": migration.OLD["hero_title_ar"]})
        custom = PublicPageContent.objects.create(**{**values, "hero_title_ar": "عنوان كتبه المدير"})
        migration.forwards(django_apps, None)
        untouched.refresh_from_db()
        custom.refresh_from_db()
        self.assertEqual(untouched.hero_title_ar, SLOGAN_AR)
        self.assertEqual(custom.hero_title_ar, "عنوان كتبه المدير")


class DurationWordsTests(TestCase):
    def test_unit_words_agree_with_the_number(self):
        category = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="dw-cat")
        cases = [(1, "المدة المتوقعة: 1 يوم", "Expected completion: 1 day"), (2, "المدة المتوقعة: يومان", "Expected completion: 2 days"),
                 (5, "المدة المتوقعة: 5 أيام", "Expected completion: 5 days"), (14, "المدة المتوقعة: 14 يوماً", "Expected completion: 14 days")]
        for index, (value, arabic, english) in enumerate(cases):
            service = Service.objects.create(category=category, name_ar="خ", name_en="S", slug=f"dw-{index}", description_ar="و",
                                             estimated_duration=value)
            payload = service.delivery_time_payload()
            self.assertEqual((payload["label_ar"], payload["label_en"]), (arabic, english))
        ranged = Service.objects.create(category=category, name_ar="خ", name_en="S", slug="dw-range", description_ar="و",
                                        delivery_time_mode="duration_range", estimated_duration_min=1, estimated_duration_max=3)
        self.assertEqual(ranged.delivery_time_payload()["label_ar"], "المدة المتوقعة: من 1 إلى 3 أيام")
        ranged_two = Service.objects.create(category=category, name_ar="خ", name_en="S", slug="dw-range-2", description_ar="و",
                                            delivery_time_mode="duration_range", estimated_duration_min=1, estimated_duration_max=2)
        self.assertEqual(ranged_two.delivery_time_payload()["label_ar"], "المدة المتوقعة: من 1 إلى يومان")
