from django.utils import timezone
from rest_framework import serializers

from accounts.fields import CanonicalPhoneField

from core.reserved_domains import is_reserved_email
from core.serializer_mixins import PkAsIdMixin, SoftDeleteFieldsReadOnlyMixin
from public_site.models import Advertisement, ContactInquiry, LegalDocument, PublicPageContent, SiteTheme
from public_site.validators import validate_no_script_content
from public_site.models import MissingServiceRequest


class ContactInquiryCreateSerializer(SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
    # Stored canonical so staff can match the inquiry to a customer's number.
    phone = CanonicalPhoneField()

    class Meta:
        model = ContactInquiry
        fields = ("inquiry_id", "name", "phone", "email", "message", "created_at")
        read_only_fields = ("inquiry_id", "created_at")


def build_media_url(request, file_field):
    if not file_field:
        return ""
    url = getattr(file_field, "url", "")
    if not url:
        return ""
    if request is None:
        return url
    return request.build_absolute_uri(url)


class SiteThemePublicSerializer(SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    favicon_url = serializers.SerializerMethodField()

    class Meta:
        model = SiteTheme
        fields = (
            "theme_id",
            "name",
            "primary_color",
            "secondary_color",
            "background_color",
            "text_color",
            "header_background_color",
            "footer_background_color",
            "logo_url",
            "favicon_url",
            "active_theme",
        )

    def get_logo_url(self, obj):
        return build_media_url(self.context.get("request"), obj.logo)

    def get_favicon_url(self, obj):
        return build_media_url(self.context.get("request"), obj.favicon)


class PublicPageContentPublicSerializer(SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
    hero_image_url = serializers.SerializerMethodField()

    class Meta:
        model = PublicPageContent
        fields = (
            "content_id",
            "version_name",
            "hero_title_ar",
            "hero_title_en",
            "hero_subtitle_ar",
            "hero_subtitle_en",
            "primary_button_text",
            "primary_button_text_en",
            "primary_button_url",
            "secondary_button_text",
            "secondary_button_text_en",
            "secondary_button_url",
            "hero_image_url",
            "how_it_works_text",
            "how_it_works_text_en",
            "contact_phone",
            "whatsapp_number",
            "email",
            "office_address",
            "office_address_en",
            "office_hours_ar",
            "office_hours_en",
            "footer_text",
            "footer_text_en",
            "privacy_policy_ar",
            "privacy_policy_en",
            "active_content",
        )

    def get_hero_image_url(self, obj):
        return build_media_url(self.context.get("request"), obj.hero_image)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # D05: an address on a reserved domain (e.g. support@khalisni.local)
        # cannot receive mail, so it is not published. The stored value is
        # left as it is; the footer then shows the remaining contact details or
        # its "not published" text.
        if is_reserved_email(data.get("email")):
            data["email"] = ""
        return data


class AdvertisementPublicSerializer(SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    is_currently_public = serializers.BooleanField(read_only=True)

    class Meta:
        model = Advertisement
        fields = (
            "advertisement_id",
            "title_ar",
            "title_en",
            "description_ar",
            "description_en",
            "advertisement_type",
            "image_url",
            "button_text_ar",
            "button_text_en",
            "button_url",
            "background_color",
            "text_color",
            "display_order",
            "start_date",
            "end_date",
            "is_active",
            "is_currently_public",
        )

    def get_image_url(self, obj):
        return build_media_url(self.context.get("request"), obj.image)


class SiteThemeAdminSerializer(SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    favicon_url = serializers.SerializerMethodField()

    class Meta:
        model = SiteTheme
        fields = (
            "theme_id",
            "name",
            "primary_color",
            "secondary_color",
            "background_color",
            "text_color",
            "header_background_color",
            "footer_background_color",
            "logo",
            "logo_url",
            "favicon",
            "favicon_url",
            "active_theme",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at", "logo_url", "favicon_url")

    def get_logo_url(self, obj):
        return build_media_url(self.context.get("request"), obj.logo)

    def get_favicon_url(self, obj):
        return build_media_url(self.context.get("request"), obj.favicon)


class PublicPageContentAdminSerializer(SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
    hero_image_url = serializers.SerializerMethodField()

    class Meta:
        model = PublicPageContent
        fields = (
            "content_id",
            "version_name",
            "hero_title_ar",
            "hero_title_en",
            "hero_subtitle_ar",
            "hero_subtitle_en",
            "primary_button_text",
            "primary_button_text_en",
            "primary_button_url",
            "secondary_button_text",
            "secondary_button_text_en",
            "secondary_button_url",
            "hero_image",
            "hero_image_url",
            "how_it_works_text",
            "how_it_works_text_en",
            "contact_phone",
            "whatsapp_number",
            "email",
            "office_address",
            "office_address_en",
            "office_hours_ar",
            "office_hours_en",
            "footer_text",
            "footer_text_en",
            "privacy_policy_ar",
            "privacy_policy_en",
            "active_content",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at", "hero_image_url")

    def get_hero_image_url(self, obj):
        return build_media_url(self.context.get("request"), obj.hero_image)

    def validate_email(self, value):
        if is_reserved_email(value):
            raise serializers.ValidationError(
                "This address is on a reserved domain that cannot receive mail. Publish a real support address or leave it blank."
            )
        return value


class AdvertisementAdminSerializer(SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    is_currently_public = serializers.BooleanField(read_only=True)

    class Meta:
        model = Advertisement
        fields = (
            "advertisement_id",
            "title_ar",
            "title_en",
            "description_ar",
            "description_en",
            "advertisement_type",
            "image",
            "image_url",
            "button_text_ar",
            "button_text_en",
            "button_url",
            "background_color",
            "text_color",
            "display_order",
            "start_date",
            "end_date",
            "is_active",
            "is_deleted",
            "deleted_at",
            "delete_reason",
            "is_currently_public",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at", "image_url", "is_currently_public")

    def get_image_url(self, obj):
        return build_media_url(self.context.get("request"), obj.image)


class HomepagePayloadSerializer(serializers.Serializer):
    content = PublicPageContentPublicSerializer()
    advertisements = AdvertisementPublicSerializer(many=True)
    important_alert = AdvertisementPublicSerializer(allow_null=True)


class MissingServiceRequestPublicSerializer(SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
    requester_phone = CanonicalPhoneField(required=False, allow_blank=True)
    matched_service_id = serializers.PrimaryKeyRelatedField(
        queryset=MissingServiceRequest._meta.get_field("matched_service").remote_field.model.objects.filter(is_deleted=False),
        source="matched_service",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = MissingServiceRequest
        fields = (
            "request_id",
            "request_number",
            "service_name",
            "request_message",
            "requester_name",
            "requester_phone",
            "requester_email",
            "preferred_contact_channel",
            "source",
            "matched_service_id",
            "status",
            "created_at",
        )
        read_only_fields = ("request_id", "request_number", "status", "created_at")

    def validate(self, attrs):
        requester_phone = attrs.get("requester_phone", "")
        requester_email = attrs.get("requester_email", "")
        request_user = getattr(self.context.get("request"), "user", None)
        if not requester_phone and not requester_email and not getattr(request_user, "is_authenticated", False):
            raise serializers.ValidationError(
                {"requester_phone": "أدخل رقم هاتف أو بريد إلكتروني حتى يتمكن الفريق من التواصل معك."}
            )
        return attrs


class MissingServiceRequestAdminSerializer(SoftDeleteFieldsReadOnlyMixin, PkAsIdMixin, serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source="assigned_to.full_name", read_only=True)
    matched_service_name = serializers.CharField(source="matched_service.name_ar", read_only=True)
    created_by_user_name = serializers.CharField(source="created_by_user.full_name", read_only=True)

    class Meta:
        model = MissingServiceRequest
        fields = (
            "request_id",
            "request_number",
            "service_name",
            "request_message",
            "requester_name",
            "requester_phone",
            "requester_email",
            "preferred_contact_channel",
            "source",
            "status",
            "created_by_user",
            "created_by_user_name",
            "matched_service",
            "matched_service_name",
            "assigned_to",
            "assigned_to_name",
            "internal_notes",
            "response_message",
            "resolved_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("request_id", "request_number", "created_at", "updated_at", "resolved_at")


# Public contract for legal documents (other clients, including the mobile app,
# depend on exactly these keys).
LEGAL_DOCUMENT_PUBLIC_FIELDS = (
    "kind",
    "version",
    "effective_date",
    "title_ar",
    "title_en",
    "body_ar",
    "body_en",
    "approval_status",
    "updated_at",
)


class LegalDocumentPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = LegalDocument
        fields = LEGAL_DOCUMENT_PUBLIC_FIELDS
        read_only_fields = LEGAL_DOCUMENT_PUBLIC_FIELDS


class LegalDocumentAdminSerializer(PkAsIdMixin, serializers.ModelSerializer):
    approved_by_name = serializers.CharField(source="approved_by.full_name", read_only=True, default="")
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True, default="")
    is_draft = serializers.BooleanField(read_only=True)
    was_published = serializers.BooleanField(read_only=True)
    is_editable = serializers.SerializerMethodField()
    # Declared explicitly: uniqueness (one published version per kind, one row
    # per kind + version) is checked in validate(), not by generated validators.
    kind = serializers.ChoiceField(choices=LegalDocument.Kind.choices)
    version = serializers.CharField(max_length=64, validators=[validate_no_script_content])

    class Meta:
        model = LegalDocument
        validators = []
        fields = (
            "legal_document_id",
            "kind",
            "version",
            "effective_date",
            "title_ar",
            "title_en",
            "body_ar",
            "body_en",
            "approval_status",
            "approval_note",
            "is_draft",
            "is_published",
            "was_published",
            "is_editable",
            "published_at",
            "approved_by",
            "approved_by_name",
            "approved_at",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "legal_document_id",
            "is_published",
            "published_at",
            "approved_by",
            "approved_at",
            "created_by",
            "created_at",
            "updated_at",
        )

    def get_is_editable(self, obj):
        return not obj.was_published

    def validate(self, attrs):
        instance = self.instance
        if instance is not None and instance.was_published:
            raise serializers.ValidationError(
                {"detail": "A version that has been published is read-only. Create a new version instead."}
            )
        if instance is not None and "kind" in attrs and attrs["kind"] != instance.kind:
            raise serializers.ValidationError({"kind": "The kind of an existing version cannot change."})
        kind = attrs.get("kind", getattr(instance, "kind", None))
        version = (attrs.get("version", getattr(instance, "version", "")) or "").strip()
        if "version" in attrs:
            attrs["version"] = version
        if kind and version:
            duplicates = LegalDocument.objects.filter(kind=kind, version=version)
            if instance is not None:
                duplicates = duplicates.exclude(pk=instance.pk)
            if duplicates.exists():
                raise serializers.ValidationError({"version": "This version already exists for this document. Use a new version label."})
        status_value = attrs.get("approval_status", getattr(instance, "approval_status", None))
        note = attrs.get("approval_note", getattr(instance, "approval_note", "")) or ""
        if status_value == LegalDocument.ApprovalStatus.APPROVED and not note.strip():
            raise serializers.ValidationError(
                {"approval_note": "Record who approved this wording and the reference of that approval."}
            )
        return attrs

    def _stamp_approval(self, validated_data, instance=None):
        request = self.context.get("request")
        status_value = validated_data.get("approval_status", getattr(instance, "approval_status", None))
        if status_value == LegalDocument.ApprovalStatus.APPROVED:
            if instance is None or instance.approval_status != LegalDocument.ApprovalStatus.APPROVED:
                validated_data["approved_at"] = timezone.now()
                user = getattr(request, "user", None)
                validated_data["approved_by"] = user if getattr(user, "is_authenticated", False) else None
        else:
            validated_data["approved_at"] = None
            validated_data["approved_by"] = None
        return validated_data

    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        validated_data["created_by"] = user if getattr(user, "is_authenticated", False) else None
        return super().create(self._stamp_approval(validated_data))

    def update(self, instance, validated_data):
        return super().update(instance, self._stamp_approval(validated_data, instance))
