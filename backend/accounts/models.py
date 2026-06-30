from django.conf import settings
from django.core.exceptions import ValidationError
from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from core.choices import UserRole
from core.models import SoftDeleteModel


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)

        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("role", CustomUser.Role.ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_email_verified", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")

        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class CustomUser(SoftDeleteModel, AbstractBaseUser, PermissionsMixin):
    Role = UserRole

    user_id = models.BigAutoField(primary_key=True)

    full_name = models.CharField(max_length=255)

    email = models.EmailField(
        unique=True,
        db_index=True
    )

    phone = models.CharField(
        max_length=30,
        blank=True,
        db_index=True
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CUSTOMER,
        db_index=True
    )

    national_id = models.CharField(
        max_length=32,
        blank=True,
        db_index=True
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Controls whether the account can log in."
    )

    is_staff = models.BooleanField(
        default=False,
        help_text="Controls access to Django admin."
    )

    is_email_verified = models.BooleanField(default=False)
    is_phone_verified = models.BooleanField(default=False)

    is_verified = models.BooleanField(
        default=False,
        help_text="Business/identity verification status."
    )

    last_login_ip = models.GenericIPAddressField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    objects = CustomUserManager()

    class Meta:
        ordering = ["full_name"]
        verbose_name = "User"
        verbose_name_plural = "Users"
        constraints = [
            models.UniqueConstraint(
                fields=["phone"],
                condition=~models.Q(phone=""),
                name="unique_non_empty_user_phone",
            ),
            models.UniqueConstraint(
                fields=["national_id"],
                condition=~models.Q(national_id=""),
                name="unique_non_empty_user_national_id",
            ),
        ]
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["phone"]),
            models.Index(fields=["role"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["is_verified"]),
            models.Index(fields=["created_at"]),
        ]
        permissions = [
            ("manage_user_roles", "Can manage users and roles"),
        ]

    def clean(self):
        if self.email:
            self.email = self.__class__.objects.normalize_email(self.email)
        if self.role == self.Role.PROVIDER and not self.phone:
            raise ValidationError({"phone": "Provider accounts require a phone number."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.email})"

    @property
    def id(self):
        return self.pk


class CustomerProfile(models.Model):
    customer_profile_id = models.BigAutoField(primary_key=True)

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="customer_profile"
    )

    national_id = models.CharField(max_length=32, blank=True)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.PROTECT,
        related_name="customer_profiles",
        null=True,
        blank=True,
    )
    address = models.TextField(blank=True)
    date_of_birth = models.DateField(null=True, blank=True)

    is_identity_verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        errors = {}
        if self.user_id and self.user.role != self.user.Role.CUSTOMER:
            errors["user"] = "Customer profiles can only be linked to customer users."
        if self.organization_id and not self.organization.is_active:
            errors["organization"] = "Customer profiles can only be linked to active organizations."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

class SystemSetting(models.Model):
    setting_id = models.BigAutoField(primary_key=True)

    key = models.CharField(max_length=120, unique=True)
    value = models.JSONField(default=dict, blank=True)

    description = models.TextField(blank=True)

    updated_at = models.DateTimeField(auto_now=True)


class PasswordResetToken(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
    )
    token_hash = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    request_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["token_hash"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["expires_at"]),
        ]

    @property
    def is_used(self):
        return self.used_at is not None

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at
