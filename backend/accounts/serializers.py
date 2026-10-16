from organizations.services import assert_can_assign_membership
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction

from accounts.models import CustomUser, CustomerProfile, SystemSetting
from accounts.validators import PHONE_MESSAGES, phone_number_error
from core.i18n import pick, request_language
from core.delete_guard import get_delete_guard_setting, update_delete_guard_password
from core.serializer_mixins import PkAsIdMixin, SoftDeleteFieldsReadOnlyMixin
from organizations.models import Branch, Organization, OrganizationMembership
from organizations.serializers import MembershipSummarySerializer
from organizations.selectors import (
    active_memberships_for_user,
    can_manage_user_account,
    is_platform_super_admin,
    platform_memberships_for_user,
)

PLATFORM_LEVEL_ROLES = frozenset({CustomUser.Role.ADMIN, CustomUser.Role.SUPPORT})

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


class UserSerializer(SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
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


REGISTER_DUPLICATE_MESSAGES = {
    # Registration cannot hide that an address is taken without an activation
    # step (a product decision, audit B04); the answer is throttled and names
    # no model or field internals.
    "email": {
        "ar": "يوجد حساب مسجّل بهذا البريد الإلكتروني. سجّل الدخول أو استخدم خيار «نسيت كلمة المرور».",
        "en": "An account with this email already exists. Sign in or use “Forgot password”.",
    },
    "phone": {
        "ar": "رقم الهاتف هذا مستخدم في حساب آخر. سجّل الدخول أو استخدم رقماً آخر.",
        "en": "This phone number is already used by another account. Sign in or use a different number.",
    },
    "national_id": {
        "ar": "الرقم الوطني هذا مستخدم في حساب آخر.",
        "en": "This national ID is already used by another account.",
    },
}


class RegisterSerializer(SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)
    # Declared explicitly so uniqueness is answered with the customer-facing
    # messages below instead of the generated "model and field" text.
    email = serializers.EmailField(max_length=254)
    phone = serializers.CharField(max_length=30)

    class Meta:
        model = CustomUser
        fields = ("id", "full_name", "phone", "email", "password", "national_id")
        validators = []

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        language = self._language()
        self.fields["phone"].error_messages.update(
            required=pick(PHONE_MESSAGES["required"], language),
            blank=pick(PHONE_MESSAGES["required"], language),
            null=pick(PHONE_MESSAGES["required"], language),
        )

    def _language(self):
        return request_language(self.context.get("request"))

    def _taken(self, field, value):
        # Soft-deleted accounts still own their unique values.
        return CustomUser._base_manager.filter(**{field: value}).exists()

    def validate_email(self, value):
        email = CustomUser.objects.normalize_email(value.strip())
        if self._taken("email", email):
            raise serializers.ValidationError(pick(REGISTER_DUPLICATE_MESSAGES["email"], self._language()))
        return email

    def validate_phone(self, value):
        value = value.strip()
        error = phone_number_error(value)
        if error:
            raise serializers.ValidationError(pick(PHONE_MESSAGES[error], self._language()))
        if self._taken("phone", value):
            raise serializers.ValidationError(pick(REGISTER_DUPLICATE_MESSAGES["phone"], self._language()))
        return value

    def validate_national_id(self, value):
        value = (value or "").strip()
        if value and self._taken("national_id", value):
            raise serializers.ValidationError(pick(REGISTER_DUPLICATE_MESSAGES["national_id"], self._language()))
        return value

    def validate(self, attrs):
        # Same password policy as password reset (AUTH_PASSWORD_VALIDATORS).
        candidate = CustomUser(
            email=attrs.get("email", ""), full_name=attrs.get("full_name", ""), phone=attrs.get("phone", "")
        )
        try:
            validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs

    def create(self, validated_data):
        try:
            with transaction.atomic():
                return CustomUser.objects.create_user(
                    email=validated_data["email"],
                    password=validated_data["password"],
                    full_name=validated_data["full_name"],
                    phone=validated_data["phone"],
                    national_id=validated_data.get("national_id", ""),
                    role=CustomUser.Role.CUSTOMER,
                )
        except IntegrityError:
            # A concurrent registration took a unique value after validation.
            language = self._language()
            for field in ("email", "phone", "national_id"):
                value = validated_data.get(field)
                if value and self._taken(field, value):
                    raise serializers.ValidationError({field: [pick(REGISTER_DUPLICATE_MESSAGES[field], language)]})
            raise


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
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Defect D4: stamp the user's current token version so a later password
        # reset or "log out everywhere" can invalidate this token immediately.
        token["token_version"] = int(getattr(user, "token_version", 1) or 1)
        return token

    def validate(self, attrs):
        if not SIMPLEJWT_AVAILABLE:
            raise serializers.ValidationError(
                "JWT authentication is unavailable because djangorestframework-simplejwt is not installed."
            )
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class CustomerProfileSerializer(SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
    """
    Self-service profile.

    The email is the login identifier and the phone number is the second
    factor of public order tracking, so changing either requires the current
    password: a borrowed or stolen session alone must not be enough to take
    the account over.
    """

    IDENTITY_FIELDS = ("email", "phone")

    current_password = serializers.CharField(write_only=True, required=False, allow_blank=True, trim_whitespace=False)

    class Meta:
        model = CustomUser
        fields = ("full_name", "phone", "email", "national_id", "current_password")

    def validate(self, attrs):
        current_password = attrs.pop("current_password", "")
        user = self.instance
        changed = [
            field for field in self.IDENTITY_FIELDS
            if field in attrs and (attrs[field] or "") != (getattr(user, field, "") or "")
        ]
        self.identity_fields_changed = changed
        if "phone" in changed and (attrs["phone"] or "").strip():
            # A changed number follows the registration rule (accounts/validators.py).
            error = phone_number_error(attrs["phone"])
            if error:
                language = request_language(self.context.get("request"))
                raise serializers.ValidationError({"phone": [pick(PHONE_MESSAGES[error], language)]})
            attrs["phone"] = attrs["phone"].strip()
        if changed and user is not None and user.has_usable_password():
            if not current_password:
                raise serializers.ValidationError(
                    {"current_password": "Enter your current password to change your email or phone number."}
                )
            if not user.check_password(current_password):
                raise serializers.ValidationError({"current_password": "The current password is incorrect."})
        return attrs


class CustomerProfileAdminSerializer(SoftDeleteFieldsReadOnlyMixin, PkAsIdMixin, serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = "__all__"


class AdminUserSerializer(SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)
    organization_id = serializers.PrimaryKeyRelatedField(queryset=Organization.objects.filter(is_active=True, is_deleted=False), required=False, allow_null=True, write_only=True)
    branch_id = serializers.PrimaryKeyRelatedField(queryset=Branch.objects.filter(is_active=True, is_deleted=False), required=False, allow_null=True, write_only=True)
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
            "is_email_verified",
            "is_phone_verified",
            "is_super_admin",
            "role_options",
            "current_permissions",
            "memberships",
            "is_deleted",
            "deleted_at",
            "delete_reason",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "created_at",
            "updated_at",
            "is_staff",
            "is_super_admin",
            "role_options",
            "current_permissions",
            # Shown, never set from this screen: who verifies what is not decided (audit B10-8).
            "is_email_verified",
            "is_phone_verified",
        )

    def get_current_permissions(self, obj):
        return sorted(
            f"{app}.{code}"
            for app, code in obj.user_permissions.values_list("content_type__app_label", "codename")
        )

    def get_is_super_admin(self, obj):
        return bool(obj.is_superuser)

    def get_role_options(self, obj):
        base_options = [CustomUser.Role.EMPLOYEE, CustomUser.Role.PROVIDER]
        if self._is_super_admin_request():
            base_options = [CustomUser.Role.ADMIN, CustomUser.Role.EMPLOYEE, CustomUser.Role.SUPPORT, CustomUser.Role.PROVIDER]
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
        return platform_memberships_for_user(
            user, {OrganizationMembership.MembershipRole.PLATFORM_SUPER_ADMIN}
        ).exists()

    def validate_role(self, value):
        if not self.instance and value == CustomUser.Role.CUSTOMER:
            raise serializers.ValidationError("Customer users are created automatically from the public customer flow.")

        if self._is_super_admin_request():
            return value
        # "admin" and "support" carry platform-wide authority on their own.
        if value in PLATFORM_LEVEL_ROLES and value != getattr(self.instance, "role", None):
            raise serializers.ValidationError("Only a platform super admin can assign this role.")
        return value

    def validate(self, attrs):
        branch = attrs.get("branch_id")
        organization = attrs.get("organization_id")
        membership_role = attrs.get("membership_role")
        target_role = attrs.get("role", getattr(self.instance, "role", ""))
        if self.instance and self.instance.role != CustomUser.Role.CUSTOMER and target_role == CustomUser.Role.CUSTOMER:
            raise serializers.ValidationError({"role": "Customer users are created automatically and cannot be assigned manually."})
        actor = getattr(self.context.get("request"), "user", None)
        if not self._is_super_admin_request():
            if self.instance:
                if self.instance.is_superuser or self.instance.role == CustomUser.Role.ADMIN:
                    raise serializers.ValidationError({"detail": "Only super admin can change admin-level users."})
                if not can_manage_user_account(actor, self.instance):
                    raise serializers.ValidationError(
                        {"detail": "This account is shared with another organization or the platform and can be changed only by a platform super admin."}
                    )
            elif not (organization and membership_role):
                # A user created by an organization must start inside it. An
                # employee with no membership would be unscoped internal staff.
                raise serializers.ValidationError(
                    {"organization_id": "Choose the organization and membership role for the new user."}
                )
        if not self.instance and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Password is required when creating a user."})
        if branch and organization and branch.organization_id != organization.id:
            raise serializers.ValidationError({"branch_id": "Branch must belong to the selected organization."})
        if membership_role and not organization:
            raise serializers.ValidationError({"organization_id": "Organization is required when assigning a membership role."})
        if organization:
            request = self.context.get("request")
            try:
                assert_can_assign_membership(
                    actor=getattr(request, "user", None),
                    organization=organization,
                    role=membership_role,
                    field="membership_role",
                )
                if membership_role:
                    OrganizationMembership(organization=organization, branch=branch, role=membership_role).clean()
            except DjangoValidationError as exc:
                errors = exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}
                if "organization" in errors:
                    errors["organization_id"] = errors.pop("organization")
                if "role" in errors:
                    errors["membership_role"] = errors.pop("role")
                raise serializers.ValidationError(errors)
        return attrs

    def validate_password(self, value):
        try:
            validate_password(value, user=self.instance)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

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
            # A replaced password ends every session opened with the old one.
            instance.token_version = (instance.token_version or 1) + 1
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


class SafeSystemSettingSerializer(SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
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


if SIMPLEJWT_AVAILABLE:
    from rest_framework_simplejwt.exceptions import InvalidToken
    from rest_framework_simplejwt.serializers import TokenRefreshSerializer
    from rest_framework_simplejwt.tokens import RefreshToken as _RefreshToken

    class VersionedTokenRefreshSerializer(TokenRefreshSerializer):
        """
        Refuse a refresh token issued before the account's sessions were revoked.

        The access token it would mint is rejected anyway, but answering 200
        here keeps a revoked client retrying and hides the revocation from it.
        """

        def validate(self, attrs):
            refresh = _RefreshToken(attrs["refresh"])
            user = CustomUser.objects.filter(pk=refresh.payload.get("user_id")).first()
            claimed = refresh.payload.get("token_version")
            current = int(getattr(user, "token_version", 1) or 1)
            revoked = (
                user is None
                or not user.is_active
                or user.is_deleted
                or (claimed is None and current != 1)
                or (claimed is not None and int(claimed) != current)
            )
            if revoked:
                raise InvalidToken("Token has been revoked. Please sign in again.")
            return super().validate(attrs)
