from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, response, status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError as DRFValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.decorators import action
from rest_framework.views import APIView

from audit.utils import create_audit_log
from config.permissions import CanAssignOrders, CanManageUserRoles, IsProviderRole
from core.delete_guard import AdminDeleteGuardMixin, _include_deleted
from documents.serializers import DocumentUploadSerializer
from organizations.selectors import (
    active_memberships_for_user,
    enforce_organization_scope,
    has_scoped_memberships,
    is_platform_super_admin,
)
from orders.models import Order
from orders.serializers import ProviderOrderDetailSerializer, ProviderOrderListSerializer
from orders.selectors import get_reviewable_orders_for_user
from orders.views import StatusGroupListMixin
from orders.services import complete_provider_work, provider_add_internal_note, provider_update_status
from providers.models import ProviderProfile
from providers.serializers import (
    ProviderActivationSerializer,
    ProviderAdminListSerializer,
    ProviderAdminSerializer,
    ProviderApprovalDecisionSerializer,
    ProviderProfileSerializer,
)
from services.models import Service


def _scope_provider_admin_queryset(queryset, user):
    if not user or not getattr(user, "is_authenticated", False):
        return queryset.none()
    if has_scoped_memberships(user):
        org_ids = active_memberships_for_user(user).values_list("organization_id", flat=True)
        return queryset.filter(
            Q(organization_id__in=org_ids)
            | Q(service_assignments__service__organization_id__in=org_ids)
            | Q(service_categories__services__organization_id__in=org_ids)
        ).distinct()
    return queryset


class ProviderAdminViewSet(AdminDeleteGuardMixin, viewsets.ModelViewSet):
    queryset = ProviderProfile.objects.select_related("user").prefetch_related("service_categories")
    search_fields = ["user__full_name", "user__email", "city", "provider_type"]

    def get_queryset(self):
        base_queryset = super().get_queryset()
        params = self.request.query_params
        order_id = params.get("order")
        service_id = params.get("service")
        approved = params.get("is_approved")
        active = params.get("is_active")

        # The assignment pickers (?order= / ?service=) list eligible providers
        # across the platform. They are list filters only: every other action
        # resolves its object inside the caller's own scope.
        if self.action != "list":
            order_id = service_id = None

        if order_id:
            queryset = base_queryset
            order = generics.get_object_or_404(
                get_reviewable_orders_for_user(self.request.user).select_related("service"),
                pk=order_id,
            )
            queryset = queryset.filter(
                is_available=True,
                is_approved=True,
            ).filter(
                Q(service_assignments__service=order.service, service_assignments__is_active=True, service_assignments__is_deleted=False)
                | Q(service_categories=order.service.category)
            ).distinct()
        elif service_id:
            queryset = base_queryset
            scoped_services = enforce_organization_scope(
                Service.objects.select_related("category"),
                user=self.request.user,
                organization_field="organization",
            ).distinct()
            service = generics.get_object_or_404(scoped_services, pk=service_id)
            queryset = queryset.filter(
                is_available=True,
                is_approved=True,
            ).filter(
                Q(service_assignments__service=service, service_assignments__is_active=True, service_assignments__is_deleted=False)
                | Q(service_categories=service.category)
            ).distinct()
        else:
            queryset = _scope_provider_admin_queryset(base_queryset, self.request.user)

        if approved is not None:
            queryset = queryset.filter(is_approved=str(approved).strip().lower() in {"1", "true", "yes", "on"})
        if active is not None:
            queryset = queryset.filter(user__is_active=str(active).strip().lower() in {"1", "true", "yes", "on"})
        # With include_deleted, is_deleted narrows the list on the server so a
        # paged "deleted only" view counts and pages correctly.
        deleted = params.get("is_deleted")
        if deleted is not None and _include_deleted(self.request):
            queryset = queryset.filter(is_deleted=str(deleted).strip().lower() in {"1", "true", "yes", "on"})

        # Unique tiebreak: equal ratings and names must not move between pages.
        return queryset.order_by("-rating", "user__full_name", "pk")

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            permission_classes = [permissions.IsAuthenticated, CanAssignOrders]
        else:
            permission_classes = [permissions.IsAuthenticated, CanManageUserRoles]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action in {"list", "retrieve"}:
            if getattr(self.request.user, "role", "") in {"employee", "support"}:
                return ProviderAdminListSerializer
            return ProviderAdminListSerializer
        return ProviderAdminSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    @staticmethod
    def _require_platform_admin(request):
        # Providers are shared by every organization: whether one is approved
        # or may sign in at all is decided by the platform.
        if not is_platform_super_admin(request.user):
            raise PermissionDenied("Only a platform super admin can approve or activate providers.")

    def perform_create(self, serializer):
        provider = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="create_provider_profile",
            entity_type="ProviderProfile",
            entity_id=provider.pk,
            new_value={"is_approved": provider.is_approved, "is_available": provider.is_available},
        )

    def perform_update(self, serializer):
        provider = self.get_object()
        old_value = {
            "is_approved": provider.is_approved,
            "is_available": provider.is_available,
            "user_is_active": provider.user.is_active,
        }
        provider = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="update_provider_profile",
            entity_type="ProviderProfile",
            entity_id=provider.pk,
            old_value=old_value,
            new_value={
                "is_approved": provider.is_approved,
                "is_available": provider.is_available,
                "user_is_active": provider.user.is_active,
            },
        )

    def destroy(self, request, *args, **kwargs):
        provider = self.get_object()
        old_value = {
            "is_available": provider.is_available,
            "user_is_active": provider.user.is_active,
            "is_deleted": provider.is_deleted,
        }
        self.enforce_delete_guard(request, instance=provider, old_value=old_value)
        with transaction.atomic():
            provider.soft_delete(user=request.user)
            provider.user.soft_delete(user=request.user)
            create_audit_log(
                request=request,
                user=request.user,
                action="delete_provider_profile",
                entity_type="ProviderProfile",
                entity_id=provider.pk,
                entity_name=provider.user.full_name,
                old_value=old_value,
                new_value={"is_available": provider.is_available, "user_is_active": provider.user.is_active, "is_deleted": provider.is_deleted},
            )
        return response.Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, CanManageUserRoles])
    def restore(self, request, pk=None):
        provider = generics.get_object_or_404(ProviderProfile.objects.select_related("user"), pk=pk)
        old_value = {
            "is_available": provider.is_available,
            "user_is_active": provider.user.is_active,
            "is_deleted": provider.is_deleted,
        }
        provider.restore()
        if getattr(provider.user, "is_deleted", False):
            provider.user.restore()
        create_audit_log(
            request=request,
            user=request.user,
            action="restore_provider_profile",
            entity_type="ProviderProfile",
            entity_id=provider.pk,
            entity_name=provider.user.full_name,
            old_value=old_value,
            new_value={"is_available": provider.is_available, "user_is_active": provider.user.is_active, "is_deleted": provider.is_deleted},
        )
        return response.Response(ProviderAdminListSerializer(provider).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, CanManageUserRoles])
    def approval(self, request, pk=None):
        provider = self.get_object()
        self._require_platform_admin(request)
        serializer = ProviderApprovalDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        decision = serializer.validated_data["decision"]
        reason = serializer.validated_data.get("reason", "").strip()
        old_value = {
            "is_approved": provider.is_approved,
            "approved_by": provider.approved_by_id,
            "approved_at": provider.approved_at.isoformat() if provider.approved_at else "",
        }

        if decision == "approve":
            provider.is_approved = True
            provider.approved_by = request.user
            provider.approved_at = timezone.now()
        else:
            provider.is_approved = False
            provider.approved_by = None
            provider.approved_at = None

        provider.save()
        create_audit_log(
            request=request,
            user=request.user,
            action="provider_approval_decision",
            entity_type="ProviderProfile",
            entity_id=provider.pk,
            old_value=old_value,
            new_value={
                "decision": decision,
                "reason": reason,
                "is_approved": provider.is_approved,
            },
        )
        return response.Response(ProviderAdminListSerializer(provider).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, CanManageUserRoles])
    def activation(self, request, pk=None):
        provider = self.get_object()
        self._require_platform_admin(request)
        serializer = ProviderActivationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        is_active = serializer.validated_data["is_active"]
        reason = serializer.validated_data.get("reason", "").strip()
        old_value = {
            "account_active": provider.user.is_active,
            "is_available": provider.is_available,
        }

        provider.user.is_active = is_active
        provider.user.save(update_fields=["is_active", "updated_at"])
        provider.is_available = is_active
        provider.save(update_fields=["is_available", "updated_at"])

        create_audit_log(
            request=request,
            user=request.user,
            action="provider_activation_change",
            entity_type="ProviderProfile",
            entity_id=provider.pk,
            old_value=old_value,
            new_value={
                "reason": reason,
                "account_active": provider.user.is_active,
                "is_available": provider.is_available,
            },
        )
        return response.Response(ProviderAdminListSerializer(provider).data, status=status.HTTP_200_OK)


def provider_orders_queryset(user):
    queryset = (
        Order.objects.select_related("customer", "service", "service__category", "assigned_provider", "assigned_provider__user")
        .prefetch_related("documents", "status_logs", "notes__user")
    )
    return enforce_organization_scope(
        queryset.filter(
            Q(assigned_provider__user=user)
            | Q(
                assigned_provider_organization__memberships__user=user,
                assigned_provider_organization__memberships__is_active=True,
                assigned_provider_organization__memberships__is_deleted=False,
            )
        ),
        user=user,
        organization_field="organization",
    ).distinct()


def _raise_drf_validation_error(exc):
    if hasattr(exc, "message_dict"):
        raise DRFValidationError(exc.message_dict)
    raise DRFValidationError(exc.messages)


class ProviderDashboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsProviderRole]

    def get(self, request):
        # Members of a provider organization work its orders without a personal profile.
        provider = getattr(request.user, "provider_profile", None)
        queryset = provider_orders_queryset(request.user)
        data = {
            "provider": ProviderProfileSerializer(provider).data if provider else None,
            "assigned_orders": queryset.count(),
            "in_progress": queryset.filter(status=Order.Status.IN_PROGRESS).count(),
            "ready_for_delivery": queryset.filter(status=Order.Status.READY_FOR_DELIVERY).count(),
            "completed": queryset.filter(status=Order.Status.COMPLETED).count(),
            "delayed": queryset.filter(expected_delivery_date__lt=timezone.localdate()).exclude(
                status__in=[Order.Status.COMPLETED, Order.Status.REJECTED, Order.Status.CANCELLED]
            ).count(),
        }
        return response.Response(data)


class ProviderOrderListAPIView(StatusGroupListMixin, generics.ListAPIView):
    serializer_class = ProviderOrderListSerializer
    permission_classes = [permissions.IsAuthenticated, IsProviderRole]
    search_fields = ["order_number", "service__name_ar", "service__name_en", "city"]
    # The provider's work-queue chips (AssignedOrdersPage), answered over every row.
    status_groups = {
        "active": Q(status__in=[Order.Status.ASSIGNED, Order.Status.IN_PROGRESS, Order.Status.WAITING_GOVERNMENT]),
        "ready": Q(status=Order.Status.READY_FOR_DELIVERY),
        "done": Q(status=Order.Status.COMPLETED),
    }

    def get_scoped_queryset(self):
        # Newest first; pk breaks ties so rows never move between pages.
        return provider_orders_queryset(self.request.user).order_by("-created_at", "-pk")


class ProviderOrderDetailAPIView(generics.RetrieveAPIView):
    serializer_class = ProviderOrderDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsProviderRole]

    def get_queryset(self):
        return provider_orders_queryset(self.request.user)


class ProviderOrderStatusAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsProviderRole]

    def patch(self, request, pk):
        order = generics.get_object_or_404(provider_orders_queryset(request.user), pk=pk)
        try:
            provider_update_status(
                order=order,
                actor=request.user,
                new_status=request.data.get("status"),
                note=request.data.get("note", ""),
                request=request,
            )
        except DjangoValidationError as exc:
            _raise_drf_validation_error(exc)
        return response.Response({"status": order.status})


class ProviderOrderNoteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsProviderRole]

    def post(self, request, pk):
        order = generics.get_object_or_404(provider_orders_queryset(request.user), pk=pk)
        try:
            note = provider_add_internal_note(
                order=order,
                actor=request.user,
                note_text=request.data.get("note", ""),
                request=request,
            )
        except DjangoValidationError as exc:
            _raise_drf_validation_error(exc)
        return response.Response({"id": note.pk}, status=status.HTTP_201_CREATED)


class ProviderFinalDocumentAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsProviderRole]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        order = generics.get_object_or_404(provider_orders_queryset(request.user), pk=pk)
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
            document = complete_provider_work(
                order=order,
                actor=request.user,
                validated_data=serializer.validated_data,
                request=request,
            )
        except DjangoValidationError as exc:
            _raise_drf_validation_error(exc)
        return response.Response({"id": document.pk}, status=status.HTTP_201_CREATED)
