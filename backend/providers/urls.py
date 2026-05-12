from django.urls import include, path
from rest_framework.routers import DefaultRouter

from providers.views import (
    ProviderAdminViewSet,
    ProviderDashboardAPIView,
    ProviderFinalDocumentAPIView,
    ProviderOrderDetailAPIView,
    ProviderOrderListAPIView,
    ProviderOrderNoteAPIView,
    ProviderOrderStatusAPIView,
)

router = DefaultRouter()
router.register("admin/providers", ProviderAdminViewSet, basename="admin-providers")

urlpatterns = [
    path("", include(router.urls)),
    path("provider/dashboard/", ProviderDashboardAPIView.as_view()),
    path("provider/orders/", ProviderOrderListAPIView.as_view()),
    path("provider/orders/<int:pk>/", ProviderOrderDetailAPIView.as_view()),
    path("provider/orders/<int:pk>/status/", ProviderOrderStatusAPIView.as_view()),
    path("provider/orders/<int:pk>/notes/", ProviderOrderNoteAPIView.as_view()),
    path("provider/orders/<int:pk>/final-document/", ProviderFinalDocumentAPIView.as_view()),
]
