"""Customer complaints on an order (daily operations: «متابعة شكاوى العملاء»).

A complaint is an ``OrderIssue`` raised by the order's customer. Staff follow
it up on the staff order page (list + resolve with a note that is sent to the
customer as an order message); the customer sees each complaint and whether it
is resolved. The assigned employee and the admins are notified when a
complaint is filed.
"""

from django.utils import timezone
from rest_framework import generics, permissions, response, serializers, status
from rest_framework.views import APIView

from audit.utils import create_audit_log
from config.permissions import CanReviewOrders, IsCustomerRole
from notifications.services import send_notification_event
from orders.models import OrderIssue, OrderNote
from orders.selectors import get_orders_for_user, get_reviewable_orders_for_user
from orders.services import add_order_note

COMPLAINT_TITLE = "شكوى العميل"


class ComplaintCreateSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=4000, trim_whitespace=True)


def serialize_complaint(issue):
    return {
        "id": issue.pk,
        "description": issue.description,
        "is_resolved": issue.is_resolved,
        "created_at": issue.created_at,
        "resolved_at": issue.resolved_at,
    }


class CustomerOrderComplaintsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomerRole]

    def get_order(self, request, pk):
        return generics.get_object_or_404(get_orders_for_user(request.user), pk=pk)

    def get(self, request, pk):
        order = self.get_order(request, pk)
        issues = order.issues.filter(is_deleted=False, created_by=request.user).order_by("created_at", "pk")
        return response.Response([serialize_complaint(issue) for issue in issues])

    def post(self, request, pk):
        order = self.get_order(request, pk)
        serializer = ComplaintCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        issue = OrderIssue.objects.create(order=order, created_by=request.user, title=COMPLAINT_TITLE,
                                          description=serializer.validated_data["description"])
        send_notification_event(event_key="customer_complaint_received", order=order, actor=request.user, request=request,
                                dedupe_key=f"customer_complaint:{issue.pk}")
        create_audit_log(request=request, user=request.user, action="customer_complaint", entity_type="OrderIssue", entity_id=issue.pk)
        return response.Response(serialize_complaint(issue), status=status.HTTP_201_CREATED)


class StaffComplaintResolveSerializer(serializers.Serializer):
    resolution_note = serializers.CharField(max_length=2000, trim_whitespace=True)


class StaffOrderComplaintsAPIView(APIView):
    """Staff list the complaints of an order they can review."""

    permission_classes = [permissions.IsAuthenticated, CanReviewOrders]

    def get(self, request, pk):
        order = generics.get_object_or_404(get_reviewable_orders_for_user(request.user), pk=pk)
        issues = order.issues.filter(is_deleted=False, created_by=order.customer).order_by("created_at", "pk")
        return response.Response([serialize_complaint(issue) for issue in issues])


class StaffResolveComplaintAPIView(APIView):
    """Staff resolve a complaint; the resolution note is sent to the customer as an order message."""

    permission_classes = [permissions.IsAuthenticated, CanReviewOrders]

    def post(self, request, pk, issue_pk):
        order = generics.get_object_or_404(get_reviewable_orders_for_user(request.user), pk=pk)
        issue = generics.get_object_or_404(order.issues.filter(is_deleted=False, created_by=order.customer), pk=issue_pk)
        if issue.is_resolved:
            raise serializers.ValidationError({"detail": "This complaint is already resolved."})
        serializer = StaffComplaintResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        issue.is_resolved = True
        issue.resolved_by = request.user
        issue.resolved_at = timezone.now()
        issue.save()
        add_order_note(order=order, actor=request.user, request=request,
                       validated_data={"note": serializer.validated_data["resolution_note"], "visibility": OrderNote.Visibility.CUSTOMER})
        create_audit_log(request=request, user=request.user, action="resolve_customer_complaint", entity_type="OrderIssue", entity_id=issue.pk)
        return response.Response(serialize_complaint(issue))
