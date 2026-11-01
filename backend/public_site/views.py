from django.http import Http404
from rest_framework import generics, permissions, status, viewsets
from django.db import transaction
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.utils import create_audit_log
from config.permissions import IsAdminRole, IsInternalStaffRole, PlatformRecordWriteMixin
from core.delete_guard import AdminDeleteGuardMixin
from public_site.defaults import DEFAULT_PUBLIC_PAGE_CONTENT, DEFAULT_SITE_THEME
from public_site.models import Advertisement, LegalDocument, MissingServiceRequest, PublicPageContent, SiteTheme
from public_site.services import notify_missing_service_request_assigned, notify_missing_service_request_created
from public_site.selectors import (
    get_active_public_page_content,
    get_active_theme,
    get_current_important_alert,
    get_current_public_advertisements,
    get_latest_public_page_content,
    get_published_legal_document,
    get_published_legal_documents,
)
from public_site.serializers import (
    AdvertisementAdminSerializer,
    AdvertisementPublicSerializer,
    ContactInquiryCreateSerializer,
    HomepagePayloadSerializer,
    LegalDocumentAdminSerializer,
    LegalDocumentPublicSerializer,
    MissingServiceRequestAdminSerializer,
    MissingServiceRequestPublicSerializer,
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


def get_published_content():
    """
    Content for the public site. Reading never changes publish state: when the
    administrator has unpublished the homepage, visitors get the built-in
    defaults, not the unpublished version.
    """
    content = get_active_public_page_content()
    if content:
        return content
    if not PublicPageContent.objects.exists():
        return PublicPageContent.objects.create(**DEFAULT_PUBLIC_PAGE_CONTENT)
    return PublicPageContent(**{**DEFAULT_PUBLIC_PAGE_CONTENT, "active_content": False})


def get_or_create_editable_content():
    """Content for the admin editor: the published version, else the newest draft."""
    return get_latest_public_page_content() or PublicPageContent.objects.create(**DEFAULT_PUBLIC_PAGE_CONTENT)


class PublicHomepageAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        payload = {
            "content": get_published_content(),
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


class PublicMissingServiceRequestCreateAPIView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = MissingServiceRequestPublicSerializer
    throttle_scope = "missing_service_request"

    def perform_create(self, serializer):
        user = self.request.user if getattr(self.request.user, "is_authenticated", False) else None
        missing_request = serializer.save(created_by_user=user)
        notify_missing_service_request_created(missing_request=missing_request, actor=user)
        create_audit_log(
            request=self.request,
            user=user,
            action="create_missing_service_request",
            entity_type="MissingServiceRequest",
            entity_id=missing_request.pk,
            new_value={
                "request_number": missing_request.request_number,
                "service_name": missing_request.service_name,
                "status": missing_request.status,
                "source": missing_request.source,
            },
        )


class PublicContactInquiryCreateAPIView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ContactInquiryCreateSerializer
    throttle_scope = "public_contact"

    def perform_create(self, serializer):
        inquiry = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user if self.request.user.is_authenticated else None,
            action="create_contact_inquiry",
            entity_type="ContactInquiry",
            entity_id=inquiry.pk,
        )


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
        "primary_button_text_en",
        "primary_button_url",
        "secondary_button_text",
        "secondary_button_text_en",
        "secondary_button_url",
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
        "active_content",
    )

    def get(self, request):
        serializer = self.serializer_class(get_or_create_editable_content(), context=self.get_serializer_context())
        return Response(serializer.data)

    def put(self, request):
        instance = get_or_create_editable_content()
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


class AdvertisementAdminViewSet(AdminDeleteGuardMixin, viewsets.ModelViewSet):
    serializer_class = AdvertisementAdminSerializer
    queryset = Advertisement.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    search_fields = ["title_ar", "title_en", "description_ar", "description_en"]
    ordering_fields = ["display_order", "start_date", "end_date", "created_at", "updated_at"]
    pagination_class = None

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
        self.enforce_delete_guard(request, instance=instance, old_value=old_value)
        with transaction.atomic():
            instance.soft_delete(user=request.user)
            create_audit_log(
                request=request,
                user=request.user,
                action="delete_public_site_advertisement",
                entity_type="PublicSiteAdvertisement",
                entity_id=instance.pk,
                entity_name=instance.title_ar or instance.title_en,
                old_value=old_value,
                new_value=_snapshot(instance, ("title_ar", "advertisement_type", "display_order", "start_date", "end_date", "is_active", "is_deleted")),
            )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        instance = self.get_restore_instance(Advertisement, pk)
        old_value = _snapshot(instance, ("title_ar", "advertisement_type", "display_order", "start_date", "end_date", "is_active", "is_deleted"))
        instance.restore()
        create_audit_log(
            request=request,
            user=request.user,
            action="restore_public_site_advertisement",
            entity_type="PublicSiteAdvertisement",
            entity_id=instance.pk,
            entity_name=instance.title_ar or instance.title_en,
            old_value=old_value,
            new_value=_snapshot(instance, ("title_ar", "advertisement_type", "display_order", "start_date", "end_date", "is_active", "is_deleted")),
        )
        return Response(self.get_serializer(instance).data)


class MissingServiceRequestViewSet(PlatformRecordWriteMixin, viewsets.ModelViewSet):
    # Requester contact details from the public site: platform team only.
    platform_only_reads = True
    serializer_class = MissingServiceRequestAdminSerializer
    queryset = MissingServiceRequest.objects.select_related("assigned_to", "matched_service", "created_by_user")
    permission_classes = [permissions.IsAuthenticated, IsInternalStaffRole]
    http_method_names = ["get", "patch", "head", "options"]
    pagination_class = None
    search_fields = ["request_number", "service_name", "request_message", "requester_name", "requester_phone", "requester_email"]
    ordering_fields = ["created_at", "updated_at", "resolved_at", "status"]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_value = self.request.query_params.get("status")
        assigned_only = self.request.query_params.get("assigned_only")
        source = self.request.query_params.get("source")

        if status_value:
            queryset = queryset.filter(status=status_value)
        if source:
            queryset = queryset.filter(source=source)
        if str(assigned_only).strip().lower() in {"1", "true", "yes", "on"}:
            queryset = queryset.filter(assigned_to=self.request.user)

        return queryset.order_by("-created_at", "-request_id")

    def perform_update(self, serializer):
        instance = self.get_object()
        old_value = {
            "status": instance.status,
            "assigned_to": instance.assigned_to_id,
            "matched_service": instance.matched_service_id,
            "response_message": instance.response_message,
        }
        previous_assignee_id = instance.assigned_to_id
        missing_request = serializer.save()

        if missing_request.assigned_to_id and missing_request.assigned_to_id != previous_assignee_id:
            notify_missing_service_request_assigned(missing_request=missing_request, actor=self.request.user)

        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="update_missing_service_request",
            entity_type="MissingServiceRequest",
            entity_id=missing_request.pk,
            old_value=old_value,
            new_value={
                "status": missing_request.status,
                "assigned_to": missing_request.assigned_to_id,
                "matched_service": missing_request.matched_service_id,
                "response_message": missing_request.response_message,
            },
        )


LEGAL_AUDIT_FIELDS = ("kind", "version", "effective_date", "approval_status", "approval_note", "is_published", "published_at")


class PublicLegalDocumentsAPIView(APIView):
    """GET /api/public-site/legal/ -> {"privacy": {...} | null, "terms": {...} | null}."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        documents = get_published_legal_documents()
        return Response(
            {kind: (LegalDocumentPublicSerializer(document).data if document else None) for kind, document in documents.items()}
        )


class PublicLegalDocumentDetailAPIView(APIView):
    """GET /api/public-site/legal/<kind>/ -> the published version, 404 when none is published."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, kind):
        if kind not in LegalDocument.Kind.values:
            raise Http404
        document = get_published_legal_document(kind)
        if document is None:
            raise Http404
        return Response(LegalDocumentPublicSerializer(document).data)


class LegalDocumentAdminViewSet(viewsets.ModelViewSet):
    """Admin management of legal document versions.

    Versions are never deleted. A version that has been published is read-only;
    a new wording is a new version, created as a draft and then published.
    """

    serializer_class = LegalDocumentAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    http_method_names = ["get", "post", "put", "patch", "head", "options"]
    pagination_class = None

    def get_queryset(self):
        queryset = LegalDocument.objects.select_related("approved_by", "created_by")
        kind = self.request.query_params.get("kind")
        if kind:
            queryset = queryset.filter(kind=kind)
        return queryset.order_by("kind", "-created_at", "-legal_document_id")

    def perform_create(self, serializer):
        document = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="create_legal_document_version",
            entity_type="LegalDocument",
            entity_id=document.pk,
            entity_name=f"{document.kind} {document.version}",
            new_value=_snapshot(document, LEGAL_AUDIT_FIELDS),
        )

    def perform_update(self, serializer):
        old_value = _snapshot(serializer.instance, LEGAL_AUDIT_FIELDS)
        document = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="update_legal_document_version",
            entity_type="LegalDocument",
            entity_id=document.pk,
            entity_name=f"{document.kind} {document.version}",
            old_value=old_value,
            new_value=_snapshot(document, LEGAL_AUDIT_FIELDS),
        )

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        document = self.get_object()
        if document.was_published:
            return Response(
                {"detail": "This version was already published. Create a new version to publish a change."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        previous = get_published_legal_document(document.kind)
        with transaction.atomic():
            document.publish()
            create_audit_log(
                request=request,
                user=request.user,
                action="publish_legal_document_version",
                entity_type="LegalDocument",
                entity_id=document.pk,
                entity_name=f"{document.kind} {document.version}",
                old_value={"previous_published_version": previous.version if previous else ""},
                new_value=_snapshot(document, LEGAL_AUDIT_FIELDS),
            )
        return Response(self.get_serializer(document).data)
