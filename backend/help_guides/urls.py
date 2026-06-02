from django.urls import include, path
from rest_framework.routers import DefaultRouter

from help_guides.views import HelpGuideCurrentAPIView, HelpGuideMetadataAPIView, HelpGuideViewSet

router = DefaultRouter()
router.register("help", HelpGuideViewSet, basename="help-guides")

urlpatterns = [
    path("help/current/", HelpGuideCurrentAPIView.as_view(), name="help-current"),
    path("help/metadata/", HelpGuideMetadataAPIView.as_view(), name="help-metadata"),
    path("", include(router.urls)),
]
