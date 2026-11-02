"""Total closure pass (Stream B): D05 contact source, D06 versioned legal documents,
retention policy, brand strings in emails."""

import importlib
import shutil
import tempfile
from datetime import timedelta
from io import StringIO
from pathlib import Path

from django.apps import apps as django_apps
from django.conf import settings
from django.core.checks import run_checks
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import CommandError, call_command
from django.db import IntegrityError, transaction
from django.template.loader import render_to_string
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from accounts.password_reset import EMAIL_SUBJECTS
from audit.models import AuditLog
from documents.models import Document
from documents.services import create_order_document
from notifications.models import Notification
from orders.models import Order, OrderConsent
from public_site.contact_checks import contact_placeholder_findings, is_placeholder_email, is_placeholder_phone
from public_site.defaults import DEFAULT_PUBLIC_PAGE_CONTENT
from public_site.models import LegalDocument, PublicPageContent, SiteTheme
from services.models import Service, ServiceCategory

SEEDED = "2026-11-01-draft"
CONTRACT_KEYS = {"kind", "version", "effective_date", "title_ar", "title_en", "body_ar", "body_en", "approval_status", "updated_at"}
PDF = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
OLD_BRAND = ("خلّصني", "Khalisni")


def content_row(**overrides):
    values = {**DEFAULT_PUBLIC_PAGE_CONTENT, "version_name": "Total closure", "active_content": True}
    values.update(overrides)
    return PublicPageContent.objects.create(**values)


def make_admin(email="tc-admin@example.org", phone="0791700001"):
    return CustomUser.objects.create_user(
        email=email, password="Password@123", full_name="Admin", phone=phone,
        role=CustomUser.Role.ADMIN, is_staff=True, is_superuser=True,
    )


class PublicLegalApiContractTests(APITestCase):
    def test_seeded_bilingual_drafts_are_published_and_flagged_as_drafts(self):
        response = self.client.get("/api/public-site/legal/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(set(data), {"privacy", "terms"})
        for kind in ("privacy", "terms"):
            document = data[kind]
            self.assertEqual(set(document), CONTRACT_KEYS)
            self.assertEqual(document["kind"], kind)
            self.assertEqual(document["version"], SEEDED)
            self.assertEqual(document["effective_date"], "2026-11-01")
            self.assertEqual(document["approval_status"], "draft_requires_approval")
            for field in ("title_ar", "title_en", "body_ar", "body_en"):
                self.assertTrue(document[field].strip(), field)
            for text in (document["body_ar"], document["body_en"], document["title_ar"], document["title_en"]):
                for old in OLD_BRAND:
                    self.assertNotIn(old, text)

    def test_seeded_texts_promise_no_unimplemented_behaviour(self):
        privacy = LegalDocument.objects.get(kind="privacy", version=SEEDED)
        # Retention periods are not invented: they are left to the operator's configuration.
        self.assertIn("configuration", privacy.body_en)
        self.assertIn("إعدادات النظام", privacy.body_ar)
        self.assertIn("does not take online payments", privacy.body_en)
        self.assertIn("notifications inside your account", privacy.body_en)
        self.assertIn("does not offer self-service account deletion", privacy.body_en)
        for claim in ("we never sell", "we do not sell", "GDPR", "encrypted at rest"):
            self.assertNotIn(claim.lower(), privacy.body_en.lower())

    def test_detail_contract_and_404s(self):
        response = self.client.get("/api/public-site/legal/terms/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.json()), CONTRACT_KEYS)
        self.assertEqual(response.json()["kind"], "terms")
        self.assertEqual(self.client.get("/api/public-site/legal/cookies/").status_code, 404)
        LegalDocument.objects.filter(kind="terms").update(is_published=False)
        self.assertEqual(self.client.get("/api/public-site/legal/terms/").status_code, 404)
        data = self.client.get("/api/public-site/legal/").json()
        self.assertIsNone(data["terms"])
        self.assertEqual(data["privacy"]["version"], SEEDED)

    def test_an_unpublished_draft_is_never_public(self):
        LegalDocument.objects.create(
            kind="privacy", version="next", effective_date="2027-01-01", title_ar="خصوصية", title_en="Privacy",
            body_ar="نص غير منشور", body_en="Unpublished text",
        )
        self.assertEqual(self.client.get("/api/public-site/legal/privacy/").json()["version"], SEEDED)


class OnePublishedPerKindTests(TestCase):
    def test_database_allows_only_one_published_version_per_kind(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            LegalDocument.objects.bulk_create([
                LegalDocument(kind="privacy", version="dup", effective_date="2027-01-01", title_ar="a", title_en="a",
                              body_ar="a", body_en="a", is_published=True, published_at=timezone.now()),
            ])

    def test_publish_replaces_the_previous_version_and_keeps_it(self):
        newer = LegalDocument.objects.create(kind="privacy", version="v2", effective_date="2027-01-01", title_ar="a",
                                             title_en="a", body_ar="a", body_en="a")
        newer.publish()
        self.assertEqual(LegalDocument.objects.filter(kind="privacy", is_published=True).get().version, "v2")
        old = LegalDocument.objects.get(kind="privacy", version=SEEDED)
        self.assertFalse(old.is_published)
        self.assertIsNotNone(old.published_at)
        self.assertEqual(LegalDocument.objects.filter(kind="terms", is_published=True).get().version, SEEDED)

    def test_version_label_is_unique_per_kind(self):
        with self.assertRaises(Exception):
            LegalDocument.objects.create(kind="terms", version=SEEDED, effective_date="2026-11-01", title_ar="a",
                                         title_en="a", body_ar="a", body_en="a")


class AdminLegalDocumentApiTests(APITestCase):
    url = "/api/admin/public-site/legal-documents/"

    def setUp(self):
        self.admin = make_admin()
        self.customer = CustomUser.objects.create_user(
            email="tc-customer@example.org", password="Password@123", full_name="Customer", phone="0791700002",
            role=CustomUser.Role.CUSTOMER,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def new_version(self, **overrides):
        payload = {
            "kind": "privacy", "version": "2027-01-01", "effective_date": "2027-01-01",
            "title_ar": "سياسة الخصوصية", "title_en": "Privacy Policy", "body_ar": "نص النسخة الجديدة",
            "body_en": "New version text",
        }
        payload.update(overrides)
        return self.client.post(self.url, payload, format="json")

    def test_only_admins_manage_versions(self):
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get(self.url).status_code, 403)
        self.assertEqual(self.new_version().status_code, 403)

    def test_create_edit_publish_flow_keeps_old_versions_read_only(self):
        created = self.new_version()
        self.assertEqual(created.status_code, 201, created.content)
        body = created.json()
        self.assertEqual(body["approval_status"], "draft_requires_approval")
        self.assertFalse(body["is_published"])
        self.assertTrue(body["is_editable"])
        pk = body["legal_document_id"]
        self.assertEqual(self.client.get("/api/public-site/legal/privacy/").json()["version"], SEEDED)

        edited = self.client.patch(f"{self.url}{pk}/", {"body_en": "Edited text"}, format="json")
        self.assertEqual(edited.status_code, 200, edited.content)

        published = self.client.post(f"{self.url}{pk}/publish/")
        self.assertEqual(published.status_code, 200, published.content)
        public = self.client.get("/api/public-site/legal/privacy/").json()
        self.assertEqual((public["version"], public["body_en"]), ("2027-01-01", "Edited text"))

        # The published version and the previous one are read-only.
        self.assertEqual(self.client.patch(f"{self.url}{pk}/", {"body_en": "x"}, format="json").status_code, 400)
        seeded = LegalDocument.objects.get(kind="privacy", version=SEEDED)
        self.assertEqual(self.client.patch(f"{self.url}{seeded.pk}/", {"body_en": "x"}, format="json").status_code, 400)
        self.assertEqual(self.client.post(f"{self.url}{seeded.pk}/publish/").status_code, 400)
        self.assertEqual(self.client.delete(f"{self.url}{seeded.pk}/").status_code, 405)
        self.assertEqual(LegalDocument.objects.filter(kind="privacy").count(), 2)
        actions = set(AuditLog.objects.filter(entity_type="LegalDocument").values_list("action", flat=True))
        self.assertEqual(actions, {"create_legal_document_version", "update_legal_document_version", "publish_legal_document_version"})

    def test_duplicate_version_label_is_refused(self):
        response = self.new_version(version=SEEDED)
        self.assertEqual(response.status_code, 400)
        self.assertIn("version", response.json())

    def test_approval_needs_a_recorded_reference_and_stamps_who_and_when(self):
        refused = self.new_version(approval_status="approved")
        self.assertEqual(refused.status_code, 400)
        self.assertIn("approval_note", refused.json())
        approved = self.new_version(approval_status="approved", approval_note="Owner written approval, ref QA-1")
        self.assertEqual(approved.status_code, 201, approved.content)
        document = LegalDocument.objects.get(pk=approved.json()["legal_document_id"])
        self.assertEqual(document.approved_by, self.admin)
        self.assertIsNotNone(document.approved_at)
        self.assertFalse(document.is_draft)


class ContactSourceAndHoursTests(APITestCase):
    def test_hours_fields_are_served_and_editable(self):
        content_row(office_hours_ar="الأحد - الخميس", office_hours_en="Sunday - Thursday")
        data = self.client.get("/api/public-site/homepage/").json()["content"]
        self.assertEqual((data["office_hours_ar"], data["office_hours_en"]), ("الأحد - الخميس", "Sunday - Thursday"))
        admin = make_admin()
        self.client.force_authenticate(admin)
        current = self.client.get("/api/admin/public-site/content/").json()
        payload = {key: value for key, value in current.items() if value is not None and key not in {"hero_image", "hero_image_url"}}
        saved = self.client.put("/api/admin/public-site/content/", {**payload, "office_hours_en": "Sun-Thu"}, format="json")
        self.assertEqual(saved.status_code, 200, saved.content)
        self.assertEqual(PublicPageContent.objects.get(active_content=True).office_hours_en, "Sun-Thu")

    def test_the_retired_site_contact_setting_is_not_a_second_source(self):
        from accounts.serializers import RETIRED_SYSTEM_SETTINGS, SAFE_SYSTEM_SETTINGS

        self.assertIn("site.contact", RETIRED_SYSTEM_SETTINGS)
        self.assertNotIn("site.contact", SAFE_SYSTEM_SETTINGS)

    def test_defaults_hold_no_contact_values(self):
        for field in ("contact_phone", "whatsapp_number", "email", "office_address", "office_address_en"):
            self.assertEqual(DEFAULT_PUBLIC_PAGE_CONTENT[field], "")


class ContactPlaceholderMigrationTests(TestCase):
    migration = importlib.import_module("public_site.migrations.0010_remove_contact_placeholders_and_old_brand")

    def run_migration(self):
        self.migration.forwards(django_apps, None)

    def test_known_placeholders_are_blanked_real_values_kept_and_rerun_is_a_no_op(self):
        fake = content_row(
            version_name="Sample data", active_content=False,
            contact_phone="+962 6 560 9000", whatsapp_number="+962 79 000 0000", email="support@khalisni.local",
            office_address="عمان - الشميساني، شارع الملكة نور، مبنى خلصني للخدمات",
            office_address_en="Amman - Shmeisani, Queen Noor Street, Khalisni Services Building",
        )
        real = content_row(
            contact_phone="+962 6 552 7381", whatsapp_number="+962 79 552 7381", email="support@khalsni.jo",
            office_address="عمّان، جبل عمّان", office_address_en="Amman, Jabal Amman",
        )
        PublicPageContent.objects.filter(pk=fake.pk).update(
            footer_text="Khalisni منصة أردنية لإدارة طلبات الخدمات الحكومية والإدارية.",
            footer_text_en="Khalisni is a Jordanian platform. Visit khalisni.com or write to info@khalisni.com.",
            hero_subtitle_ar="فريق خلّصني جاهز.",
        )
        swapped = content_row(version_name="Swapped sample", active_content=False, contact_phone="+962790000000")
        theme = SiteTheme.objects.create(
            name="Default Khalisni Theme", primary_color="#000000", secondary_color="#000000", background_color="#ffffff",
            text_color="#000000", header_background_color="#ffffff", footer_background_color="#000000",
        )
        self.run_migration()
        fake.refresh_from_db()
        for field in ("contact_phone", "whatsapp_number", "email", "office_address", "office_address_en"):
            self.assertEqual(getattr(fake, field), "", field)
        self.assertEqual(fake.footer_text, "خلصني منصة أردنية لإدارة طلبات الخدمات الحكومية والإدارية.")
        # Brand word renamed in visible text; domain and email address untouched.
        self.assertEqual(fake.footer_text_en, "Khalsni is a Jordanian platform. Visit khalisni.com or write to info@khalisni.com.")
        self.assertEqual(fake.hero_subtitle_ar, "فريق خلصني جاهز.")
        swapped.refresh_from_db()
        self.assertEqual(swapped.contact_phone, "")
        theme.refresh_from_db()
        self.assertEqual(theme.name, "Default Khalsni Theme")
        before = PublicPageContent.objects.values().get(pk=real.pk)
        self.assertEqual(before["email"], "support@khalsni.jo")
        self.assertEqual(before["office_address_en"], "Amman, Jabal Amman")
        self.run_migration()  # idempotent
        self.assertEqual(PublicPageContent.objects.values().get(pk=real.pk), before)
        fake_after = PublicPageContent.objects.values().get(pk=fake.pk)
        self.run_migration()
        self.assertEqual(PublicPageContent.objects.values().get(pk=fake.pk), fake_after)


class PlaceholderDeployCheckTests(TestCase):
    def ids(self):
        return {message.id for message in run_checks(include_deployment_checks=True)}

    def test_placeholder_rules(self):
        for address in ("support@khalisni.local", "info@example.com", "x@khalsni.example.com", "a@example.org"):
            self.assertTrue(is_placeholder_email(address), address)
        self.assertFalse(is_placeholder_email("support@khalsni.jo"))
        for number in ("0790000000", "+962 79 000 0000", "0791234567", "+962 6 560 9000", "1111111"):
            self.assertTrue(is_placeholder_phone(number), number)
        self.assertFalse(is_placeholder_phone("+962 6 552 7381"))

    def test_deploy_check_rejects_placeholders_in_published_contact(self):
        content_row(contact_phone="0790000000", email="support@khalsni.example.com", office_address="مبنى خلصني للخدمات")
        findings = {field for field, _value, _reason in contact_placeholder_findings(PublicPageContent.objects.get(active_content=True))}
        self.assertEqual(findings, {"contact_phone", "email", "office_address"})
        self.assertIn("khalsni.E002", self.ids())

    def test_deploy_check_passes_for_real_or_blank_values(self):
        content_row(contact_phone="+962 6 552 7381", email="support@khalsni.jo", office_hours_en="Sun-Thu 9:00-17:00")
        self.assertNotIn("khalsni.E002", self.ids())
        PublicPageContent.objects.all().delete()
        self.assertNotIn("khalsni.E002", self.ids())


class StrictPublicContentReportTests(TestCase):
    def report(self, *args):
        out = StringIO()
        call_command("check_public_content", *args, stdout=out)
        return out.getvalue()

    def test_draft_legal_documents_hours_and_placeholders_are_open_items(self):
        content_row(contact_phone="0790000000")
        output = self.report()
        self.assertIn("D06 approved privacy policy text is missing", output)
        self.assertIn("D06 approved terms of use text is missing", output)
        self.assertIn("D05 office_hours_ar is blank", output)
        self.assertIn("D05 contact_phone holds a placeholder value", output)
        with self.assertRaises(CommandError):
            self.report("--strict")


class BrandStringTests(TestCase):
    def test_email_templates_and_subjects_use_the_approved_brand(self):
        context = {"full_name": "QA", "reset_link": "https://khalisni.com/reset-password/x"}
        texts = [
            render_to_string(f"accounts/email/{name}_{language}.txt", context)
            for name in ("password_reset", "password_changed") for language in ("ar", "en")
        ]
        texts += [subject for subjects in EMAIL_SUBJECTS.values() for subject in subjects.values()]
        for text in texts:
            for old in OLD_BRAND:
                self.assertNotIn(old, text)
        self.assertIn("خلصني", texts[0])
        self.assertIn("Khalsni", texts[1])


class RetentionTests(TestCase):
    def setUp(self):
        self.media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        override = override_settings(MEDIA_ROOT=self.media)
        override.enable()
        self.addCleanup(override.disable)
        self.customer = CustomUser.objects.create_user(
            email="tc-ret@example.org", password="Password@123", full_name="Customer", phone="0791700003",
            role=CustomUser.Role.CUSTOMER,
        )
        category = ServiceCategory.objects.create(name_ar="تصنيف", name_en="Category", slug="tc-ret-category")
        service = Service.objects.create(category=category, name_ar="خدمة", name_en="Service", slug="tc-ret-service", description_ar="وصف")
        self.old = timezone.now() - timedelta(days=400)
        self.closed = Order.objects.create(customer=self.customer, service=service, city="Amman")
        Order.objects.filter(pk=self.closed.pk).update(status=Order.Status.COMPLETED, completed_at=self.old, updated_at=self.old)
        self.open = Order.objects.create(customer=self.customer, service=service, city="Amman")
        self.closed_doc = self.document(self.closed, "closed.pdf")
        self.open_doc = self.document(self.open, "open.pdf")
        OrderConsent.objects.create(order=self.closed, customer=self.customer, accepted=True, consent_version="v", source="web")
        self.old_read = Notification.objects.create(recipient=self.customer, title="t", message="m", is_read=True, read_at=self.old, sent_at=self.old)
        self.old_unread = Notification.objects.create(recipient=self.customer, title="t", message="m")
        self.recent_read = Notification.objects.create(recipient=self.customer, title="t", message="m", is_read=True, read_at=timezone.now(), sent_at=timezone.now())
        Notification.objects.filter(pk__in=[self.old_read.pk, self.old_unread.pk]).update(created_at=self.old)
        old_log = AuditLog.objects.create(action="login", entity_type="User", entity_id="1")
        AuditLog.objects.filter(pk=old_log.pk).update(created_at=self.old)

    def document(self, order, name):
        return create_order_document(
            order=order, uploaded_by=self.customer, document_type="id",
            file_obj=SimpleUploadedFile(name, PDF, content_type="application/pdf"),
        )

    def snapshot(self):
        return {
            "documents": list(Document._base_manager.order_by("pk").values_list("pk", "file", "is_deleted")),
            "notifications": list(Notification.objects.order_by("pk").values_list("pk", flat=True)),
            "audit": AuditLog.objects.count(),
            "orders": Order.objects.count(),
            "consents": OrderConsent.objects.count(),
        }

    def retention(self, *args):
        out = StringIO()
        call_command("retention_report", *args, stdout=out)
        return out.getvalue()

    def configure(self, **values):
        policy = {key: None for key in ("documents_days", "completed_orders_days", "accounts_days", "notifications_days", "audit_logs_days", "backups_keep")}
        policy.update(values)
        override = override_settings(KHALSNI_RETENTION=policy)
        override.enable()
        self.addCleanup(override.disable)

    def test_unconfigured_policy_is_shown_and_nothing_is_purged_even_with_apply(self):
        self.configure()
        output = self.retention("--show-policy")
        self.assertIn("KHALSNI_RETENTION_DOCUMENTS_DAYS = not configured", output)
        self.assertIn("KHALSNI_BACKUP_KEEP = not configured", output)
        before = self.snapshot()
        self.retention("--apply")
        after = self.snapshot()
        self.assertEqual(after["documents"], before["documents"])
        self.assertEqual(after["notifications"], before["notifications"])
        self.assertEqual(after["audit"], before["audit"] + 1)  # the apply run itself is audited
        self.assertTrue(AuditLog.objects.filter(action="apply_retention_policy").exists())

    def test_dry_run_changes_nothing_even_when_every_category_is_configured(self):
        self.configure(documents_days=30, completed_orders_days=30, accounts_days=30, notifications_days=30, audit_logs_days=30, backups_keep=7)
        before = self.snapshot()
        output = self.retention()
        self.assertIn("DRY RUN", output)
        self.assertIn("documents: 1 stored document file(s)", output)
        self.assertIn("notifications: 1 read notification(s)", output)
        self.assertEqual(self.snapshot(), before)
        self.assertFalse(AuditLog.objects.filter(action="apply_retention_policy").exists())

    def test_apply_touches_only_configured_categories_and_never_orders_or_consent(self):
        self.configure(notifications_days=30)
        self.retention("--apply")
        remaining = set(Notification.objects.values_list("pk", flat=True))
        self.assertEqual(remaining, {self.old_unread.pk, self.recent_read.pk})
        # documents and audit logs are not configured: untouched.
        self.closed_doc.refresh_from_db()
        self.assertTrue(self.closed_doc.file.name)
        self.assertFalse(self.closed_doc.is_deleted)
        self.assertTrue(AuditLog.objects.filter(action="login").exists())
        self.assertEqual(Order.objects.count(), 2)
        self.assertEqual(OrderConsent.objects.count(), 1)

    def test_document_apply_removes_old_closed_order_files_and_keeps_rows(self):
        self.configure(documents_days=30, completed_orders_days=30, accounts_days=1)
        stored = Path(self.closed_doc.file.path)
        self.assertTrue(stored.exists())
        output = self.retention("--apply")
        self.assertIn("applied to 1", output)
        row = Document._base_manager.get(pk=self.closed_doc.pk)
        self.assertEqual(row.file.name, "")
        self.assertTrue(row.is_deleted)
        self.assertEqual(row.original_filename, "closed.pdf")
        self.assertFalse(stored.exists())
        open_row = Document._base_manager.get(pk=self.open_doc.pk)
        self.assertTrue(open_row.file.name)
        self.assertFalse(open_row.is_deleted)
        self.assertEqual(Order.objects.count(), 2)  # never deleted, not anonymised
        self.assertTrue(CustomUser.objects.filter(pk=self.customer.pk, is_active=True).exists())
        self.assertEqual(OrderConsent.objects.count(), 1)
        log = AuditLog.objects.get(action="apply_retention_policy")
        self.assertEqual(log.new_values["results"]["documents"]["ids"], [self.closed_doc.pk])
        self.assertEqual(log.new_values["results"]["completed_orders"]["applied"], 0)


class LegalEvidenceFilesTests(TestCase):
    evidence = Path(settings.BASE_DIR).parent / "docs" / "audit" / "evidence" / "khalsni-total-closure-2026-11-01" / "legal"

    def test_evidence_copies_match_the_seeded_drafts(self):
        if not self.evidence.exists():
            self.skipTest("docs/ is not available in this checkout")
        for kind, filename in (("privacy", "privacy_draft.md"), ("terms", "terms_draft.md")):
            text = (self.evidence / filename).read_text(encoding="utf-8")
            self.assertIn("REQUIRES OWNER/LEGAL CONTENT APPROVAL BEFORE PRODUCTION", text)
            document = LegalDocument.objects.get(kind=kind, version=SEEDED)
            self.assertIn(document.body_ar, text)
            self.assertIn(document.body_en, text)


class ArabicLegalTerminologyTests(TestCase):
    """Loose-end closure 2026-11-02: the Arabic privacy draft explains technical
    abbreviations at their first occurrence; the legal meaning is unchanged and
    the version is still an unapproved draft."""

    def test_arabic_privacy_explains_ip_and_sms(self):
        privacy = LegalDocument.objects.get(kind="privacy", version=SEEDED)
        self.assertIn("عنوان بروتوكول الإنترنت (IP)", privacy.body_ar)
        self.assertIn("الرسائل النصية القصيرة (SMS)", privacy.body_ar)
        self.assertNotIn("وعنوان IP المستخدم", privacy.body_ar)
        first_ip = privacy.body_ar.index("IP")
        self.assertTrue(privacy.body_ar[:first_ip].endswith("بروتوكول الإنترنت ("))
        self.assertEqual(privacy.approval_status, "draft_requires_approval")
        # The English text keeps its own wording.
        self.assertIn("IP address", privacy.body_en)
