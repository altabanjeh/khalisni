import os
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.text import get_valid_filename


def secure_document_upload_path(instance, filename):
    """
    Store uploaded files using a generated filename, not the user filename.

    Original filename is stored separately in original_filename.
    """
    extension = os.path.splitext(filename)[1].lower()

    order_ref = "unassigned"

    if instance.order_id:
        if hasattr(instance.order, "order_number") and instance.order.order_number:
            order_ref = instance.order.order_number
        else:
            order_ref = str(instance.order_id)

    generated_name = f"{uuid.uuid4().hex}{extension}"

    return f"secure_orders/{order_ref}/documents/{generated_name}"


# Backward-compatible alias for older migrations.
document_upload_path = secure_document_upload_path


class Document(models.Model):
    class DocumentStatus(models.TextChoices):
        UPLOADED = "uploaded", "Uploaded"
        PENDING_SCAN = "pending_scan", "Pending security scan"
        SAFE = "safe", "Safe"
        UNSAFE = "unsafe", "Unsafe"
        PENDING_REVIEW = "pending_review", "Pending review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        ARCHIVED = "archived", "Archived"

    class ScanStatus(models.TextChoices):
        NOT_SCANNED = "not_scanned", "Not scanned"
        PENDING = "pending", "Pending"
        CLEAN = "clean", "Clean"
        INFECTED = "infected", "Infected"
        FAILED = "failed", "Scan failed"

    class UploadedByRole(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        EMPLOYEE = "employee", "Employee"
        PROVIDER = "provider", "Provider"
        ADMIN = "admin", "Admin"
        SYSTEM = "system", "System"

    document_id = models.BigAutoField(primary_key=True)

    # This creates order_id in the database.
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.PROTECT,
        related_name="documents"
    )

    # This creates uploaded_by_id in the database.
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="uploaded_documents",
        null=True,
        blank=True
    )

    uploaded_by_role = models.CharField(
        max_length=30,
        choices=UploadedByRole.choices,
        blank=True,
        db_index=True
    )

    document_type = models.CharField(
        max_length=120,
        db_index=True,
        help_text="Example: national_id, passport_copy, payment_receipt, final_report."
    )

    title = models.CharField(
        max_length=255,
        blank=True,
        help_text="Readable document title."
    )

    file = models.FileField(
        upload_to=secure_document_upload_path
    )

    original_filename = models.CharField(
        max_length=255,
        blank=True
    )

    stored_filename = models.CharField(
        max_length=255,
        blank=True,
        editable=False
    )

    file_extension = models.CharField(
        max_length=20,
        blank=True,
        db_index=True
    )

    file_size = models.PositiveBigIntegerField(default=0)

    mime_type = models.CharField(
        max_length=120,
        blank=True,
        help_text="Declared or detected MIME type."
    )

    checksum_sha256 = models.CharField(
        max_length=64,
        blank=True,
        db_index=True,
        help_text="SHA-256 checksum for integrity/deduplication."
    )

    status = models.CharField(
        max_length=30,
        choices=DocumentStatus.choices,
        default=DocumentStatus.UPLOADED,
        db_index=True
    )

    scan_status = models.CharField(
        max_length=30,
        choices=ScanStatus.choices,
        default=ScanStatus.NOT_SCANNED,
        db_index=True
    )

    scan_engine = models.CharField(
        max_length=100,
        blank=True,
        help_text="Example: ClamAV, external_scan_service."
    )

    scan_result = models.JSONField(
        null=True,
        blank=True,
        help_text="Security scan result details."
    )

    scanned_at = models.DateTimeField(
        null=True,
        blank=True
    )

    is_final_document = models.BooleanField(default=False, db_index=True)

    auto_approved_by_rule = models.BooleanField(
        default=False,
        db_index=True,
        help_text="True when the document was approved automatically by a service rule (requires_verification=False), not by a human reviewer.",
    )

    is_verified = models.BooleanField(default=False, db_index=True)

    # This creates verified_by_id in the database.
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="verified_documents",
        null=True,
        blank=True
    )

    verified_at = models.DateTimeField(
        null=True,
        blank=True
    )

    verification_note = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)

    is_deleted = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Soft delete flag. Do not physically delete important documents."
    )

    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="deleted_documents",
        null=True,
        blank=True
    )

    deleted_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Document"
        verbose_name_plural = "Documents"
        permissions = [
            ("verify_document", "Can verify documents"),
            ("upload_final_document", "Can upload final documents"),
            ("delete_sensitive_document", "Can delete sensitive documents"),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(file_size__gte=0),
                name="document_file_size_gte_0",
            ),
        ]
        indexes = [
            models.Index(fields=["order"]),
            models.Index(fields=["uploaded_by"]),
            models.Index(fields=["verified_by"]),
            models.Index(fields=["document_type"]),
            models.Index(fields=["status"]),
            models.Index(fields=["scan_status"]),
            models.Index(fields=["is_verified"]),
            models.Index(fields=["is_final_document"]),
            models.Index(fields=["is_deleted"]),
            models.Index(fields=["checksum_sha256"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["order", "document_type"]),
            models.Index(fields=["order", "status"]),
            models.Index(fields=["order", "is_deleted", "status"], name="doc_order_deleted_status_idx"),
        ]

    def clean(self):
        errors = {}

        if self.file:
            allowed_extensions = getattr(
                settings,
                "ALLOWED_UPLOAD_EXTENSIONS",
                [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"]
            )

            allowed_mime_types = getattr(
                settings,
                "ALLOWED_UPLOAD_MIME_TYPES",
                [
                    "application/pdf",
                    "image/jpeg",
                    "image/png",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ]
            )

            max_size = getattr(
                settings,
                "FILE_UPLOAD_MAX_SIZE",
                10 * 1024 * 1024
            )

            original_name = self.file.name or ""
            safe_original_name = get_valid_filename(os.path.basename(original_name))

            extension = os.path.splitext(safe_original_name)[1].lower()

            if not extension:
                errors["file"] = "File must have an extension."

            if extension and extension not in allowed_extensions:
                errors["file"] = "Unsupported file extension."

            if self.file_size and self.file_size > max_size:
                errors["file_size"] = "File exceeds maximum allowed size."

            if self.mime_type and self.mime_type not in allowed_mime_types:
                errors["mime_type"] = "Unsupported MIME type."

            dangerous_extensions = {
                ".exe", ".bat", ".cmd", ".sh", ".php", ".phtml", ".js",
                ".jar", ".msi", ".dll", ".scr", ".vbs", ".ps1", ".html",
                ".htm", ".svg"
            }

            if extension in dangerous_extensions:
                errors["file"] = "This file type is not allowed for security reasons."

        if self.is_verified and not self.verified_by_id:
            errors["verified_by"] = "Verified documents require verified_by."

        if self.verified_by_id and not self.verified_at:
            self.verified_at = timezone.now()

        if self.verified_at and not self.verified_by_id:
            errors["verified_at"] = "verified_at requires verified_by."

        if self.status == self.DocumentStatus.REJECTED and not self.rejection_reason:
            errors["rejection_reason"] = "Rejected documents require a rejection reason."

        if self.deleted_by_id and not self.deleted_at:
            self.deleted_at = timezone.now()

        if self.deleted_at and not self.deleted_by_id:
            errors["deleted_at"] = "deleted_at requires deleted_by."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.file:
            if not self.original_filename:
                self.original_filename = get_valid_filename(
                    os.path.basename(self.file.name)
                )

            if not self.file_size:
                self.file_size = self.file.size

            self.file_extension = os.path.splitext(
                self.original_filename
            )[1].lower()

        self.full_clean()

        super().save(*args, **kwargs)

        if self.file and not self.stored_filename:
            self.stored_filename = os.path.basename(self.file.name)
            super().save(update_fields=["stored_filename"])

    def mark_verified(self, user=None, note=""):
        self.is_verified = True
        self.status = self.DocumentStatus.APPROVED
        self.verified_by = user
        self.verified_at = timezone.now()
        self.verification_note = note
        self.save(
            update_fields=[
                "is_verified",
                "status",
                "verified_by",
                "verified_at",
                "verification_note",
                "updated_at",
            ]
        )

    def mark_rejected(self, user=None, reason=""):
        self.is_verified = False
        self.status = self.DocumentStatus.REJECTED
        self.verified_by = user
        self.verified_at = timezone.now()
        self.rejection_reason = reason
        self.save(
            update_fields=[
                "is_verified",
                "status",
                "verified_by",
                "verified_at",
                "rejection_reason",
                "updated_at",
            ]
        )

    def soft_delete(self, user=None):
        self.is_deleted = True
        self.deleted_by = user
        self.deleted_at = timezone.now()
        self.save(
            update_fields=[
                "is_deleted",
                "deleted_by",
                "deleted_at",
                "updated_at",
            ]
        )

    def __str__(self):
        return self.title or self.original_filename or f"Document #{self.document_id}"

    @property
    def id(self):
        return self.pk
