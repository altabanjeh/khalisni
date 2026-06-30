from rest_framework import serializers

from accounts.models import CustomUser
from providers.models import ProviderProfile
from services.models import ServiceCategory


class ProviderProfileSerializer(serializers.ModelSerializer):
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


class ProviderAdminListSerializer(serializers.ModelSerializer):
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
        return "Approved" if obj.is_approved else "Pending review"

    def get_capability_summary(self, obj):
        categories = list(obj.service_categories.values_list("name_ar", flat=True))
        if categories:
            return ", ".join(categories)
        return "No categories linked yet"


class ProviderAdminSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name")
    email = serializers.EmailField(source="user.email")
    phone = serializers.CharField(source="user.phone")
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
        return "Approved" if obj.is_approved else "Pending review"

    def validate(self, attrs):
        if not self.instance and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Password is required when creating a provider account."})
        return attrs

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
