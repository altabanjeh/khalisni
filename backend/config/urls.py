from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.views.static import serve


def healthcheck(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
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
    # Serve uploaded media files for all environments.
    # For high-traffic deployments replace this with nginx or object storage.
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]
