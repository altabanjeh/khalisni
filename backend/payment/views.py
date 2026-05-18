from rest_framework import generics, permissions, response, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView

from config.permissions import CanCreatePaymentRecord, CanRefundPayment, CanViewPaymentStatus, IsCustomerRole
from organizations.selectors import enforce_organization_scope
from payment.models import Payment
from payment.serializers import (
    AdminPaymentCreateSerializer,
    AdminPaymentRuleListSerializer,
    AdminPaymentStatusSerializer,
    CustomerPaymentCreateSerializer,
    PaymentSerializer,
)
from payment.services import create_admin_payment, create_customer_payment, update_payment_status


def customer_payments_queryset(user):
    return Payment.objects.select_related("order", "order__customer", "paid_by", "recorded_by").filter(order__customer=user)


class CustomerPaymentListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomerRole]
    pagination_class = None

    def get_queryset(self):
        return customer_payments_queryset(self.request.user)

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CustomerPaymentCreateSerializer
        return PaymentSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.validated_data["order"]
        if order.customer_id != request.user.id:
            raise PermissionDenied("You can only create payment records for your own orders.")
        payment = create_customer_payment(actor=request.user, validated_data=serializer.validated_data, request=request)
        return response.Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class CustomerPaymentDetailAPIView(generics.RetrieveAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomerRole]

    def get_queryset(self):
        return customer_payments_queryset(self.request.user)


class AdminPaymentListAPIView(generics.ListCreateAPIView):
    queryset = Payment.objects.select_related("order", "order__customer", "paid_by", "recorded_by")
    pagination_class = None

    def get_queryset(self):
        queryset = enforce_organization_scope(
            super().get_queryset(),
            user=self.request.user,
            organization_field="organization",
        )
        status_value = self.request.query_params.get("status")
        payment_type = self.request.query_params.get("payment_type")
        order_number = self.request.query_params.get("order_number")
        if status_value:
            queryset = queryset.filter(status=status_value)
        if payment_type:
            queryset = queryset.filter(payment_type=payment_type)
        if order_number:
            queryset = queryset.filter(order__order_number__icontains=order_number)
        return queryset

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), CanCreatePaymentRecord()]
        return [permissions.IsAuthenticated(), CanViewPaymentStatus()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdminPaymentCreateSerializer
        return AdminPaymentRuleListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = create_admin_payment(actor=request.user, validated_data=serializer.validated_data, request=request)
        return response.Response(AdminPaymentRuleListSerializer(payment).data, status=status.HTTP_201_CREATED)


class AdminPaymentDetailAPIView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated, CanViewPaymentStatus]
    queryset = Payment.objects.select_related("order", "order__customer", "paid_by", "recorded_by")
    serializer_class = AdminPaymentRuleListSerializer

    def get_queryset(self):
        return enforce_organization_scope(super().get_queryset(), user=self.request.user, organization_field="organization")


class AdminPaymentStatusAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanRefundPayment]

    def post(self, request, pk):
        payment = generics.get_object_or_404(
            enforce_organization_scope(Payment.objects.all(), user=request.user, organization_field="organization"),
            pk=pk,
        )
        serializer = AdminPaymentStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = update_payment_status(
            payment=payment,
            actor=request.user,
            status_value=serializer.validated_data["status"],
            failure_reason=serializer.validated_data.get("failure_reason", ""),
            notes=serializer.validated_data.get("notes", ""),
            reference_number=serializer.validated_data.get("reference_number", ""),
            request=request,
        )
        return response.Response(AdminPaymentRuleListSerializer(payment).data, status=status.HTTP_200_OK)
