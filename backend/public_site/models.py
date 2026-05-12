from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator, MinValueValidator
from django.db import models, transaction
from django.utils import timezone

from public_site.validators import (
    HEX_COLOR_VALIDATOR,
    PublicSiteImageValidator,
    validate_no_script_content,
    validate_safe_url,
)


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SiteTheme(TimeStampedModel):
    theme_id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=120, default="Default Theme", validators=[validate_no_script_content])
    primary_color = models.CharField(max_length=7, validators=[HEX_COLOR_VALIDATOR])
    secondary_color = models.CharField(max_length=7, validators=[HEX_COLOR_VALIDATOR])
    background_color = models.CharField(max_length=7, validators=[HEX_COLOR_VALIDATOR])
    text_color = models.CharField(max_length=7, validators=[HEX_COLOR_VALIDATOR])
    header_background_color = models.CharField(max_length=7, validators=[HEX_COLOR_VALIDATOR])
    footer_background_color = models.CharField(max_length=7, validators=[HEX_COLOR_VALIDATOR])
    logo = models.FileField(
        upload_to="public_site/themes/logos/",
        blank=True,
        null=True,
        validators=[PublicSiteImageValidator()],
    )
    favicon = models.FileField(
        upload_to="public_site/themes/favicons/",
        blank=True,
        null=True,
        validators=[PublicSiteImageValidator(allow_favicon_types=True)],
    )
    active_theme = models.BooleanField(default=False)

    class Meta:
        ordering = ["-active_theme", "name", "-updated_at"]
        verbose_name = "Site theme"
        verbose_name_plural = "Site themes"
        indexes = [
            models.Index(fields=["active_theme"]),
            models.Index(fields=["updated_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["active_theme"],
                condition=models.Q(active_theme=True),
                name="unique_active_public_site_theme",
            ),
        ]

    def __str__(self):
        return self.name

    @property
    def id(self):
        return self.pk

    def save(self, *args, **kwargs):
        with transaction.atomic():
            if self.active_theme:
                self.__class__.objects.exclude(pk=self.pk).filter(active_theme=True).update(active_theme=False)
            self.full_clean()
            super().save(*args, **kwargs)


class PublicPageContent(TimeStampedModel):
    content_id = models.BigAutoField(primary_key=True)
    version_name = models.CharField(max_length=120, default="Default Homepage", validators=[validate_no_script_content])
    hero_title_ar = models.CharField(max_length=255, validators=[validate_no_script_content])
    hero_title_en = models.CharField(max_length=255, blank=True, validators=[validate_no_script_content])
    hero_subtitle_ar = models.TextField(validators=[validate_no_script_content])
    hero_subtitle_en = models.TextField(blank=True, validators=[validate_no_script_content])
    primary_button_text = models.CharField(max_length=120, validators=[validate_no_script_content])
    primary_button_url = models.CharField(max_length=500, validators=[validate_safe_url])
    secondary_button_text = models.CharField(max_length=120, blank=True, validators=[validate_no_script_content])
    secondary_button_url = models.CharField(max_length=500, blank=True, validators=[validate_safe_url])
    hero_image = models.FileField(
        upload_to="public_site/homepage/hero/",
        blank=True,
        null=True,
        validators=[PublicSiteImageValidator()],
    )
    how_it_works_text = models.TextField(validators=[validate_no_script_content])
    contact_phone = models.CharField(max_length=30, validators=[validate_no_script_content])
    whatsapp_number = models.CharField(max_length=30, validators=[validate_no_script_content])
    email = models.EmailField(validators=[EmailValidator()])
    office_address = models.CharField(max_length=255, validators=[validate_no_script_content])
    footer_text = models.TextField(validators=[validate_no_script_content])
    active_content = models.BooleanField(default=False)

    class Meta:
        ordering = ["-active_content", "-updated_at", "-content_id"]
        verbose_name = "Public page content"
        verbose_name_plural = "Public page contents"
        indexes = [
            models.Index(fields=["active_content"]),
            models.Index(fields=["updated_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["active_content"],
                condition=models.Q(active_content=True),
                name="unique_active_public_page_content",
            ),
        ]

    def __str__(self):
        return self.version_name

    @property
    def id(self):
        return self.pk

    def clean(self):
        errors = {}
        if bool(self.secondary_button_text) != bool(self.secondary_button_url):
            errors["secondary_button_url"] = "Secondary button text and URL must be provided together."
        if self.primary_button_text and not self.primary_button_url:
            errors["primary_button_url"] = "Primary button URL is required."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        with transaction.atomic():
            if self.active_content:
                self.__class__.objects.exclude(pk=self.pk).filter(active_content=True).update(active_content=False)
            self.full_clean()
            super().save(*args, **kwargs)


class AdvertisementQuerySet(models.QuerySet):
    def currently_public(self, now=None):
        current_time = now or timezone.now()
        return self.filter(is_active=True, start_date__lte=current_time).filter(
            models.Q(end_date__isnull=True) | models.Q(end_date__gte=current_time)
        ).order_by("display_order", "-start_date", "-advertisement_id")


class Advertisement(TimeStampedModel):
    class Type(models.TextChoices):
        NEW_SERVICE = "new_service", "New service"
        OFFICE_ANNOUNCEMENT = "office_announcement", "Office announcement"
        OFFER = "offer", "Offer"
        IMPORTANT_ALERT = "important_alert", "Important alert"
        GENERAL = "general", "General"

    advertisement_id = models.BigAutoField(primary_key=True)
    title_ar = models.CharField(max_length=255, validators=[validate_no_script_content])
    title_en = models.CharField(max_length=255, blank=True, validators=[validate_no_script_content])
    description_ar = models.TextField(validators=[validate_no_script_content])
    description_en = models.TextField(blank=True, validators=[validate_no_script_content])
    advertisement_type = models.CharField(max_length=30, choices=Type.choices, default=Type.GENERAL, db_index=True)
    image = models.FileField(
        upload_to="public_site/advertisements/",
        blank=True,
        null=True,
        validators=[PublicSiteImageValidator()],
    )
    button_text_ar = models.CharField(max_length=120, blank=True, validators=[validate_no_script_content])
    button_text_en = models.CharField(max_length=120, blank=True, validators=[validate_no_script_content])
    button_url = models.CharField(max_length=500, blank=True, validators=[validate_safe_url])
    background_color = models.CharField(max_length=7, blank=True, validators=[HEX_COLOR_VALIDATOR])
    text_color = models.CharField(max_length=7, blank=True, validators=[HEX_COLOR_VALIDATOR])
    display_order = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)], db_index=True)
    start_date = models.DateTimeField(default=timezone.now, db_index=True)
    end_date = models.DateTimeField(blank=True, null=True, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    objects = AdvertisementQuerySet.as_manager()

    class Meta:
        ordering = ["display_order", "-start_date", "-advertisement_id"]
        verbose_name = "Advertisement"
        verbose_name_plural = "Advertisements"
        indexes = [
            models.Index(fields=["advertisement_type", "is_active"]),
            models.Index(fields=["start_date", "end_date"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(end_date__isnull=True) | models.Q(end_date__gte=models.F("start_date")),
                name="public_site_ad_end_after_start",
            ),
        ]

    def __str__(self):
        return self.title_ar

    @property
    def id(self):
        return self.pk

    @property
    def is_currently_public(self):
        now = timezone.now()
        if not self.is_active:
            return False
        if self.start_date and self.start_date > now:
            return False
        if self.end_date and self.end_date < now:
            return False
        return True

    def clean(self):
        errors = {}
        if self.end_date and self.start_date and self.end_date < self.start_date:
            errors["end_date"] = "End date must be after the start date."
        if self.button_url and not (self.button_text_ar or self.button_text_en):
            errors["button_text_ar"] = "Add button text before publishing a button URL."
        if (self.button_text_ar or self.button_text_en) and not self.button_url:
            errors["button_url"] = "Button URL is required when button text is provided."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
