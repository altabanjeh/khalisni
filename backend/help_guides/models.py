from django.conf import settings
from django.contrib.auth.models import Permission
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.text import slugify


def _validate_permission_key(value: str, *, field_name: str) -> None:
    if not value:
        return
    if "." not in value:
        raise ValidationError({field_name: "Permission must use the full codename format app_label.codename."})
    app_label, codename = value.split(".", 1)
    if not Permission.objects.filter(content_type__app_label=app_label, codename=codename).exists():
        raise ValidationError({field_name: "Permission does not exist in the current system."})


class HelpGuide(models.Model):
    class Category(models.TextChoices):
        NAVIGATION = "navigation", "Navigation"
        ACCOUNT = "account", "Account access"
        CUSTOMER = "customer", "Customer"
        EMPLOYEE = "employee", "Employee"
        SUPPORT = "support", "Support"
        PROVIDER = "provider", "Provider"
        ADMIN = "admin", "Admin"
        REPORTS = "reports", "Reports"
        SETTINGS = "settings", "Settings"
        MANUAL = "manual", "Manual maintenance"
        GENERAL = "general", "General"

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
    slug = models.SlugField(max_length=160, unique=True, db_index=False)
    screen_key = models.CharField(max_length=100, blank=True, db_index=True)
    route_path = models.CharField(max_length=255, blank=True)
    category = models.CharField(max_length=40, choices=Category.choices, default=Category.GENERAL, db_index=True)
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
    when_to_use = models.TextField(blank=True)
    main_workflow = models.CharField(max_length=120, blank=True)
    next_step = models.TextField(blank=True)
    troubleshooting = models.TextField(blank=True)
    related_screen = models.CharField(max_length=100, blank=True)
    related_permission = models.CharField(max_length=120, blank=True)
    search_keywords = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True)
    is_quick_link = models.BooleanField(default=False, db_index=True)
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
    related_guides = models.ManyToManyField("self", blank=True, symmetrical=False, related_name="referenced_by")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "title", "help_guide_id"]
        indexes = [
            models.Index(fields=["slug", "is_active"], name="help_guides_slug_active_idx"),
            models.Index(fields=["category", "role", "is_active"], name="help_guides_cat_role_idx"),
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
        if not self.slug:
            base_slug = slugify(self.title or self.screen_key or "help-guide")[:140] or "help-guide"
            self.slug = base_slug
        _validate_permission_key(self.permission_key, field_name="permission_key")
        _validate_permission_key(self.related_permission, field_name="related_permission")


class HelpGuideScreenshot(models.Model):
    screenshot_id = models.BigAutoField(primary_key=True)
    help_guide = models.ForeignKey(
        HelpGuide,
        on_delete=models.CASCADE,
        related_name="screenshots",
    )
    caption = models.CharField(max_length=255)
    image = models.ImageField(upload_to="manual/screenshots/uploads/", blank=True, null=True)
    static_path = models.CharField(max_length=255, blank=True)
    placeholder_label = models.CharField(max_length=255, blank=True)
    alt_text = models.CharField(max_length=255, blank=True)
    step_reference = models.CharField(max_length=80, blank=True)
    display_order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "screenshot_id"]
        indexes = [
            models.Index(fields=["help_guide", "is_active", "display_order"], name="help_guide_shot_idx"),
        ]

    def __str__(self):
        return f"{self.help_guide.title} / {self.caption}"

    @property
    def id(self):
        return self.pk

    def clean(self):
        if not self.image and not self.static_path and not self.placeholder_label:
            raise ValidationError(
                {
                    "placeholder_label": (
                        "Provide an uploaded image, a static path, or a placeholder label for the screenshot entry."
                    )
                }
            )


class HelpGuideBase(models.Model):
    screen_key = models.CharField(max_length=100, blank=True, db_index=True)
    role = models.CharField(
        max_length=40,
        choices=HelpGuide.Audience.choices,
        default=HelpGuide.Audience.ALL_USERS,
        db_index=True,
    )
    permission_key = models.CharField(max_length=120, blank=True, db_index=True)
    search_keywords = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True)
    display_order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(class)s_created_entries",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(class)s_updated_entries",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    def clean(self):
        _validate_permission_key(self.permission_key, field_name="permission_key")


class HelpGuideAction(HelpGuideBase):
    button_key = models.CharField(max_length=120, db_index=True)
    button_label = models.CharField(max_length=255)
    purpose = models.TextField(blank=True)
    when_to_use = models.TextField(blank=True)
    action_result = models.TextField(blank=True)
    status_before = models.CharField(max_length=40, blank=True, db_index=True)
    status_after = models.CharField(max_length=40, blank=True, db_index=True)
    notification_triggered = models.TextField(blank=True)
    warning_message = models.TextField(blank=True)
    common_errors = models.TextField(blank=True)
    safety_rule = models.TextField(blank=True)
    confirmation_message = models.TextField(blank=True)

    class Meta:
        ordering = ["screen_key", "display_order", "button_label", "id"]
        indexes = [
            models.Index(fields=["screen_key", "role", "is_active"]),
            models.Index(fields=["screen_key", "status_before", "is_active"]),
            models.Index(fields=["button_key", "role", "is_active"]),
        ]

    def __str__(self):
        return f"{self.button_label} ({self.screen_key or 'general'} / {self.role})"


class HelpGuideField(HelpGuideBase):
    field_key = models.CharField(max_length=120, db_index=True)
    field_label = models.CharField(max_length=255)
    model_name = models.CharField(max_length=120, blank=True)
    model_field = models.CharField(max_length=120, blank=True)
    purpose = models.TextField(blank=True)
    required = models.BooleanField(default=False)
    editable = models.BooleanField(default=True)
    data_type = models.CharField(max_length=50, blank=True)
    accepted_format = models.TextField(blank=True)
    valid_example = models.TextField(blank=True)
    invalid_example = models.TextField(blank=True)
    validation_rule = models.TextField(blank=True)
    error_explanation = models.TextField(blank=True)
    placeholder_text = models.TextField(blank=True)
    tooltip_text = models.TextField(blank=True)
    default_value = models.TextField(blank=True)
    max_length = models.PositiveIntegerField(null=True, blank=True)
    who_can_edit = models.TextField(blank=True)
    locked_when = models.TextField(blank=True)

    class Meta:
        ordering = ["screen_key", "display_order", "field_label", "id"]
        indexes = [
            models.Index(fields=["screen_key", "role", "is_active"]),
            models.Index(fields=["field_key", "role", "is_active"]),
        ]

    def __str__(self):
        return f"{self.field_label} ({self.screen_key or 'general'} / {self.role})"


class HelpGuideService(HelpGuideBase):
    service = models.ForeignKey(
        "services.Service",
        on_delete=models.CASCADE,
        related_name="help_guides",
    )
    description = models.TextField(blank=True)
    who_can_use = models.TextField(blank=True)
    required_documents = models.TextField(blank=True)
    optional_documents = models.TextField(blank=True)
    required_data = models.TextField(blank=True)
    prerequisites = models.TextField(blank=True)
    related_services = models.TextField(blank=True)
    workflow_summary = models.TextField(blank=True)
    final_output = models.TextField(blank=True)
    common_errors = models.TextField(blank=True)
    common_rejection_reasons = models.TextField(blank=True)
    common_missing_document_reasons = models.TextField(blank=True)
    estimated_processing_time = models.TextField(blank=True)
    price_rule = models.TextField(blank=True)
    provider_requirement = models.TextField(blank=True)

    class Meta:
        ordering = ["service_id", "display_order", "role", "id"]
        indexes = [
            models.Index(fields=["service", "role", "is_active"]),
            models.Index(fields=["screen_key", "role", "is_active"]),
        ]

    def __str__(self):
        return f"{self.service_id} / {self.role}"


class HelpGuideWorkflow(HelpGuideBase):
    workflow_key = models.CharField(max_length=120, db_index=True)
    current_status = models.CharField(max_length=40, blank=True, db_index=True)
    action_key = models.CharField(max_length=120, blank=True, db_index=True)
    action_label = models.CharField(max_length=255, blank=True)
    next_status = models.CharField(max_length=40, blank=True, db_index=True)
    required_fields = models.TextField(blank=True)
    system_effect = models.TextField(blank=True)
    notification_effect = models.TextField(blank=True)
    blocked_cases = models.TextField(blank=True)
    correction_process = models.TextField(blank=True)
    button_key = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["screen_key", "display_order", "current_status", "workflow_key", "id"]
        indexes = [
            models.Index(fields=["screen_key", "current_status", "is_active"]),
            models.Index(fields=["workflow_key", "role", "is_active"]),
        ]

    def __str__(self):
        return f"{self.workflow_key} ({self.current_status} -> {self.next_status})"
