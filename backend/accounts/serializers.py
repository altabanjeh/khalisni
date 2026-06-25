from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from accounts.models import CustomUser, CustomerProfile, SystemSetting
from core.delete_guard import get_delete_guard_setting, update_delete_guard_password
from core.serializer_mixins import PkAsIdMixin
from organizations.models import Branch, Organization, OrganizationMembership
from organizations.serializers import MembershipSummarySerializer
from organizations.selectors import active_memberships_for_user, is_platform_super_admin

try:
    from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
except ImportError:  # pragma: no cover - depends on optional dependency
    TokenObtainPairSerializer = serializers.Serializer
    SIMPLEJWT_AVAILABLE = False
else:
    SIMPLEJWT_AVAILABLE = True


SAFE_SYSTEM_SETTINGS = {
    "site.homepage": {
        "label": "Homepage content",
        "help_text": "Edit only the safe public text shown on the home page.",
        "warning": "",
        "requires_super_admin": False,
        "fields": (
            {
                "key": "hero_title",
                "label": "Main title",
                "control": "text",
                "help_text": "Short headline shown at the top of the home page.",
            },
            {
                "key": "hero_subtitle",
                "label": "Supporting text",
                "control": "textarea",
                "help_text": "Short supporting description below the title.",
            },
        ),
    },
    "site.contact": {
        "label": "Contact details",
        "help_text": "Public contact details used by clients when they need help.",
        "warning": "Changes appear to clients immediately.",
        "requires_super_admin": False,
        "fields": (
            {
                "key": "phone",
                "label": "Phone number",
                "control": "text",
                "help_text": "Visible customer support phone number.",
            },
            {
                "key": "email",
                "label": "Email address",
                "control": "email",
                "help_text": "Visible customer support email address.",
            },
        ),
    },
}


class UserSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    memberships = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = (
            "id",
            "full_name",
            "phone",
            "email",
            "role",
            "national_id",
            "is_active",
            "created_at",
            "updated_at",
            "permissions",
            "memberships",
        )

    def get_permissions(self, obj):
        return sorted(obj.get_all_permissions())

    def get_memberships(self, obj):
        memberships = obj.organization_memberships.filter(is_active=True).select_related("organization", "branch")
        return MembershipSummarySerializer(memberships, many=True).data


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = CustomUser
        fields = ("id", "full_name", "phone", "email", "password", "national_id")

    def create(self, validated_data):
        return CustomUser.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            full_name=validated_data["full_name"],
            phone=validated_data["phone"],
            national_id=validated_data.get("national_id", ""),
            role=CustomUser.Role.CUSTOMER,
        )


class ForgotPasswordRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)
    confirm_new_password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_new_password"]:
            raise serializers.ValidationError({"confirm_new_password": "Passwords do not match."})

        user = self.context["user"]
        try:
            validate_password(attrs["new_password"], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": list(exc.messages)}) from exc
        return attrs


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        if not SIMPLEJWT_AVAILABLE:
            raise serializers.ValidationError(
                "JWT authentication is unavailable because djangorestframework-simplejwt is not installed."
            )
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ("full_name", "phone", "email", "national_id")


class CustomerProfileAdminSerializer(PkAsIdMixin, serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = "__all__"


class AdminUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)
    organization_id = serializers.PrimaryKeyRelatedField(queryset=Organization.objects.filter(is_active=True), required=False, allow_null=True, write_only=True)
    branch_id = serializers.PrimaryKeyRelatedField(queryset=Branch.objects.filter(is_active=True), required=False, allow_null=True, write_only=True)
    membership_role = serializers.ChoiceField(choices=OrganizationMembership.MembershipRole.choices, required=False, allow_null=True, write_only=True)
    memberships = MembershipSummarySerializer(source="organization_memberships", many=True, read_only=True)
    is_staff = serializers.BooleanField(read_only=True)
    is_super_admin = serializers.SerializerMethodField()
    role_options = serializers.SerializerMethodField()
    current_permissions = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = (
            "id",
            "full_name",
            "phone",
            "email",
            "password",
            "organization_id",
            "branch_id",
            "membership_role",
            "role",
            "national_id",
            "is_active",
            "is_staff",
            "is_verified",
            "is_super_admin",
            "role_options",
            "current_permissions",
            "memberships",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at", "is_staff", "is_super_admin", "role_options", "current_permissions")

    def get_current_permissions(self, obj):
        return sorted(
            f"{app}.{code}"
            for app, code in obj.user_permissions.values_list("content_type__app_label", "codename")
        )

    def get_is_super_admin(self, obj):
        return bool(obj.is_superuser)

    def get_role_options(self, obj):
        base_options = [
            CustomUser.Role.EMPLOYEE,
            CustomUser.Role.SUPPORT,
            CustomUser.Role.PROVIDER,
        ]
        if self._is_super_admin_request():
            base_options = [CustomUser.Role.ADMIN, *base_options]
        if getattr(obj, "role", "") == CustomUser.Role.CUSTOMER:
            return [CustomUser.Role.CUSTOMER, *base_options]
        return base_options

    def _is_super_admin_request(self):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return False
        if getattr(user, "is_superuser", False):
            return True
        return active_memberships_for_user(user).filter(
            role=OrganizationMembership.MembershipRole.PLATFORM_SUPER_ADMIN
        ).exists()

    def validate_role(self, value):
        if not self.instance and value == CustomUser.Role.CUSTOMER:
            raise serializers.ValidationError("Customer users are created automatically from the public customer flow.")

        if self._is_super_admin_request():
            return value
        if value == CustomUser.Role.ADMIN:
            raise serializers.ValidationError("Only super admin can create or assign admin users.")
        return value

    def validate(self, attrs):
        branch = attrs.get("branch_id")
        organization = attrs.get("organization_id")
        membership_role = attrs.get("membership_role")
        target_role = attrs.get("role", getattr(self.instance, "role", ""))
        if self.instance and self.instance.role != CustomUser.Role.CUSTOMER and target_role == CustomUser.Role.CUSTOMER:
            raise serializers.ValidationError({"role": "Customer users are created automatically and cannot be assigned manually."})
        if not self._is_super_admin_request() and self.instance:
            if self.instance.is_superuser or self.instance.role == CustomUser.Role.ADMIN:
                raise serializers.ValidationError({"detail": "Only super admin can change admin-level users."})
        if not self.instance and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Password is required when creating a user."})
        if branch and organization and branch.organization_id != organization.id:
            raise serializers.ValidationError({"branch_id": "Branch must belong to the selected organization."})
        if membership_role and not organization:
            raise serializers.ValidationError({"organization_id": "Organization is required when assigning a membership role."})
        return attrs

    def create(self, validated_data):
        organization = validated_data.pop("organization_id", None)
        branch = validated_data.pop("branch_id", None)
        membership_role = validated_data.pop("membership_role", None)
        password = validated_data.pop("password")
        user = CustomUser.objects.create_user(password=password, **validated_data)
        if organization and membership_role:
            OrganizationMembership.objects.create(
                user=user,
                organization=organization,
                branch=branch,
                role=membership_role,
            )
        return user

    def update(self, instance, validated_data):
        organization = validated_data.pop("organization_id", None)
        branch = validated_data.pop("branch_id", None)
        membership_role = validated_data.pop("membership_role", None)
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        if organization and membership_role:
            membership, _ = OrganizationMembership.objects.get_or_create(
                user=instance,
                organization=organization,
                role=membership_role,
                defaults={"branch": branch, "is_active": True},
            )
            if branch and membership.branch_id != branch.id:
                membership.branch = branch
                membership.save(update_fields=["branch"])
        return instance


class SafeSystemSettingSerializer(serializers.ModelSerializer):
    label = serializers.SerializerMethodField()
    help_text = serializers.SerializerMethodField()
    warning = serializers.SerializerMethodField()
    requires_super_admin = serializers.SerializerMethodField()
    value = serializers.SerializerMethodField()
    hero_title = serializers.CharField(required=False, allow_blank=True, write_only=True)
    hero_subtitle = serializers.CharField(required=False, allow_blank=True, write_only=True)
    phone = serializers.CharField(required=False, allow_blank=True, write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True, write_only=True)
    fields = serializers.SerializerMethodField(method_name="get_setting_fields")

    class Meta:
        model = SystemSetting
        fields = (
            "setting_id",
            "key",
            "label",
            "help_text",
            "warning",
            "requires_super_admin",
            "description",
            "updated_at",
            "value",
            "fields",
            "hero_title",
            "hero_subtitle",
            "phone",
            "email",
        )
        read_only_fields = ("setting_id", "updated_at", "label", "help_text", "warning", "requires_super_admin", "value", "fields")

    def get_label(self, obj):
        return SAFE_SYSTEM_SETTINGS.get(obj.key, {}).get("label", obj.key)

    def get_help_text(self, obj):
        return SAFE_SYSTEM_SETTINGS.get(obj.key, {}).get("help_text", "")

    def get_warning(self, obj):
        return SAFE_SYSTEM_SETTINGS.get(obj.key, {}).get("warning", "")

    def get_requires_super_admin(self, obj):
        return SAFE_SYSTEM_SETTINGS.get(obj.key, {}).get("requires_super_admin", False)

    def get_value(self, obj):
        return dict(obj.value or {})

    def get_setting_fields(self, obj):
        values = obj.value or {}
        field_definitions = SAFE_SYSTEM_SETTINGS.get(obj.key, {}).get("fields", ())
        return [
            {
                **field,
                "value": values.get(field["key"], ""),
            }
            for field in field_definitions
        ]

    def validate_key(self, value):
        if value not in SAFE_SYSTEM_SETTINGS:
            raise serializers.ValidationError("This setting is not available in the admin rule screen.")
        return value

    def validate(self, attrs):
        key = attrs.get("key") or getattr(self.instance, "key", "")
        if key not in SAFE_SYSTEM_SETTINGS:
            raise serializers.ValidationError({"key": "This setting is not available in the admin rule screen."})
        return attrs

    def _build_value(self, attrs):
        key = attrs.get("key") or getattr(self.instance, "key", "")
        fields = [field["key"] for field in SAFE_SYSTEM_SETTINGS[key]["fields"]]
        current = dict(getattr(self.instance, "value", {}) or {})
        for field in fields:
            if field in attrs:
                current[field] = attrs.pop(field)
        return current

    def create(self, validated_data):
        validated_data["value"] = self._build_value(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("key", None)
        validated_data["value"] = self._build_value(validated_data)
        return super().update(instance, validated_data)


class DeleteGuardSettingSerializer(serializers.Serializer):
    key = serializers.CharField(read_only=True, default="security.delete_guard")
    label = serializers.CharField(read_only=True, default="Delete protection")
    description = serializers.CharField(read_only=True, default="Extra password required before any admin delete or deactivate action.")
    is_configured = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()
    delete_password = serializers.CharField(write_only=True, required=False, allow_blank=False, trim_whitespace=False)
    confirm_delete_password = serializers.CharField(write_only=True, required=False, allow_blank=False, trim_whitespace=False)

    def get_is_configured(self, _obj):
        setting = self._get_setting()
        return bool(setting and isinstance(setting.value, dict) and setting.value.get("password_hash"))

    def get_updated_at(self, _obj):
        setting = self._get_setting()
        return getattr(setting, "updated_at", None)

    def _get_setting(self):
        return self.instance or get_delete_guard_setting()

    def validate(self, attrs):
        delete_password = attrs.get("delete_password", "")
        confirm_delete_password = attrs.get("confirm_delete_password", "")

        if not delete_password:
            raise serializers.ValidationError({"delete_password": "Delete password is required."})
        if delete_password != confirm_delete_password:
            raise serializers.ValidationError({"confirm_delete_password": "Delete passwords do not match."})

        request = self.context.get("request")
        user = getattr(request, "user", None)
        try:
            validate_password(delete_password, user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"delete_password": list(exc.messages)}) from exc
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        return update_delete_guard_password(
            raw_password=validated_data["delete_password"],
            actor=getattr(request, "user", None),
        )

    def update(self, instance, validated_data):
        request = self.context.get("request")
        return update_delete_guard_password(
            raw_password=validated_data["delete_password"],
            actor=getattr(request, "user", None),
        )

    def to_representation(self, instance):
        setting = instance or self._get_setting()
        return {
            "key": "security.delete_guard",
            "label": "Delete protection",
            "description": "Extra password required before any admin delete or deactivate action.",
            "is_configured": bool(setting and isinstance(setting.value, dict) and setting.value.get("password_hash")),
            "updated_at": getattr(setting, "updated_at", None),
        }
