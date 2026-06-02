from django.contrib import admin

from help_guides.models import HelpGuide


@admin.register(HelpGuide)
class HelpGuideAdmin(admin.ModelAdmin):
    list_display = ("title", "screen_key", "role", "workflow_status", "permission_key", "display_order", "is_active")
    list_filter = ("role", "is_active", "screen_key", "workflow_status")
    search_fields = ("title", "screen_key", "short_description", "purpose", "step_by_step_guide", "search_keywords")
    ordering = ("screen_key", "display_order", "title")
    readonly_fields = ("created_at", "updated_at")

