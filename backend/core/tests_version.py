"""GET /api/health/version/ reports only the build SHA and time (deployed-SHA verification)."""

from django.test import SimpleTestCase, override_settings


class BuildVersionEndpointTests(SimpleTestCase):
    @override_settings(KHALSNI_BUILD_SHA="F35A640ABCDEF0123456789", KHALSNI_BUILD_TIME="2026-11-01T10:00:00Z")
    def test_reports_short_sha_and_time_uncached(self):
        response = self.client.get("/api/health/version/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"sha": "f35a640abcde", "built_at": "2026-11-01T10:00:00Z"})
        self.assertEqual(response["Cache-Control"], "no-store")

    @override_settings(KHALSNI_BUILD_SHA="main; rm -rf /", KHALSNI_BUILD_TIME="yesterday")
    def test_anything_else_is_unknown(self):
        self.assertEqual(self.client.get("/api/health/version/").json(), {"sha": "unknown", "built_at": "unknown"})

    def test_only_get(self):
        self.assertEqual(self.client.post("/api/health/version/").status_code, 405)
