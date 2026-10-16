import hashlib
import json
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.uploadedfile import UploadedFile
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.http import Http404
from rest_framework import generics, permissions, response, status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError as DRFValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.views import APIView

from accounts.validators import phones_match
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
from core.delete_guard import AdminDeleteGuardMixin
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
    RecoverMissingDocumentRequestSerializer,
    RequestDocumentsSerializer,
    TrackOrderSerializer,
)
from orders.services import (
    add_order_note,
    archive_order,
    assign_provider_to_order,
    cancel_order,
    complete_order,
    create_customer_rating,
    recover_invalid_missing_document_request,
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


def _submission_fingerprint(data):
    """Hash the submitted fields and file bytes without storing sensitive form data."""
    entries = []
    pairs = data.lists() if hasattr(data, "lists") else ((key, value if isinstance(value, list) else [value]) for key, value in data.items())
    for key, values in sorted(pairs, key=lambda item: item[0]):
        if key == "csrfmiddlewaretoken":
            continue
        normalized = []
        for value in values:
            if isinstance(value, UploadedFile):
                position = value.tell()
                digest = hashlib.sha256()
                for chunk in value.chunks():
                    digest.update(chunk)
                value.seek(position)
                normalized.append({"name": value.name, "size": value.size, "sha256": digest.hexdigest()})
            else:
                normalized.append(str(value))
        entries.append((key, normalized))
    return hashlib.sha256(json.dumps(entries, ensure_ascii=False, separators=(",", ":")).encode("utf-8")).hexdigest()


class CreateOrderAPIView(generics.CreateAPIView):
    serializer_class = PublicOrderCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomerRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def create(self, request, *args, **kwargs):
        raw_key = request.headers.get("Idempotency-Key", "").strip()
        submission_key = None
        fingerprint = ""
        if raw_key:
            try:
                submission_key = uuid.UUID(raw_key)
            except (ValueError, AttributeError):
                raise DRFValidationError({"idempotency_key": "Use a UUID submission key."})
            fingerprint = _submission_fingerprint(request.data)
            replay = self._replay(request.user, submission_key, fingerprint)
            if replay is not None:
                return replay

        serializer = self.get_serializer(data=request.data, context={
            "request": request,
            "submission_key": submission_key,
            "submission_fingerprint": fingerprint,
        })
        serializer.is_valid(raise_exception=True)
        try:
            order = serializer.save()
        except (IntegrityError, DRFValidationError):
            # A concurrent request with the same key may have won the race after
            # the check above. Depending on timing the loser fails on the unique
            # constraint in the database or in model validation; both are the
            # same retry and must return the original order.
            replay = self._replay(request.user, submission_key, fingerprint) if submission_key else None
            if replay is None:
                raise
            return replay
        return response.Response(self._order_response(order), status=status.HTTP_201_CREATED)

    @staticmethod
    def _existing_submission(customer, submission_key):
        return Order.objects.filter(customer=customer, submission_key=submission_key).first()

    def _replay(self, customer, submission_key, fingerprint):
        existing = self._existing_submission(customer, submission_key)
        if existing is None:
            return None
        if existing.submission_fingerprint != fingerprint:
            return response.Response(
                {"detail": "This submission key was used for different request data.", "code": "submission_key_conflict"},
                status=status.HTTP_409_CONFLICT,
            )
        return response.Response(self._order_response(existing), status=status.HTTP_200_OK)

    @staticmethod
    def _order_response(order):
        return {
            "id": order.pk,
            "order_number": order.order_number,
            "status": order.status,
            "warnings": getattr(order, "prerequisite_warnings", []),
        }


class TrackOrderAPIView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "order_tracking"

    def get(self, request):
        order_number = (request.query_params.get("order_number") or "").strip()
        phone = (request.query_params.get("phone") or "").strip()
        # Both secrets are mandatory: an account without a phone number must
        # not become trackable by its (sequential) order number alone.
        if not order_number or not phone:
            raise Http404
        order = (
            Order.objects.select_related("customer", "service", "service__category")
            .prefetch_related("documents", "status_logs")
            .filter(order_number=order_number)
            .first()
        )
        # The phone is compared as a canonical number, not as typed: 079...,
        # +96279... and 0096279... are the same phone (owner phone policy).
        if order is None or not phones_match(phone, order.customer.phone):
            raise Http404
        serializer = TrackOrderSerializer(order, context={"request": request})
        return response.Response(serializer.data)


def _query_flag(value):
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


class StatusGroupListMixin:
    """A paged order list whose status chips are answered by the server.

    ``?status_group=<key>`` narrows the list to one of ``status_groups`` on the
    server, so the filtered rows and their count are right across every page.
    ``?include_status_counts=true`` adds ``status_counts`` (``all`` plus one
    count per group) to the paged answer, computed on the same scope and search
    as the list but before the group filter -- never from one page of rows.
    Subclasses implement ``get_scoped_queryset`` (scope + every other filter).
    """

    status_groups = {}

    def get_scoped_queryset(self):  # pragma: no cover - subclasses implement it
        raise NotImplementedError

    def get_queryset(self):
        queryset = self.get_scoped_queryset()
        group = (self.request.query_params.get("status_group") or "").strip()
        if group and group != "all":
            condition = self.status_groups.get(group)
            if condition is None:
                raise DRFValidationError({"status_group": f"Unknown status group: {group}."})
            queryset = queryset.filter(condition)
        return queryset

    def status_counts(self):
        queryset = self.filter_queryset(self.get_scoped_queryset())
        counts = {"all": queryset.count()}
        for key, condition in self.status_groups.items():
            counts[key] = queryset.filter(condition).count()
        return counts

    def list(self, request, *args, **kwargs):
        result = super().list(request, *args, **kwargs)
        if _query_flag(request.query_params.get("include_status_counts")) and isinstance(result.data, dict):
            result.data["status_counts"] = self.status_counts()
        return result


_CUSTOMER_TERMINAL_STATUSES = [
    Order.Status.COMPLETED,
    Order.Status.CANCELLED,
    Order.Status.REJECTED,
    Order.Status.ARCHIVED,
]
_CUSTOMER_ACTION_REQUIRED = Q(status=Order.Status.WAITING_CUSTOMER) | ~Q(missing_document_types=[])


class CustomerOrderListAPIView(StatusGroupListMixin, generics.ListAPIView):
    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomerRole]
    search_fields = ["order_number", "service__name_ar", "service__name_en"]
    # The customer's own chips: something to do, still running, finished.
    status_groups = {
        "action": _CUSTOMER_ACTION_REQUIRED,
        "active": ~Q(status__in=_CUSTOMER_TERMINAL_STATUSES) & ~_CUSTOMER_ACTION_REQUIRED,
        "done": Q(status=Order.Status.COMPLETED),
    }

    def get_scoped_queryset(self):
        # Most recently touched first; pk breaks ties so rows never move between pages.
        return get_orders_for_user(self.request.user).order_by("-updated_at", "-pk")


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


class AdminDashboardOrderListAPIView(StatusGroupListMixin, generics.ListAPIView):
    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated, CanReviewOrders]
    # The admin requests chips (OrdersManagementPage), answered over every row.
    status_groups = {
        "action": Q(status__in=[Order.Status.NEW, Order.Status.UNDER_REVIEW, Order.Status.WAITING_CUSTOMER]),
        "execution": Q(status__in=[Order.Status.ASSIGNED, Order.Status.IN_PROGRESS, Order.Status.WAITING_GOVERNMENT]),
        "completed": Q(status=Order.Status.COMPLETED),
    }

    def get_scoped_queryset(self):
        # Newest first; pk breaks ties so rows never move between pages.
        queryset = get_reviewable_orders_for_user(self.request.user).order_by("-created_at", "-pk")
        params = self.request.query_params
        search = (params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(
                Q(order_number__icontains=search)
                | Q(customer__full_name__icontains=search)
                | Q(service__name_ar__icontains=search)
                | Q(service__name_en__icontains=search)
                | Q(assigned_provider__user__full_name__icontains=search)
                | Q(city__icontains=search)
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


class AdminOrderRecordViewSet(AdminDeleteGuardMixin, viewsets.ModelViewSet):
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
        old_value = {"status": order.status, "order_number": order.order_number}
        self.enforce_delete_guard(request, instance=order, old_value=old_value)
        with transaction.atomic():
            archive_order(order=order, actor=request.user, note="Archived from admin delete action.", request=request)
            create_audit_log(
                request=request,
                action="archive_order_record",
                entity_type="Order",
                entity_id=order.pk,
                entity_name=order.order_number,
                old_value=old_value,
                new_value={"status": order.status, "order_number": order.order_number},
            )
        return response.Response(status=status.HTTP_204_NO_CONTENT)


class AdminOrderNoteViewSet(AdminDeleteGuardMixin, viewsets.ModelViewSet):
    delete_audit_action = "delete_order_note"
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    serializer_class = OrderNoteAdminSerializer
    queryset = OrderNote.objects.select_related("order", "user").all()
    search_fields = ["order__order_number", "user__full_name", "note", "visibility"]


class AdminOrderIssueViewSet(AdminDeleteGuardMixin, viewsets.ModelViewSet):
    delete_audit_action = "delete_order_issue"
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    serializer_class = OrderIssueAdminSerializer
    queryset = OrderIssue.objects.select_related("order", "created_by", "resolved_by").all()
    search_fields = ["order__order_number", "title", "description"]


class AdminRatingViewSet(AdminDeleteGuardMixin, viewsets.ModelViewSet):
    delete_audit_action = "delete_rating"
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


class AdminRecoverMissingDocumentRequestAPIView(APIView):
    """Staff recovery for a waiting order whose missing-document request is unusable."""

    permission_classes = [permissions.IsAuthenticated, CanRequestMissingDocuments]

    def post(self, request, pk):
        order = generics.get_object_or_404(get_reviewable_orders_for_user(request.user), pk=pk)
        serializer = RecoverMissingDocumentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            recover_invalid_missing_document_request(
                order=order,
                actor=request.user,
                reason=serializer.validated_data["reason"],
                request=request,
            )
        except DjangoValidationError as exc:
            _raise_drf_validation_error(exc)
        return response.Response({"status": order.status})


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
                    "channel": "status" if rule.generic_status_update else (
                        "provider_status" if rule.action.startswith("provider_") else "dedicated"
                    ),
                    "validation_checks": list(rule.validation_checks),
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
