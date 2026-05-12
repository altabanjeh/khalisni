from django.urls import include, path
from rest_framework.routers import DefaultRouter

from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import (
    AdminUserViewSet,
    AvailablePermissionsAPIView,
    CustomerProfileAdminViewSet,
    CustomerProfileAPIView,
    LoginAPIView,
    LogoutAPIView,
    MeAPIView,
    RegisterAPIView,
    SystemSettingViewSet,
)

router = DefaultRouter()
router.register("admin/users", AdminUserViewSet, basename="admin-users")
router.register("admin/customer-profiles", CustomerProfileAdminViewSet, basename="admin-customer-profiles")
router.register("admin/system-settings", SystemSettingViewSet, basename="admin-system-settings")

urlpatterns = [
    path("", include(router.urls)),
    path("auth/register/", RegisterAPIView.as_view()),
    path("auth/login/", LoginAPIView.as_view()),
    path("auth/logout/", LogoutAPIView.as_view()),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/me/", MeAPIView.as_view()),
    path("customer/profile/", CustomerProfileAPIView.as_view()),
    path("admin/available-permissions/", AvailablePermissionsAPIView.as_view(), name="admin-available-permissions"),
]
