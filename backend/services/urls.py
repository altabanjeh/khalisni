from django.urls import include, path
from rest_framework.routers import DefaultRouter

from services.views import (
    AddressAdminViewSet,
    CategoryAdminViewSet,
    RequiredDocumentAdminViewSet,
    ServiceAdminViewSet,
    ServiceCategoryListAPIView,
    ServiceDetailAPIView,
    ServiceListAPIView,
    ServiceProviderAssignmentAdminViewSet,
    ServiceRelationAdminViewSet,
)

router = DefaultRouter()
router.register("admin/services", ServiceAdminViewSet, basename="admin-services")
router.register("admin/categories", CategoryAdminViewSet, basename="admin-categories")
router.register("admin/service-documents", RequiredDocumentAdminViewSet, basename="admin-service-documents")
router.register("admin/service-relations", ServiceRelationAdminViewSet, basename="admin-service-relations")
router.register("admin/service-provider-assignments", ServiceProviderAssignmentAdminViewSet, basename="admin-service-provider-assignments")
router.register("admin/addresses", AddressAdminViewSet, basename="admin-addresses")

urlpatterns = [
    path("services/", ServiceListAPIView.as_view()),
    path("services/categories/", ServiceCategoryListAPIView.as_view()),
    path("services/<slug:slug>/", ServiceDetailAPIView.as_view()),
    path("", include(router.urls)),
]
