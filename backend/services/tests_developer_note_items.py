"""Client developer notes: CN-BIZ-05 (site coordinates and photos), CN-BIZ-07/08
(mortgage data), CN-BIZ-09 (large engineering drawings)."""

import importlib
import json
from pathlib import Path

from django.apps import apps as django_apps
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from documents.file_validation import REQUIREMENT_SIZE_ERROR, requirement_upload_error
from documents.models import Document
from documents.upload_limits import MB, allowed_upload_size, hard_max_size_mb
from orders.models import Order
from services.catalogue_rules import DEVELOPER_NOTE_DOCUMENTS, apply_developer_note_fields
from services.models import RequiredDocumentDefinition, Service, ServiceCategory, ServiceRequiredDocument
from services.schema_rules import answers_notes_section, schema_problems, validate_answers
from services.service_import import ImportResult, apply_import, catalogue_documents, catalogue_schema

NOTES_MIGRATION = importlib.import_module("services.migrations.0025_developer_note_fields_and_large_uploads")
NORMALIZED = Path(settings.BASE_DIR).parent / "data" / "service-import" / "normalized-services.json"
DRAWINGS = "document_3443627d36"


def _sources():
    return {service["slug"]: service for service in json.loads(NORMALIZED.read_text(encoding="utf-8"))["services"]}


def _link(service, definition, **extra):
    return ServiceRequiredDocument.objects.create(
        service=service, document_definition=definition, document_type=definition.code, name_ar=definition.name_ar, **extra
    )


def _pdf(size, name="drawing.pdf"):
    return SimpleUploadedFile(name, b"%PDF-1.4\n" + b"0" * (size - 9), content_type="application/pdf")


class DeveloperNoteFieldTests(SimpleTestCase):
    def setUp(self):
        self.sources = _sources()

    def test_boundary_demarcation_gets_optional_site_coordinates(self):
        schema = catalogue_schema(self.sources["request-boundary-demarcation"])
        keys = [field["key"] for field in schema]
        field = schema[keys.index("site_coordinates")]
        self.assertEqual(keys.index("site_coordinates") + 1, keys.index("additional_notes"))
        self.assertEqual((field["type"], field["required"]), ("text", False))
        self.assertEqual(field["label_ar"], "إحداثيات الموقع (اختياري)")
        self.assertEqual(field["label_en"], "Site coordinates (optional)")
        self.assertEqual(field["help_text_ar"], "مثال: 31.9539, 35.9106")
        self.assertEqual(field["help_text_en"], "Example: 31.9539, 35.9106")
        self.assertEqual([item["display_order"] for item in schema], list(range(1, len(schema) + 1)))
        self.assertFalse([problem for problem in schema_problems(schema) if problem[1] == "site_coordinates"])
        cleaned, errors = validate_answers([field], {})
        self.assertEqual((cleaned, errors), ({}, {}))
        cleaned, _errors = validate_answers([field], {"site_coordinates": "31.9539, 35.9106"})
        self.assertEqual(answers_notes_section([field], cleaned), "البيانات الإضافية المطلوبة:\nإحداثيات الموقع (اختياري): 31.9539, 35.9106")

    def test_mortgage_release_gets_the_optional_approval_date(self):
        schema = catalogue_schema(self.sources["request-mortgage-release"])
        field = next(item for item in schema if item["key"] == "release_approval_date")
        self.assertEqual((field["type"], field["required"]), ("date", False))
        self.assertEqual(validate_answers([field], {})[1], {})
        self.assertEqual(validate_answers([field], {"release_approval_date": "2026-10-30"})[0], {"release_approval_date": "2026-10-30"})
        self.assertEqual(validate_answers([field], {"release_approval_date": "30/10/2026"})[1],
                         {"release_approval_date": "Enter a date as YYYY-MM-DD."})
        # The release letter itself was already a required document.
        documents = {document["code"]: document for document in self.sources["request-mortgage-release"]["documents"]}
        self.assertTrue(documents["document_d2024a06a1"]["is_required"])

    def test_mortgage_registration_already_has_the_noted_data(self):
        """CN-BIZ-07: mortgagee, mortgage value and financing documents are imported items; nothing is added."""
        source = self.sources["request-property-mortgage-registration"]
        keys = {field["key"] for field in catalogue_schema(source)}
        self.assertTrue({"field_08d94d2888", "field_3ece488644", "field_d6467d46cf"} <= keys)
        self.assertIn("document_5c2f8f95d1", {document["code"] for document in catalogue_documents(source)})
        self.assertEqual(apply_developer_note_fields(catalogue_schema(source), source["slug"]), catalogue_schema(source))

    def test_fields_are_added_once_and_only_to_their_services(self):
        schema = catalogue_schema(self.sources["request-boundary-demarcation"])
        self.assertEqual(apply_developer_note_fields(schema, "request-boundary-demarcation"), schema)
        other = catalogue_schema(self.sources["request-land-survey"])
        self.assertNotIn("site_coordinates", [field["key"] for field in other])

    def test_site_photos_document_is_added_by_the_importer(self):
        documents = catalogue_documents(self.sources["request-boundary-demarcation"])
        photos = [document for document in documents if document["code"] == "site_photos"]
        self.assertEqual(len(photos), 1)
        self.assertEqual(photos[0]["allowed_extensions"], [".jpg", ".jpeg", ".png"])
        self.assertFalse(photos[0]["is_required"])
        self.assertTrue(photos[0]["provider_can_view_file"])
        self.assertNotIn("site_photos", [document["code"] for document in catalogue_documents(self.sources["request-land-survey"])])


class DeveloperNoteMigrationTests(TestCase):
    def setUp(self):
        category = ServiceCategory.objects.create(name_ar="عقارات", name_en="Land", slug="dn-land", show_on_public_site=True)
        sources = _sources()
        self.boundary = Service.objects.create(
            category=category, slug="request-boundary-demarcation", name_ar="طلب تثبيت حدود", name_en="Boundary",
            description_ar="وصف", required_information_schema=[
                field for field in catalogue_schema(sources["request-boundary-demarcation"]) if field["key"] != "site_coordinates"
            ],
        )
        self.permit = Service.objects.create(category=category, slug="request-building-permit", name_ar="طلب رخصة بناء",
                                             name_en="Permit", description_ar="وصف")
        self.drawings = RequiredDocumentDefinition.objects.create(code=DRAWINGS, name_ar="المخططات الهندسية", name_en="Engineering drawings")
        self.drawings_link = _link(self.permit, self.drawings, is_required=True)

    def test_adds_coordinates_photos_and_the_drawings_limit(self):
        NOTES_MIGRATION.forwards(django_apps, None)
        self.boundary.refresh_from_db()
        self.assertIn("site_coordinates", [field["key"] for field in self.boundary.required_information_schema])
        photos = ServiceRequiredDocument.objects.get(service=self.boundary, document_type="site_photos")
        self.assertFalse(photos.is_required)
        self.assertTrue(photos.provider_can_view_file)
        self.assertEqual(sorted(photos.allowed_extensions), [".jpeg", ".jpg", ".png"])
        self.assertEqual((photos.name_ar, photos.name_en), ("صور الموقع", "Site photos"))
        self.drawings.refresh_from_db()
        self.drawings_link.refresh_from_db()
        self.assertEqual((self.drawings.max_file_size_mb, self.drawings.max_file_size), (50, 50 * MB))
        self.assertEqual(self.drawings_link.max_file_size, 50 * MB)

    def test_is_idempotent_and_respects_admin_decisions(self):
        NOTES_MIGRATION.forwards(django_apps, None)
        snapshot = (
            list(Service.objects.order_by("pk").values_list("required_information_schema", flat=True)),
            list(ServiceRequiredDocument.objects.order_by("pk").values_list("pk", "document_type", "max_file_size", "is_deleted")),
        )
        NOTES_MIGRATION.forwards(django_apps, None)
        self.assertEqual(snapshot, (
            list(Service.objects.order_by("pk").values_list("required_information_schema", flat=True)),
            list(ServiceRequiredDocument.objects.order_by("pk").values_list("pk", "document_type", "max_file_size", "is_deleted")),
        ))
        # An admin removed the photos and chose 30 MB for the drawings: both stay.
        ServiceRequiredDocument.objects.get(document_type="site_photos").soft_delete(reason="admin")
        self.drawings.max_file_size_mb = 30
        self.drawings.save()
        NOTES_MIGRATION.forwards(django_apps, None)
        self.assertFalse(ServiceRequiredDocument.objects.filter(document_type="site_photos", is_deleted=False).exists())
        self.drawings.refresh_from_db()
        self.assertEqual(self.drawings.max_file_size_mb, 30)

    def test_orders_keep_their_requirement_snapshot(self):
        customer = CustomUser.objects.create_user(email="dn-old@example.test", password="x-Pass-2026!", full_name="عميل",
                                                  phone="+962791600001", role=CustomUser.Role.CUSTOMER)
        order = Order.objects.create(customer=customer, service=self.permit, city="عمّان")
        before = order.requirements_snapshot
        NOTES_MIGRATION.forwards(django_apps, None)
        order.refresh_from_db()
        self.assertEqual(order.requirements_snapshot, before)
        self.assertEqual(order.requirements_snapshot[0]["max_file_size"], 10 * MB)


class LargeUploadLimitTests(TestCase):
    def setUp(self):
        category = ServiceCategory.objects.create(name_ar="عقارات", name_en="Land", slug="lu-land", show_on_public_site=True)
        self.service = Service.objects.create(category=category, slug="lu-permit", name_ar="رخصة", name_en="Permit", description_ar="و")
        self.drawings = RequiredDocumentDefinition.objects.create(code=DRAWINGS, name_ar="المخططات الهندسية")
        self.link = _link(self.service, self.drawings, is_required=False)

    def test_override_sets_the_definition_and_linked_requirements(self):
        self.assertEqual(self.link.max_file_size, 10 * MB)
        self.drawings.max_file_size_mb = 40
        self.drawings.save()
        self.link.refresh_from_db()
        self.assertEqual((self.drawings.max_file_size, self.link.max_file_size), (40 * MB, 40 * MB))
        # New links take the override too.
        other = _link(
            Service.objects.create(category=self.service.category, slug="lu-other", name_ar="أخرى", name_en="Other", description_ar="و"),
            self.drawings, max_file_size=5 * MB,
        )
        self.assertEqual(other.max_file_size, 40 * MB)
        # Removing the override goes back to the default limit.
        self.drawings.max_file_size_mb = None
        self.drawings.save()
        self.link.refresh_from_db()
        self.assertEqual((self.drawings.max_file_size, self.link.max_file_size), (10 * MB, 10 * MB))

    def test_override_is_capped_by_the_ceiling(self):
        self.assertEqual(hard_max_size_mb(), 50)
        self.drawings.max_file_size_mb = 51
        with self.assertRaises(ValidationError) as raised:
            self.drawings.save()
        self.assertIn("max_file_size_mb", raised.exception.message_dict)
        with override_settings(ENGINEERING_UPLOAD_MAX_SIZE=80 * MB):
            self.drawings.max_file_size_mb = 80
            self.drawings.save()
            self.assertEqual(self.drawings.max_file_size, 80 * MB)

    def test_requirement_limit_is_enforced(self):
        big = SimpleNamespaceRequirement(max_file_size=50 * MB)
        normal = SimpleNamespaceRequirement(max_file_size=10 * MB)
        self.assertIsNone(requirement_upload_error(_pdf(12 * MB), big))
        self.assertEqual(requirement_upload_error(_pdf(12 * MB), normal), REQUIREMENT_SIZE_ERROR)
        self.assertEqual(requirement_upload_error(_pdf(51 * MB), big), REQUIREMENT_SIZE_ERROR)
        # A requirement can never allow more than the ceiling.
        self.assertEqual(allowed_upload_size(SimpleNamespaceRequirement(max_file_size=500 * MB)), 50 * MB)
        self.assertEqual(allowed_upload_size(None), 10 * MB)
        self.assertEqual(allowed_upload_size(SimpleNamespaceRequirement(max_file_size=1 * MB)), 10 * MB)


class SimpleNamespaceRequirement:
    def __init__(self, max_file_size, allowed_extensions=(".pdf",)):
        self.max_file_size = max_file_size
        self.allowed_extensions = list(allowed_extensions)


class LargeUploadApiTests(APITestCase):
    def setUp(self):
        category = ServiceCategory.objects.create(name_ar="عقارات", name_en="Land", slug="la-land", show_on_public_site=True)
        self.service = Service.objects.create(category=category, slug="la-permit", name_ar="رخصة بناء", name_en="Permit",
                                              description_ar="و", is_active=True, show_on_public_site=True)
        self.drawings = RequiredDocumentDefinition.objects.create(code=DRAWINGS, name_ar="المخططات الهندسية", max_file_size_mb=50)
        self.id_copy = RequiredDocumentDefinition.objects.create(code="national_id_copy", name_ar="صورة الهوية")
        for definition in (self.drawings, self.id_copy):
            _link(self.service, definition, is_required=False, allowed_extensions=[".pdf"])
        self.customer = CustomUser.objects.create_user(email="la-cust@example.test", password="x-Pass-2026!", full_name="عميل",
                                                       phone="+962791600002", role=CustomUser.Role.CUSTOMER)
        self.admin = CustomUser.objects.create_user(email="la-admin@example.test", password="x-Pass-2026!", full_name="مدير",
                                                    role=CustomUser.Role.ADMIN, is_staff=True)
        self.client = APIClient()

    def _order(self, document_type, upload):
        self.client.force_authenticate(self.customer)
        self.client.credentials(HTTP_ACCEPT_LANGUAGE="ar")
        return self.client.post("/api/orders/", {
            "service": self.service.id, "full_name": "عميل", "phone": "0791600002", "city": "عمّان", "consent": "true",
            "document_types": [document_type], "documents": [upload],
        }, format="multipart")

    def test_drawings_up_to_50_mb_are_accepted_other_documents_keep_10_mb(self):
        response = self._order(DRAWINGS, _pdf(12 * MB))
        self.assertEqual(response.status_code, 201, response.content[:500])
        document = Document.objects.get(order_id=response.json()["id"])
        self.assertEqual(document.file_size, 12 * MB)
        response = self._order("national_id_copy", _pdf(12 * MB, "id.pdf"))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["document_errors"]["national_id_copy"], "حجم الملف أكبر من الحد المسموح لهذا المستند.")

    def test_customer_upload_endpoint_uses_the_requirement_limit(self):
        self.client.force_authenticate(self.customer)
        order = Order.objects.create(customer=self.customer, service=self.service, city="عمّان")
        response = self.client.post(f"/api/customer/orders/{order.pk}/documents/",
                                    {"document_type": DRAWINGS, "file": _pdf(12 * MB)}, format="multipart")
        self.assertEqual(response.status_code, 201, response.content[:500])
        response = self.client.post(f"/api/customer/orders/{order.pk}/documents/",
                                    {"document_type": "national_id_copy", "file": _pdf(12 * MB, "id.pdf")}, format="multipart")
        self.assertEqual(response.status_code, 400)

    def test_service_detail_and_admin_api_show_the_limit(self):
        detail = self.client.get(f"/api/services/{self.service.slug}/").json()
        documents = detail.get("required_documents") or detail.get("document_requirements") or []
        sizes = {item.get("document_type") or item.get("code"): item["max_file_size"] for item in documents}
        self.assertEqual(sizes.get(DRAWINGS), 50 * MB)
        self.client.force_authenticate(self.admin)
        response = self.client.get(f"/api/admin/required-document-definitions/{self.drawings.pk}/")
        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        self.assertEqual((data["max_file_size_mb"], data["max_file_size_mb_ceiling"]), (50, 50))
        self.client.credentials(HTTP_ACCEPT_LANGUAGE="ar")
        response = self.client.patch(f"/api/admin/required-document-definitions/{self.id_copy.pk}/", {"max_file_size_mb": 60}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["max_file_size_mb"], ["لا يمكن أن يتجاوز الحد الأقصى لحجم الملف 50 ميغابايت."])
        response = self.client.patch(f"/api/admin/required-document-definitions/{self.id_copy.pk}/", {"max_file_size_mb": 20}, format="json")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["max_file_size"], 20 * MB)
        link = ServiceRequiredDocument.objects.get(service=self.service, document_type="national_id_copy")
        self.assertEqual(link.max_file_size, 20 * MB)
        response = self.client.patch(f"/api/admin/required-document-definitions/{self.id_copy.pk}/", {"max_file_size_mb": None}, format="json")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIsNone(response.json()["max_file_size_mb"])
        self.assertEqual(response.json()["max_file_size"], 10 * MB)


class ImporterDocumentTests(TestCase):
    def test_fresh_import_creates_photos_and_the_drawings_limit(self):
        sources = _sources()
        services = [sources["request-boundary-demarcation"], sources["request-building-permit"]]
        for service in services:
            service["category_slug"] = "land-and-survey"
        result = ImportResult(normalized={
            "categories": [{"slug": "land-and-survey", "name_ar": "العقارات والأراضي", "name_en": "Land and Survey", "display_order": 1}],
            "services": services,
        }, inventory_rows=[])
        apply_import(result)
        boundary = Service.objects.get(slug="request-boundary-demarcation")
        self.assertIn("site_coordinates", [field["key"] for field in boundary.required_information_schema])
        photos = boundary.document_requirements.get(document_type="site_photos", is_deleted=False)
        self.assertEqual((photos.is_required, photos.provider_can_view_file, sorted(photos.allowed_extensions)),
                         (False, True, [".jpeg", ".jpg", ".png"]))
        drawings = RequiredDocumentDefinition.objects.get(code=DRAWINGS, is_deleted=False)
        self.assertEqual((drawings.max_file_size_mb, drawings.max_file_size), (50, 50 * MB))
        link = Service.objects.get(slug="request-building-permit").document_requirements.get(document_type=DRAWINGS)
        self.assertEqual(link.max_file_size, 50 * MB)
        # A second run changes nothing.
        apply_import(result)
        self.assertEqual(boundary.document_requirements.filter(document_type="site_photos", is_deleted=False).count(), 1)
        self.assertEqual(DEVELOPER_NOTE_DOCUMENTS["request-boundary-demarcation"][0]["code"], "site_photos")


class LargeFileRequestDataTests(SimpleTestCase):
    def test_request_data_copy_keeps_temporary_files_without_copying_them(self):
        """Uploads above 2.5 MB are temporary files; copying request data used to fail with a 500."""
        from django.core.files.uploadedfile import TemporaryUploadedFile
        from django.http import QueryDict
        from django.utils.datastructures import MultiValueDict

        from documents.upload_limits import copy_request_data

        upload = TemporaryUploadedFile("drawing.pdf", "application/pdf", 3 * MB, None)
        try:
            data = QueryDict("document_type=document_3443627d36", mutable=True)
            data.update(MultiValueDict({"file": [upload]}))
            payload = copy_request_data(data)
            payload["is_final_document"] = True
            self.assertIs(payload["file"], upload)
            self.assertEqual(payload["document_type"], "document_3443627d36")
            self.assertNotIn("is_final_document", data)
        finally:
            upload.close()
