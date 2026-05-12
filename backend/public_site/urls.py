from django.urls import include, path
from rest_framework.routers import DefaultRouter

from public_site.views import (
    AdminPublicPageContentAPIView,
    AdminPublicSiteThemeAPIView,
    AdvertisementAdminViewSet,
    PublicAdvertisementListAPIView,
    PublicHomepageAPIView,
    PublicThemeAPIView,
)

router = DefaultRouter()
router.register("admin/public-site/advertisements", AdvertisementAdminViewSet, basename="admin-public-site-advertisements")

urlpatterns = [
    path("public-site/homepage/", PublicHomepageAPIView.as_view()),
    path("public-site/theme/", PublicThemeAPIView.as_view()),
    path("public-site/advertisements/", PublicAdvertisementListAPIView.as_view()),
    path("admin/public-site/content/", AdminPublicPageContentAPIView.as_view()),
    path("admin/public-site/theme/", AdminPublicSiteThemeAPIView.as_view()),
    path("", include(router.urls)),
]

