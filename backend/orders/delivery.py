"""Result delivery (client daily operations: "PDF or tracking link if electronic;
courier or partner office if paper").

Staff record how the result reaches the customer and any customer-visible
instructions (where to collect the original, what to bring, courier note).
No partner, fee or address is assumed: staff type what applies. Changing the
method notifies the customer in the app.
"""

from rest_framework import generics, permissions, response, serializers
from rest_framework.views import APIView

from audit.utils import create_audit_log
from config.permissions import CanReviewOrders, IsCustomerRole
from notifications.services import notify_client
from orders.models import Order
from orders.selectors import get_orders_for_user, get_reviewable_orders_for_user

METHOD_LABELS = {
    "electronic": {"ar": "تسليم إلكتروني (تنزيل النتيجة)", "en": "Electronic (download the result)"},
    "paper_pickup": {"ar": "تسليم ورقي - استلام", "en": "Paper - pickup"},
    "paper_courier": {"ar": "تسليم ورقي - توصيل", "en": "Paper - courier"},
}
FINISHED = {Order.Status.COMPLETED, Order.Status.REJECTED, Order.Status.CANCELLED, Order.Status.ARCHIVED}


def delivery_payload(order):
    return {
        "delivery_method": order.delivery_method,
        "delivery_method_label_ar": METHOD_LABELS[order.delivery_method]["ar"],
        "delivery_method_label_en": METHOD_LABELS[order.delivery_method]["en"],
        "delivery_instructions": order.delivery_instructions,
    }


class DeliverySerializer(serializers.Serializer):
    delivery_method = serializers.ChoiceField(choices=list(METHOD_LABELS))
    delivery_instructions = serializers.CharField(required=False, allow_blank=True, max_length=2000)

    def validate(self, attrs):
        if attrs["delivery_method"] != "electronic" and not (attrs.get("delivery_instructions") or "").strip():
            raise serializers.ValidationError({"delivery_instructions": "Paper delivery needs instructions for the customer."})
        return attrs


class CustomerOrderDeliveryAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomerRole]

    def get(self, request, pk):
        order = generics.get_object_or_404(get_orders_for_user(request.user), pk=pk)
        return response.Response(delivery_payload(order))


class StaffOrderDeliveryAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanReviewOrders]

    def get(self, request, pk):
        order = generics.get_object_or_404(get_reviewable_orders_for_user(request.user), pk=pk)
        return response.Response(delivery_payload(order))

    def put(self, request, pk):
        order = generics.get_object_or_404(get_reviewable_orders_for_user(request.user), pk=pk)
        if order.status in FINISHED:
            raise serializers.ValidationError({"detail": "Delivery details cannot be changed on a finished order."})
        serializer = DeliverySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        old = delivery_payload(order)
        order.delivery_method = serializer.validated_data["delivery_method"]
        order.delivery_instructions = (serializer.validated_data.get("delivery_instructions") or "").strip()
        order.save(update_fields=["delivery_method", "delivery_instructions", "updated_at"])
        new = delivery_payload(order)
        if (old["delivery_method"], old["delivery_instructions"]) != (new["delivery_method"], new["delivery_instructions"]):
            notify_client(
                order=order, title="Delivery details", message=new["delivery_instructions"] or new["delivery_method_label_en"],
                actor=request.user, request=request, template_key="order_delivery_updated",
                dedupe_key=f"order_delivery:{order.pk}:{order.delivery_method}:{hash(order.delivery_instructions)}",
                localized={
                    "ar": {"title": "تفاصيل تسليم الطلب", "message": f"{new['delivery_method_label_ar']}. {order.delivery_instructions}".strip()},
                    "en": {"title": "Delivery details", "message": f"{new['delivery_method_label_en']}. {order.delivery_instructions}".strip()},
                },
            )
        create_audit_log(request=request, user=request.user, action="update_delivery_method", entity_type="Order", entity_id=order.pk,
                         old_value=old, new_value=new)
        return response.Response(new)
