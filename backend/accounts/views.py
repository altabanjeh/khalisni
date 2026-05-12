from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from rest_framework import generics, permissions, response, status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView

from accounts.models import CustomUser, CustomerProfile, SystemSetting
from accounts.serializers import (
    AdminUserSerializer,
    CustomTokenObtainPairSerializer,
    CustomerProfileAdminSerializer,
    CustomerProfileSerializer,
    RegisterSerializer,
    SafeSystemSettingSerializer,
    UserSerializer,
)
from audit.utils import create_audit_log
from config.permissions import CanManageUserRoles, IsCustomerRole

# Apps whose permissions are surfaced in the admin permission-assignment UI.
_PERMISSION_APPS = {"orders", "documents", "services", "payment", "accounts", "notifications", "providers", "audit"}

try:
    from rest_framework_simplejwt.tokens import RefreshToken
    from rest_framework_simplejwt.views import TokenObtainPairView
except ImportError:  # pragma: no cover - depends on optional dependency
    RefreshToken = None

    class TokenObtainPairView(APIView):
        permission_classes = [permissions.AllowAny]

        def post(self, request, *args, **kwargs):
            return response.Response(
                {"detail": "JWT authentication is unavailable because djangorestframework-simplejwt is not installed."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class RegisterAPIView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        create_audit_log(
            request=self.request,
            user=user,
            action="register",
            entity_type="CustomUser",
            entity_id=user.pk,
            new_value={"role": user.role, "email": user.email},
        )


class LoginAPIView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class LogoutAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh = request.data.get("refresh")
        if refresh:
            if RefreshToken is None:
                return response.Response(
                    {"detail": "JWT authentication is unavailable because djangorestframework-simplejwt is not installed."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            token = RefreshToken(refresh)
            token.blacklist()
        create_audit_log(
            request=request,
            action="logout",
            entity_type="CustomUser",
            entity_id=request.user.pk,
        )
        return response.Response(status=status.HTTP_204_NO_CONTENT)


class MeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return response.Response(UserSerializer(request.user).data)


class CustomerProfileAPIView(generics.UpdateAPIView):
    serializer_class = CustomerProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomerRole]

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        user = serializer.save()
        create_audit_log(
            request=self.request,
            action="update_profile",
            entity_type="CustomUser",
            entity_id=user.pk,
            new_value=serializer.validated_data,
        )


class AdminUserViewSet(viewsets.ModelViewSet):
    serializer_class = AdminUserSerializer
    queryset = CustomUser.objects.all().order_by("full_name")
    permission_classes = [permissions.IsAuthenticated, CanManageUserRoles]
    search_fields = ["full_name", "email", "phone", "role"]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def perform_create(self, serializer):
        user = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="create_admin_user",
            entity_type="CustomUser",
            entity_id=user.pk,
            new_value={"role": user.role, "is_active": user.is_active},
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        old_value = {"role": instance.role, "is_active": instance.is_active, "is_verified": instance.is_verified}
        user = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="update_admin_user",
            entity_type="CustomUser",
            entity_id=user.pk,
            old_value=old_value,
            new_value={"role": user.role, "is_active": user.is_active, "is_verified": user.is_verified},
        )

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        old_value = {"role": user.role, "is_active": user.is_active}
        user.is_active = False
        user.save(update_fields=["is_active", "updated_at"])
        create_audit_log(
            request=request,
            user=request.user,
            action="deactivate_admin_user",
            entity_type="CustomUser",
            entity_id=user.pk,
            old_value=old_value,
            new_value={"is_active": user.is_active},
        )
        return response.Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get", "patch"], url_path="permissions")
    def user_permissions(self, request, pk=None):
        user = self.get_object()
        if request.method == "GET":
            current = list(
                user.user_permissions.filter(content_type__app_label__in=_PERMISSION_APPS)
                .values_list("content_type__app_label", "codename")
            )
            return response.Response(
                {"permissions": [f"{app}.{code}" for app, code in current]}
            )

        # PATCH — replace direct permissions with the supplied list.
        perm_codenames = request.data.get("permissions", [])
        if not isinstance(perm_codenames, list):
            return response.Response(
                {"detail": "permissions must be a list of full_codename strings (e.g. 'orders.review_order')."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resolved = []
        unknown = []
        for full_codename in perm_codenames:
            parts = str(full_codename).split(".", 1)
            if len(parts) != 2:
                unknown.append(full_codename)
                continue
            app_label, codename = parts
            try:
                perm = Permission.objects.get(content_type__app_label=app_label, codename=codename)
                resolved.append(perm)
            except Permission.DoesNotExist:
                unknown.append(full_codename)

        if unknown:
            return response.Response(
                {"detail": f"Unknown permissions: {unknown}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_perms = list(
            user.user_permissions.filter(content_type__app_label__in=_PERMISSION_APPS)
            .values_list("content_type__app_label", "codename")
        )
        user.user_permissions.set(resolved)
        new_perms = [f"{app}.{code}" for app, code in old_perms]
        create_audit_log(
            request=request,
            user=request.user,
            action="set_user_permissions",
            entity_type="CustomUser",
            entity_id=user.pk,
            old_value={"permissions": new_perms},
            new_value={"permissions": [f"{p.content_type.app_label}.{p.codename}" for p in resolved]},
        )
        return response.Response(
            {"permissions": [f"{p.content_type.app_label}.{p.codename}" for p in resolved]}
        )


class SystemSettingViewSet(viewsets.ModelViewSet):
    serializer_class = SafeSystemSettingSerializer
    queryset = SystemSetting.objects.all().order_by("key")
    permission_classes = [permissions.IsAuthenticated, CanManageUserRoles]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def perform_create(self, serializer):
        setting = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="create_system_setting",
            entity_type="SystemSetting",
            entity_id=setting.pk,
            new_value={"key": setting.key, "value": setting.value},
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        old_value = {"key": instance.key, "value": instance.value}
        setting = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="update_system_setting",
            entity_type="SystemSetting",
            entity_id=setting.pk,
            old_value=old_value,
            new_value={"key": setting.key, "value": setting.value},
        )

    def destroy(self, request, *args, **kwargs):
        return response.Response({"detail": "System settings cannot be deleted from this screen."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


class CustomerProfileAdminViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerProfileAdminSerializer
    queryset = CustomerProfile.objects.select_related("user").all()
    permission_classes = [permissions.IsAuthenticated, CanManageUserRoles]


class AvailablePermissionsAPIView(APIView):
    """Return all Django permissions grouped by app label, filtered to system apps."""

    permission_classes = [permissions.IsAuthenticated, CanManageUserRoles]

    def get(self, request):
        qs = (
            Permission.objects.select_related("content_type")
            .filter(content_type__app_label__in=_PERMISSION_APPS)
            .order_by("content_type__app_label", "codename")
        )
        groups = {}
        for perm in qs:
            app = perm.content_type.app_label
            if app not in groups:
                groups[app] = []
            groups[app].append(
                {
                    "id": perm.pk,
                    "codename": perm.codename,
                    "full_codename": f"{app}.{perm.codename}",
                    "name": perm.name,
                }
            )
        return response.Response(groups)
