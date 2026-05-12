from django.contrib import admin

from orders.models import Order, OrderAssignmentHistory, OrderNote, OrderStatusLog, Rating


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "customer",
        "service",
        "status",
        "assigned_employee",
        "assigned_provider",
        "final_price",
        "created_at",
    )
    list_filter = ("status", "priority", "service", "created_at")
    search_fields = ("order_number", "customer__full_name", "customer__email", "service__name_ar")
    readonly_fields = (
        "order_number",
        "final_price",
        "created_at",
        "updated_at",
        "completed_at",
        "cancelled_at",
        "archived_at",
    )


@admin.register(OrderStatusLog)
class OrderStatusLogAdmin(admin.ModelAdmin):
    list_display = ("order", "old_status", "new_status", "changed_by", "created_at")
    list_filter = ("new_status", "created_at")
    search_fields = ("order__order_number", "changed_by__full_name", "note")
    readonly_fields = ("order", "old_status", "new_status", "changed_by", "note", "created_at")


@admin.register(OrderNote)
class OrderNoteAdmin(admin.ModelAdmin):
    list_display = ("order", "user", "visibility", "created_at")
    list_filter = ("visibility", "created_at")
    search_fields = ("order__order_number", "user__full_name", "note")
    readonly_fields = ("created_at",)


@admin.register(OrderAssignmentHistory)
class OrderAssignmentHistoryAdmin(admin.ModelAdmin):
    list_display = ("order", "assignment_type", "assigned_to", "assigned_by", "created_at")
    list_filter = ("assignment_type", "created_at")
    search_fields = ("order__order_number", "assigned_to__full_name", "assigned_by__full_name", "note")
    readonly_fields = ("created_at",)


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ("order", "customer", "score", "created_at")
    search_fields = ("order__order_number", "customer__full_name", "comment")
    readonly_fields = ("created_at",)
