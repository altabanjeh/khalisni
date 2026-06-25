from django.contrib.auth.hashers import check_password, make_password
from rest_framework.exceptions import PermissionDenied, ValidationError

from accounts.models import SystemSetting
from organizations.selectors import is_platform_super_admin

DELETE_GUARD_SETTING_KEY = "security.delete_guard"


def get_delete_guard_setting():
    return SystemSetting.objects.filter(key=DELETE_GUARD_SETTING_KEY).first()


def is_delete_guard_configured():
    setting = get_delete_guard_setting()
    return bool(setting and isinstance(setting.value, dict) and setting.value.get("password_hash"))


def update_delete_guard_password(*, raw_password, actor=None):
    value = {
        "password_hash": make_password(raw_password),
        "configured_by_user_id": getattr(actor, "pk", None),
    }
    setting, _created = SystemSetting.objects.update_or_create(
        key=DELETE_GUARD_SETTING_KEY,
        defaults={
            "value": value,
            "description": "Extra password required before any admin delete or deactivate action.",
        },
    )
    return setting


def _extract_delete_password(request):
    raw_password = ""
    try:
        raw_password = request.data.get("delete_password", "")
    except Exception:  # pragma: no cover - request.data can fail only on malformed requests
        raw_password = ""
    if not raw_password:
        raw_password = request.headers.get("X-Delete-Password", "")
    return str(raw_password or "").strip()


def enforce_admin_delete_guard(request):
    user = getattr(request, "user", None)
    if not user or not getattr(user, "is_authenticated", False) or not is_platform_super_admin(user):
        raise PermissionDenied("Only admin users can delete or deactivate records.")

    setting = get_delete_guard_setting()
    password_hash = ""
    if setting and isinstance(setting.value, dict):
        password_hash = str(setting.value.get("password_hash", "") or "")

    if not password_hash:
        raise PermissionDenied("Delete password is not configured. Set it first from admin settings.")

    raw_password = _extract_delete_password(request)
    if not raw_password:
        raise ValidationError({"delete_password": "Delete password is required."})

    if not check_password(raw_password, password_hash):
        raise ValidationError({"delete_password": "Delete password is incorrect."})


class AdminDeleteGuardMixin:
    def enforce_delete_guard(self, request):
        enforce_admin_delete_guard(request)

    def destroy(self, request, *args, **kwargs):
        self.enforce_delete_guard(request)
        return super().destroy(request, *args, **kwargs)
