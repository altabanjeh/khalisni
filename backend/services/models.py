from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone

from core.models import SoftDeleteModel


def _normalize_code(value):
    return str(value or "").strip().lower().replace(" ", "_")


def _normalize_extension_list(values):
    return sorted(
        {
            (str(value).strip().lower() if str(value).strip().startswith(".") else f".{str(value).strip().lower()}")
            for value in (values or [])
            if str(value).strip()
        }
    )


class ServiceCategory(SoftDeleteModel):
    category_id = models.BigAutoField(primary_key=True)

    name_ar = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255)

    slug = models.SlugField(max_length=255, unique=True)

    description_ar = models.TextField(blank=True)
    description_en = models.TextField(blank=True)

    icon = models.CharField(max_length=100, blank=True)
    color = models.CharField(max_length=20, blank=True, default="")

    image = models.ImageField(
        upload_to="service_categories/images/",
        blank=True,
        null=True
    )

    display_order = models.PositiveIntegerField(default=0)
    sort_order = models.PositiveIntegerField(default=0)

    parent = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        related_name="children",
        null=True,
        blank=True,
    )

    is_active = models.BooleanField(default=True)
    show_on_public_site = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "display_order", "name_ar"]
        verbose_name = "Service category"
        verbose_name_plural = "Service categories"
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["display_order"]),
            models.Index(fields=["sort_order"]),
            models.Index(fields=["parent", "is_active"]),
            models.Index(fields=["show_on_public_site"]),
            models.Index(fields=["is_deleted", "is_active"]),
        ]

    def __str__(self):
        return self.name_ar

    @property
    def id(self):
        return self.pk

    @property
    def name(self):
        return self.name_ar

    @property
    def description(self):
        return self.description_ar

    @property
    def full_path_name(self):
        parts = [self.name_ar]
        current = self.parent
        while current is not None:
            parts.append(current.name_ar)
            current = current.parent
        return " / ".join(reversed(parts))

    @property
    def full_path_name_en(self):
        parts = [self.name_en or self.name_ar]
        current = self.parent
        while current is not None:
            parts.append(current.name_en or current.name_ar)
            current = current.parent
        return " / ".join(reversed(parts))

    def clean(self):
        errors = {}

        if self.parent_id and self.parent_id == self.pk:
            errors["parent"] = "Category cannot be its own parent."

        if self.parent_id:
            from services.service_categories import ensure_category_parent_not_circular

            try:
                ensure_category_parent_not_circular(category=self)
            except ValidationError as exc:
                if hasattr(exc, "message_dict"):
                    errors.update(exc.message_dict)
                else:
                    errors["parent"] = exc.messages[0]

        duplicate_qs = type(self).objects.exclude(pk=self.pk).filter(
            parent_id=self.parent_id,
            name_ar__iexact=(self.name_ar or "").strip(),
            is_deleted=False,
        )
        if self.name_ar and duplicate_qs.exists():
            errors["name_ar"] = "Category name must be unique under the same parent category."

        if self.pk and not self.is_active and not self.is_deleted and self.services.filter(is_active=True, is_deleted=False).exists():
            errors["is_active"] = "Deactivate or reassign active services before deactivating this category."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.is_deleted:
            self.is_active = False
        if not self.sort_order and self.display_order:
            self.sort_order = self.display_order
        self.full_clean()
        super().save(*args, **kwargs)


class Service(SoftDeleteModel):
    class Scope(models.TextChoices):
        GLOBAL = "global", "Global"
        PARTNER_PRIVATE = "partner_private", "Partner private"
        PARTNER_CUSTOMIZED = "partner_customized", "Partner customized"

    class PriceType(models.TextChoices):
        FIXED = "fixed", "Fixed price"
        STARTS_FROM = "starts_from", "Starts from"
        QUOTATION = "quotation", "Requires quotation"
        FREE = "free", "Free"

    class DurationUnit(models.TextChoices):
        HOURS = "hours", "Hours"
        DAYS = "days", "Days"
        WEEKS = "weeks", "Weeks"

    class DeliveryTimeMode(models.TextChoices):
        DURATION = "duration", "Expected duration"
        DURATION_RANGE = "duration_range", "Expected duration range"
        DATE_RANGE = "date_range", "Date range"

    service_id = models.BigAutoField(primary_key=True)

    service_number = models.CharField(
        max_length=30,
        unique=True,
        blank=True,
        editable=False,
        db_index=True,
        help_text="Auto-generated service number, example: SRV-000001."
    )

    category = models.ForeignKey(
        ServiceCategory,
        on_delete=models.PROTECT,
        related_name="services"
    )
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.SET_NULL,
        related_name="services",
        null=True,
        blank=True,
    )
    scope = models.CharField(
        max_length=30,
        choices=Scope.choices,
        default=Scope.GLOBAL,
        db_index=True,
    )

    name_ar = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255)

    slug = models.SlugField(max_length=255, unique=True)

    short_description_ar = models.CharField(max_length=300, blank=True)
    short_description_en = models.CharField(max_length=300, blank=True)

    description_ar = models.TextField()
    description_en = models.TextField(blank=True)

    image = models.ImageField(
        upload_to="services/images/",
        blank=True,
        null=True
    )

    required_information_schema = models.JSONField(
        default=list,
        blank=True,
        help_text="Dynamic fields required from client when ordering this service."
    )

    price_type = models.CharField(
        max_length=20,
        choices=PriceType.choices,
        default=PriceType.FIXED
    )

    base_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))]
    )

    government_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))]
    )

    service_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))]
    )

    show_total_price_public = models.BooleanField(default=True)
    show_government_fee_public = models.BooleanField(default=False)
    show_company_fee_public = models.BooleanField(default=False)
    public_price_note_ar = models.TextField(blank=True)
    public_price_note_en = models.TextField(blank=True)

    estimated_duration = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)]
    )
    estimated_duration_min = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)]
    )
    estimated_duration_max = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)]
    )

    estimated_duration_unit = models.CharField(
        max_length=10,
        choices=DurationUnit.choices,
        default=DurationUnit.DAYS
    )

    delivery_time_mode = models.CharField(
        max_length=20,
        choices=DeliveryTimeMode.choices,
        default=DeliveryTimeMode.DURATION,
    )
    delivery_start_date = models.DateField(null=True, blank=True)
    delivery_end_date = models.DateField(null=True, blank=True)
    delivery_note_ar = models.TextField(blank=True)
    delivery_note_en = models.TextField(blank=True)

    terms_ar = models.TextField(blank=True)
    terms_en = models.TextField(blank=True)

    is_online = models.BooleanField(
        default=True,
        help_text="Can clients request this service online?"
    )

    requires_appointment = models.BooleanField(default=False)

    requires_manual_review = models.BooleanField(
        default=True,
        help_text="Employee must review the order before processing."
    )

    provider_required = models.BooleanField(
        default=True,
        help_text="This service requires a service provider to execute it."
    )

    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    show_on_public_site = models.BooleanField(default=True)

    display_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "name_ar"]
        verbose_name = "Service"
        verbose_name_plural = "Services"
        permissions = [
            ("manage_service_prices", "Can manage services and prices"),
        ]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["service_number"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["is_featured"]),
            models.Index(fields=["is_online"]),
            models.Index(fields=["display_order"]),
            models.Index(fields=["category", "is_active"]),
            models.Index(fields=["organization", "scope", "is_active"]),
            models.Index(fields=["show_on_public_site", "is_active"]),
            models.Index(fields=["is_deleted", "is_active"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(base_price__gte=0),
                name="service_base_price_gte_0"
            ),
            models.CheckConstraint(
                check=models.Q(government_fee__gte=0),
                name="service_government_fee_gte_0"
            ),
            models.CheckConstraint(
                check=models.Q(service_fee__gte=0),
                name="service_service_fee_gte_0"
            ),
            models.CheckConstraint(
                check=models.Q(estimated_duration__gte=1),
                name="service_estimated_duration_gte_1"
            ),
        ]

    @property
    def total_fee(self):
        return self.base_price + self.government_fee + self.service_fee

    def get_duration_unit_label_en(self):
        return self.get_estimated_duration_unit_display().lower()

    def get_duration_unit_label_ar(self):
        return "يوم" if self.estimated_duration_unit == self.DurationUnit.DAYS else "ساعة" if self.estimated_duration_unit == self.DurationUnit.HOURS else "أسبوع"

    def to_duration_delta(self, value):
        if self.estimated_duration_unit == self.DurationUnit.HOURS:
            return timedelta(hours=value)
        if self.estimated_duration_unit == self.DurationUnit.WEEKS:
            return timedelta(weeks=value)
        return timedelta(days=value)

    def delivery_time_payload(self):
        if self.delivery_time_mode == self.DeliveryTimeMode.DATE_RANGE:
            start_date = self.delivery_start_date.isoformat() if self.delivery_start_date else None
            end_date = self.delivery_end_date.isoformat() if self.delivery_end_date else None
            label_en = f"From {start_date} to {end_date}" if start_date and end_date else "Date range"
            label_ar = f"من {start_date} إلى {end_date}" if start_date and end_date else "فترة زمنية"
            return {
                "mode": self.delivery_time_mode,
                "label": label_en,
                "label_ar": label_ar,
                "label_en": label_en,
                "start_date": start_date,
                "end_date": end_date,
                "expected_duration": None,
                "expected_duration_unit": None,
                "note_ar": self.delivery_note_ar,
                "note_en": self.delivery_note_en,
            }

        unit_label_en = self.get_duration_unit_label_en()
        unit_label_ar = self.get_duration_unit_label_ar()
        if self.delivery_time_mode == self.DeliveryTimeMode.DURATION_RANGE:
            min_value = self.estimated_duration_min
            max_value = self.estimated_duration_max
            label_en = f"Expected completion: {min_value} to {max_value} {unit_label_en}"
            label_ar = f"المدة المتوقعة: من {min_value} إلى {max_value} {unit_label_ar}"
            return {
                "mode": self.delivery_time_mode,
                "label": label_en,
                "label_ar": label_ar,
                "label_en": label_en,
                "start_date": None,
                "end_date": None,
                "expected_duration": self.estimated_duration,
                "expected_duration_min": min_value,
                "expected_duration_max": max_value,
                "expected_duration_unit": self.estimated_duration_unit,
                "note_ar": self.delivery_note_ar,
                "note_en": self.delivery_note_en,
            }

        label_en = f"Expected completion: {self.estimated_duration} {unit_label_en}"
        label_ar = f"المدة المتوقعة: {self.estimated_duration} {unit_label_ar}"
        return {
            "mode": self.delivery_time_mode,
            "label": label_en,
            "label_ar": label_ar,
            "label_en": label_en,
            "start_date": None,
            "end_date": None,
            "expected_duration": self.estimated_duration,
            "expected_duration_min": None,
            "expected_duration_max": None,
            "expected_duration_unit": self.estimated_duration_unit,
            "note_ar": self.delivery_note_ar,
            "note_en": self.delivery_note_en,
        }

    def clean(self):
        errors = {}

        if self.category_id and self.is_active and not self.category.is_active:
            errors["category"] = "Active services must belong to an active category."
        if self.scope != self.Scope.GLOBAL and not self.organization_id:
            errors["organization"] = "Partner-scoped services must belong to an organization."
        if self.organization_id and not self.organization.is_active:
            errors["organization"] = "Services can only belong to active organizations."
        if self.is_active and self.category_id and self.category.is_deleted:
            errors["category"] = "Active services cannot belong to deleted categories."
        if self.delivery_time_mode == self.DeliveryTimeMode.DATE_RANGE:
            if not self.delivery_start_date:
                errors["delivery_start_date"] = "Start date is required for date-range delivery."
            if not self.delivery_end_date:
                errors["delivery_end_date"] = "End date is required for date-range delivery."
            if self.delivery_start_date and self.delivery_end_date and self.delivery_end_date < self.delivery_start_date:
                errors["delivery_end_date"] = "End date must be on or after the start date."
        elif self.delivery_time_mode == self.DeliveryTimeMode.DURATION_RANGE:
            if not self.estimated_duration_min:
                errors["estimated_duration_min"] = "Minimum expected duration is required for duration-range mode."
            if not self.estimated_duration_max:
                errors["estimated_duration_max"] = "Maximum expected duration is required for duration-range mode."
            if self.estimated_duration_min and self.estimated_duration_max and self.estimated_duration_max < self.estimated_duration_min:
                errors["estimated_duration_max"] = "Maximum expected duration must be greater than or equal to the minimum duration."
        else:
            if not self.estimated_duration:
                errors["estimated_duration"] = "Expected duration is required for duration mode."

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        if self.service_number:
            return f"{self.service_number} - {self.name_ar}"
        return self.name_ar

    @property
    def id(self):
        return self.pk

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if self.is_deleted:
            self.is_active = False
        if self.delivery_time_mode == self.DeliveryTimeMode.DURATION:
            self.estimated_duration_min = None
            self.estimated_duration_max = None
            self.delivery_start_date = None
            self.delivery_end_date = None
        elif self.delivery_time_mode == self.DeliveryTimeMode.DURATION_RANGE:
            self.delivery_start_date = None
            self.delivery_end_date = None
            self.estimated_duration = self.estimated_duration_max or self.estimated_duration_min or self.estimated_duration or 1
        elif self.delivery_time_mode == self.DeliveryTimeMode.DATE_RANGE:
            self.estimated_duration_min = None
            self.estimated_duration_max = None
        exclude = ["service_number"] if not self.service_number else None
        self.full_clean(exclude=exclude)

        super().save(*args, **kwargs)

        if is_new and not self.service_number:
            self.service_number = f"SRV-{self.service_id:06d}"
            super().save(update_fields=["service_number"])

class RequiredDocumentDefinition(SoftDeleteModel):
    definition_id = models.BigAutoField(primary_key=True)
    code = models.SlugField(max_length=120, unique=False)
    name_ar = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255, blank=True)
    description_ar = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    allowed_extensions = models.JSONField(default=list, blank=True)
    allowed_mime_types = models.JSONField(default=list, blank=True)
    max_file_size = models.PositiveBigIntegerField(default=10 * 1024 * 1024)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "name_ar"]
        constraints = [
            models.UniqueConstraint(
                fields=["code"],
                condition=Q(is_deleted=False, is_active=True),
                name="unique_active_required_document_definition_code",
            ),
            models.UniqueConstraint(
                fields=["name_ar"],
                condition=Q(is_deleted=False, is_active=True),
                name="unique_active_required_document_definition_name_ar",
            ),
        ]
        indexes = [
            models.Index(fields=["code", "is_active"]),
            models.Index(fields=["is_deleted", "is_active"]),
        ]

    def __str__(self):
        return self.name_ar

    @property
    def id(self):
        return self.pk

    def clean(self):
        self.code = _normalize_code(self.code or self.name_en or self.name_ar)
        self.allowed_extensions = _normalize_extension_list(self.allowed_extensions)
        self.allowed_mime_types = sorted(
            {
                str(value).strip().lower()
                for value in (self.allowed_mime_types or [])
                if str(value).strip()
            }
        )

        errors = {}
        if (
            self.code
            and type(self).objects.exclude(pk=self.pk).filter(code=self.code, is_deleted=False, is_active=True).exists()
        ):
            errors["code"] = "Document code must be unique among active definitions."
        if (
            self.name_ar
            and type(self).objects.exclude(pk=self.pk).filter(
                name_ar__iexact=(self.name_ar or "").strip(),
                is_deleted=False,
                is_active=True,
            ).exists()
        ):
            errors["name_ar"] = "Arabic document name must be unique among active definitions."
        if self.max_file_size <= 0:
            errors["max_file_size"] = "Maximum file size must be greater than zero."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.is_deleted:
            self.is_active = False
        self.full_clean()
        super().save(*args, **kwargs)


class ServiceRelation(SoftDeleteModel):
    class RelationType(models.TextChoices):
        PREREQUISITE = "prerequisite", "Required first"
        RECOMMENDED_AFTER = "recommended_after", "Recommended after completion"
        OPTIONAL_BUNDLE = "optional_bundle", "Optional bundle"
        ALTERNATIVE = "alternative", "Alternative option"

    relation_id = models.BigAutoField(primary_key=True)

    source_service = models.ForeignKey(
        "services.Service",
        on_delete=models.CASCADE,
        related_name="outgoing_relations"
    )

    target_service = models.ForeignKey(
        "services.Service",
        on_delete=models.CASCADE,
        related_name="incoming_relations"
    )

    relation_type = models.CharField(
        max_length=30,
        choices=RelationType.choices
    )

    is_required = models.BooleanField(default=False)
    message_to_customer = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_service_relations"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["source_service__name_ar", "target_service__name_ar", "relation_type"]
        verbose_name = "Service relation"
        verbose_name_plural = "Service relations"
        constraints = [
            models.UniqueConstraint(
                fields=["source_service", "target_service", "relation_type"],
                condition=Q(is_deleted=False),
                name="unique_service_relation_per_type"
            )
        ]
        indexes = [
            models.Index(fields=["source_service", "relation_type", "is_active"]),
            models.Index(fields=["target_service", "relation_type", "is_active"]),
            models.Index(fields=["is_active", "relation_type"]),
            models.Index(fields=["is_deleted", "is_active"]),
        ]

    def __str__(self):
        return f"{self.source_service} -> {self.target_service} ({self.relation_type})"

    @property
    def id(self):
        return self.pk

    def clean(self):
        errors = {}

        if self.source_service_id and self.target_service_id and self.source_service_id == self.target_service_id:
            errors["target_service"] = "Source service and target service must be different."

        if self.source_service_id and not self.source_service.is_active:
            errors["source_service"] = "Only active services can be selected."

        if self.target_service_id and not self.target_service.is_active:
            errors["target_service"] = "Only active services can be selected."

        if self.created_by_id and self.created_by.role not in {
            self.created_by.Role.ADMIN,
            self.created_by.Role.SUPPORT,
        }:
            errors["created_by"] = "Only admin or support users can create service relations."

        if (
            self.is_active
            and self.is_required
            and self.relation_type == self.RelationType.PREREQUISITE
            and self.source_service_id
            and self.target_service_id
        ):
            from services.service_relations import ensure_required_prerequisite_not_circular

            try:
                ensure_required_prerequisite_not_circular(
                    source_service_id=self.source_service_id,
                    target_service_id=self.target_service_id,
                    exclude_relation_id=self.pk,
                )
            except ValidationError as exc:
                if hasattr(exc, "message_dict"):
                    errors.update(exc.message_dict)
                else:
                    errors["target_service"] = exc.messages[0]

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.is_deleted:
            self.is_active = False
        self.full_clean()
        super().save(*args, **kwargs)


class ServiceProviderAssignment(SoftDeleteModel):
    assignment_id = models.BigAutoField(primary_key=True)

    service = models.ForeignKey(
        "services.Service",
        on_delete=models.CASCADE,
        related_name="provider_assignments"
    )

    provider = models.ForeignKey(
        "providers.ProviderProfile",
        on_delete=models.CASCADE,
        related_name="service_assignments"
    )

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["service", "provider"],
                condition=Q(is_deleted=False),
                name="unique_service_provider_assignment"
            )
        ]

    def clean(self):
        errors = {}
        if self.provider_id and self.provider.user.role != self.provider.user.Role.PROVIDER:
            errors["provider"] = "Assigned provider must belong to a provider user."
        if self.service_id and not self.service.provider_required:
            errors["service"] = "This service does not require provider assignments."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.is_deleted:
            self.is_active = False
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def id(self):
        return self.pk

class Address(SoftDeleteModel):
    address_id = models.BigAutoField(primary_key=True)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="addresses"
    )

    label = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100)
    area = models.CharField(max_length=100, blank=True)
    street = models.CharField(max_length=255, blank=True)
    building = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    is_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "is_default"]),
            models.Index(fields=["city"]),
            models.Index(fields=["is_deleted"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(is_default=True),
                name="unique_default_address_per_user",
            ),
        ]

    def clean(self):
        if self.user_id and self.user.role != self.user.Role.CUSTOMER:
            raise ValidationError({"user": "Addresses can only be linked to customer users."})

    def save(self, *args, **kwargs):
        if self.is_deleted:
            self.is_default = False
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def id(self):
        return self.pk

class ServiceRequiredDocument(SoftDeleteModel):
    requirement_id = models.BigAutoField(primary_key=True)

    service = models.ForeignKey(
        "services.Service",
        on_delete=models.CASCADE,
        related_name="document_requirements"
    )

    document_definition = models.ForeignKey(
        "services.RequiredDocumentDefinition",
        on_delete=models.PROTECT,
        related_name="service_links",
        null=True,
        blank=True,
    )

    document_type = models.CharField(max_length=120)
    name_ar = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255, blank=True)
    instructions_ar = models.TextField(blank=True)
    instructions_en = models.TextField(blank=True)

    is_required = models.BooleanField(default=True)
    allowed_extensions = models.JSONField(default=list, blank=True)
    max_file_size = models.PositiveBigIntegerField(default=10 * 1024 * 1024)
    requires_verification = models.BooleanField(default=True)
    client_can_replace_file = models.BooleanField(default=True)
    provider_can_view_file = models.BooleanField(default=False)

    display_order = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["display_order", "name_ar"]
        constraints = [
            models.UniqueConstraint(
                fields=["service", "document_type"],
                condition=Q(is_deleted=False),
                name="unique_service_required_document_type"
            ),
            models.UniqueConstraint(
                fields=["service", "document_definition"],
                condition=Q(is_deleted=False),
                name="unique_service_required_document_definition"
            ),
        ]
        indexes = [
            models.Index(fields=["service", "is_active"]),
            models.Index(fields=["service", "is_deleted"]),
            models.Index(fields=["document_definition", "is_active"]),
        ]

    def clean(self):
        if self.document_definition_id:
            self.document_type = self.document_definition.code
            self.name_ar = self.document_definition.name_ar
            self.name_en = self.document_definition.name_en
            if not self.allowed_extensions:
                self.allowed_extensions = list(self.document_definition.allowed_extensions or [])
            if not self.max_file_size:
                self.max_file_size = self.document_definition.max_file_size
        self.document_type = _normalize_code(self.document_type)
        self.allowed_extensions = _normalize_extension_list(self.allowed_extensions)

    def save(self, *args, **kwargs):
        if self.is_deleted:
            self.is_active = False
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def id(self):
        return self.pk
