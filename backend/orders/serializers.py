import os

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from core.serializer_mixins import PkAsIdMixin

from accounts.models import CustomUser
from core.choices import DocumentType
from documents.serializers import DocumentSerializer, ProviderDocumentSerializer, StaffDocumentSerializer
from documents.services import can_user_download_document
from organizations.models import Branch
from organizations.selectors import resolve_organization_by_ref
from orders.models import Order, OrderIssue, OrderNote, OrderStatusLog, Rating
from orders.allowed_actions import get_order_allowed_actions
from orders.services import create_customer_order
from providers.models import ProviderProfile
from services.models import Service
from services.selectors import visible_services_queryset
from workflow.rules import get_transition_rule


class ServiceBriefSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name_ar", read_only=True)

    class Meta:
        model = Service
        fields = ("id", "name_ar", "slug", "estimated_duration", "service_fee", "government_fee", "category_name")


class CustomerBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ("id", "full_name", "phone", "email", "national_id")


class EmployeeBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ("id", "full_name", "email", "role")


class ProviderBriefSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = ProviderProfile
        fields = ("id", "full_name", "provider_type", "city", "rating", "is_available")


class OrderStatusLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.full_name", read_only=True)

    class Meta:
        model = OrderStatusLog
        fields = ("id", "old_status", "new_status", "changed_by", "changed_by_name", "note", "created_at")


class OrderNoteSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = OrderNote
        fields = ("id", "user", "user_name", "note", "visibility", "created_at")


class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = ("id", "score", "comment", "created_at")


class OrderListSerializer(serializers.ModelSerializer):
    service = ServiceBriefSerializer(read_only=True)
    customer = CustomerBriefSerializer(read_only=True)
    assigned_employee = EmployeeBriefSerializer(read_only=True)
    assigned_provider = ProviderBriefSerializer(read_only=True)
    allowed_actions = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "service_name_snapshot",
            "service_category_name_snapshot",
            "organization_name_snapshot",
            "customer",
            "city",
            "service",
            "status",
            "priority",
            "assigned_employee",
            "assigned_provider",
            "expected_delivery_date",
            "final_price",
            "missing_document_types",
            "created_at",
            "updated_at",
            "allowed_actions",
        )

    def get_allowed_actions(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        # Queryset already filtered to orders this user can see — skip the extra existence check.
        return get_order_allowed_actions(user=user, order=obj, can_view=True)


class OrderAdminSerializer(serializers.ModelSerializer):
    DANGEROUS_FIELDS = {
        "assigned_provider",
        "assigned_by",
        "assigned_employee",
        "cancelled_at",
        "completed_at",
        "customer",
        "final_price",
        "status",
    }

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "city",
            "priority",
            "expected_delivery_date",
            "customer_notes",
            "internal_notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "order_number", "created_at", "updated_at")

    def validate(self, attrs):
        submitted_fields = {str(key) for key in getattr(self, "initial_data", {}).keys()}
        dangerous_fields = sorted(submitted_fields & self.DANGEROUS_FIELDS)
        if dangerous_fields:
            raise serializers.ValidationError(
                {
                    field: "This field can only be changed through dedicated workflow actions."
                    for field in dangerous_fields
                }
            )
        return attrs


class OrderDetailSerializer(OrderListSerializer):
    customer = CustomerBriefSerializer(read_only=True)
    documents = serializers.SerializerMethodField()
    status_logs = OrderStatusLogSerializer(read_only=True, many=True)
    notes = serializers.SerializerMethodField()
    rating = RatingSerializer(read_only=True)

    class Meta(OrderListSerializer.Meta):
        fields = OrderListSerializer.Meta.fields + (
            "customer",
            "city",
            "customer_notes",
            "internal_notes",
            "missing_document_types",
            "rejection_reason",
            "is_archived",
            "completed_at",
            "documents",
            "status_logs",
            "notes",
            "rating",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if getattr(user, "is_authenticated", False) and getattr(user, "role", "") == CustomUser.Role.CUSTOMER:
            data.pop("internal_notes", None)
        return data

    def get_documents(self, obj):
        request = self.context.get("request")
        public_track = self.context.get("public_track", False)
        queryset = obj.documents.all()
        if public_track:
            queryset = queryset.filter(is_final_document=True)
        user = getattr(request, "user", None)
        role = (getattr(user, "role", "") or "").lower()
        serializer_class = StaffDocumentSerializer if role in {CustomUser.Role.ADMIN, CustomUser.Role.EMPLOYEE, CustomUser.Role.SUPPORT} else DocumentSerializer
        return serializer_class(queryset, many=True, context={"request": request}).data

    def get_notes(self, obj):
        public_track = self.context.get("public_track", False)
        request = self.context.get("request")
        queryset = obj.notes.select_related("user")
        if public_track:
            queryset = queryset.filter(visibility=OrderNote.Visibility.CUSTOMER)
        elif request and request.user.is_authenticated and request.user.role == CustomUser.Role.CUSTOMER:
            queryset = queryset.filter(visibility=OrderNote.Visibility.CUSTOMER)
        return OrderNoteSerializer(queryset, many=True).data


class ProviderOrderStatusLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusLog
        fields = ("id", "old_status", "new_status", "note", "created_at")


class ProviderOrderListSerializer(serializers.ModelSerializer):
    service = ServiceBriefSerializer(read_only=True)
    allowed_actions = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "city",
            "service",
            "status",
            "expected_delivery_date",
            "created_at",
            "updated_at",
            "allowed_actions",
        )

    def get_allowed_actions(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        # Queryset already filtered to orders this user can see — skip the extra existence check.
        return get_order_allowed_actions(user=user, order=obj, can_view=True)


class ProviderOrderDetailSerializer(ProviderOrderListSerializer):
    assigned_work_details = serializers.CharField(source="customer_notes", read_only=True)
    provider_instructions = serializers.SerializerMethodField()
    documents = serializers.SerializerMethodField()
    status_logs = ProviderOrderStatusLogSerializer(read_only=True, many=True)

    class Meta(ProviderOrderListSerializer.Meta):
        fields = ProviderOrderListSerializer.Meta.fields + (
            "assigned_work_details",
            "provider_instructions",
            "documents",
            "status_logs",
        )

    def get_provider_instructions(self, obj):
        return list(
            obj.notes.filter(visibility=OrderNote.Visibility.PROVIDER).values_list("note", flat=True)
        )

    def get_documents(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        queryset = [
            document
            for document in obj.documents.all()
            if can_user_download_document(user=user, document=document)
        ]
        return ProviderDocumentSerializer(queryset, many=True, context={"request": request}).data


class PublicOrderCreateSerializer(serializers.Serializer):
    service = serializers.PrimaryKeyRelatedField(queryset=Service.objects.filter(is_active=True))
    organization = serializers.CharField(required=False, allow_blank=True)
    branch_id = serializers.PrimaryKeyRelatedField(queryset=Branch.objects.filter(is_active=True), required=False, allow_null=True)
    full_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=30)
    national_id = serializers.CharField(max_length=32, required=False, allow_blank=True)
    city = serializers.CharField(max_length=120)
    notes = serializers.CharField(required=False, allow_blank=True)
    consent = serializers.BooleanField()
    document_types = serializers.ListField(
        child=serializers.CharField(max_length=120),
        write_only=True,
        required=False,
    )
    documents = serializers.ListField(child=serializers.FileField(), write_only=True, required=False)

    def to_internal_value(self, data):
        request = self.context.get("request")
        payload = data.copy() if hasattr(data, "copy") else dict(data)

        if hasattr(payload, "setlist"):
            payload.setlist(
                "document_types",
                data.getlist("document_types") if hasattr(data, "getlist") else [],
            )
            payload.setlist(
                "documents",
                request.FILES.getlist("documents") if request and hasattr(request, "FILES") else [],
            )
        else:
            if hasattr(data, "getlist"):
                payload["document_types"] = data.getlist("document_types")
            if request and hasattr(request, "FILES"):
                payload["documents"] = request.FILES.getlist("documents")

        return super().to_internal_value(payload)

    def validate_consent(self, value):
        if not value:
            raise serializers.ValidationError("Consent is required.")
        return value

    def validate_service(self, value):
        if not value.is_online:
            raise serializers.ValidationError("This service cannot be ordered online.")
        return value

    def validate(self, attrs):
        organization = resolve_organization_by_ref(attrs.get("organization"))
        if organization is not None:
            visible_service_ids = visible_services_queryset(organization=organization).values_list("pk", flat=True)
            if attrs["service"].pk not in visible_service_ids:
                raise serializers.ValidationError({"service": "This service is not available for the selected organization."})
        attrs["organization_obj"] = organization

        branch = attrs.get("branch_id")
        if branch is not None and organization is not None and branch.organization_id != organization.id:
            raise serializers.ValidationError({"branch_id": "Branch must belong to the selected organization."})

        service = attrs["service"]
        requirements = list(service.document_requirements.filter(is_active=True).order_by("display_order", "name_ar"))
        requirements_by_type = {requirement.document_type: requirement for requirement in requirements}
        required_types = {requirement.document_type for requirement in requirements if requirement.is_required}

        uploads = list(attrs.pop("documents", []))
        document_types = [str(item).strip().lower() for item in attrs.pop("document_types", []) if str(item).strip()]

        if document_types and len(document_types) != len(uploads):
            raise serializers.ValidationError({"documents": "Each uploaded file must have a matching document type."})

        if uploads and not document_types:
            if requirements:
                raise serializers.ValidationError({"documents": "Upload each required document in its own field."})
            attrs["initial_documents"] = [
                {"document_type": DocumentType.CUSTOMER_UPLOAD, "file": upload}
                for upload in uploads
            ]
            return attrs

        if required_types and not uploads:
            missing_labels = [requirements_by_type[doc_type].name_ar or doc_type for doc_type in sorted(required_types)]
            raise serializers.ValidationError(
                {"documents": f"Missing required documents: {', '.join(missing_labels)}."}
            )

        errors = {}
        seen_types = set()
        initial_documents = []

        for index, (document_type, upload) in enumerate(zip(document_types, uploads)):
            requirement = requirements_by_type.get(document_type)
            if not requirement:
                errors[f"document_types[{index}]"] = "This document is not required for the selected service."
                continue
            if document_type in seen_types:
                errors[f"document_types[{index}]"] = "This document was uploaded more than once."
                continue

            extension = os.path.splitext(upload.name or "")[1].lower()
            allowed_extensions = [str(item).lower() for item in (requirement.allowed_extensions or []) if str(item).strip()]
            if allowed_extensions and extension not in allowed_extensions:
                errors[f"documents[{index}]"] = "Unsupported file extension for this document."
                continue

            max_file_size = requirement.max_file_size or 0
            if max_file_size and upload.size > max_file_size:
                errors[f"documents[{index}]"] = "This document exceeds the allowed file size."
                continue

            seen_types.add(document_type)
            initial_documents.append({"document_type": document_type, "file": upload})

        missing_types = required_types - seen_types
        if missing_types:
            missing_labels = [requirements_by_type[doc_type].name_ar or doc_type for doc_type in sorted(missing_types)]
            errors["documents"] = f"Missing required documents: {', '.join(missing_labels)}."

        if errors:
            raise serializers.ValidationError(errors)

        attrs["initial_documents"] = initial_documents
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not getattr(user, "is_authenticated", False) or getattr(user, "role", "") != CustomUser.Role.CUSTOMER:
            raise serializers.ValidationError("Only authenticated customer accounts can create orders.")

        payload = dict(validated_data)
        payload.pop("consent", None)
        payload["organization"] = payload.pop("organization_obj", None)
        payload["branch"] = payload.pop("branch_id", None)
        try:
            return create_customer_order(customer=user, data=payload, request=request)
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise serializers.ValidationError(exc.message_dict)
            raise serializers.ValidationError(exc.messages)


class TrackOrderSerializer(serializers.ModelSerializer):
    timeline = OrderStatusLogSerializer(source="status_logs", many=True, read_only=True)
    missing_documents = serializers.SerializerMethodField()
    final_documents = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ("id", "order_number", "status", "timeline", "missing_documents", "final_documents")

    def get_missing_documents(self, obj):
        if obj.status != Order.Status.WAITING_CUSTOMER:
            return []
        return list(obj.missing_document_types or [])

    def get_final_documents(self, obj):
        request = self.context.get("request")
        docs = obj.documents.filter(is_final_document=True)
        return DocumentSerializer(docs, many=True, context={"request": request}).data


class CustomerDocumentUploadSerializer(serializers.Serializer):
    document_type = serializers.CharField(max_length=120)
    file = serializers.FileField()


class RatingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = ("score", "comment")


class AdminStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)
    note = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        order = self.context.get("order")
        transition_rule = get_transition_rule(getattr(order, "status", None), attrs["status"])
        if not transition_rule or not transition_rule.generic_status_update:
            raise serializers.ValidationError(
                {"status": "This transition is not available through the generic status endpoint."}
            )
        if transition_rule.reason_required and not str(attrs.get("note", "")).strip():
            raise serializers.ValidationError({"note": "A reason is required for this workflow action."})
        return attrs


class AssignProviderSerializer(serializers.Serializer):
    provider_id = serializers.PrimaryKeyRelatedField(queryset=ProviderProfile.objects.select_related("user"))
    note = serializers.CharField(required=False, allow_blank=True)


class RequestDocumentsSerializer(serializers.Serializer):
    note = serializers.CharField()
    document_types = serializers.ListField(
        child=serializers.CharField(max_length=120),
        required=False,
        allow_empty=True,
    )


class OrderNoteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderNote
        fields = ("note", "visibility")


class OrderNoteAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderNote
        fields = "__all__"


class OrderIssueAdminSerializer(PkAsIdMixin, serializers.ModelSerializer):
    class Meta:
        model = OrderIssue
        fields = "__all__"


class RatingAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = "__all__"


class FinalDocumentSerializer(serializers.Serializer):
    document_type = serializers.CharField(max_length=120, default="FINAL_RESULT")
    file = serializers.FileField()
    verification_note = serializers.CharField(required=False, allow_blank=True)


class RejectOrderSerializer(serializers.Serializer):
    reason = serializers.CharField()


class CompleteOrderSerializer(serializers.Serializer):
    admin_confirmation = serializers.BooleanField(default=False)


class CancelOrderSerializer(serializers.Serializer):
    reason = serializers.CharField()
