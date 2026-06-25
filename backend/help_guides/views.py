from django.db.models import Q
from django.db import transaction
from rest_framework import permissions, response, status, viewsets
from rest_framework.views import APIView

from audit.utils import create_audit_log
from config.permissions import CanManageHelpGuides
from core.delete_guard import AdminDeleteGuardMixin
from help_guides.models import HelpGuide, HelpGuideAction, HelpGuideField, HelpGuideScreenshot, HelpGuideService, HelpGuideWorkflow
from help_guides.selectors import (
    build_contextual_help_payload,
    get_action_guides_for_context,
    get_field_guides_for_context,
    get_manual_index_guides,
    get_manual_quick_links,
    get_readable_entity_queryset,
    get_readable_help_guides_queryset,
    get_service_guide_for_context,
    get_workflow_guides_for_context,
    search_help_content,
)
from help_guides.serializers import (
    HelpGuideActionAdminSerializer,
    HelpGuideAdminSerializer,
    HelpGuideFieldAdminSerializer,
    HelpGuideMetadataSerializer,
    HelpGuideReadOnlySerializer,
    HelpGuideScreenshotAdminSerializer,
    HelpGuideServiceAdminSerializer,
    HelpGuideWorkflowAdminSerializer,
    build_help_guide_metadata,
    serialize_action_guide,
    serialize_field_guide,
    serialize_screen_guide,
    serialize_service_guide,
    serialize_workflow_guide,
)
from help_guides.screen_registry import get_help_screen_label


class CanManageHelpGuidesOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return CanManageHelpGuides().has_permission(request, view)


def _preview_role(request):
    return str(request.query_params.get("preview_role", "")).strip()


def _include_preview_permissions(request, view):
    return bool(_preview_role(request) and CanManageHelpGuides().has_permission(request, view))


def _service_id(request):
    raw_value = request.query_params.get("service_id")
    if raw_value in (None, ""):
        return None
    try:
        return int(raw_value)
    except (TypeError, ValueError):
        return None


class HelpGuideCurrentAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        screen_key = str(request.query_params.get("screen_key", "")).strip()
        workflow_status = str(request.query_params.get("workflow_status", "")).strip()
        preview_role = _preview_role(request)
        payload = build_contextual_help_payload(
            request.user,
            screen_key=screen_key,
            workflow_status=workflow_status,
            service_id=_service_id(request),
            preview_role=preview_role if CanManageHelpGuides().has_permission(request, self) else "",
            include_permission_restricted=_include_preview_permissions(request, self),
        )
        screen_guides = [serialize_screen_guide(item) for item in payload["screen_guides"]]
        action_guides = [serialize_action_guide(item) for item in payload["actions"]]
        field_guides = [serialize_field_guide(item) for item in payload["fields"]]
        workflow_guides = [serialize_workflow_guide(item) for item in payload["workflows"]]
        service_guide = serialize_service_guide(payload["service"]) if payload["service"] else None
        return response.Response(
            {
                "screen_key": screen_key,
                "screen_label": get_help_screen_label(screen_key),
                "workflow_status": workflow_status,
                "service_id": _service_id(request),
                "preview_role": preview_role if CanManageHelpGuides().has_permission(request, self) else "",
                "fallback_priority": payload["fallback_priority"],
                "results": screen_guides,
                "screen_guides": screen_guides,
                "actions": action_guides,
                "fields": field_guides,
                "service": service_guide,
                "workflows": workflow_guides,
            }
        )


class HelpGuideFieldsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        screen_key = str(request.query_params.get("screen_key", "")).strip()
        rows = get_field_guides_for_context(
            request.user,
            screen_key=screen_key,
            preview_role=_preview_role(request) if CanManageHelpGuides().has_permission(request, self) else "",
            include_permission_restricted=_include_preview_permissions(request, self),
        )
        return response.Response([serialize_field_guide(item) for item in rows])


class HelpGuideActionsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        screen_key = str(request.query_params.get("screen_key", "")).strip()
        workflow_status = str(request.query_params.get("workflow_status", "")).strip()
        rows = get_action_guides_for_context(
            request.user,
            screen_key=screen_key,
            workflow_status=workflow_status,
            preview_role=_preview_role(request) if CanManageHelpGuides().has_permission(request, self) else "",
            include_permission_restricted=_include_preview_permissions(request, self),
        )
        return response.Response([serialize_action_guide(item) for item in rows])


class HelpGuideServiceAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, service_id):
        guide = get_service_guide_for_context(
            request.user,
            service_id=service_id,
            screen_key=str(request.query_params.get("screen_key", "")).strip(),
            preview_role=_preview_role(request) if CanManageHelpGuides().has_permission(request, self) else "",
            include_permission_restricted=_include_preview_permissions(request, self),
        )
        if not guide:
            return response.Response({"detail": "Service help was not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(serialize_service_guide(guide))


class HelpGuideWorkflowsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        screen_key = str(request.query_params.get("screen_key", "")).strip()
        current_status = str(request.query_params.get("status", "") or request.query_params.get("workflow_status", "")).strip()
        rows = get_workflow_guides_for_context(
            request.user,
            screen_key=screen_key,
            current_status=current_status,
            preview_role=_preview_role(request) if CanManageHelpGuides().has_permission(request, self) else "",
            include_permission_restricted=_include_preview_permissions(request, self),
        )
        return response.Response([serialize_workflow_guide(item) for item in rows])


class HelpGuideSearchAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = str(request.query_params.get("q", "") or request.query_params.get("search", "")).strip()
        results = search_help_content(
            request.user,
            query=query,
            preview_role=_preview_role(request) if CanManageHelpGuides().has_permission(request, self) else "",
            include_permission_restricted=_include_preview_permissions(request, self),
        )
        return response.Response(
            {
                "query": query,
                "screens": [serialize_screen_guide(item) for item in results["screens"]],
                "actions": [serialize_action_guide(item) for item in results["actions"]],
                "fields": [serialize_field_guide(item) for item in results["fields"]],
                "services": [serialize_service_guide(item) for item in results["services"]],
                "workflows": [serialize_workflow_guide(item) for item in results["workflows"]],
            }
        )


class HelpGuideIndexAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        preview_role = _preview_role(request) if CanManageHelpGuides().has_permission(request, self) else ""
        include_permission_restricted = _include_preview_permissions(request, self)
        search = str(request.query_params.get("q", "") or request.query_params.get("search", "")).strip()
        category = str(request.query_params.get("category", "")).strip()
        slug = str(request.query_params.get("slug", "")).strip()
        guides = get_manual_index_guides(
            request.user,
            category=category,
            search=search,
            slug=slug,
            preview_role=preview_role,
            include_permission_restricted=include_permission_restricted,
        )
        quick_links = get_manual_quick_links(
            request.user,
            preview_role=preview_role,
            include_permission_restricted=include_permission_restricted,
        )
        metadata = build_help_guide_metadata(
            can_manage_help_guides=CanManageHelpGuides().has_permission(request, self),
        )
        return response.Response(
            {
                "query": search,
                "category": category,
                "slug": slug,
                "preview_role": preview_role,
                "guides": [serialize_screen_guide(item) for item in guides],
                "quick_links": [serialize_screen_guide(item) for item in quick_links],
                **HelpGuideMetadataSerializer(metadata).data,
            }
        )


class HelpGuideMetadataAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = HelpGuideMetadataSerializer(
            build_help_guide_metadata(
                can_manage_help_guides=CanManageHelpGuides().has_permission(request, self),
            )
        )
        return response.Response(serializer.data)


class BaseAdminGuideViewSet(AdminDeleteGuardMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, CanManageHelpGuides]
    pagination_class = None

    def get_queryset(self):
        return self.queryset.order_by(*self.ordering)

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user, updated_by=self.request.user)
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action=f"create_{instance.__class__.__name__.lower()}",
            entity_type=instance.__class__.__name__,
            entity_id=instance.pk,
            new_value={"id": instance.pk},
        )

    def perform_update(self, serializer):
        instance = serializer.save(updated_by=self.request.user)
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action=f"update_{instance.__class__.__name__.lower()}",
            entity_type=instance.__class__.__name__,
            entity_id=instance.pk,
            new_value={"id": instance.pk},
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        old_value = {"is_active": instance.is_active}
        self.enforce_delete_guard(request, instance=instance, old_value=old_value)
        with transaction.atomic():
            instance.is_active = False
            instance.updated_by = request.user
            instance.save(update_fields=["is_active", "updated_by", "updated_at"])
            create_audit_log(
                request=request,
                user=request.user,
                action=f"deactivate_{instance.__class__.__name__.lower()}",
                entity_type=instance.__class__.__name__,
                entity_id=instance.pk,
                entity_name=getattr(instance, "title", "") or getattr(instance, "caption", ""),
                old_value=old_value,
                new_value={"is_active": False},
            )
        return response.Response(status=status.HTTP_204_NO_CONTENT)


class HelpGuideViewSet(BaseAdminGuideViewSet):
    permission_classes = [CanManageHelpGuidesOrReadOnly]
    queryset = HelpGuide.objects.prefetch_related("screenshots", "related_guides").all()
    serializer_class = HelpGuideAdminSerializer
    ordering = ("screen_key", "display_order", "title", "help_guide_id")
    search_fields = [
        "title",
        "screen_key",
        "short_description",
        "purpose",
        "before_you_start",
        "step_by_step_guide",
        "common_errors",
        "search_keywords",
    ]
    filterset_fields = ["screen_key", "role", "workflow_status", "is_active"]

    def get_serializer_class(self):
        if CanManageHelpGuides().has_permission(self.request, self):
            return HelpGuideAdminSerializer
        return HelpGuideReadOnlySerializer

    def get_queryset(self):
        if CanManageHelpGuides().has_permission(self.request, self):
            queryset = super().get_queryset()
        else:
            queryset = get_readable_help_guides_queryset(self.request.user)
        screen_key = str(self.request.query_params.get("screen_key", "")).strip()
        category = str(self.request.query_params.get("category", "")).strip()
        slug = str(self.request.query_params.get("slug", "")).strip()
        role = str(self.request.query_params.get("role", "")).strip()
        workflow_status = str(self.request.query_params.get("workflow_status", "")).strip()
        search = str(self.request.query_params.get("search", "") or self.request.query_params.get("q", "")).strip()
        is_active = self.request.query_params.get("is_active")
        if screen_key:
            queryset = queryset.filter(screen_key=screen_key)
        if category:
            queryset = queryset.filter(category=category)
        if slug:
            queryset = queryset.filter(slug=slug)
        if role:
            queryset = queryset.filter(role=role)
        if workflow_status:
            queryset = queryset.filter(workflow_status=workflow_status)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(short_description__icontains=search)
                | Q(purpose__icontains=search)
                | Q(search_keywords__icontains=search)
                | Q(slug__icontains=search)
            )
        if is_active not in (None, ""):
            queryset = queryset.filter(is_active=str(is_active).lower() == "true")
        return queryset


class HelpGuideActionAdminViewSet(BaseAdminGuideViewSet):
    queryset = HelpGuideAction.objects.all()
    serializer_class = HelpGuideActionAdminSerializer
    ordering = ("screen_key", "display_order", "button_label", "id")


class HelpGuideFieldAdminViewSet(BaseAdminGuideViewSet):
    queryset = HelpGuideField.objects.all()
    serializer_class = HelpGuideFieldAdminSerializer
    ordering = ("screen_key", "display_order", "field_label", "id")


class HelpGuideServiceAdminViewSet(BaseAdminGuideViewSet):
    queryset = HelpGuideService.objects.select_related("service", "service__category").all()
    serializer_class = HelpGuideServiceAdminSerializer
    ordering = ("service_id", "display_order", "role", "id")


class HelpGuideWorkflowAdminViewSet(BaseAdminGuideViewSet):
    queryset = HelpGuideWorkflow.objects.all()
    serializer_class = HelpGuideWorkflowAdminSerializer
    ordering = ("screen_key", "display_order", "workflow_key", "id")


class HelpGuideScreenshotAdminViewSet(BaseAdminGuideViewSet):
    queryset = HelpGuideScreenshot.objects.select_related("help_guide").all()
    serializer_class = HelpGuideScreenshotAdminSerializer
    ordering = ("help_guide_id", "display_order", "screenshot_id")
