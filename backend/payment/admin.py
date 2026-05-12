from django.contrib import admin

from payment.models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("payment_number", "order", "amount", "currency", "payment_type", "method", "status", "created_at")
    list_filter = ("status", "method", "payment_type", "currency", "created_at")
    search_fields = ("payment_number", "order__order_number", "reference_number", "gateway_transaction_id")
    readonly_fields = ("payment_number", "paid_at", "refunded_at", "created_at", "updated_at")
