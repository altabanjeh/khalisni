from django.contrib import admin

from providers.models import ProviderProfile


@admin.register(ProviderProfile)
class ProviderProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "provider_type", "city", "rating", "is_available", "is_approved")
    list_filter = ("city", "is_available", "is_approved")
    search_fields = ("user__full_name", "user__email", "provider_type", "company_name")
    readonly_fields = ("approved_at", "created_at", "updated_at")
