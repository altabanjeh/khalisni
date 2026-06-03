from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = "create", "Create"
        UPDATE = "update", "Update"
        DELETE = "delete", "Delete"
        RESTORE = "restore", "Restore"
        REGISTER = "register", "Register"
        UPDATE_PROFILE = "update_profile", "Update profile"
        CREATE_ORDER = "create_order", "Create order"
        CUSTOMER_UPLOAD_DOCUMENT = "customer_upload_document", "Customer upload document"
        RATE_ORDER = "rate_order", "Rate order"
        CHANGE_ORDER_STATUS = "change_order_status", "Change order status"

        LOGIN = "login", "Login"
        LOGOUT = "logout", "Logout"
        PASSWORD_RESET_REQUEST = "password_reset_request", "Password reset request"
        PASSWORD_RESET_SUCCESS = "password_reset_success", "Password reset success"

        STATUS_CHANGE = "status_change", "Status change"
        ASSIGN = "assign", "Assign"
        UNASSIGN = "unassign", "Unassign"
        ASSIGN_PROVIDER = "assign_provider", "Assign provider"
        REQUEST_DOCUMENTS = "request_documents", "Request documents"
        ADD_NOTE = "add_note", "Add note"
        COMPLETE_ORDER = "complete_order", "Complete order"
        REJECT_ORDER = "reject_order", "Reject order"
        PROVIDER_STATUS_UPDATE = "provider_status_update", "Provider status update"
        PROVIDER_ADD_NOTE = "provider_add_note", "Provider add note"

        UPLOAD_DOCUMENT = "upload_document", "Upload document"
        UPLOAD_FINAL_DOCUMENT = "upload_final_document", "Upload final document"
        PROVIDER_UPLOAD_FINAL_DOCUMENT = "provider_upload_final_document", "Provider upload final document"
        DELETE_DOCUMENT = "delete_document", "Delete document"

        PAYMENT_UPDATE = "payment_update", "Payment update"
        COMMENT = "comment", "Comment"

        NOTIFICATION_SENT = "notification_sent", "Notification sent"
        SYSTEM_EVENT = "system_event", "System event"

    class Source(models.TextChoices):
        ADMIN = "admin", "Admin"
        CLIENT_PORTAL = "client_portal", "Client portal"
        EMPLOYEE_PORTAL = "employee_portal", "Employee portal"
        PROVIDER_PORTAL = "provider_portal", "Provider portal"
        API = "api", "API"
        SYSTEM = "system", "System"

    class LogStatus(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    audit_id = models.BigAutoField(primary_key=True)

    # This creates user_id in the database.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
        null=True,
        blank=True
    )

    user_role = models.CharField(
        max_length=30,
        blank=True,
        db_index=True,
        help_text="Snapshot of the acting user's role when the audit event was recorded."
    )

    action = models.CharField(
        max_length=50,
        choices=Action.choices,
        db_index=True
    )

    source = models.CharField(
        max_length=50,
        choices=Source.choices,
        default=Source.SYSTEM,
        db_index=True
    )

    status = models.CharField(
        max_length=20,
        choices=LogStatus.choices,
        default=LogStatus.SUCCESS,
        db_index=True
    )

    entity_type = models.CharField(
        max_length=120,
        db_index=True,
        help_text="Example: Order, Service, Payment, User"
    )

    entity_id = models.CharField(
        max_length=120,
        db_index=True,
        help_text="Primary key of the affected record."
    )

    entity_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Readable reference, example: ORD-000001 or SRV-000001."
    )

    old_values = models.JSONField(
        null=True,
        blank=True,
        help_text="Field values before the change."
    )

    new_values = models.JSONField(
        null=True,
        blank=True,
        help_text="Field values after the change."
    )

    changed_fields = models.JSONField(
        default=list,
        blank=True,
        help_text="List of fields changed by this action."
    )

    message = models.TextField(
        blank=True,
        help_text="Human-readable audit message."
    )

    error_message = models.TextField(
        blank=True,
        help_text="Used when status is failed."
    )

    request_id = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        help_text="Used to group logs from the same HTTP request or process."
    )

    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True
    )

    user_agent = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Audit log"
        verbose_name_plural = "Audit logs"
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["user_role", "created_at"]),
            models.Index(fields=["action", "created_at"]),
            models.Index(fields=["entity_type", "entity_id"]),
            models.Index(fields=["request_id"]),
            models.Index(fields=["source", "created_at"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return f"{self.created_at} | {self.action} | {self.entity_type}:{self.entity_id}"
