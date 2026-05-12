from django.contrib import admin

from services.models import Service, ServiceCategory, ServiceProviderAssignment, ServiceRequiredDocument


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ("name_ar", "slug", "display_order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name_ar", "name_en", "slug")
    ordering = ("display_order", "name_ar")


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("service_number", "name_ar", "category", "price_type", "is_online", "is_active")
    list_filter = ("category", "price_type", "is_online", "is_active", "is_featured")
    search_fields = ("service_number", "name_ar", "name_en", "slug")
    readonly_fields = ("service_number", "created_at", "updated_at")


@admin.register(ServiceRequiredDocument)
class ServiceRequiredDocumentAdmin(admin.ModelAdmin):
    list_display = ("service", "document_type", "name_ar", "is_required", "is_active", "display_order")
    list_filter = ("is_required", "is_active")
    search_fields = ("service__name_ar", "document_type", "name_ar", "name_en")


@admin.register(ServiceProviderAssignment)
class ServiceProviderAssignmentAdmin(admin.ModelAdmin):
    list_display = ("service", "provider", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("service__name_ar", "provider__user__full_name")
    readonly_fields = ("created_at",)
