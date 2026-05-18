import os

from rest_framework import serializers
from rest_framework.reverse import reverse

from core.serializer_mixins import PkAsIdMixin
from documents.models import Document


class DocumentSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = (
            "id",
            "document_type",
            "original_filename",
            "file_size",
            "mime_type",
            "status",
            "is_final_document",
            "is_verified",
            "verification_note",
            "created_at",
            "download_url",
        )

    def get_download_url(self, obj):
        request = self.context.get("request")
        if not request:
            return None
        return reverse("document-download", kwargs={"pk": obj.pk}, request=request)


class ProviderDocumentSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = (
            "id",
            "document_type",
            "original_filename",
            "file_size",
            "status",
            "is_final_document",
            "created_at",
            "download_url",
        )

    def get_download_url(self, obj):
        request = self.context.get("request")
        if not request:
            return None
        return reverse("document-download", kwargs={"pk": obj.pk}, request=request)


class DocumentUploadSerializer(serializers.ModelSerializer):
    file = serializers.FileField()

    class Meta:
        model = Document
        fields = ("id", "document_type", "file", "is_final_document", "verification_note")
        read_only_fields = ("id",)

    def validate_file(self, value):
        extension = os.path.splitext(value.name)[1].lower()
        if extension not in self.context["allowed_extensions"]:
            raise serializers.ValidationError("Unsupported file extension.")
        if value.size > self.context["max_size"]:
            raise serializers.ValidationError("File exceeds maximum allowed size.")
        content_type = getattr(value, "content_type", "")
        if content_type and content_type not in self.context["allowed_mime_types"]:
            raise serializers.ValidationError("Unsupported file type.")
        return value

    def create(self, validated_data):
        upload = validated_data["file"]
        return Document.objects.create(
            order=self.context["order"],
            uploaded_by=self.context.get("uploaded_by"),
            document_type=validated_data["document_type"],
            file=upload,
            original_filename=upload.name,
            file_size=upload.size,
            mime_type=getattr(upload, "content_type", ""),
            is_final_document=validated_data.get("is_final_document", False),
            verification_note=validated_data.get("verification_note", ""),
        )


class DocumentVerificationSerializer(serializers.Serializer):
    is_verified = serializers.BooleanField()
    note = serializers.CharField(required=False, allow_blank=True)


class StaffDocumentSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()
    order = serializers.SerializerMethodField()
    uploaded_by_name = serializers.CharField(source="uploaded_by.full_name", read_only=True)
    verified_by_name = serializers.CharField(source="verified_by.full_name", read_only=True)

    class Meta:
        model = Document
        fields = (
            "id",
            "document_type",
            "original_filename",
            "file_size",
            "mime_type",
            "status",
            "is_final_document",
            "is_verified",
            "verification_note",
            "rejection_reason",
            "uploaded_by_role",
            "uploaded_by_name",
            "verified_by_name",
            "verified_at",
            "created_at",
            "order",
            "download_url",
        )

    def get_download_url(self, obj):
        request = self.context.get("request")
        if not request:
            return None
        return reverse("document-download", kwargs={"pk": obj.pk}, request=request)

    def get_order(self, obj):
        order = getattr(obj, "order", None)
        if not order:
            return None
        return {
            "id": order.pk,
            "order_number": order.order_number,
            "status": order.status,
            "service_name": getattr(order.service, "name_ar", ""),
        }


class DocumentAdminSerializer(PkAsIdMixin, serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = "__all__"
        read_only_fields = ("stored_filename", "created_at", "updated_at")
