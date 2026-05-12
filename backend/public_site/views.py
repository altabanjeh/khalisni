from rest_framework import generics, permissions, status, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.utils import create_audit_log
from config.permissions import IsAdminRole
from public_site.defaults import DEFAULT_PUBLIC_PAGE_CONTENT, DEFAULT_SITE_THEME
from public_site.models import Advertisement, PublicPageContent, SiteTheme
from public_site.selectors import (
    get_active_public_page_content,
    get_active_theme,
    get_current_important_alert,
    get_current_public_advertisements,
)
from public_site.serializers import (
    AdvertisementAdminSerializer,
    AdvertisementPublicSerializer,
    HomepagePayloadSerializer,
    PublicPageContentAdminSerializer,
    PublicPageContentPublicSerializer,
    SiteThemeAdminSerializer,
    SiteThemePublicSerializer,
)


def _snapshot(instance, fields):
    data = {}
    for field in fields:
        value = getattr(instance, field, None)
        if hasattr(value, "url"):
            data[field] = getattr(value, "name", "")
        else:
            data[field] = value
    return data


def get_or_create_active_theme():
    theme = get_active_theme()
    if theme:
        if not theme.active_theme:
            theme.active_theme = True
            theme.save(update_fields=["active_theme", "updated_at"])
        return theme
    return SiteTheme.objects.create(**DEFAULT_SITE_THEME)


def get_or_create_active_content():
    content = get_active_public_page_content()
    if content:
        if not content.active_content:
            content.active_content = True
            content.save(update_fields=["active_content", "updated_at"])
        return content
    return PublicPageContent.objects.create(**DEFAULT_PUBLIC_PAGE_CONTENT)


class PublicHomepageAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        payload = {
            "content": get_or_create_active_content(),
            "advertisements": list(get_current_public_advertisements()),
            "important_alert": get_current_important_alert(),
        }
        serializer = HomepagePayloadSerializer(payload, context={"request": request})
        return Response(serializer.data)


class PublicThemeAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        serializer = SiteThemePublicSerializer(get_or_create_active_theme(), context={"request": request})
        return Response(serializer.data)


class PublicAdvertisementListAPIView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = AdvertisementPublicSerializer
    pagination_class = None

    def get_queryset(self):
        return get_current_public_advertisements()


class AdminSingletonMixin:
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    audit_entity_type = ""
    audit_fields = ()

    def get_serializer_context(self):
        return {"request": self.request}

    def log_update(self, instance, *, old_value=None, new_value=None, action="update"):
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action=action,
            entity_type=self.audit_entity_type,
            entity_id=instance.pk,
            old_value=old_value,
            new_value=new_value,
        )


class AdminPublicSiteThemeAPIView(AdminSingletonMixin, APIView):
    serializer_class = SiteThemeAdminSerializer
    audit_entity_type = "PublicSiteTheme"
    audit_fields = (
        "name",
        "primary_color",
        "secondary_color",
        "background_color",
        "text_color",
        "header_background_color",
        "footer_background_color",
        "active_theme",
    )

    def get(self, request):
        serializer = self.serializer_class(get_or_create_active_theme(), context=self.get_serializer_context())
        return Response(serializer.data)

    def put(self, request):
        instance = get_or_create_active_theme()
        old_value = _snapshot(instance, self.audit_fields)
        serializer = self.serializer_class(instance, data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        self.log_update(
            instance,
            old_value=old_value,
            new_value=_snapshot(instance, self.audit_fields),
            action="update_public_site_theme",
        )
        return Response(serializer.data)


class AdminPublicPageContentAPIView(AdminSingletonMixin, APIView):
    serializer_class = PublicPageContentAdminSerializer
    audit_entity_type = "PublicPageContent"
    audit_fields = (
        "version_name",
        "hero_title_ar",
        "hero_title_en",
        "hero_subtitle_ar",
        "hero_subtitle_en",
        "primary_button_text",
        "primary_button_url",
        "secondary_button_text",
        "secondary_button_url",
        "how_it_works_text",
        "contact_phone",
        "whatsapp_number",
        "email",
        "office_address",
        "footer_text",
        "active_content",
    )

    def get(self, request):
        serializer = self.serializer_class(get_or_create_active_content(), context=self.get_serializer_context())
        return Response(serializer.data)

    def put(self, request):
        instance = get_or_create_active_content()
        old_value = _snapshot(instance, self.audit_fields)
        serializer = self.serializer_class(instance, data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        self.log_update(
            instance,
            old_value=old_value,
            new_value=_snapshot(instance, self.audit_fields),
            action="update_public_page_content",
        )
        return Response(serializer.data)


class AdvertisementAdminViewSet(viewsets.ModelViewSet):
    serializer_class = AdvertisementAdminSerializer
    queryset = Advertisement.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    search_fields = ["title_ar", "title_en", "description_ar", "description_en"]
    ordering_fields = ["display_order", "start_date", "end_date", "created_at", "updated_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        advertisement_type = self.request.query_params.get("type")
        is_active = self.request.query_params.get("is_active")
        if advertisement_type:
            queryset = queryset.filter(advertisement_type=advertisement_type)
        if is_active is not None:
            queryset = queryset.filter(is_active=str(is_active).strip().lower() in {"1", "true", "yes", "on"})
        return queryset.order_by("display_order", "-start_date", "-advertisement_id")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def perform_create(self, serializer):
        advertisement = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="create_public_site_advertisement",
            entity_type="PublicSiteAdvertisement",
            entity_id=advertisement.pk,
            new_value=_snapshot(
                advertisement,
                (
                    "title_ar",
                    "advertisement_type",
                    "display_order",
                    "start_date",
                    "end_date",
                    "is_active",
                ),
            ),
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        old_value = _snapshot(
            instance,
            (
                "title_ar",
                "advertisement_type",
                "display_order",
                "start_date",
                "end_date",
                "is_active",
            ),
        )
        advertisement = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="update_public_site_advertisement",
            entity_type="PublicSiteAdvertisement",
            entity_id=advertisement.pk,
            old_value=old_value,
            new_value=_snapshot(
                advertisement,
                (
                    "title_ar",
                    "advertisement_type",
                    "display_order",
                    "start_date",
                    "end_date",
                    "is_active",
                ),
            ),
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        old_value = _snapshot(
            instance,
            (
                "title_ar",
                "advertisement_type",
                "display_order",
                "start_date",
                "end_date",
                "is_active",
            ),
        )
        response = super().destroy(request, *args, **kwargs)
        create_audit_log(
            request=request,
            user=request.user,
            action="delete_public_site_advertisement",
            entity_type="PublicSiteAdvertisement",
            entity_id=instance.pk,
            old_value=old_value,
            new_value=None,
        )
        return response
