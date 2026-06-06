from django.contrib import admin

from help_guides.models import HelpGuide, HelpGuideAction, HelpGuideField, HelpGuideScreenshot, HelpGuideService, HelpGuideWorkflow


class HelpGuideScreenshotInline(admin.TabularInline):
    model = HelpGuideScreenshot
    extra = 0
    fields = ("caption", "image", "static_path", "placeholder_label", "step_reference", "display_order", "is_active")
    ordering = ("display_order", "screenshot_id")


@admin.register(HelpGuide)
class HelpGuideAdmin(admin.ModelAdmin):
    inlines = [HelpGuideScreenshotInline]
    list_display = ("title", "slug", "category", "screen_key", "role", "workflow_status", "permission_key", "display_order", "is_active")
    list_filter = ("category", "role", "is_active", "screen_key", "workflow_status", "is_quick_link")
    search_fields = ("title", "slug", "screen_key", "short_description", "purpose", "step_by_step_guide", "search_keywords")
    ordering = ("screen_key", "display_order", "title")
    readonly_fields = ("created_at", "updated_at")
    filter_horizontal = ("related_guides",)


@admin.register(HelpGuideAction)
class HelpGuideActionAdmin(admin.ModelAdmin):
    list_display = ("button_label", "screen_key", "role", "status_before", "status_after", "display_order", "is_active")
    list_filter = ("role", "screen_key", "status_before", "status_after", "is_active")
    search_fields = ("button_key", "button_label", "purpose", "when_to_use", "search_keywords")
    ordering = ("screen_key", "display_order", "button_label")


@admin.register(HelpGuideField)
class HelpGuideFieldAdmin(admin.ModelAdmin):
    list_display = ("field_label", "screen_key", "role", "required", "editable", "display_order", "is_active")
    list_filter = ("role", "screen_key", "required", "editable", "is_active")
    search_fields = ("field_key", "field_label", "purpose", "validation_rule", "search_keywords")
    ordering = ("screen_key", "display_order", "field_label")


@admin.register(HelpGuideService)
class HelpGuideServiceAdmin(admin.ModelAdmin):
    list_display = ("service", "role", "display_order", "is_active")
    list_filter = ("role", "is_active")
    search_fields = ("service__name_ar", "description", "who_can_use", "search_keywords")
    ordering = ("service", "display_order", "role")


@admin.register(HelpGuideWorkflow)
class HelpGuideWorkflowAdmin(admin.ModelAdmin):
    list_display = ("workflow_key", "screen_key", "current_status", "next_status", "role", "display_order", "is_active")
    list_filter = ("role", "screen_key", "current_status", "next_status", "is_active")
    search_fields = ("workflow_key", "action_key", "action_label", "system_effect", "search_keywords")
    ordering = ("screen_key", "display_order", "workflow_key")


@admin.register(HelpGuideScreenshot)
class HelpGuideScreenshotAdmin(admin.ModelAdmin):
    list_display = ("caption", "help_guide", "step_reference", "display_order", "is_active")
    list_filter = ("is_active", "help_guide__category")
    search_fields = ("caption", "placeholder_label", "static_path", "help_guide__title", "help_guide__slug")
    ordering = ("help_guide", "display_order", "screenshot_id")
