"""Provider reassignment (team decision: allowed for staff, with a reason).

While an order is ASSIGNED or IN_PROGRESS, staff can move it to another
eligible provider. The same provider checks as the first assignment apply
(``Order.validate_provider_eligibility``). Work restarts with the new provider,
so the order returns to ASSIGNED; access follows the current assignment, so
the previous provider loses access at once. Assignment history, the status log
(when the status changes), the new provider's notification and the audit log
are written together.
"""

from django.core.exceptions import ValidationError
from django.db import transaction
from rest_framework import generics, permissions, response, serializers
from rest_framework.views import APIView

from audit.utils import create_audit_log
from config.permissions import CanAssignOrders
from core.choices import UserRole
from notifications.services import send_notification_event
from orders.models import Order, OrderAssignmentHistory, OrderStatusLog
from orders.selectors import get_reviewable_orders_for_user
from providers.models import ProviderProfile

REASSIGNABLE = {Order.Status.ASSIGNED, Order.Status.IN_PROGRESS}
STAFF_ROLES = {UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.SUPPORT}


def reassign_provider(*, order, provider, actor, reason, request=None):
    if getattr(actor, "role", "") not in STAFF_ROLES:
        raise ValidationError({"detail": "Only internal staff can review orders."})
    if not (reason or "").strip():
        raise ValidationError({"reason": "A reason is required for this workflow action."})
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order.pk)
        if order.status not in REASSIGNABLE:
            raise ValidationError({"detail": "The provider can be changed only while the order is assigned or in progress."})
        if order.assigned_provider_id == provider.pk:
            raise ValidationError({"provider_id": "This provider is already assigned to the order."})
        order.validate_provider_eligibility(provider)
        old_status = order.status
        previous_provider_id = order.assigned_provider_id
        order.assigned_provider = provider
        order.assigned_provider_organization = provider.organization if provider.organization_id else None
        order.assigned_by = actor
        order.status = Order.Status.ASSIGNED
        order.save()
        OrderAssignmentHistory.objects.create(
            order=order, assigned_to=provider.user, assigned_by=actor, assignment_type="provider",
            note=f"Provider reassigned: {reason.strip()}",
        )
        if old_status != order.status:
            OrderStatusLog.objects.create(order=order, old_status=old_status, new_status=order.status, changed_by=actor,
                                          note=reason.strip())
        send_notification_event(
            event_key="provider_assigned", order=order, actor=actor, request=request,
            dedupe_key=f"provider_assigned:{order.pk}:{previous_provider_id or 0}:{provider.pk}",
        )
        create_audit_log(request=request, user=actor, action="reassign_provider", entity_type="Order", entity_id=order.pk,
                         old_value={"provider": previous_provider_id, "status": old_status},
                         new_value={"provider": provider.pk, "status": order.status, "reason": reason.strip()})
    return order


class ReassignProviderSerializer(serializers.Serializer):
    provider_id = serializers.PrimaryKeyRelatedField(queryset=ProviderProfile.objects.select_related("user"))
    reason = serializers.CharField()


class AdminOrderReassignAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanAssignOrders]

    def post(self, request, pk):
        order = generics.get_object_or_404(get_reviewable_orders_for_user(request.user), pk=pk)
        serializer = ReassignProviderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            order = reassign_provider(order=order, provider=serializer.validated_data["provider_id"], actor=request.user,
                                      reason=serializer.validated_data["reason"], request=request)
        except ValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, "error_dict") else exc.messages)
        return response.Response({"assigned_provider": order.assigned_provider_id, "status": order.status})
