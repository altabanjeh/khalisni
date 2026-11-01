"""Customer ↔ support messages on an order (client sitemap: «مراسلة الدعم الفني»).

A message is an ``OrderNote`` with customer visibility, so the thread is the
same one staff already write to when they add a customer-visible note (which
notifies the customer). A customer message notifies the assigned employee and
the admins. Staff identities are not shown to the customer (owner decision
B06): the customer sees "customer" or "staff" only.
"""

from rest_framework import generics, permissions, response, serializers, status
from rest_framework.views import APIView

from audit.utils import create_audit_log
from config.permissions import IsCustomerRole
from notifications.services import send_notification_event
from orders.models import Order, OrderNote
from orders.selectors import get_orders_for_user

MAX_MESSAGE_LENGTH = 2000


class CustomerMessageCreateSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=MAX_MESSAGE_LENGTH, trim_whitespace=True)


def _thread(order):
    return order.notes.filter(is_deleted=False, visibility=OrderNote.Visibility.CUSTOMER).order_by("created_at", "pk")


def serialize_message(note, order):
    return {
        "id": note.pk,
        "message": note.note,
        "author_role": "customer" if note.user_id == order.customer_id else "staff",
        "created_at": note.created_at,
    }


class CustomerOrderMessagesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomerRole]

    def get_order(self, request, pk):
        # Only the customer's own orders: another customer's order is a 404.
        return generics.get_object_or_404(get_orders_for_user(request.user), pk=pk)

    def get(self, request, pk):
        order = self.get_order(request, pk)
        return response.Response([serialize_message(note, order) for note in _thread(order)])

    def post(self, request, pk):
        order = self.get_order(request, pk)
        if order.status == Order.Status.ARCHIVED:
            raise serializers.ValidationError({"message": "Messages cannot be sent on an archived order."})
        serializer = CustomerMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = OrderNote.objects.create(
            order=order,
            user=request.user,
            note=serializer.validated_data["message"],
            visibility=OrderNote.Visibility.CUSTOMER,
        )
        send_notification_event(
            event_key="customer_message_received",
            order=order,
            actor=request.user,
            request=request,
            dedupe_key=f"customer_message:{note.pk}",
        )
        create_audit_log(request=request, user=request.user, action="customer_message", entity_type="OrderNote", entity_id=note.pk)
        return response.Response(serialize_message(note, order), status=status.HTTP_201_CREATED)
