"""Build identity endpoint: ``GET /api/health/version/``.

Returns only the commit the running image was built from and when it was
built, so an operator can confirm which release is live:

    {"sha": "fa5a19b", "built_at": "2026-11-01T10:00:00Z"}

Both values come from ``BUILD_SHA`` / ``BUILD_TIME``, baked into the image as
Docker build arguments (``backend/Dockerfile``) and read in settings
(``KHALSNI_BUILD_SHA`` / ``KHALSNI_BUILD_TIME``). Anything that is not a plain
hex commit id or timestamp is reported as ``"unknown"``; no other setting,
version string or environment value is ever exposed.
"""

import re

from django.conf import settings
from django.http import JsonResponse
from django.urls import path
from django.views.decorators.http import require_GET

UNKNOWN = "unknown"
_SHA = re.compile(r"^[0-9a-f]{7,40}$")
_TIME = re.compile(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?(Z|[+-][0-9]{2}:?[0-9]{2})$")
# Long enough to stay unique in this repository, short enough to read aloud.
SHA_LENGTH = 12


def build_sha():
    value = str(getattr(settings, "KHALSNI_BUILD_SHA", "") or "").strip().lower()
    return value[:SHA_LENGTH] if _SHA.match(value) else UNKNOWN


def build_time():
    value = str(getattr(settings, "KHALSNI_BUILD_TIME", "") or "").strip()
    return value if _TIME.match(value) else UNKNOWN


@require_GET
def build_version(_request):
    response = JsonResponse({"sha": build_sha(), "built_at": build_time()})
    response["Cache-Control"] = "no-store"
    return response


# Mounted with include() at api/health/version/ in config/urls.py.
urlpatterns = [path("", build_version, name="health-version")]
