"""Data-retention policy: report what a configured policy would affect, and apply only safe actions.

The periods are an owner/legal decision (audit D06). They are read from
``settings.KHALSNI_RETENTION`` (environment variables, see the "Retention
(Stream B)" block of config/settings.py). A category without a value is
"not configured" and nothing in it is ever touched. No period is assumed.

What ``apply`` may do, per configured category:

* ``documents``: remove the stored file of (a) documents soft-deleted more than
  N days ago and (b) documents of orders closed (completed, rejected, cancelled
  or archived) more than N days ago. The Document row and its metadata (name,
  type, size, checksum, verification history) are kept and the row is marked
  deleted, so no download path serves it. The audit trail is kept.
* ``notifications``: delete notifications that were read and are older than N days.
* ``audit_logs``: delete audit-log entries older than N days (only when configured).
* ``completed_orders`` and ``accounts``: report only. Orders and accounts are
  never deleted; anonymisation is not implemented in this release, so apply
  skips them with a message.
* ``backups``: report only. Rotation is done by scripts/backup_scheduled.sh
  with the same KHALSNI_BACKUP_KEEP value.

Consent evidence (OrderConsent) is never purged. Every apply run writes an
audit-log entry with what it did.
"""

from dataclasses import dataclass, field
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.db.models.functions import Coalesce
from django.utils import timezone

CATEGORIES = (
    # key, settings key, environment variable, unit
    ("documents", "documents_days", "KHALSNI_RETENTION_DOCUMENTS_DAYS", "days"),
    ("completed_orders", "completed_orders_days", "KHALSNI_RETENTION_COMPLETED_ORDERS_DAYS", "days"),
    ("accounts", "accounts_days", "KHALSNI_RETENTION_ACCOUNTS_DAYS", "days"),
    ("notifications", "notifications_days", "KHALSNI_RETENTION_NOTIFICATIONS_DAYS", "days"),
    ("audit_logs", "audit_logs_days", "KHALSNI_RETENTION_AUDIT_LOGS_DAYS", "days"),
    ("backups", "backups_keep", "KHALSNI_BACKUP_KEEP", "newest backups kept"),
)
NOT_CONFIGURED = "not configured - nothing is purged"
AUDIT_ID_LIMIT = 500


@dataclass
class CategoryResult:
    key: str
    env: str
    value: object
    unit: str
    in_scope: int = 0
    summary: str = ""
    applied: int = 0
    ids: list = field(default_factory=list)

    @property
    def configured(self):
        return self.value is not None


def get_policy():
    """``{category: value or None}`` from settings; None means not configured."""
    configured = getattr(settings, "KHALSNI_RETENTION", None) or {}
    return {key: configured.get(setting_key) for key, setting_key, _env, _unit in CATEGORIES}


def describe_policy():
    """Lines describing the configured policy (release evidence)."""
    policy = get_policy()
    lines = []
    for key, _setting_key, env, unit in CATEGORIES:
        value = policy[key]
        shown = f"{value} {unit}" if value is not None else NOT_CONFIGURED
        lines.append(f"{key}: {env} = {shown}")
    lines.append("consent_evidence: never purged (append-only, OrderConsent)")
    lines.append("orders: never deleted; anonymisation not implemented in this release")
    return lines


def _closed_orders(cutoff):
    from orders.models import Order

    final = [Order.Status.COMPLETED, Order.Status.REJECTED, Order.Status.CANCELLED, Order.Status.ARCHIVED]
    return (
        Order.objects.filter(status__in=final)
        .annotate(closed_on=Coalesce("completed_at", "cancelled_at", "archived_at", "updated_at"))
        .filter(closed_on__lt=cutoff)
    )


def _document_candidates(cutoff):
    from documents.models import Document
    from documents.retention import purge_candidates

    deleted_ids = purge_candidates(deleted_before=cutoff).values("pk")
    closed_order_ids = _closed_orders(cutoff).values("pk")
    return (
        Document._base_manager.exclude(file="")
        .filter(Q(pk__in=deleted_ids) | Q(order_id__in=closed_order_ids))
        .order_by("pk")
    )


def _remove_document_files(queryset, now):
    from documents.models import Document

    removed = []
    for document in queryset.iterator():
        name = document.file.name
        if name:
            storage = document.file.storage
            if storage.exists(name):
                storage.delete(name)
        # update(): keep every metadata column; only the stored file reference
        # goes, and the row is hidden from every download path.
        Document._base_manager.filter(pk=document.pk).update(
            file="",
            is_deleted=True,
            deleted_at=document.deleted_at or now,
            updated_at=now,
        )
        removed.append(document.pk)
    return removed


def _documents(result, now, apply):
    cutoff = now - timedelta(days=result.value)
    candidates = _document_candidates(cutoff)
    result.in_scope = candidates.count()
    result.summary = (
        f"{result.in_scope} stored document file(s) older than {result.value} days "
        "(soft-deleted, or on orders closed before the cutoff); rows and metadata are kept"
    )
    if apply and result.in_scope:
        result.ids = _remove_document_files(candidates, now)
        result.applied = len(result.ids)


def _completed_orders(result, now, apply):
    cutoff = now - timedelta(days=result.value)
    result.in_scope = _closed_orders(cutoff).count()
    result.summary = (
        f"{result.in_scope} closed order(s) older than {result.value} days; orders are never deleted and "
        "anonymisation is not implemented in this release, so nothing is changed"
    )


def _accounts(result, now, apply):
    from accounts.models import CustomUser
    from orders.models import Order

    cutoff = now - timedelta(days=result.value)
    open_statuses = [status for status in Order.Status.values if status not in {
        Order.Status.COMPLETED, Order.Status.REJECTED, Order.Status.CANCELLED, Order.Status.ARCHIVED,
    }]
    dormant = (
        CustomUser.objects.filter(role=CustomUser.Role.CUSTOMER)
        .annotate(last_seen=Coalesce("last_login", "created_at"))
        .filter(last_seen__lt=cutoff)
        .exclude(customer_orders__status__in=open_statuses)
        .distinct()
    )
    result.in_scope = dormant.count()
    result.summary = (
        f"{result.in_scope} customer account(s) without sign-in for {result.value} days and without an open order; "
        "account deletion/anonymisation is not implemented in this release, so nothing is changed"
    )


def _notifications(result, now, apply):
    from notifications.models import Notification

    cutoff = now - timedelta(days=result.value)
    candidates = Notification.objects.filter(is_read=True, created_at__lt=cutoff)
    result.in_scope = candidates.count()
    result.summary = f"{result.in_scope} read notification(s) older than {result.value} days would be deleted"
    if apply and result.in_scope:
        result.ids = list(candidates.order_by("pk").values_list("pk", flat=True)[:AUDIT_ID_LIMIT])
        _count, per_model = candidates.delete()
        result.applied = per_model.get(Notification._meta.label, 0)


def _audit_logs(result, now, apply):
    from audit.models import AuditLog

    cutoff = now - timedelta(days=result.value)
    candidates = AuditLog.objects.filter(created_at__lt=cutoff)
    result.in_scope = candidates.count()
    result.summary = f"{result.in_scope} audit-log entr(y/ies) older than {result.value} days would be deleted"
    if apply and result.in_scope:
        _count, per_model = candidates.delete()
        result.applied = per_model.get(AuditLog._meta.label, 0)


def _backups(result, now, apply):
    result.summary = (
        f"keep the newest {result.value} backup(s); rotation is done by scripts/backup_scheduled.sh, "
        "this command does not touch backup files"
    )


HANDLERS = {
    "documents": _documents,
    "completed_orders": _completed_orders,
    "accounts": _accounts,
    "notifications": _notifications,
    "audit_logs": _audit_logs,
    "backups": _backups,
}


def run_retention(*, apply=False, actor=None, now=None):
    """Evaluate every category; with ``apply`` perform the safe actions of configured ones.

    Returns ``[CategoryResult]``. A dry run (the default) changes nothing and
    writes nothing.
    """
    now = now or timezone.now()
    policy = get_policy()
    results = []
    for key, _setting_key, env, unit in CATEGORIES:
        result = CategoryResult(key=key, env=env, value=policy[key], unit=unit)
        if not result.configured:
            result.summary = NOT_CONFIGURED
        else:
            with transaction.atomic():
                HANDLERS[key](result, now, apply)
        results.append(result)
    if apply:
        from audit.utils import create_audit_log

        create_audit_log(
            user=actor,
            action="apply_retention_policy",
            entity_type="RetentionPolicy",
            entity_id=0,
            entity_name="retention_report --apply",
            new_value={
                "run_at": now.isoformat(),
                "policy": {result.key: result.value for result in results},
                "results": {
                    result.key: {
                        "configured": result.configured,
                        "in_scope": result.in_scope,
                        "applied": result.applied,
                        "ids": result.ids[:AUDIT_ID_LIMIT],
                        "summary": result.summary,
                    }
                    for result in results
                },
            },
            message="Retention policy applied (configured categories only; consent evidence and orders untouched).",
        )
    return results
