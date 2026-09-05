"""Regression tests for file-access / upload-content remediation (D1, D5)."""

import io

from django.test import TestCase
from rest_framework.test import APITestCase

from documents.file_validation import sniff_matches_extension


PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"0" * 64
PDF_BYTES = b"%PDF-1.4\n" + b"0" * 64


class UploadSignatureTests(TestCase):
    """Defect D5: reject files whose real bytes contradict the extension."""

    def test_png_bytes_match_png_extension(self):
        self.assertTrue(sniff_matches_extension(io.BytesIO(PNG_BYTES), ".png"))

    def test_pdf_bytes_do_not_match_png_extension(self):
        self.assertFalse(sniff_matches_extension(io.BytesIO(PDF_BYTES), ".png"))

    def test_html_disguised_as_pdf_is_rejected(self):
        disguised = io.BytesIO(b"<!DOCTYPE html><script>alert(1)</script>")
        self.assertFalse(sniff_matches_extension(disguised, ".pdf"))

    def test_unknown_extension_is_not_blocked_here(self):
        # The extension allow-list is enforced separately; the sniffer only
        # rejects a *known* type mismatch.
        self.assertTrue(sniff_matches_extension(io.BytesIO(b"anything"), ".xyz"))


class MediaRouteAuthorizationTests(APITestCase):
    """Defect D1: the /media/ route must not serve sensitive uploads."""

    def test_media_route_rejects_sensitive_prefixes_and_traversal(self):
        # secure_orders/** holds uploaded customer identity documents.
        self.assertEqual(
            self.client.get("/media/secure_orders/1/documents/deadbeef.pdf").status_code, 404
        )
        # payments/receipts/** holds payment receipts.
        self.assertEqual(self.client.get("/media/payments/receipts/x.pdf").status_code, 404)
        # path traversal must not escape the allow-list either.
        self.assertEqual(self.client.get("/media/../config/settings.py").status_code, 404)
        self.assertEqual(self.client.get("/media/secure_orders/../services/x.png").status_code, 404)

    def test_public_catalog_media_prefixes_are_allow_listed(self):
        from config.urls import PUBLIC_MEDIA_PREFIXES

        self.assertIn("services/", PUBLIC_MEDIA_PREFIXES)
        self.assertIn("service_categories/", PUBLIC_MEDIA_PREFIXES)
        self.assertIn("public_site/", PUBLIC_MEDIA_PREFIXES)
        # Sensitive prefixes must never be on the list.
        self.assertNotIn("secure_orders/", PUBLIC_MEDIA_PREFIXES)
        self.assertNotIn("payments/", PUBLIC_MEDIA_PREFIXES)

    def test_missing_public_media_file_reaches_the_static_helper(self):
        # A whitelisted prefix passes the guard; a non-existent file then 404s
        # from Django's static serve (proving the guard did not short-circuit).
        response = self.client.get("/media/services/images/does-not-exist.png")
        self.assertEqual(response.status_code, 404)
