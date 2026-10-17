from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from organizations.selectors import is_platform_super_admin

from core.i18n import pick, request_language
from core.serializer_mixins import SoftDeleteFieldsReadOnlyMixin

from accounts.fields import CanonicalPhoneField
from accounts.models import CustomUser
from providers.models import ProviderProfile
from services.models import ServiceCategory


APPROVAL_STATUS_LABELS = {
    True: {"ar": "معتمد", "en": "Approved"},
    False: {"ar": "قيد المراجعة", "en": "Pending review"},
}


def approval_status_label(provider, request):
    """Approval label in the caller's language (audit D03)."""
    return pick(APPROVAL_STATUS_LABELS[bool(provider.is_approved)], request_language(request))


class ProviderProfileSerializer(SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)
    service_categories = serializers.SlugRelatedField(many=True, slug_field="name_ar", read_only=True)

    class Meta:
        model = ProviderProfile
        fields = (
            "id",
            "full_name",
            "email",
            "phone",
            "provider_type",
            "service_categories",
            "city",
            "rating",
            "total_completed_orders",
            "is_available",
            "created_at",
        )


class ProviderAdminListSerializer(SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)
    service_categories = serializers.SlugRelatedField(many=True, slug_field="name_ar", read_only=True)
    service_category_ids = serializers.PrimaryKeyRelatedField(source="service_categories", many=True, read_only=True)
    account_active = serializers.BooleanField(source="user.is_active", read_only=True)
    approval_status_label = serializers.SerializerMethodField()
    capability_summary = serializers.SerializerMethodField()

    class Meta:
        model = ProviderProfile
        fields = (
            "id",
            "full_name",
            "email",
            "phone",
            "provider_type",
            "company_name",
            "commercial_registration_number",
            "tax_number",
            "address",
            "service_categories",
            "service_category_ids",
            "city",
            "rating",
            "total_completed_orders",
            "is_available",
            "is_approved",
            "account_active",
            "is_deleted",
            "deleted_at",
            "delete_reason",
            "approval_status_label",
            "capability_summary",
            "created_at",
        )

    def get_approval_status_label(self, obj):
        return approval_status_label(obj, self.context.get("request"))

    def get_capability_summary(self, obj):
        categories = list(obj.service_categories.values_list("name_ar", flat=True))
        if categories:
            return ", ".join(categories)
        return "No categories linked yet"


class ProviderAdminSerializer(SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name")
    email = serializers.EmailField(source="user.email")
    phone = CanonicalPhoneField(source="user.phone")
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)
    service_category_ids = serializers.PrimaryKeyRelatedField(
        source="service_categories",
        many=True,
        queryset=ServiceCategory.objects.filter(is_deleted=False),
        required=False,
    )
    service_categories = serializers.SlugRelatedField(many=True, slug_field="name_ar", read_only=True)
    account_active = serializers.BooleanField(source="user.is_active", required=False)
    approval_status_label = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ProviderProfile
        fields = (
            "id",
            "full_name",
            "email",
            "phone",
            "password",
            "provider_type",
            "company_name",
            "commercial_registration_number",
            "tax_number",
            "address",
            "service_categories",
            "service_category_ids",
            "city",
            "is_available",
            "is_approved",
            "account_active",
            "rating",
            "total_completed_orders",
            "is_deleted",
            "deleted_at",
            "delete_reason",
            "created_at",
            "approval_status_label",
        )
        read_only_fields = ("rating", "total_completed_orders", "created_at", "approval_status_label")

    def get_approval_status_label(self, obj):
        return approval_status_label(obj, self.context.get("request"))

    def create(self, validated_data):
        user_data = validated_data.pop("user")
        account_active = user_data.pop("is_active", True)
        password = validated_data.pop("password")
        categories = validated_data.pop("service_categories", [])
        user = CustomUser.objects.create_user(
            email=user_data["email"],
            password=password,
            full_name=user_data["full_name"],
            phone=user_data["phone"],
            role=CustomUser.Role.PROVIDER,
            is_active=account_active,
        )
        profile = ProviderProfile.objects.create(user=user, **validated_data)
        profile.service_categories.set(categories)
        return profile

    def validate(self, attrs):
        # The single validate() of this serializer: a second definition used to
        # shadow the password check, so a create without one reached create()
        # and failed with KeyError (HTTP 500).
        attrs = super().validate(attrs)
        actor = getattr(self.context.get("request"), "user", None)
        if self.instance is None:
            password = attrs.get("password")
            if not password:
                raise serializers.ValidationError({"password": "Password is required when creating a provider account."})
            user_data = attrs.get("user", {})
            candidate = CustomUser(
                email=user_data.get("email", ""), full_name=user_data.get("full_name", ""), phone=user_data.get("phone", "")
            )
            try:
                # Same policy as registration and admin-created users.
                validate_password(password, user=candidate)
            except DjangoValidationError as exc:
                raise serializers.ValidationError({"password": list(exc.messages)})
        if self.instance is None and not is_platform_super_admin(actor):
            # A provider added by an organization waits for platform approval.
            attrs["is_approved"] = False
        if self.instance is not None and not is_platform_super_admin(actor):
            # Providers are shared across organizations. Their login identity
            # and approval are decided by the platform, not by one tenant.
            blocked = [
                name for name, present in (
                    ("password", "password" in attrs),
                    ("email", "email" in attrs.get("user", {})),
                    ("is_approved", "is_approved" in attrs),
                    ("account_active", "is_active" in attrs.get("user", {})),
                ) if present
            ]
            if blocked:
                raise serializers.ValidationError(
                    {name: "Only a platform super admin can change this field." for name in blocked}
                )
        email = attrs.get("user", {}).get("email")
        if email:
            email = CustomUser.objects.normalize_email(email.strip())
            attrs["user"]["email"] = email
            owner_pk = self.instance.user_id if self.instance is not None else None
            # Soft-deleted accounts still own their address (as in registration).
            if CustomUser._base_manager.filter(email=email).exclude(pk=owner_pk).exists():
                raise serializers.ValidationError({"email": "This email is already used by another account."})
        phone = attrs.get("user", {}).get("phone")
        if phone:
            # Canonical numbers: 079... and +96279... are the same phone.
            owner_pk = self.instance.user_id if self.instance is not None else None
            if CustomUser._base_manager.filter(phone=phone).exclude(pk=owner_pk).exists():
                raise serializers.ValidationError({"phone": "This phone number is already used by another account."})
        return attrs

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        categories = validated_data.pop("service_categories", None)
        password = validated_data.pop("password", None)
        if "is_active" in user_data:
            instance.user.is_active = user_data.pop("is_active")
        for attr, value in user_data.items():
            setattr(instance.user, attr, value)
        if password:
            instance.user.set_password(password)
            # A replaced password ends every session opened with the old one.
            instance.user.token_version = (instance.user.token_version or 1) + 1
        instance.user.save()
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        request = self.context.get("request")
        if "is_approved" in validated_data and validated_data["is_approved"]:
            instance.approved_by = getattr(request, "user", None)
        if "is_approved" in validated_data and not validated_data["is_approved"]:
            instance.approved_by = None
            instance.approved_at = None
        instance.save()
        if categories is not None:
            instance.service_categories.set(categories)
        return instance


class ProviderApprovalDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=(("approve", "Approve"), ("reject", "Reject")))
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs["decision"] == "reject" and not str(attrs.get("reason", "")).strip():
            raise serializers.ValidationError({"reason": "A reason is required when rejecting a provider."})
        return attrs


class ProviderActivationSerializer(serializers.Serializer):
    is_active = serializers.BooleanField()
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not attrs["is_active"] and not str(attrs.get("reason", "")).strip():
            raise serializers.ValidationError({"reason": "A reason is required when deactivating a provider."})
        return attrs
