from django.urls import include, path
from rest_framework.routers import DefaultRouter

from notifications.views import (
    AdminNotificationDetailAPIView,
    AdminNotificationListAPIView,
    EmployeeNotificationTemplateListAPIView,
    ManualOrderNotificationAPIView,
    NotificationCenterAPIView,
    NotificationTemplateAdminViewSet,
)

router = DefaultRouter()
router.register("admin/notification-templates", NotificationTemplateAdminViewSet, basename="admin-notification-templates")

urlpatterns = [
    path("", include(router.urls)),
    path("admin/notifications/", AdminNotificationListAPIView.as_view()),
    path("admin/notifications/<int:pk>/", AdminNotificationDetailAPIView.as_view()),
    path("notifications/", NotificationCenterAPIView.as_view()),
    path("employee/notification-templates/", EmployeeNotificationTemplateListAPIView.as_view()),
    path("orders/<int:pk>/manual-notification/", ManualOrderNotificationAPIView.as_view()),
]
