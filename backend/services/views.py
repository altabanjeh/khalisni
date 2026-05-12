from rest_framework import filters, generics, permissions, status, viewsets
from rest_framework.response import Response

from audit.utils import create_audit_log
from config.permissions import CanManageServicePrices
from services.models import Address, Service, ServiceCategory, ServiceProviderAssignment, ServiceRequiredDocument
from services.serializers import (
    AddressAdminSerializer,
    AdminCategoryRuleSerializer,
    AdminRequiredDocumentRuleSerializer,
    AdminServiceProviderAssignmentSerializer,
    AdminServiceRuleSerializer,
    ServiceCategorySerializer,
    ServiceDetailSerializer,
    ServiceListSerializer,
)


def _as_bool(value):
    if value is None:
        return None
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _snapshot(instance, fields):
    data = {}
    for field in fields:
        value = getattr(instance, field, None)
        if hasattr(value, "pk"):
            data[field] = value.pk
        else:
            data[field] = value
    return data


class AdminAuditMixin:
    audit_entity_type = ""
    audit_fields = ()

    def _entity_name(self, instance):
        return getattr(instance, "name_ar", "") or getattr(instance, "key", "") or str(instance.pk)

    def _log_change(self, request, action, instance, *, old_value=None, new_value=None):
        create_audit_log(
            request=request,
            user=request.user,
            action=action,
            entity_type=self.audit_entity_type,
            entity_id=instance.pk,
            old_value=old_value,
            new_value=new_value,
        )

    def perform_create(self, serializer):
        instance = serializer.save()
        self._log_change(self.request, f"create_{self.audit_entity_type.lower()}", instance, new_value=_snapshot(instance, self.audit_fields))

    def perform_update(self, serializer):
        instance = self.get_object()
        old_value = _snapshot(instance, self.audit_fields)
        instance = serializer.save()
        self._log_change(self.request, f"update_{self.audit_entity_type.lower()}", instance, old_value=old_value, new_value=_snapshot(instance, self.audit_fields))


class ServiceListAPIView(generics.ListAPIView):
    serializer_class = ServiceListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name_ar", "name_en", "description_ar"]

    def get_queryset(self):
        queryset = Service.objects.filter(is_active=True).select_related("category")
        category_slug = self.request.query_params.get("category")
        featured = self.request.query_params.get("featured")
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)
        if featured:
            queryset = queryset.filter(is_featured=featured.lower() == "true")
        return queryset


class ServiceCategoryListAPIView(generics.ListAPIView):
    serializer_class = ServiceCategorySerializer
    permission_classes = [permissions.AllowAny]
    queryset = ServiceCategory.objects.filter(is_active=True)


class ServiceDetailAPIView(generics.RetrieveAPIView):
    serializer_class = ServiceDetailSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Service.objects.filter(is_active=True).select_related("category")
    lookup_field = "slug"


class ServiceAdminViewSet(AdminAuditMixin, viewsets.ModelViewSet):
    queryset = Service.objects.all().select_related("category")
    permission_classes = [permissions.IsAuthenticated, CanManageServicePrices]
    search_fields = ["name_ar", "name_en", "slug"]
    ordering_fields = ["created_at", "service_fee", "government_fee"]
    serializer_class = AdminServiceRuleSerializer
    audit_entity_type = "Service"
    audit_fields = (
        "name_ar",
        "name_en",
        "category_id",
        "base_price",
        "government_fee",
        "service_fee",
        "estimated_duration",
        "estimated_duration_unit",
        "provider_required",
        "requires_manual_review",
        "is_active",
    )

    def get_queryset(self):
        queryset = super().get_queryset()
        category_id = self.request.query_params.get("category")
        active = _as_bool(self.request.query_params.get("is_active"))
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        if active is not None:
            queryset = queryset.filter(is_active=active)
        return queryset

    def get_serializer_class(self):
        if self.action in {"list", "retrieve"}:
            return AdminServiceRuleSerializer
        return AdminServiceRuleSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        old_value = _snapshot(instance, self.audit_fields)
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        self._log_change(
            request,
            "disable_service",
            instance,
            old_value=old_value,
            new_value=_snapshot(instance, self.audit_fields),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class CategoryAdminViewSet(AdminAuditMixin, viewsets.ModelViewSet):
    serializer_class = AdminCategoryRuleSerializer
    queryset = ServiceCategory.objects.all()
    permission_classes = [permissions.IsAuthenticated, CanManageServicePrices]
    search_fields = ["name_ar", "name_en", "slug"]
    audit_entity_type = "ServiceCategory"
    audit_fields = ("name_ar", "name_en", "display_order", "is_active")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        old_value = _snapshot(instance, self.audit_fields)
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        self._log_change(request, "disable_service_category", instance, old_value=old_value, new_value=_snapshot(instance, self.audit_fields))
        return Response(status=status.HTTP_204_NO_CONTENT)


class RequiredDocumentAdminViewSet(AdminAuditMixin, viewsets.ModelViewSet):
    serializer_class = AdminRequiredDocumentRuleSerializer
    queryset = ServiceRequiredDocument.objects.select_related("service").all()
    permission_classes = [permissions.IsAuthenticated, CanManageServicePrices]
    search_fields = ["service__name_ar", "document_type", "name_ar", "name_en"]
    audit_entity_type = "ServiceRequiredDocument"
    audit_fields = (
        "service_id",
        "document_type",
        "is_required",
        "allowed_extensions",
        "max_file_size",
        "requires_verification",
        "client_can_replace_file",
        "provider_can_view_file",
        "is_active",
    )

    def get_queryset(self):
        queryset = super().get_queryset()
        service_id = self.request.query_params.get("service")
        active = _as_bool(self.request.query_params.get("is_active"))
        if service_id:
            queryset = queryset.filter(service_id=service_id)
        if active is not None:
            queryset = queryset.filter(is_active=active)
        return queryset

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        old_value = _snapshot(instance, self.audit_fields)
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        self._log_change(request, "disable_service_document_rule", instance, old_value=old_value, new_value=_snapshot(instance, self.audit_fields))
        return Response(status=status.HTTP_204_NO_CONTENT)


class ServiceProviderAssignmentAdminViewSet(AdminAuditMixin, viewsets.ModelViewSet):
    serializer_class = AdminServiceProviderAssignmentSerializer
    queryset = ServiceProviderAssignment.objects.select_related("service", "provider", "provider__user").all()
    permission_classes = [permissions.IsAuthenticated, CanManageServicePrices]
    search_fields = ["service__name_ar", "provider__user__full_name"]
    audit_entity_type = "ServiceProviderAssignment"
    audit_fields = ("service_id", "provider_id", "is_active")

    def get_queryset(self):
        queryset = super().get_queryset()
        service_id = self.request.query_params.get("service")
        provider_id = self.request.query_params.get("provider")
        active = _as_bool(self.request.query_params.get("is_active"))
        if service_id:
            queryset = queryset.filter(service_id=service_id)
        if provider_id:
            queryset = queryset.filter(provider_id=provider_id)
        if active is not None:
            queryset = queryset.filter(is_active=active)
        return queryset

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        old_value = _snapshot(instance, self.audit_fields)
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        self._log_change(request, "disable_service_provider_assignment", instance, old_value=old_value, new_value=_snapshot(instance, self.audit_fields))
        return Response(status=status.HTTP_204_NO_CONTENT)


class AddressAdminViewSet(viewsets.ModelViewSet):
    serializer_class = AddressAdminSerializer
    queryset = Address.objects.select_related("user").all()
    permission_classes = [permissions.IsAuthenticated, CanManageServicePrices]
    search_fields = ["user__full_name", "city", "area", "street"]
