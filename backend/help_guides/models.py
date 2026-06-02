from django.conf import settings
from django.contrib.auth.models import Permission
from django.core.exceptions import ValidationError
from django.db import models


def _validate_permission_key(value: str, *, field_name: str) -> None:
    if not value:
        return
    if "." not in value:
        raise ValidationError({field_name: "Permission must use the full codename format app_label.codename."})
    app_label, codename = value.split(".", 1)
    if not Permission.objects.filter(content_type__app_label=app_label, codename=codename).exists():
        raise ValidationError({field_name: "Permission does not exist in the current system."})


class HelpGuide(models.Model):
    class Audience(models.TextChoices):
        ALL_USERS = "all_users", "All users"
        ADMIN = "admin", "Admin"
        CUSTOMER = "customer", "Customer"
        EMPLOYEE = "employee", "Employee"
        SUPPORT = "support", "Support"
        PROVIDER = "provider", "Provider"
        PLATFORM_SUPER_ADMIN = "platform_super_admin", "Platform super admin"
        PLATFORM_SUPPORT = "platform_support", "Platform support"
        PARTNER_OWNER = "partner_owner", "Partner owner"
        PARTNER_ADMIN = "partner_admin", "Partner admin"
        BRANCH_MANAGER = "branch_manager", "Branch manager"
        PARTNER_EMPLOYEE = "partner_employee", "Partner employee"
        PROVIDER_ADMIN = "provider_admin", "Provider admin"
        PROVIDER_EMPLOYEE = "provider_employee", "Provider employee"
        FINANCE = "finance", "Finance"
        AUDITOR = "auditor", "Auditor"

    help_guide_id = models.BigAutoField(primary_key=True)
    screen_key = models.CharField(max_length=100, blank=True, db_index=True)
    route_path = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=40, choices=Audience.choices, default=Audience.ALL_USERS, db_index=True)
    permission_key = models.CharField(max_length=120, blank=True, db_index=True)
    workflow_status = models.CharField(max_length=40, blank=True, db_index=True)
    title = models.CharField(max_length=255)
    short_description = models.TextField(blank=True)
    purpose = models.TextField(blank=True)
    before_you_start = models.TextField(blank=True)
    step_by_step_guide = models.TextField(blank=True)
    expected_result = models.TextField(blank=True)
    common_errors = models.TextField(blank=True)
    related_screen = models.CharField(max_length=100, blank=True)
    related_permission = models.CharField(max_length=120, blank=True)
    search_keywords = models.TextField(blank=True)
    display_order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_help_guides",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="updated_help_guides",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "title", "help_guide_id"]
        indexes = [
            models.Index(fields=["screen_key", "role", "is_active"]),
            models.Index(fields=["screen_key", "workflow_status", "is_active"]),
            models.Index(fields=["role", "permission_key", "is_active"]),
        ]
        permissions = [
            ("manage_help_guides", "Can manage in-app help guide content"),
        ]

    def __str__(self):
        return f"{self.title} ({self.screen_key or 'general'} / {self.role})"

    @property
    def id(self):
        return self.pk

    def clean(self):
        _validate_permission_key(self.permission_key, field_name="permission_key")
        _validate_permission_key(self.related_permission, field_name="related_permission")

