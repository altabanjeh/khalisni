"""Total closure (D06): consent statement v2 shared by web and mobile, and the
legal document versions recorded with each accepted order consent."""

from django.db import IntegrityError, connection, transaction

from orders.consent import CONSENT_TEXTS
from orders.models import Order, OrderConsent
from orders.tests_owner_decisions import OwnerDecisionBase
from public_site.models import LegalDocument

SEEDED = "2026-11-01-draft"
V2_AR = "أوافق على شروط الاستخدام وسياسة الخصوصية، وعلى استخدام بياناتي ومستنداتي لإنجاز هذه الخدمة فقط وإشعاري بأي نواقص."
V2_EN = (
    "I agree to the Terms of Use and the Privacy Policy, and that my details and documents are used only to "
    "complete this service and to notify me of anything missing."
)


class ConsentV2Tests(OwnerDecisionBase):
    def submit(self, *, language="ar", **fields):
        payload = {"service": self.service.pk, "full_name": "Customer", "phone": "0791200001", "city": "Amman", **fields}
        return self.as_user(self.customer, language).post("/api/orders/", payload, format="multipart")

    def test_v2_statements_have_the_same_meaning_on_web_and_mobile_and_v1_is_kept(self):
        self.assertEqual(CONSENT_TEXTS["order-consent-web-v2"], {"ar": V2_AR, "en": V2_EN})
        self.assertEqual(CONSENT_TEXTS["order-consent-mobile-v2"], {"ar": V2_AR, "en": V2_EN})
        self.assertIn("order-consent-web-v1", CONSENT_TEXTS)
        self.assertIn("order-consent-mobile-v1", CONSENT_TEXTS)

    def test_web_v2_records_published_legal_versions_and_consent_type(self):
        response = self.submit(language="en", consent="true", consent_version="order-consent-web-v2", consent_source="web")
        self.assertEqual(response.status_code, 201, response.data)
        record = OrderConsent.objects.get(order_id=response.data["id"])
        self.assertEqual(record.consent_text, V2_EN)
        self.assertEqual(record.language, "en")
        self.assertEqual(record.consent_type, "order_submission")
        self.assertEqual(record.privacy_version, SEEDED)
        self.assertEqual(record.terms_version, SEEDED)
        for user, url in ((self.employee, f"/api/admin/orders/{record.order_id}/"), (self.customer, f"/api/customer/orders/{record.order_id}/")):
            consent = self.as_user(user).get(url).data["consent"]
            self.assertEqual(consent["status"], "recorded")
            self.assertEqual(consent["version"], "order-consent-web-v2")
            self.assertEqual(consent["consent_type"], "order_submission")
            self.assertEqual(consent["privacy_version"], SEEDED)
            self.assertEqual(consent["terms_version"], SEEDED)

    def test_mobile_v2_records_the_same_meaning(self):
        response = self.submit(consent="true", consent_version="order-consent-mobile-v2", consent_source="mobile")
        self.assertEqual(response.status_code, 201, response.data)
        record = OrderConsent.objects.get(order_id=response.data["id"])
        self.assertEqual((record.consent_text, record.source), (V2_AR, "mobile"))
        self.assertEqual((record.privacy_version, record.terms_version), (SEEDED, SEEDED))

    def test_versions_follow_the_published_document_at_submission_time(self):
        newer = LegalDocument.objects.create(
            kind="terms", version="2026-12-01", effective_date="2026-12-01", title_ar="شروط", title_en="Terms",
            body_ar="نص", body_en="Text",
        )
        newer.publish()
        response = self.submit(consent="true", consent_version="order-consent-web-v2", consent_source="web")
        record = OrderConsent.objects.get(order_id=response.data["id"])
        self.assertEqual((record.privacy_version, record.terms_version), (SEEDED, "2026-12-01"))

    def test_blank_versions_when_nothing_is_published(self):
        LegalDocument.objects.update(is_published=False)
        response = self.submit(consent="true", consent_version="order-consent-web-v2", consent_source="web")
        self.assertEqual(response.status_code, 201, response.data)
        record = OrderConsent.objects.get(order_id=response.data["id"])
        self.assertEqual((record.privacy_version, record.terms_version, record.consent_type), ("", "", "order_submission"))

    def test_append_only_triggers_still_refuse_raw_update_and_delete_after_the_new_columns(self):
        if connection.vendor not in {"sqlite", "postgresql"}:
            self.skipTest("No append-only trigger dialect for this database.")
        response = self.submit(consent="true", consent_version="order-consent-web-v2", consent_source="web")
        record = OrderConsent.objects.get(order_id=response.data["id"])
        table = OrderConsent._meta.db_table
        statements = (
            (f"UPDATE {table} SET privacy_version = %s", ["forged"]),
            (f"UPDATE {table} SET terms_version = %s WHERE consent_id = %s", ["forged", record.pk]),
            (f"DELETE FROM {table} WHERE consent_id = %s", [record.pk]),
        )
        for sql, params in statements:
            with self.assertRaises(IntegrityError), transaction.atomic(), connection.cursor() as cursor:
                cursor.execute(sql, params)
        record.refresh_from_db()
        self.assertEqual((record.privacy_version, record.terms_version), (SEEDED, SEEDED))
        self.assertTrue(Order.objects.filter(pk=record.order_id).exists())
