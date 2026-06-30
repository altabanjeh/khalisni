from rest_framework import serializers

from core.serializer_mixins import PkAsIdMixin
from public_site.models import Advertisement, PublicPageContent, SiteTheme
from public_site.models import MissingServiceRequest


def build_media_url(request, file_field):
    if not file_field:
        return ""
    url = getattr(file_field, "url", "")
    if not url:
        return ""
    if request is None:
        return url
    return request.build_absolute_uri(url)


class SiteThemePublicSerializer(serializers.ModelSerializer):
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


class PublicPageContentPublicSerializer(serializers.ModelSerializer):
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
            "footer_text",
            "footer_text_en",
            "active_content",
        )

    def get_hero_image_url(self, obj):
        return build_media_url(self.context.get("request"), obj.hero_image)


class AdvertisementPublicSerializer(serializers.ModelSerializer):
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


class SiteThemeAdminSerializer(serializers.ModelSerializer):
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


class PublicPageContentAdminSerializer(serializers.ModelSerializer):
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
            "footer_text",
            "footer_text_en",
            "active_content",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at", "hero_image_url")

    def get_hero_image_url(self, obj):
        return build_media_url(self.context.get("request"), obj.hero_image)


class AdvertisementAdminSerializer(serializers.ModelSerializer):
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


class MissingServiceRequestPublicSerializer(serializers.ModelSerializer):
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


class MissingServiceRequestAdminSerializer(PkAsIdMixin, serializers.ModelSerializer):
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
