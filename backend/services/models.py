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

    image = models.ImageField(
        upload_to="service_categories/images/",
        blank=True,
        null=True
    )

    display_order = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "name_ar"]
        verbose_name = "Service category"
        verbose_name_plural = "Service categories"
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["display_order"]),
        ]

    def __str__(self):
        return self.name_ar

    @property
    def id(self):
        return self.pk

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class Service(models.Model):
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
