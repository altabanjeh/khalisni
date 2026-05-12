from django.db import models


class UserRole(models.TextChoices):
    CUSTOMER = "customer", "Customer"
    ADMIN = "admin", "Admin"
    EMPLOYEE = "employee", "Employee"
    PROVIDER = "provider", "Provider"
    SUPPORT = "support", "Support"


class OrderStatus(models.TextChoices):
    NEW = "NEW", "New"
    UNDER_REVIEW = "UNDER_REVIEW", "Under review"
    WAITING_CUSTOMER = "WAITING_CUSTOMER", "Waiting customer"
    ASSIGNED = "ASSIGNED", "Assigned"
    IN_PROGRESS = "IN_PROGRESS", "In progress"
    WAITING_GOVERNMENT = "WAITING_GOVERNMENT", "Waiting government"
    READY_FOR_DELIVERY = "READY_FOR_DELIVERY", "Ready for delivery"
    COMPLETED = "COMPLETED", "Completed"
    REJECTED = "REJECTED", "Rejected"
    CANCELLED = "CANCELLED", "Cancelled"
    ARCHIVED = "ARCHIVED", "Archived"


class OrderPriority(models.TextChoices):
    LOW = "LOW", "Low"
    NORMAL = "NORMAL", "Normal"
    HIGH = "HIGH", "High"
    URGENT = "URGENT", "Urgent"


class DocumentType(models.TextChoices):
    CUSTOMER_UPLOAD = "CUSTOMER_UPLOAD", "Customer upload"
    NATIONAL_ID = "national_id", "National ID"
    PASSPORT_COPY = "passport_copy", "Passport copy"
    AUTHORIZATION_LETTER = "authorization_letter", "Authorization letter"
    PAYMENT_RECEIPT = "payment_receipt", "Payment receipt"
    FINAL_REPORT = "final_report", "Final report"
    OTHER = "other", "Other"


class NotificationType(models.TextChoices):
    ORDER = "order", "Order"
    PAYMENT = "payment", "Payment"
    ACCOUNT = "account", "Account"
    SYSTEM = "system", "System"
    SUPPORT = "support", "Support"


class PaymentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PROCESSING = "processing", "Processing"
    PAID = "paid", "Paid"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"
    REFUNDED = "refunded", "Refunded"
    PARTIALLY_REFUNDED = "partially_refunded", "Partially refunded"

