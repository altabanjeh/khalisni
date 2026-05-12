from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class ProviderProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="provider_profile",
    )
    provider_type = models.CharField(max_length=255)
    company_name = models.CharField(max_length=255, blank=True)
    commercial_registration_number = models.CharField(max_length=100, blank=True)
    tax_number = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    address = models.TextField(blank=True)
    service_categories = models.ManyToManyField("services.ServiceCategory", related_name="providers", blank=True)
    city = models.CharField(max_length=120)
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
    )
    total_completed_orders = models.PositiveIntegerField(default=0)
    is_available = models.BooleanField(default=True)
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_providers",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-rating", "user__full_name"]
        indexes = [
            models.Index(fields=["city"]),
            models.Index(fields=["is_available"]),
            models.Index(fields=["is_approved"]),
            models.Index(fields=["rating"]),
        ]

    def clean(self):
        errors = {}

        if self.user_id and self.user.role != self.user.Role.PROVIDER:
            errors["user"] = "Provider profiles can only be linked to provider users."

        if self.is_approved and not self.approved_at:
            self.approved_at = timezone.now()

        if self.approved_by_id and not self.is_approved:
            errors["approved_by"] = "approved_by can only be set for approved providers."

        if self.approved_at and not self.is_approved:
            errors["approved_at"] = "approved_at can only be set for approved providers."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.user.full_name
