from django.urls import include, path
from rest_framework.routers import DefaultRouter

from documents.views import (
    AdminDocumentViewSet,
    DocumentDownloadAPIView,
    DocumentDownloadTokenAPIView,
    StaffDocumentListAPIView,
    StaffDocumentVerifyAPIView,
)

router = DefaultRouter()
router.register("admin/documents", AdminDocumentViewSet, basename="admin-documents")

urlpatterns = [
    path("", include(router.urls)),
    path("documents/<int:pk>/download/", DocumentDownloadAPIView.as_view(), name="document-download"),
    path("documents/<int:pk>/download-token/", DocumentDownloadTokenAPIView.as_view(), name="document-download-token"),
    path("staff/documents/", StaffDocumentListAPIView.as_view()),
    path("staff/documents/<int:pk>/verify/", StaffDocumentVerifyAPIView.as_view()),
]
