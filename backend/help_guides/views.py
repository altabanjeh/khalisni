from rest_framework import permissions, response, status, viewsets
from rest_framework.views import APIView

from audit.utils import create_audit_log
from config.permissions import CanManageHelpGuides
from help_guides.models import HelpGuide
from help_guides.selectors import get_help_guides_for_screen, get_readable_help_guides_queryset
from help_guides.serializers import HelpGuideAdminSerializer, HelpGuideMetadataSerializer, HelpGuideReadSerializer, build_help_guide_metadata
from help_guides.screen_registry import get_help_screen_label


class CanManageHelpGuidesOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return CanManageHelpGuides().has_permission(request, view)


class HelpGuideCurrentAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        screen_key = str(request.query_params.get("screen_key", "")).strip()
        workflow_status = str(request.query_params.get("workflow_status", "")).strip()
        guides, fallback_priority = get_help_guides_for_screen(
            request.user,
            screen_key=screen_key,
            workflow_status=workflow_status,
        )
        serializer = HelpGuideReadSerializer(guides, many=True)
        return response.Response(
            {
                "screen_key": screen_key,
                "screen_label": get_help_screen_label(screen_key),
                "workflow_status": workflow_status,
                "fallback_priority": fallback_priority,
                "results": serializer.data,
            }
        )


class HelpGuideMetadataAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanManageHelpGuides]

    def get(self, request):
        serializer = HelpGuideMetadataSerializer(build_help_guide_metadata())
        return response.Response(serializer.data)


class HelpGuideViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageHelpGuidesOrReadOnly]
    search_fields = [
        "title",
        "screen_key",
        "short_description",
        "purpose",
        "before_you_start",
        "step_by_step_guide",
        "expected_result",
        "common_errors",
        "related_screen",
        "related_permission",
        "search_keywords",
    ]
    ordering_fields = ["display_order", "title", "created_at", "updated_at", "screen_key", "role"]
    filterset_fields = ["screen_key", "role", "workflow_status", "is_active"]
    pagination_class = None

    def get_queryset(self):
        if CanManageHelpGuides().has_permission(self.request, self):
            return HelpGuide.objects.all().order_by("screen_key", "display_order", "title", "help_guide_id")
        return get_readable_help_guides_queryset(self.request.user).order_by("screen_key", "display_order", "title", "help_guide_id")

    def get_serializer_class(self):
        if CanManageHelpGuides().has_permission(self.request, self):
            return HelpGuideAdminSerializer
        return HelpGuideReadSerializer

    def perform_create(self, serializer):
        guide = serializer.save(created_by=self.request.user, updated_by=self.request.user)
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="create_help_guide",
            entity_type="HelpGuide",
            entity_id=guide.pk,
            new_value={"screen_key": guide.screen_key, "role": guide.role, "title": guide.title},
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        old_value = {
            "screen_key": instance.screen_key,
            "role": instance.role,
            "title": instance.title,
            "is_active": instance.is_active,
            "display_order": instance.display_order,
        }
        guide = serializer.save(updated_by=self.request.user)
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="update_help_guide",
            entity_type="HelpGuide",
            entity_id=guide.pk,
            old_value=old_value,
            new_value={
                "screen_key": guide.screen_key,
                "role": guide.role,
                "title": guide.title,
                "is_active": guide.is_active,
                "display_order": guide.display_order,
            },
        )

    def destroy(self, request, *args, **kwargs):
        guide = self.get_object()
        old_value = {"title": guide.title, "is_active": guide.is_active}
        guide.is_active = False
        guide.updated_by = request.user
        guide.save(update_fields=["is_active", "updated_by", "updated_at"])
        create_audit_log(
            request=request,
            user=request.user,
            action="deactivate_help_guide",
            entity_type="HelpGuide",
            entity_id=guide.pk,
            old_value=old_value,
            new_value={"is_active": guide.is_active},
        )
        return response.Response(status=status.HTTP_204_NO_CONTENT)
