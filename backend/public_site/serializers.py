from rest_framework import serializers

from public_site.models import Advertisement, PublicPageContent, SiteTheme


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
            "primary_button_url",
            "secondary_button_text",
            "secondary_button_url",
            "hero_image_url",
            "how_it_works_text",
            "contact_phone",
            "whatsapp_number",
            "email",
            "office_address",
            "footer_text",
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
            "primary_button_url",
            "secondary_button_text",
            "secondary_button_url",
            "hero_image",
            "hero_image_url",
            "how_it_works_text",
            "contact_phone",
            "whatsapp_number",
            "email",
            "office_address",
            "footer_text",
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

