from django.urls import include, path
from rest_framework.routers import DefaultRouter

from public_site.views import (
    AdminPublicPageContentAPIView,
    AdminPublicSiteThemeAPIView,
    AdvertisementAdminViewSet,
    MissingServiceRequestViewSet,
    PublicAdvertisementListAPIView,
    PublicHomepageAPIView,
    PublicMissingServiceRequestCreateAPIView,
    PublicThemeAPIView,
)

router = DefaultRouter()
router.register("admin/public-site/advertisements", AdvertisementAdminViewSet, basename="admin-public-site-advertisements")
router.register("admin/public-site/missing-service-requests", MissingServiceRequestViewSet, basename="admin-public-site-missing-service-requests")

urlpatterns = [
    path("public-site/homepage/", PublicHomepageAPIView.as_view()),
    path("public-site/theme/", PublicThemeAPIView.as_view()),
    path("public-site/advertisements/", PublicAdvertisementListAPIView.as_view()),
    path("public-site/missing-service-requests/", PublicMissingServiceRequestCreateAPIView.as_view()),
    path("admin/public-site/content/", AdminPublicPageContentAPIView.as_view()),
    path("admin/public-site/theme/", AdminPublicSiteThemeAPIView.as_view()),
    path("", include(router.urls)),
]
