import json

from django.core.serializers.json import DjangoJSONEncoder

from audit.models import AuditLog


def _as_json_safe(value):
    if value is None:
        return None
    return json.loads(json.dumps(value, cls=DjangoJSONEncoder))


def _resolved_actor_role(actor):
    return (getattr(actor, "role", "") or "").lower()


def _resolved_source(*, request=None, actor=None):
    if request is not None and getattr(getattr(request, "user", None), "is_authenticated", False):
        role = _resolved_actor_role(request.user)
    else:
        role = _resolved_actor_role(actor)

    if role == "admin":
        return AuditLog.Source.ADMIN
    if role == "customer":
        return AuditLog.Source.CLIENT_PORTAL
    if role in {"employee", "support"}:
        return AuditLog.Source.EMPLOYEE_PORTAL
    if role == "provider":
        return AuditLog.Source.PROVIDER_PORTAL
    if request is not None:
        return AuditLog.Source.API
    return AuditLog.Source.SYSTEM


def create_audit_log(*, request=None, user=None, action, entity_type, entity_id, old_value=None, new_value=None):
    actor = user or getattr(request, "user", None)
    ip_address = None
    user_agent = ""
    request_id = ""
    if request is not None:
        ip_address = request.META.get("REMOTE_ADDR")
        user_agent = request.META.get("HTTP_USER_AGENT", "")
        request_id = request.META.get("HTTP_X_REQUEST_ID", "")
    AuditLog.objects.create(
        user=actor if getattr(actor, "is_authenticated", False) else None,
        user_role=_resolved_actor_role(actor),
        action=action,
        source=_resolved_source(request=request, actor=actor),
        entity_type=entity_type,
        entity_id=str(entity_id),
        old_values=_as_json_safe(old_value),
        new_values=_as_json_safe(new_value),
        changed_fields=sorted(set((old_value or {}).keys()) | set((new_value or {}).keys())),
        request_id=request_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
