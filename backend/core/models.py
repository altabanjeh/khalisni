from django.conf import settings
from django.db import models
from django.utils import timezone


class SoftDeleteModel(models.Model):
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
