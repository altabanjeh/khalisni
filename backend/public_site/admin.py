from django.contrib import admin

from public_site.models import Advertisement, PublicPageContent, SiteTheme


@admin.register(SiteTheme)
class SiteThemeAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "primary_color",
        "secondary_color",
        "active_theme",
        "updated_at",
    )
    list_filter = ("active_theme",)
    search_fields = ("name",)
    ordering = ("-active_theme", "name")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Theme Identity", {"fields": ("name", "active_theme")}),
        (
            "Colors",
            {
                "fields": (
                    "primary_color",
                    "secondary_color",
                    "background_color",
                    "text_color",
                    "header_background_color",
                    "footer_background_color",
                )
            },
        ),
        ("Brand Files", {"fields": ("logo", "favicon")}),
        ("Audit", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(PublicPageContent)
class PublicPageContentAdmin(admin.ModelAdmin):
    list_display = ("version_name", "hero_title_ar", "contact_phone", "email", "active_content", "updated_at")
    list_filter = ("active_content",)
    search_fields = ("version_name", "hero_title_ar", "hero_title_en", "office_address", "email")
    ordering = ("-active_content", "-updated_at")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Version", {"fields": ("version_name", "active_content")}),
        (
            "Hero Section",
            {
                "fields": (
                    "hero_title_ar",
                    "hero_title_en",
                    "hero_subtitle_ar",
                    "hero_subtitle_en",
                    "primary_button_text",
                    "primary_button_url",
                    "secondary_button_text",
                    "secondary_button_url",
                    "hero_image",
                )
            },
        ),
        ("How It Works", {"fields": ("how_it_works_text",)}),
        (
            "Contact And Footer",
            {
                "fields": (
                    "contact_phone",
                    "whatsapp_number",
                    "email",
                    "office_address",
                    "footer_text",
                )
            },
        ),
        ("Audit", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(Advertisement)
class AdvertisementAdmin(admin.ModelAdmin):
    list_display = (
        "title_ar",
        "advertisement_type",
        "display_order",
        "start_date",
        "end_date",
        "is_active",
        "updated_at",
    )
    list_filter = ("is_active", "advertisement_type")
    search_fields = ("title_ar", "title_en", "description_ar", "description_en")
    ordering = ("display_order", "-start_date")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Status", {"fields": ("advertisement_type", "is_active", "display_order")}),
        (
            "Content",
            {
                "fields": (
                    "title_ar",
                    "title_en",
                    "description_ar",
                    "description_en",
                    "image",
                )
            },
        ),
        ("Button", {"fields": ("button_text_ar", "button_text_en", "button_url")}),
        ("Appearance", {"fields": ("background_color", "text_color")}),
        ("Schedule", {"fields": ("start_date", "end_date")}),
        ("Audit", {"fields": ("created_at", "updated_at")}),
    )

