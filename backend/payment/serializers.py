from rest_framework import serializers

from orders.models import Order
from payment.models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    customer_name = serializers.CharField(source="order.customer.full_name", read_only=True)

    class Meta:
        model = Payment
        fields = (
            "id",
            "payment_number",
            "order",
            "order_number",
            "customer_name",
            "payment_type",
            "method",
            "status",
            "amount",
            "currency",
            "gateway_name",
            "gateway_transaction_id",
            "gateway_payment_url",
            "reference_number",
            "failure_reason",
            "notes",
            "paid_at",
            "refunded_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("payment_number", "status", "paid_at", "refunded_at", "created_at", "updated_at")


class AdminPaymentRuleListSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    customer_name = serializers.CharField(source="order.customer.full_name", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    method_label = serializers.CharField(source="get_method_display", read_only=True)
    payment_type_label = serializers.CharField(source="get_payment_type_display", read_only=True)

    class Meta:
        model = Payment
        fields = (
            "id",
            "payment_number",
            "order_number",
            "customer_name",
            "payment_type",
            "payment_type_label",
            "method",
            "method_label",
            "status",
            "status_label",
            "amount",
            "currency",
            "reference_number",
            "failure_reason",
            "notes",
            "paid_at",
            "refunded_at",
            "created_at",
        )


class CustomerPaymentCreateSerializer(serializers.ModelSerializer):
    order = serializers.PrimaryKeyRelatedField(queryset=Order.objects.all())

    class Meta:
        model = Payment
        fields = (
            "order",
            "payment_type",
            "method",
            "amount",
            "currency",
            "gateway_name",
            "gateway_payment_url",
            "reference_number",
            "notes",
        )


class AdminPaymentCreateSerializer(serializers.ModelSerializer):
    order = serializers.PrimaryKeyRelatedField(queryset=Order.objects.all())

    class Meta:
        model = Payment
        fields = ("order", "payment_type", "method", "amount", "currency", "reference_number", "notes")


class AdminPaymentStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Payment.PaymentStatus.choices)
    failure_reason = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    reference_number = serializers.CharField(required=False, allow_blank=True)


class AdminPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = "__all__"
        read_only_fields = ("payment_number", "created_at", "updated_at")
