from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models


class ServiceCategory(models.Model):
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
        )
        if self.name_ar and duplicate_qs.exists():
            errors["name_ar"] = "Category name must be unique under the same parent category."

        if self.pk and not self.is_active and self.services.filter(is_active=True).exists():
            errors["is_active"] = "Deactivate or reassign active services before deactivating this category."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if not self.sort_order and self.display_order:
            self.sort_order = self.display_order
        self.full_clean()
        super().save(*args, **kwargs)


class Service(models.Model):
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

    estimated_duration = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)]
    )

    estimated_duration_unit = models.CharField(
        max_length=10,
        choices=DurationUnit.choices,
        default=DurationUnit.DAYS
    )

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

    def clean(self):
        errors = {}

        if self.category_id and self.is_active and not self.category.is_active:
            errors["category"] = "Active services must belong to an active category."
        if self.scope != self.Scope.GLOBAL and not self.organization_id:
            errors["organization"] = "Partner-scoped services must belong to an organization."
        if self.organization_id and not self.organization.is_active:
            errors["organization"] = "Services can only belong to active organizations."

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
        exclude = ["service_number"] if not self.service_number else None
        self.full_clean(exclude=exclude)

        super().save(*args, **kwargs)

        if is_new and not self.service_number:
            self.service_number = f"SRV-{self.service_id:06d}"
            super().save(update_fields=["service_number"])


class ServiceRelation(models.Model):
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
                name="unique_service_relation_per_type"
            )
        ]
        indexes = [
            models.Index(fields=["source_service", "relation_type", "is_active"]),
            models.Index(fields=["target_service", "relation_type", "is_active"]),
            models.Index(fields=["is_active", "relation_type"]),
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
        self.full_clean()
        super().save(*args, **kwargs)

class ServiceProviderAssignment(models.Model):
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
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def id(self):
        return self.pk

class Address(models.Model):
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
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def id(self):
        return self.pk

class ServiceRequiredDocument(models.Model):
    requirement_id = models.BigAutoField(primary_key=True)

    service = models.ForeignKey(
        "services.Service",
        on_delete=models.CASCADE,
        related_name="document_requirements"
    )

    document_type = models.CharField(max_length=120)
    name_ar = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255, blank=True)

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
                name="unique_service_required_document_type"
            )
        ]

    def clean(self):
        self.document_type = (self.document_type or "").strip().lower()
        self.allowed_extensions = sorted(
            {extension.lower() for extension in (self.allowed_extensions or []) if extension}
        )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def id(self):
        return self.pk
