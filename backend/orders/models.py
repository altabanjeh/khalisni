from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models, transaction
from django.utils import timezone

from core.choices import OrderPriority, OrderStatus, UserRole
from core.models import SoftDeleteModel
from workflow.rules import get_allowed_order_transitions
from workflow.services import validate_order_transition


class Order(models.Model):
    """
    Main order table.

    This model represents the complete lifecycle of a customer service order:
    - Customer creates order
    - Employee reviews it
    - Employee may request missing information
    - Employee assigns provider
    - Provider works on it
    - Order is completed, rejected, cancelled, or archived
    """

    Status = OrderStatus
    Priority = OrderPriority

    """
    Allowed workflow transitions.

    This prevents dangerous jumps like:
    NEW -> COMPLETED
    COMPLETED -> IN_PROGRESS
    REJECTED -> ASSIGNED
    """
    ALLOWED_STATUS_TRANSITIONS = get_allowed_order_transitions()

    order_number = models.CharField(
        max_length=32,
        unique=True,
        blank=True,
        db_index=True,
        help_text="Public order number, generated after creation.",
    )

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="customer_orders",
    )
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.PROTECT,
        related_name="orders",
        null=True,
        blank=True,
    )
    branch = models.ForeignKey(
        "organizations.Branch",
        on_delete=models.PROTECT,
        related_name="orders",
        null=True,
        blank=True,
    )

    service = models.ForeignKey(
        "services.Service",
        on_delete=models.PROTECT,
        related_name="orders",
    )

    service_name_snapshot = models.CharField(
        max_length=255,
        blank=True,
        default="",
        db_index=True,
    )

    service_category_name_snapshot = models.CharField(
        max_length=255,
        blank=True,
        default="",
        db_index=True,
    )
    organization_name_snapshot = models.CharField(
        max_length=255,
        blank=True,
        default="",
        db_index=True,
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.NEW,
        db_index=True,
    )

    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.NORMAL,
        db_index=True,
    )

    assigned_provider = models.ForeignKey(
        "providers.ProviderProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_orders",
    )
    assigned_provider_organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_provider_orders",
    )

    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders_assigned",
        help_text="Employee/admin who assigned the order to the provider.",
    )

    assigned_employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_employee_orders",
        help_text="Current internal employee owner of the order.",
    )

    city = models.CharField(
        max_length=120,
        db_index=True,
    )

    expected_delivery_date = models.DateField(
        null=True,
        blank=True,
    )
    expected_delivery_mode = models.CharField(
        max_length=20,
        default="duration",
        blank=True,
    )
    expected_duration_value_snapshot = models.PositiveIntegerField(null=True, blank=True)
    expected_duration_unit_snapshot = models.CharField(max_length=10, blank=True)
    expected_delivery_start_date = models.DateField(null=True, blank=True)
    expected_delivery_end_date = models.DateField(null=True, blank=True)
    expected_delivery_note_snapshot = models.TextField(blank=True)

    final_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Frozen price at order creation time.",
    )

    customer_notes = models.TextField(
        blank=True,
        help_text="Notes submitted by the customer.",
    )

    missing_document_types = models.JSONField(
        default=list,
        blank=True,
        help_text="Requested customer uploads still required to move the order forward.",
    )

    internal_notes = models.TextField(
        blank=True,
        help_text="Private notes visible only to internal staff.",
    )

    rejection_reason = models.TextField(
        blank=True,
    )

    cancellation_reason = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    archived_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                check=models.Q(final_price__gte=0) | models.Q(final_price__isnull=True),
                name="order_final_price_gte_0",
            ),
        ]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["priority", "created_at"]),
            models.Index(fields=["customer", "created_at"]),
            models.Index(fields=["assigned_employee", "status"]),
            models.Index(fields=["assigned_provider", "status"]),
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["branch", "status"]),
            models.Index(fields=["assigned_provider_organization", "status"]),
            models.Index(fields=["city", "status"]),
            models.Index(fields=["expected_delivery_date"]),
        ]
        verbose_name = "Order"
        verbose_name_plural = "Orders"
        permissions = [
            ("submit_order", "Can submit orders"),
            ("cancel_order", "Can cancel orders"),
            ("review_order", "Can review orders"),
            ("request_missing_documents", "Can request missing documents"),
            ("assign_order", "Can assign orders"),
            ("process_order", "Can process provider work"),
            ("complete_order", "Can complete orders"),
            ("reject_order", "Can reject orders"),
            ("manage_order_workflow", "Can manage order workflow"),
            ("view_reports_dashboard", "Can view reports dashboard"),
            ("export_order_reports", "Can export order reports"),
        ]

    def __str__(self):
        return self.order_number or f"Order {self.pk}"

    @property
    def is_final_state(self):
        return self.status in {
            self.Status.COMPLETED,
            self.Status.REJECTED,
            self.Status.CANCELLED,
            self.Status.ARCHIVED,
        }

    @property
    def is_active(self):
        return self.status not in {
            self.Status.COMPLETED,
            self.Status.REJECTED,
            self.Status.CANCELLED,
            self.Status.ARCHIVED,
        }

    @property
    def is_archived(self):
        return self.status == self.Status.ARCHIVED

    def clean(self):
        errors = {}

        if self.final_price is not None and self.final_price < Decimal("0.00"):
            errors["final_price"] = "Final price cannot be negative."

        if self.customer_id and self.customer.role != self.customer.Role.CUSTOMER:
            errors["customer"] = "Orders can only belong to customer users."
        if not self.organization_id:
            errors["organization"] = "Every order must belong to an organization."
        if self.branch_id and self.organization_id and self.branch.organization_id != self.organization_id:
            errors["branch"] = "Branch must belong to the same organization as the order."
        if self.customer_id:
            customer_profile = getattr(self.customer, "customer_profile", None)
            if customer_profile and customer_profile.organization_id and self.organization_id:
                if customer_profile.organization_id != self.organization_id:
                    errors["organization"] = "Order organization must match the customer organization."

        if self.assigned_by_id and self.assigned_by.role not in {
            self.assigned_by.Role.ADMIN,
            self.assigned_by.Role.EMPLOYEE,
            self.assigned_by.Role.SUPPORT,
        }:
            errors["assigned_by"] = "assigned_by must be an internal staff user."

        if self.assigned_employee_id and self.assigned_employee.role not in {
            UserRole.ADMIN,
            UserRole.EMPLOYEE,
            UserRole.SUPPORT,
        }:
            errors["assigned_employee"] = "assigned_employee must be an internal staff user."

        if self.assigned_provider_id and not self.service.provider_required:
            errors["assigned_provider"] = "This service does not require an assigned provider."
        if self.assigned_provider_id and self.assigned_provider.organization_id and self.assigned_provider_organization_id:
            if self.assigned_provider.organization_id != self.assigned_provider_organization_id:
                errors["assigned_provider_organization"] = "Assigned provider organization must match the assigned provider profile."
        if self.assigned_provider_id and self.assigned_provider.organization_id and not self.assigned_provider_organization_id:
            self.assigned_provider_organization = self.assigned_provider.organization
        if self.assigned_provider_organization_id and self.assigned_provider_organization.organization_type != self.assigned_provider_organization.OrganizationType.PROVIDER:
            errors["assigned_provider_organization"] = "Assigned provider organization must be a provider organization."

        if self.status == self.Status.ASSIGNED and not self.assigned_provider:
            errors["assigned_provider"] = "Assigned orders require a provider."

        if self.status == self.Status.IN_PROGRESS and not self.assigned_provider:
            errors["assigned_provider"] = "In-progress orders require a provider."

        if self.status == self.Status.REJECTED and not self.rejection_reason:
            errors["rejection_reason"] = "Rejected orders require a rejection reason."

        if self.status == self.Status.CANCELLED and not self.cancellation_reason:
            errors["cancellation_reason"] = "Cancelled orders require a cancellation reason."

        if self.completed_at and self.status not in {self.Status.COMPLETED, self.Status.ARCHIVED}:
            errors["completed_at"] = "completed_at can only be set when order is completed or archived."

        if self.cancelled_at and self.status not in {self.Status.CANCELLED, self.Status.ARCHIVED}:
            errors["cancelled_at"] = "cancelled_at can only be set when order is cancelled or archived."

        if self.archived_at and self.status != self.Status.ARCHIVED:
            errors["archived_at"] = "archived_at can only be set when order is archived."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        creating = self._state.adding

        if self.final_price is None and self.service_id:
            self.final_price = self.service.total_fee

        if self.service_id and not self.service_name_snapshot:
            self.service_name_snapshot = self.service.name_ar

        if self.service_id and not self.service_category_name_snapshot:
            self.service_category_name_snapshot = self.service.category.name_ar
        if self.organization_id and not self.organization_name_snapshot:
            self.organization_name_snapshot = self.organization.name
        if self.service_id and not self.organization_id:
            if self.service.organization_id:
                self.organization = self.service.organization
            else:
                customer_profile = getattr(self.customer, "customer_profile", None)
                if customer_profile and customer_profile.organization_id:
                    self.organization = customer_profile.organization
        if not self.organization_id:
            from organizations.models import Organization

            fallback_org = (
                Organization.objects.filter(
                    organization_type=Organization.OrganizationType.PARTNER,
                    is_active=True,
                )
                .order_by("created_at")
                .first()
            )
            if fallback_org is None:
                fallback_org = (
                    Organization.objects.filter(
                        organization_type=Organization.OrganizationType.PLATFORM,
                        is_active=True,
                    )
                    .order_by("created_at")
                    .first()
                )
            if fallback_org is not None:
                self.organization = fallback_org
        if self.assigned_provider_id and not self.assigned_provider_organization_id and self.assigned_provider.organization_id:
            self.assigned_provider_organization = self.assigned_provider.organization

        if self.service_id:
            if creating:
                self.expected_delivery_mode = getattr(self.service, "delivery_time_mode", "duration")
                self.expected_duration_value_snapshot = self.service.estimated_duration
                self.expected_duration_unit_snapshot = self.service.estimated_duration_unit
                if self.expected_delivery_mode == "date_range":
                    self.expected_delivery_start_date = getattr(self.service, "delivery_start_date", None)
                    self.expected_delivery_end_date = getattr(self.service, "delivery_end_date", None)
                self.expected_delivery_note_snapshot = getattr(self.service, "delivery_note_ar", "") or getattr(self.service, "delivery_note_en", "")
            else:
                if not self.expected_delivery_mode:
                    self.expected_delivery_mode = getattr(self.service, "delivery_time_mode", "duration")
                if self.expected_duration_value_snapshot is None:
                    self.expected_duration_value_snapshot = self.service.estimated_duration
                if not self.expected_duration_unit_snapshot:
                    self.expected_duration_unit_snapshot = self.service.estimated_duration_unit
                if self.expected_delivery_mode == "date_range" and not self.expected_delivery_start_date:
                    self.expected_delivery_start_date = getattr(self.service, "delivery_start_date", None)
                if self.expected_delivery_mode == "date_range" and not self.expected_delivery_end_date:
                    self.expected_delivery_end_date = getattr(self.service, "delivery_end_date", None)
                if not self.expected_delivery_note_snapshot:
                    self.expected_delivery_note_snapshot = getattr(self.service, "delivery_note_ar", "") or getattr(self.service, "delivery_note_en", "")

        if self.expected_delivery_date is None and self.service_id:
            delivery_mode = getattr(self.service, "delivery_time_mode", "duration")
            if delivery_mode == "date_range":
                self.expected_delivery_date = self.service.delivery_end_date
            elif delivery_mode == "duration_range":
                base_date = timezone.localdate()
                min_duration = self.service.estimated_duration_min or self.service.estimated_duration or 1
                max_duration = self.service.estimated_duration_max or self.service.estimated_duration or min_duration
                self.expected_duration_value_snapshot = max_duration
                self.expected_delivery_start_date = base_date + self.service.to_duration_delta(min_duration)
                self.expected_delivery_end_date = base_date + self.service.to_duration_delta(max_duration)
                self.expected_delivery_date = self.expected_delivery_end_date
            else:
                self.expected_delivery_date = timezone.localdate() + self.service.to_duration_delta(self.service.estimated_duration)

        now = timezone.now()

        if self.status == self.Status.COMPLETED and self.completed_at is None:
            self.completed_at = now

        if self.status == self.Status.CANCELLED and self.cancelled_at is None:
            self.cancelled_at = now

        if self.status == self.Status.ARCHIVED and self.archived_at is None:
            self.archived_at = now

        exclude = ["order_number"] if not self.order_number else None
        self.full_clean(exclude=exclude)
        super().save(*args, **kwargs)

        if creating and not self.order_number:
            order_number = f"KH-{self.created_at.year}-{self.pk:06d}"
            type(self).objects.filter(pk=self.pk).update(order_number=order_number)
            self.order_number = order_number

    def can_transition_to(self, new_status):
        return new_status in self.ALLOWED_STATUS_TRANSITIONS.get(self.status, [])

    def transition_status(self, new_status, changed_by=None, note=""):
        """
        Safely move the order from one status to another.

        Always use this method instead of directly doing:
        order.status = ...
        order.save()
        """

        if new_status == self.status:
            return self

        validate_order_transition(self.status, new_status)

        if new_status == self.Status.REJECTED and not (self.rejection_reason or note):
            raise ValidationError("Rejected orders require a rejection reason.")

        if new_status == self.Status.CANCELLED and not (self.cancellation_reason or note):
            raise ValidationError("Cancelled orders require a cancellation reason.")

        old_status = self.status
        self.status = new_status

        if new_status == self.Status.REJECTED and note and not self.rejection_reason:
            self.rejection_reason = note

        if new_status == self.Status.CANCELLED and note and not self.cancellation_reason:
            self.cancellation_reason = note

        now = timezone.now()

        if new_status == self.Status.COMPLETED:
            self.completed_at = now

        if new_status == self.Status.CANCELLED:
            self.cancelled_at = now

        if new_status == self.Status.ARCHIVED:
            self.archived_at = now

        with transaction.atomic():
            self.save()
            OrderStatusLog.objects.create(
                order=self,
                old_status=old_status,
                new_status=new_status,
                changed_by=changed_by,
                note=note,
            )

        return self

    def assign_provider(self, provider, assigned_by=None, note=""):
        """
        Assign order to a service provider.

        This method sets the provider and moves the order to ASSIGNED.
        """

        if self.status not in {
            self.Status.UNDER_REVIEW,
        }:
            raise ValidationError(
                f"Order cannot be assigned while its status is {self.status}."
            )

        if provider is None:
            raise ValidationError("Provider is required.")

        if not provider.is_available:
            raise ValidationError("Provider is not currently available.")

        if not provider.is_approved:
            raise ValidationError("Provider must be approved before assignment.")

        if not self.service.provider_required:
            raise ValidationError("This service does not require a provider.")

        has_service_assignment = self.service.provider_assignments.filter(
            provider=provider,
            is_active=True,
        ).exists()
        has_category_assignment = provider.service_categories.filter(
            pk=self.service.category_id
        ).exists()
        if not (has_service_assignment or has_category_assignment):
            raise ValidationError(
                "Provider is not linked to this service or its category."
            )

        old_status = self.status

        self.assigned_provider = provider
        self.assigned_by = assigned_by
        self.status = self.Status.ASSIGNED

        with transaction.atomic():
            self.save()
            OrderAssignmentHistory.objects.create(
                order=self,
                assigned_to=provider.user,
                assigned_by=assigned_by,
                assignment_type="provider",
                note=note or "Order assigned to provider.",
            )
            OrderStatusLog.objects.create(
                order=self,
                old_status=old_status,
                new_status=self.Status.ASSIGNED,
                changed_by=assigned_by,
                note=note or "Order assigned to provider.",
            )

        return self


class OrderStatusLog(models.Model):
    """
    Audit table for every order status change.

    This should never be edited manually unless you are fixing corrupted data.
    """

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="status_logs",
    )

    old_status = models.CharField(
        max_length=30,
        choices=Order.Status.choices,
        blank=True,
    )

    new_status = models.CharField(
        max_length=30,
        choices=Order.Status.choices,
    )

    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_status_changes",
    )

    note = models.TextField(blank=True)

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["order", "created_at"]),
            models.Index(fields=["new_status", "created_at"]),
            models.Index(fields=["changed_by", "created_at"]),
        ]
        verbose_name = "Order status log"
        verbose_name_plural = "Order status logs"

    def __str__(self):
        return f"{self.order} | {self.old_status} -> {self.new_status}"


class OrderNote(SoftDeleteModel):
    """
    Notes attached to an order.

    Visibility controls who should see the note:
    - INTERNAL: admin/employee only
    - CUSTOMER: visible to customer
    - PROVIDER: visible to assigned provider
    """

    class Visibility(models.TextChoices):
        INTERNAL = "INTERNAL", "Internal"
        CUSTOMER = "CUSTOMER", "Customer"
        PROVIDER = "PROVIDER", "Provider"

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="notes",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="order_notes",
    )

    note = models.TextField()

    visibility = models.CharField(
        max_length=20,
        choices=Visibility.choices,
        default=Visibility.INTERNAL,
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["order", "created_at"]),
            models.Index(fields=["visibility", "created_at"]),
            models.Index(fields=["user", "created_at"]),
        ]
        verbose_name = "Order note"
        verbose_name_plural = "Order notes"

    def __str__(self):
        return f"Note for {self.order}"


class OrderAssignmentHistory(models.Model):
    assignment_history_id = models.BigAutoField(primary_key=True)

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="assignment_history"
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_assignments_received"
    )

    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_assignments_made"
    )

    assignment_type = models.CharField(
        max_length=30,
        choices=[
            ("employee", "Employee"),
            ("provider", "Provider"),
        ]
    )

    note = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def clean(self):
        errors = {}

        if self.assignment_type == "provider":
            if self.assigned_to_id and self.assigned_to.role != self.assigned_to.Role.PROVIDER:
                errors["assigned_to"] = "Provider assignments must target provider users."
        elif self.assignment_type == "employee":
            if self.assigned_to_id and self.assigned_to.role not in {
                self.assigned_to.Role.EMPLOYEE,
                self.assigned_to.Role.ADMIN,
                self.assigned_to.Role.SUPPORT,
            }:
                errors["assigned_to"] = "Employee assignments must target employee/admin/support users."

        if self.assigned_by_id and self.assigned_by.role not in {
            self.assigned_by.Role.EMPLOYEE,
            self.assigned_by.Role.ADMIN,
            self.assigned_by.Role.SUPPORT,
        }:
            errors["assigned_by"] = "Assignments must be made by internal staff."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

class OrderIssue(SoftDeleteModel):
    issue_id = models.BigAutoField(primary_key=True)

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="issues"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_order_issues"
    )

    title = models.CharField(max_length=255)
    description = models.TextField()

    is_resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_order_issues"
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        errors = {}

        if self.is_resolved and not self.resolved_by_id:
            errors["resolved_by"] = "Resolved issues require resolved_by."

        if self.resolved_by_id and not self.resolved_at:
            self.resolved_at = timezone.now()

        if self.resolved_at and not self.resolved_by_id:
            errors["resolved_at"] = "resolved_at requires resolved_by."

        if not self.is_resolved and (self.resolved_by_id or self.resolved_at):
            errors["is_resolved"] = "Unresolved issues cannot have resolution metadata."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

class Rating(SoftDeleteModel):
    """
    Customer rating for a completed order.

    One order can have only one rating.
    """

    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="rating",
    )

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ratings",
    )

    score = models.PositiveSmallIntegerField(
        validators=[
            MinValueValidator(1),
            MaxValueValidator(5),
        ]
    )

    comment = models.TextField(blank=True)

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["customer", "created_at"]),
            models.Index(fields=["score"]),
        ]
        verbose_name = "Rating"
        verbose_name_plural = "Ratings"

    def clean(self):
        errors = {}

        if self.order_id and self.customer_id:
            if self.order.customer_id != self.customer_id:
                errors["customer"] = "Only the order customer can rate this order."

        if self.order_id:
            if self.order.status != Order.Status.COMPLETED:
                errors["order"] = "Only completed orders can be rated."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.score}/5 for {self.order}"


class MissingDocumentRequest(models.Model):
    """
    First-class record for each missing-document cycle on an order.

    Created whenever an employee requests additional documents from the customer.
    Closed (is_resolved=True, responded_at set) once the customer uploads all
    requested types and the order automatically resumes review.

    Having a dedicated model enables per-cycle SLA reporting and preserves
    history across multiple missing-document rounds on the same order.
    """

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="missing_document_requests",
    )

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="missing_document_requests_sent",
    )

    document_types = models.JSONField(
        default=list,
        help_text="List of document_type strings that were requested.",
    )

    reason = models.TextField(
        blank=True,
        help_text="Reason communicated to the customer.",
    )

    requested_at = models.DateTimeField(auto_now_add=True, db_index=True)

    responded_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Set when all requested documents have been uploaded and the order resumes review.",
    )

    is_resolved = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["-requested_at"]
        indexes = [
            models.Index(fields=["order", "requested_at"]),
            models.Index(fields=["is_resolved", "requested_at"]),
        ]
        verbose_name = "Missing document request"
        verbose_name_plural = "Missing document requests"

    def __str__(self):
        return f"MissingDocRequest #{self.pk} for {self.order_id} ({len(self.document_types)} types)"
