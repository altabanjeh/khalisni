from django.contrib.auth.hashers import make_password
from django.db import transaction
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from accounts.models import SystemSetting
from audit.models import AuditLog
from audit.utils import create_audit_log
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


def _extract_delete_reason(request):
    try:
        raw_reason = request.data.get("delete_reason", "")
    except Exception:  # pragma: no cover - request.data can fail only on malformed requests
        raw_reason = ""
    return str(raw_reason or "").strip()


def _include_deleted(request):
    value = request.query_params.get("include_deleted", "")
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def is_admin_delete_user(user):
    return bool(user and getattr(user, "is_authenticated", False) and is_platform_super_admin(user))


def infer_delete_entity_name(instance):
    if instance is None:
        return ""

    for attr_name in (
        "order_number",
        "request_number",
        "title",
        "name",
        "name_ar",
        "full_name",
        "button_label",
        "field_label",
        "workflow_key",
        "caption",
        "key",
        "slug",
        "original_filename",
    ):
        value = getattr(instance, attr_name, "")
        if value:
            return str(value)

    return str(getattr(instance, "pk", "") or "")


def snapshot_instance(instance, *, fields=None):
    if instance is None:
        return None

    if fields:
        snapshot = {}
        for field_name in fields:
            value = getattr(instance, field_name, None)
            if hasattr(value, "pk"):
                snapshot[field_name] = value.pk
            elif hasattr(value, "name") and not isinstance(value, str):
                snapshot[field_name] = getattr(value, "name", "")
            else:
                snapshot[field_name] = value
        return snapshot

    snapshot = {}
    for field in getattr(instance._meta, "concrete_fields", ()):
        if getattr(field, "is_relation", False):
            snapshot[field.attname] = getattr(instance, field.attname, None)
            continue

        value = getattr(instance, field.name, None)
        if hasattr(value, "name") and not isinstance(value, str):
            snapshot[field.name] = getattr(value, "name", "")
        else:
            snapshot[field.name] = value
    return snapshot


def log_delete_failure(*, request, action, entity_type, entity_id, reason, entity_name="", old_value=None):
    create_audit_log(
        request=request,
        user=getattr(request, "user", None),
        action=action,
        entity_type=entity_type or "Record",
        entity_id=entity_id or "",
        entity_name=entity_name,
        old_value=old_value,
        new_value=None,
        status=AuditLog.LogStatus.FAILED,
        error_message=reason,
    )


def enforce_admin_delete_guard(request, *, entity_type="Record", entity_id="", entity_name="", old_value=None):
    user = getattr(request, "user", None)
    if not is_admin_delete_user(user):
        reason = "Only admin users can delete or deactivate records."
        if getattr(user, "is_authenticated", False):
            log_delete_failure(
                request=request,
                action="blocked_delete",
                entity_type=entity_type,
                entity_id=entity_id,
                entity_name=entity_name,
                old_value=old_value,
                reason=reason,
            )
        raise PermissionDenied(reason)

    raw_password = _extract_delete_password(request)
    if not raw_password:
        reason = "Current admin password is required."
        log_delete_failure(
            request=request,
            action="blocked_delete",
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            old_value=old_value,
            reason=reason,
        )
        raise ValidationError({"delete_password": reason})

    if not user.check_password(raw_password):
        reason = "Current admin password is incorrect."
        log_delete_failure(
            request=request,
            action="blocked_delete",
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            old_value=old_value,
            reason=reason,
        )
        raise ValidationError({"delete_password": reason})

    return user


class AdminDeleteGuardMixin:
    delete_audit_action = "delete_record"
    delete_blocked_audit_action = "blocked_delete"
    delete_audit_fields = None

    def get_delete_instance(self):
        return self.get_object()

    def get_queryset(self):
        queryset = super().get_queryset()
        request = getattr(self, "request", None)
        model = getattr(queryset, "model", None)
        if request is None or model is None or not hasattr(model, "is_deleted"):
            return queryset
        if _include_deleted(request):
            return queryset
        return queryset.filter(is_deleted=False)

    def get_delete_entity_type(self, instance=None):
        if getattr(self, "audit_entity_type", ""):
            return self.audit_entity_type
        queryset = getattr(self, "queryset", None)
        model = getattr(queryset, "model", None)
        if model is not None:
            return model.__name__
        if instance is not None:
            return instance.__class__.__name__
        return "Record"

    def get_delete_entity_id(self, instance=None):
        if instance is not None:
            return getattr(instance, "pk", "") or ""
        lookup_field = getattr(self, "lookup_field", "pk")
        return self.kwargs.get(lookup_field, self.kwargs.get("pk", ""))

    def get_delete_entity_name(self, instance=None):
        return infer_delete_entity_name(instance)

    def get_delete_old_value(self, instance):
        return snapshot_instance(instance, fields=self.delete_audit_fields)

    def enforce_delete_guard(self, request, *, instance=None, old_value=None):
        enforce_admin_delete_guard(
            request,
            entity_type=self.get_delete_entity_type(instance),
            entity_id=self.get_delete_entity_id(instance),
            entity_name=self.get_delete_entity_name(instance),
            old_value=old_value,
        )

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.method != "DELETE":
            return

        if is_admin_delete_user(getattr(request, "user", None)):
            return

        entity_type = self.get_delete_entity_type()
        entity_id = self.get_delete_entity_id()
        log_delete_failure(
            request=request,
            action=self.delete_blocked_audit_action,
            entity_type=entity_type,
            entity_id=entity_id,
            reason="Only admin users can delete or deactivate records.",
        )
        raise PermissionDenied("Only admin users can delete or deactivate records.")

    def perform_delete_action(self, instance):
        if hasattr(instance, "soft_delete"):
            instance.soft_delete(user=self.request.user, reason=_extract_delete_reason(self.request))
            return
        self.perform_destroy(instance)

    def log_delete_success(self, request, instance, *, old_value=None, new_value=None):
        create_audit_log(
            request=request,
            user=request.user,
            action=self.delete_audit_action,
            entity_type=self.get_delete_entity_type(instance),
            entity_id=self.get_delete_entity_id(instance),
            entity_name=self.get_delete_entity_name(instance),
            old_value=old_value,
            new_value=new_value,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_delete_instance()
        old_value = self.get_delete_old_value(instance)
        self.enforce_delete_guard(request, instance=instance, old_value=old_value)
        try:
            with transaction.atomic():
                self.perform_delete_action(instance)
                new_value = self.get_delete_old_value(instance) if hasattr(instance, "is_deleted") else None
                self.log_delete_success(request, instance, old_value=old_value, new_value=new_value)
        except Exception as exc:
            log_delete_failure(
                request=request,
                action=self.delete_blocked_audit_action,
                entity_type=self.get_delete_entity_type(instance),
                entity_id=self.get_delete_entity_id(instance),
                entity_name=self.get_delete_entity_name(instance),
                old_value=old_value,
                reason=str(exc),
            )
            raise
        return Response(status=status.HTTP_204_NO_CONTENT)
