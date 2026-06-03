from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from accounts.models import CustomUser, CustomerProfile, PasswordResetToken, SystemSetting


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ("email", "full_name", "phone", "role", "is_active")
    list_filter = ("role", "is_active")
    ordering = ("email",)
    search_fields = ("email", "full_name", "phone")
    readonly_fields = ("last_login", "last_login_ip", "created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("full_name", "phone", "national_id", "role")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Audit", {"fields": ("last_login", "last_login_ip", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "full_name", "phone", "role", "password1", "password2"),
            },
        ),
    )


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ("user",)
    search_fields = ("user__full_name", "user__email", "user__phone")


@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = ("key", "updated_at")
    search_fields = ("key", "description")
    readonly_fields = ("updated_at",)


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "created_at", "expires_at", "used_at", "request_ip")
    list_filter = ("created_at", "expires_at", "used_at")
    search_fields = ("user__email", "user__full_name", "request_ip")
    readonly_fields = ("user", "token_hash", "created_at", "expires_at", "used_at", "request_ip", "user_agent")
