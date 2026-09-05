from django.conf import settings
from django.db import models
from django.utils import timezone


class SoftDeleteQuerySet(models.QuerySet):
    """Explicit soft-delete helpers (defect D-DB1 / A2 §2).

    The default queryset is intentionally left un-filtered so this is a
    non-breaking addition: existing `.objects` calls behave exactly as before.
    Callers that want only live rows use ``.alive()`` / ``.active()``.
    """

    def alive(self):
        return self.filter(is_deleted=False)

    def active(self):
        qs = self.filter(is_deleted=False)
        # Respect a business-availability flag when the model has one.
        if any(f.name == "is_active" for f in self.model._meta.get_fields()):
            qs = qs.filter(is_active=True)
        return qs

    def deleted(self):
        return self.filter(is_deleted=True)

    def with_deleted(self):
        return self.all()


class SoftDeleteModel(models.Model):
    # Adds `.alive()/.active()/.deleted()/.with_deleted()` to `.objects` on every
    # concrete subclass that does not declare its own manager. Default `.all()`
    # is unchanged (still returns every row) so nothing regresses.
    objects = SoftDeleteQuerySet.as_manager()

    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(app_label)s_%(class)s_deleted_records",
    )
    delete_reason = models.TextField(blank=True)

    class Meta:
        abstract = True

    def soft_delete(self, *, user=None, reason=""):
        self.is_deleted = True
        self.deleted_by = user
        self.deleted_at = timezone.now()
        if hasattr(self, "is_active"):
            self.is_active = False

        update_fields = ["is_deleted", "deleted_by", "deleted_at", "delete_reason"]
        if hasattr(self, "is_active"):
            update_fields.append("is_active")
        if hasattr(self, "updated_at"):
            update_fields.append("updated_at")
        self.delete_reason = reason or ""
        self.save(update_fields=update_fields)

    def restore(self):
        self.is_deleted = False
        self.deleted_by = None
        self.deleted_at = None
        self.delete_reason = ""
        if hasattr(self, "is_active"):
            self.is_active = True

        update_fields = ["is_deleted", "deleted_by", "deleted_at", "delete_reason"]
        if hasattr(self, "is_active"):
            update_fields.append("is_active")
        if hasattr(self, "updated_at"):
            update_fields.append("updated_at")
        self.save(update_fields=update_fields)
