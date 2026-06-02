from django.urls import include, path
from rest_framework.routers import DefaultRouter

from help_guides.views import (
    HelpGuideActionAdminViewSet,
    HelpGuideActionsAPIView,
    HelpGuideCurrentAPIView,
    HelpGuideFieldAdminViewSet,
    HelpGuideFieldsAPIView,
    HelpGuideMetadataAPIView,
    HelpGuideSearchAPIView,
    HelpGuideServiceAPIView,
    HelpGuideServiceAdminViewSet,
    HelpGuideViewSet,
    HelpGuideWorkflowAdminViewSet,
    HelpGuideWorkflowsAPIView,
)

router = DefaultRouter()
router.register("help", HelpGuideViewSet, basename="help-guides")

admin_router = DefaultRouter()
admin_router.register("help/admin/screens", HelpGuideViewSet, basename="admin-help-screens")
admin_router.register("help/admin/actions", HelpGuideActionAdminViewSet, basename="admin-help-actions")
admin_router.register("help/admin/fields", HelpGuideFieldAdminViewSet, basename="admin-help-fields")
admin_router.register("help/admin/services", HelpGuideServiceAdminViewSet, basename="admin-help-services")
admin_router.register("help/admin/workflows", HelpGuideWorkflowAdminViewSet, basename="admin-help-workflows")

urlpatterns = [
    path("help/current/", HelpGuideCurrentAPIView.as_view(), name="help-current"),
    path("help/fields/", HelpGuideFieldsAPIView.as_view(), name="help-fields"),
    path("help/actions/", HelpGuideActionsAPIView.as_view(), name="help-actions"),
    path("help/services/<int:service_id>/", HelpGuideServiceAPIView.as_view(), name="help-service"),
    path("help/workflows/", HelpGuideWorkflowsAPIView.as_view(), name="help-workflows"),
    path("help/search/", HelpGuideSearchAPIView.as_view(), name="help-search"),
    path("help/metadata/", HelpGuideMetadataAPIView.as_view(), name="help-metadata"),
    path("", include(admin_router.urls)),
    path("", include(router.urls)),
]
