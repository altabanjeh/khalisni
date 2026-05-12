from django.urls import path

from audit.views import AuditLogListAPIView, OrderTimelineAPIView

urlpatterns = [
    path("admin/audit-logs/", AuditLogListAPIView.as_view()),
    path("orders/<int:pk>/timeline/", OrderTimelineAPIView.as_view()),
]
