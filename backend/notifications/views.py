from rest_framework import generics, permissions, response, status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView

from audit.utils import create_audit_log
from config.permissions import CanSendManualNotifications, IsAdminRole
from notifications.models import Notification, NotificationTemplate
from notifications.selectors import get_notifications_for_user
from notifications.serializers import (
    EmployeeNotificationTemplateSerializer,
    ManualNotificationSerializer,
    NotificationAdminSerializer,
    NotificationSerializer,
    NotificationTemplateSerializer,
    NotificationTemplatePreviewSerializer,
)
from notifications.services import send_manual_order_notification
from orders.selectors import get_reviewable_orders_for_user


class AdminNotificationListAPIView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    queryset = Notification.objects.select_related("recipient", "actor", "order", "template")

    def get_serializer_class(self):
        if self.request.method == "GET":
            return NotificationSerializer
        return NotificationAdminSerializer


class AdminNotificationDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    queryset = Notification.objects.select_related("recipient", "actor", "order", "template")

    def get_serializer_class(self):
        if self.request.method == "GET":
            return NotificationSerializer
        return NotificationAdminSerializer


class NotificationCenterAPIView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return get_notifications_for_user(self.request.user)


class ManualOrderNotificationAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanSendManualNotifications]

    def post(self, request, pk):
        order = generics.get_object_or_404(get_reviewable_orders_for_user(request.user), pk=pk)
        serializer = ManualNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        notification = send_manual_order_notification(
            order=order,
            actor=request.user,
            template=serializer.validated_data["template_id"],
            request=request,
        )
        return response.Response(
            NotificationSerializer(notification, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class EmployeeNotificationTemplateListAPIView(generics.ListAPIView):
    serializer_class = EmployeeNotificationTemplateSerializer
    permission_classes = [permissions.IsAuthenticated, CanSendManualNotifications]

    def get_queryset(self):
        return NotificationTemplate.objects.filter(
            is_active=True,
            channel=Notification.Channel.SYSTEM,
        ).order_by("key")


class NotificationTemplateAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    serializer_class = NotificationTemplateSerializer
    queryset = NotificationTemplate.objects.all()
    search_fields = ["key", "channel", "title_ar", "title_en"]

    def get_queryset(self):
        queryset = super().get_queryset()
        channel = self.request.query_params.get("channel")
        is_active = self.request.query_params.get("is_active")
        if channel:
            queryset = queryset.filter(channel=channel)
        if is_active is not None:
            queryset = queryset.filter(is_active=str(is_active).strip().lower() in {"1", "true", "yes", "on"})
        return queryset

    def perform_create(self, serializer):
        template = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="create_notification_template",
            entity_type="NotificationTemplate",
            entity_id=template.pk,
            new_value={"key": template.key, "channel": template.channel, "is_active": template.is_active},
        )

    def perform_update(self, serializer):
        template = self.get_object()
        old_value = {"key": template.key, "channel": template.channel, "is_active": template.is_active}
        template = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="update_notification_template",
            entity_type="NotificationTemplate",
            entity_id=template.pk,
            old_value=old_value,
            new_value={"key": template.key, "channel": template.channel, "is_active": template.is_active},
        )

    def destroy(self, request, *args, **kwargs):
        template = self.get_object()
        template.is_active = False
        template.save(update_fields=["is_active", "updated_at"])
        create_audit_log(
            request=request,
            user=request.user,
            action="disable_notification_template",
            entity_type="NotificationTemplate",
            entity_id=template.pk,
            old_value={"is_active": True},
            new_value={"is_active": False},
        )
        return response.Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"])
    def preview(self, request):
        serializer = NotificationTemplatePreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        sample_values = {
            "{{order_number}}": "KH-2026-000123",
            "{{service_name}}": "Traffic Fine Payment",
            "{{customer_name}}": "Sample Customer",
            "{{status_label}}": "Ready for delivery",
        }

        def render_text(value):
            rendered = str(value or "")
            for placeholder, sample in sample_values.items():
                rendered = rendered.replace(placeholder, sample)
            return rendered

        validated = serializer.validated_data
        return response.Response(
            {
                "title_ar": render_text(validated.get("title_ar", "")),
                "title_en": render_text(validated.get("title_en", "")),
                "message_ar": render_text(validated.get("message_ar", "")),
                "message_en": render_text(validated.get("message_en", "")),
                "available_placeholders": sorted(sample_values),
            }
        )
