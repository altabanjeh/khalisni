from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework import generics, permissions, response, status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError as DRFValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.views import APIView

from config.permissions import (
    CanAssignOrders,
    CanCancelOrders,
    CanManageOrderWorkflow,
    CanRejectOrders,
    CanRequestMissingDocuments,
    CanReviewOrders,
    CanUploadFinalDocuments,
    IsAdminRole,
    IsCustomerRole,
)
from workflow.rules import WORKFLOW_TRANSITIONS
from documents.serializers import DocumentUploadSerializer
from orders.models import Order, OrderIssue, OrderNote, Rating
from orders.selectors import get_orders_for_user, get_reviewable_orders_for_user
from orders.serializers import (
    AdminStatusUpdateSerializer,
    AssignProviderSerializer,
    CancelOrderSerializer,
    CompleteOrderSerializer,
    OrderAdminSerializer,
    OrderDetailSerializer,
    OrderIssueAdminSerializer,
    OrderListSerializer,
    OrderNoteAdminSerializer,
    OrderNoteCreateSerializer,
    PublicOrderCreateSerializer,
    RatingCreateSerializer,
    RatingAdminSerializer,
    RejectOrderSerializer,
    RequestDocumentsSerializer,
    TrackOrderSerializer,
)
from orders.services import (
    add_order_note,
    assign_provider_to_order,
    cancel_order,
    complete_order,
    create_customer_rating,
    reject_order,
    request_missing_documents,
    update_order_status,
    upload_customer_document,
    upload_final_document,
)
from audit.utils import create_audit_log


def _raise_drf_validation_error(exc):
    if hasattr(exc, "message_dict"):
        raise DRFValidationError(exc.message_dict)
    raise DRFValidationError(exc.messages)


class CreateOrderAPIView(generics.CreateAPIView):
    serializer_class = PublicOrderCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomerRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return response.Response(
            {
                "id": order.pk,
                "order_number": order.order_number,
                "status": order.status,
                "warnings": getattr(order, "prerequisite_warnings", []),
            },
            status=status.HTTP_201_CREATED,
        )


class TrackOrderAPIView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "order_tracking"

    def get(self, request):
        order_number = request.query_params.get("order_number")
        phone = request.query_params.get("phone")
        order = generics.get_object_or_404(
            Order.objects.select_related("customer", "service", "service__category", "assigned_provider", "assigned_provider__user")
            .prefetch_related("documents", "status_logs", "notes__user"),
            order_number=order_number,
            customer__phone=phone,
        )
        serializer = TrackOrderSerializer(order, context={"request": request})
        return response.Response(serializer.data)


class CustomerOrderListAPIView(generics.ListAPIView):
    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomerRole]

    def get_queryset(self):
        return get_orders_for_user(self.request.user)


class CustomerOrderDetailAPIView(generics.RetrieveAPIView):
    serializer_class = OrderDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomerRole]

    def get_queryset(self):
        return get_orders_for_user(self.request.user)


class CustomerOrderDocumentUploadAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomerRole]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        order = generics.get_object_or_404(Order, pk=pk, customer=request.user)
        serializer = DocumentUploadSerializer(
            data=request.data,
            context={
                "order": order,
                "uploaded_by": request.user,
                "max_size": settings.FILE_UPLOAD_MAX_SIZE,
                "allowed_extensions": settings.ALLOWED_UPLOAD_EXTENSIONS,
                "allowed_mime_types": settings.ALLOWED_UPLOAD_MIME_TYPES,
            },
        )
        serializer.is_valid(raise_exception=True)
        try:
            document = upload_customer_document(
                order=order,
                actor=request.user,
                validated_data=serializer.validated_data,
                request=request,
            )
        except DjangoValidationError as exc:
            _raise_drf_validation_error(exc)
        return response.Response({"id": document.pk}, status=status.HTTP_201_CREATED)


class CustomerOrderRatingAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomerRole]

    def post(self, request, pk):
        order = generics.get_object_or_404(Order, pk=pk, customer=request.user)
        serializer = RatingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            rating = create_customer_rating(
                order=order,
                actor=request.user,
                validated_data=serializer.validated_data,
                request=request,
            )
        except DjangoValidationError as exc:
            _raise_drf_validation_error(exc)
        return response.Response(RatingCreateSerializer(rating).data, status=status.HTTP_201_CREATED)


class CustomerOrderCancelAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomerRole]

    def post(self, request, pk):
        order = generics.get_object_or_404(get_orders_for_user(request.user), pk=pk)
        serializer = CancelOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            cancel_order(
                order=order,
                actor=request.user,
                reason=serializer.validated_data["reason"],
                request=request,
            )
        except DjangoValidationError as exc:
            _raise_drf_validation_error(exc)
        return response.Response({"status": order.status, "reason": order.cancellation_reason})


class AdminDashboardOrderListAPIView(generics.ListAPIView):
    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated, CanReviewOrders]

    def get_queryset(self):
        queryset = get_reviewable_orders_for_user(self.request.user)
        params = self.request.query_params
        search = params.get("search")
        if search:
            queryset = queryset.filter(
                Q(order_number__icontains=search)
                | Q(customer__full_name__icontains=search)
                | Q(service__name_ar__icontains=search)
            )
        for field in ("status", "priority"):
            value = params.get(field)
            if value:
                queryset = queryset.filter(**{field: value})
        service_id = params.get("service")
        if service_id:
            queryset = queryset.filter(service_id=service_id)
        provider = params.get("provider")
        if provider:
            queryset = queryset.filter(assigned_provider_id=provider)
        provider_status = params.get("provider_status")
        if provider_status:
            queryset = queryset.filter(status=provider_status)
        assigned_employee = params.get("assigned_employee")
        if assigned_employee == "me":
            queryset = queryset.filter(assigned_employee=self.request.user)
        elif assigned_employee == "unassigned":
            queryset = queryset.filter(assigned_employee__isnull=True)
        elif assigned_employee:
            queryset = queryset.filter(assigned_employee_id=assigned_employee)
        has_missing_documents = params.get("has_missing_documents")
        if has_missing_documents == "true":
            queryset = queryset.exclude(missing_document_types=[])
        elif has_missing_documents == "false":
            queryset = queryset.filter(missing_document_types=[])
        date_from = params.get("date_from")
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        date_to = params.get("date_to")
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        return queryset


class AdminOrderRecordViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    queryset = (
        Order.objects.select_related(
            "customer",
            "service",
            "service__category",
            "assigned_provider",
            "assigned_provider__user",
            "assigned_employee",
            "assigned_by",
        )
        .prefetch_related("documents", "status_logs", "notes__user")
        .all()
    )
    search_fields = ["order_number", "customer__full_name", "service__name_ar", "city"]
    ordering_fields = ["created_at", "updated_at", "expected_delivery_date", "status", "priority"]

    def get_serializer_class(self):
        if self.action in {"list", "retrieve"}:
            return OrderDetailSerializer
        return OrderAdminSerializer

    def create(self, request, *args, **kwargs):
        raise PermissionDenied("Direct order creation is disabled. Use the public/customer order creation flow.")

    def update(self, request, *args, **kwargs):
        return self._safe_update(request, *args, partial=False, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        return self._safe_update(request, *args, partial=True, **kwargs)

    def _safe_update(self, request, *args, partial=False, **kwargs):
        order = self.get_object()
        if order.is_final_state:
            create_audit_log(
                request=request,
                action="blocked_admin_order_update",
                entity_type="Order",
                entity_id=order.pk,
                old_value={"status": order.status},
                new_value={"reason": "Finalized orders cannot be edited through the raw record endpoint."},
            )
            raise DRFValidationError({"detail": "Finalized orders cannot be edited through this endpoint."})

        dangerous_fields = sorted(set(getattr(request.data, "keys", lambda: [])()) & OrderAdminSerializer.DANGEROUS_FIELDS)
        if dangerous_fields:
            create_audit_log(
                request=request,
                action="blocked_admin_order_update",
                entity_type="Order",
                entity_id=order.pk,
                old_value={"status": order.status},
                new_value={"blocked_fields": dangerous_fields},
            )
            raise DRFValidationError(
                {
                    field: "This field can only be changed through dedicated workflow actions."
                    for field in dangerous_fields
                }
            )
        kwargs["partial"] = partial
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        order = self.get_object()
        if not request.user.is_superuser:
            create_audit_log(
                request=request,
                action="blocked_admin_order_delete",
                entity_type="Order",
                entity_id=order.pk,
                old_value={"status": order.status, "order_number": order.order_number},
                new_value={"reason": "Super admin required for raw order deletion."},
            )
            raise PermissionDenied("Only super admin can delete orders from this endpoint.")
        create_audit_log(
            request=request,
            action="delete_order_record",
            entity_type="Order",
            entity_id=order.pk,
            old_value={"status": order.status, "order_number": order.order_number},
        )
        return super().destroy(request, *args, **kwargs)


class AdminOrderNoteViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    serializer_class = OrderNoteAdminSerializer
    queryset = OrderNote.objects.select_related("order", "user").all()
    search_fields = ["order__order_number", "user__full_name", "note", "visibility"]


class AdminOrderIssueViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    serializer_class = OrderIssueAdminSerializer
    queryset = OrderIssue.objects.select_related("order", "created_by", "resolved_by").all()
    search_fields = ["order__order_number", "title", "description"]


class AdminRatingViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    serializer_class = RatingAdminSerializer
    queryset = Rating.objects.select_related("order", "customer").all()
    search_fields = ["order__order_number", "customer__full_name", "comment"]


class AdminOrderDetailAPIView(generics.RetrieveAPIView):
    serializer_class = OrderDetailSerializer
    permission_classes = [permissions.IsAuthenticated, CanReviewOrders]

    def get_queryset(self):
        return get_reviewable_orders_for_user(self.request.user)


class AdminOrderStatusUpdateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanManageOrderWorkflow]

    def patch(self, request, pk):
        order = generics.get_object_or_404(get_orders_for_user(request.user), pk=pk)
        serializer = AdminStatusUpdateSerializer(data=request.data, context={"order": order, "request": request})
        serializer.is_valid(raise_exception=True)
        try:
            update_order_status(
                order=order,
                actor=request.user,
                new_status=serializer.validated_data["status"],
                note=serializer.validated_data.get("note", ""),
                request=request,
            )
        except DjangoValidationError as exc:
            _raise_drf_validation_error(exc)
        return response.Response({"status": order.status})


class AdminOrderAssignAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanAssignOrders]

    def patch(self, request, pk):
        order = generics.get_object_or_404(get_reviewable_orders_for_user(request.user), pk=pk)
        serializer = AssignProviderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            assign_provider_to_order(
                order=order,
                provider=serializer.validated_data["provider_id"],
                actor=request.user,
                note=serializer.validated_data.get("note", ""),
                request=request,
            )
        except DjangoValidationError as exc:
            _raise_drf_validation_error(exc)
        return response.Response({"assigned_provider": order.assigned_provider_id, "status": order.status})


class AdminRequestDocumentsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanRequestMissingDocuments]

    def post(self, request, pk):
        order = generics.get_object_or_404(get_reviewable_orders_for_user(request.user), pk=pk)
        serializer = RequestDocumentsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            request_missing_documents(
                order=order,
                actor=request.user,
                note_text=serializer.validated_data["note"],
                missing_document_types=serializer.validated_data.get("document_types", []),
                request=request,
            )
        except DjangoValidationError as exc:
            _raise_drf_validation_error(exc)
        return response.Response({"detail": "Request sent"})


class AdminOrderNotesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanReviewOrders]

    def post(self, request, pk):
        order = generics.get_object_or_404(get_reviewable_orders_for_user(request.user), pk=pk)
        serializer = OrderNoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = add_order_note(
            order=order,
            actor=request.user,
            validated_data=serializer.validated_data,
            request=request,
        )
        return response.Response(OrderNoteCreateSerializer(note).data, status=status.HTTP_201_CREATED)


class AdminOrderFinalDocumentAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanUploadFinalDocuments]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        order = generics.get_object_or_404(get_orders_for_user(request.user), pk=pk)
        payload = request.data.copy()
        payload["is_final_document"] = True
        serializer = DocumentUploadSerializer(
            data=payload,
            context={
                "order": order,
                "uploaded_by": request.user,
                "max_size": settings.FILE_UPLOAD_MAX_SIZE,
                "allowed_extensions": settings.ALLOWED_UPLOAD_EXTENSIONS,
                "allowed_mime_types": settings.ALLOWED_UPLOAD_MIME_TYPES,
            },
        )
        serializer.is_valid(raise_exception=True)
        try:
            document = upload_final_document(
                order=order,
                actor=request.user,
                validated_data=serializer.validated_data,
                request=request,
                status_note="Final document uploaded",
                audit_action="upload_final_document",
            )
        except DjangoValidationError as exc:
            _raise_drf_validation_error(exc)
        return response.Response({"id": document.pk}, status=status.HTTP_201_CREATED)


class AdminOrderCompleteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanManageOrderWorkflow]

    def post(self, request, pk):
        order = generics.get_object_or_404(get_orders_for_user(request.user), pk=pk)
        serializer = CompleteOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            complete_order(
                order=order,
                actor=request.user,
                admin_confirmation=serializer.validated_data["admin_confirmation"],
                request=request,
            )
        except DjangoValidationError as exc:
            _raise_drf_validation_error(exc)
        return response.Response({"status": order.status})


class AdminOrderRejectAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanRejectOrders]

    def post(self, request, pk):
        order = generics.get_object_or_404(get_reviewable_orders_for_user(request.user), pk=pk)
        serializer = RejectOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            reject_order(
                order=order,
                actor=request.user,
                reason=serializer.validated_data["reason"],
                request=request,
            )
        except DjangoValidationError as exc:
            _raise_drf_validation_error(exc)
        return response.Response({"status": order.status, "reason": order.rejection_reason})


class AdminOrderCancelAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanCancelOrders]

    def post(self, request, pk):
        order = generics.get_object_or_404(get_orders_for_user(request.user), pk=pk)
        serializer = CancelOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            cancel_order(
                order=order,
                actor=request.user,
                reason=serializer.validated_data["reason"],
                request=request,
            )
        except DjangoValidationError as exc:
            _raise_drf_validation_error(exc)
        return response.Response({"status": order.status, "reason": order.cancellation_reason})


class AdminWorkflowRulesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get(self, request):
        role_labels = {
            "admin": "Admin",
            "employee": "Employee",
            "support": "Support",
            "provider": "Provider",
            "customer": "Customer",
        }
        status_labels = dict(Order.Status.choices)
        data = []
        for rule in WORKFLOW_TRANSITIONS:
            data.append(
                {
                    "from_status": rule.from_status,
                    "to_status": rule.to_status,
                    "from_status_label": status_labels.get(rule.from_status, rule.from_status),
                    "to_status_label": status_labels.get(rule.to_status, rule.to_status),
                    "action": rule.action,
                    "allowed_roles": sorted(rule.allowed_roles),
                    "allowed_role_labels": [role_labels.get(role, role.title()) for role in sorted(rule.allowed_roles)],
                    "reason_required": rule.reason_required,
                    "notification_trigger": rule.notification_trigger,
                    "audit_required": rule.audit_required,
                    "summary": (
                        f"{status_labels.get(rule.from_status, rule.from_status)} to "
                        f"{status_labels.get(rule.to_status, rule.to_status)} by "
                        f"{', '.join(role_labels.get(role, role.title()) for role in sorted(rule.allowed_roles))}"
                    ),
                    "change_request_supported": False,
                }
            )
        return response.Response({"results": data})
