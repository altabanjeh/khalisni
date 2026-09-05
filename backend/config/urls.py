from django.conf import settings
from django.contrib import admin
from django.http import Http404, JsonResponse
from django.urls import include, path, re_path
from django.views.static import serve


def healthcheck(_request):
    return JsonResponse({"status": "ok"})


# Defect D1: the previous blanket ``^media/(?P<path>.*)$`` route let anyone
# fetch ANY file under MEDIA_ROOT -- including uploaded customer identity
# documents (``secure_orders/...``) and payment receipts -- with no
# authorization, bypassing DocumentDownloadAPIView / can_user_download_document.
#
# Only genuinely public catalog and CMS media may be served by Django. Every
# other prefix (notably ``secure_orders/`` and ``payments/``) must go through an
# authenticated API endpoint, an nginx ``internal`` location + X-Accel-Redirect,
# or private object storage.
PUBLIC_MEDIA_PREFIXES = (
    "service_categories/",
    "services/",
    "public_site/",
    "organizations/branding/",
    "manual/",
)


def public_media_serve(request, path):
    normalized = str(path or "").lstrip("/")
    if ".." in normalized or not any(normalized.startswith(prefix) for prefix in PUBLIC_MEDIA_PREFIXES):
        raise Http404("Not found.")
    return serve(request, normalized, document_root=settings.MEDIA_ROOT)


urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/health/", healthcheck),
    path("api/", include("accounts.urls")),
    path("api/", include("organizations.urls")),
    path("api/", include("services.urls")),
    path("api/", include("orders.urls")),
    path("api/", include("providers.urls")),
    path("api/", include("reports.urls")),
    path("api/", include("audit.urls")),
    path("api/", include("documents.urls")),
    path("api/", include("notifications.urls")),
    path("api/", include("payment.urls")),
    path("api/", include("public_site.urls")),
    path("api/", include("help_guides.urls")),
    # Public catalog/CMS media only. Sensitive uploads are served exclusively
    # through their authenticated API endpoints.
    re_path(r"^media/(?P<path>.*)$", public_media_serve),
]
