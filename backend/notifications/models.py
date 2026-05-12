from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.choices import NotificationType as SystemNotificationType


class Notification(models.Model):
    class Channel(models.TextChoices):
        SYSTEM = "system", "System"
        EMAIL = "email", "Email"
        SMS = "sms", "SMS"
        WHATSAPP = "whatsapp", "WhatsApp"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        QUEUED = "queued", "Queued"
        SENT = "sent", "Sent"
        DELIVERED = "delivered", "Delivered"
        READ = "read", "Read"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    NotificationType = SystemNotificationType

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        NORMAL = "normal", "Normal"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    notification_id = models.BigAutoField(primary_key=True)

    # This creates user_id in the database.
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="notifications",
        null=True,
        blank=True
    )

    # Optional: who triggered the notification.
    # Example: employee changed order status, system sent payment reminder.
    # This creates actor_id in the database.
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="notifications_triggered",
        null=True,
        blank=True
    )

    # This creates order_id in the database.
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        related_name="notifications",
        null=True,
        blank=True
    )

    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
        db_index=True
    )

    channel = models.CharField(
        max_length=20,
        choices=Channel.choices,
        default=Channel.SYSTEM,
        db_index=True
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True
    )

    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.NORMAL,
        db_index=True
    )

    title = models.CharField(max_length=255)
    message = models.TextField()

    template = models.ForeignKey(
        "notifications.NotificationTemplate",
        on_delete=models.SET_NULL,
        related_name="notifications",
        null=True,
        blank=True,
    )

    template_key = models.CharField(
        max_length=120,
        blank=True,
        db_index=True,
        help_text="Example: order_submitted, payment_confirmed, missing_documents."
    )

    context_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Dynamic data used to render the notification template."
    )

    # Store actual destination used at sending time.
    recipient_email = models.EmailField(blank=True)
    recipient_phone = models.CharField(max_length=30, blank=True)

    external_message_id = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        help_text="Message ID returned by email/SMS/WhatsApp provider."
    )

    provider_response = models.JSONField(
        null=True,
        blank=True,
        help_text="Raw or summarized response from notification provider."
    )

    retry_count = models.PositiveIntegerField(default=0)
    max_retries = models.PositiveIntegerField(default=3)

    last_error = models.TextField(blank=True)

    next_retry_at = models.DateTimeField(
        null=True,
        blank=True
    )

    is_read = models.BooleanField(default=False, db_index=True)

    read_at = models.DateTimeField(
        null=True,
        blank=True
    )

    queued_at = models.DateTimeField(
        null=True,
        blank=True
    )

    sent_at = models.DateTimeField(
        null=True,
        blank=True
    )

    delivered_at = models.DateTimeField(
        null=True,
        blank=True
    )

    failed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        permissions = [
            ("send_manual_notification", "Can send manual notifications"),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(retry_count__lte=models.F("max_retries")),
                name="notification_retry_count_lte_max_retries",
            ),
            models.CheckConstraint(
                check=(
                    models.Q(is_read=False, read_at__isnull=True)
                    | models.Q(is_read=True, read_at__isnull=False)
                ),
                name="notification_read_state_consistent",
            ),
        ]
        indexes = [
            models.Index(fields=["recipient"]),
            models.Index(fields=["actor"]),
            models.Index(fields=["order"]),
            models.Index(fields=["channel"]),
            models.Index(fields=["status"]),
            models.Index(fields=["priority"]),
            models.Index(fields=["notification_type"]),
            models.Index(fields=["template_key"]),
            models.Index(fields=["is_read"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["recipient", "is_read"]),
            models.Index(fields=["recipient", "status"]),
            models.Index(fields=["order", "created_at"]),
            models.Index(fields=["channel", "status"]),
            models.Index(fields=["next_retry_at"]),
        ]

    def clean(self):
        errors = {}

        if self.template_id:
            self.template_key = self.template.key
            if self.channel != self.template.channel:
                errors["channel"] = "Notification channel must match the selected template channel."

        if self.status == self.Status.READ:
            self.is_read = True

        if self.is_read and not self.read_at:
            self.read_at = timezone.now()

        if self.read_at and not self.is_read:
            errors["read_at"] = "read_at requires is_read=True."

        if self.status == self.Status.QUEUED and not self.queued_at:
            self.queued_at = timezone.now()

        if self.status in {self.Status.SENT, self.Status.DELIVERED, self.Status.READ} and not self.sent_at:
            self.sent_at = timezone.now()

        if self.status == self.Status.DELIVERED and not self.delivered_at:
            self.delivered_at = timezone.now()

        if self.status == self.Status.FAILED:
            if not self.failed_at:
                self.failed_at = timezone.now()
            if not self.last_error:
                errors["last_error"] = "Failed notifications require last_error."

        if self.delivered_at and not self.sent_at:
            errors["delivered_at"] = "delivered_at requires sent_at."

        if self.read_at and not self.sent_at:
            errors["read_at"] = "read_at requires sent_at."

        if self.retry_count > self.max_retries:
            errors["retry_count"] = "retry_count cannot exceed max_retries."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.channel} | {self.title} | {self.status}"
    

class NotificationTemplate(models.Model):
    class Channel(models.TextChoices):
        SYSTEM = "system", "System"
        EMAIL = "email", "Email"
        SMS = "sms", "SMS"
        WHATSAPP = "whatsapp", "WhatsApp"

    template_id = models.BigAutoField(primary_key=True)

    key = models.CharField(
        max_length=120,
        db_index=True,
        help_text="Example: order_submitted, payment_confirmed."
    )

    channel = models.CharField(
        max_length=20,
        choices=Channel.choices,
        default=Channel.SYSTEM
    )

    title_ar = models.CharField(max_length=255, blank=True)
    title_en = models.CharField(max_length=255, blank=True)

    message_ar = models.TextField()
    message_en = models.TextField(blank=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["key", "channel"]
        verbose_name = "Notification template"
        verbose_name_plural = "Notification templates"
        constraints = [
            models.UniqueConstraint(
                fields=["key", "channel"],
                name="unique_notification_template_per_channel"
            )
        ]
        indexes = [
            models.Index(fields=["key"]),
            models.Index(fields=["channel"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.key} - {self.channel}"
