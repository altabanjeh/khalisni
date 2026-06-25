from rest_framework import filters, generics, permissions, status, viewsets
from rest_framework.decorators import action
from django.db.models import Count, Q
from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from audit.utils import create_audit_log
from config.permissions import CanManageServicePrices, CanManageServiceRelations, CanViewOrManageServiceCatalog
from core.delete_guard import AdminDeleteGuardMixin
from organizations.selectors import active_memberships_for_user, enforce_organization_scope, is_partner_admin, is_platform_super_admin
from services.models import Address, Service, ServiceCategory, ServiceProviderAssignment, ServiceRelation, ServiceRequiredDocument
from services.service_categories import category_snapshot
from services.service_relations import relation_snapshot
from services.selectors import (
    resolve_service_organization_from_request,
    visible_service_categories_queryset,
    visible_services_queryset,
)
from services.serializers import (
    AddressAdminSerializer,
    AdminCategoryRuleSerializer,
    AdminRequiredDocumentRuleSerializer,
    AdminServiceProviderAssignmentSerializer,
    AdminServiceRuleSerializer,
    ServiceRelationAdminSerializer,
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
        try:
            instance = serializer.save()
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise ValidationError(exc.message_dict)
            raise ValidationError(exc.messages)
        self._log_change(self.request, f"create_{self.audit_entity_type.lower()}", instance, new_value=_snapshot(instance, self.audit_fields))

    def perform_update(self, serializer):
        instance = self.get_object()
        old_value = _snapshot(instance, self.audit_fields)
        try:
            instance = serializer.save()
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise ValidationError(exc.message_dict)
            raise ValidationError(exc.messages)
        self._log_change(self.request, f"update_{self.audit_entity_type.lower()}", instance, old_value=old_value, new_value=_snapshot(instance, self.audit_fields))


class ServiceListAPIView(generics.ListAPIView):
    serializer_class = ServiceListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name_ar", "name_en", "description_ar", "description_en"]
    pagination_class = None

    def get_queryset(self):
        organization = resolve_service_organization_from_request(self.request)
        queryset = visible_services_queryset(organization=organization)
        category_slug = self.request.query_params.get("category")
        category_id = self.request.query_params.get("category_id")
        featured = self.request.query_params.get("featured")
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        if featured:
            queryset = queryset.filter(is_featured=featured.lower() == "true")
        return queryset


class ServiceCategoryListAPIView(generics.ListAPIView):
    serializer_class = ServiceCategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        organization = resolve_service_organization_from_request(self.request)
        queryset = visible_service_categories_queryset(organization=organization)
        parent_id = self.request.query_params.get("parent")
        if parent_id == "root":
            queryset = queryset.filter(parent__isnull=True)
        elif parent_id:
            queryset = queryset.filter(parent_id=parent_id)
        return queryset.order_by("sort_order", "display_order", "name_ar")


class ServiceDetailAPIView(generics.RetrieveAPIView):
    serializer_class = ServiceDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        organization = resolve_service_organization_from_request(self.request)
        return visible_services_queryset(organization=organization).prefetch_related(
            "document_requirements",
            "incoming_relations__source_service",
            "outgoing_relations__target_service",
        )


class ServiceAdminViewSet(AdminDeleteGuardMixin, AdminAuditMixin, viewsets.ModelViewSet):
    queryset = Service.objects.all().select_related("category")
    permission_classes = [permissions.IsAuthenticated, CanViewOrManageServiceCatalog]
    search_fields = ["name_ar", "name_en", "slug"]
    ordering_fields = ["created_at", "service_fee", "government_fee"]
    serializer_class = AdminServiceRuleSerializer
    audit_entity_type = "Service"
    audit_fields = (
        "organization_id",
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
        organization_id = self.request.query_params.get("organization")
        queryset = enforce_organization_scope(queryset, user=self.request.user, organization_field="organization")
        if organization_id:
            queryset = queryset.filter(organization_id=organization_id)
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
        self.enforce_delete_guard(request)
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


class CategoryAdminViewSet(AdminDeleteGuardMixin, AdminAuditMixin, viewsets.ModelViewSet):
    serializer_class = AdminCategoryRuleSerializer
    queryset = ServiceCategory.objects.all().select_related("parent").prefetch_related("services")
    permission_classes = [permissions.IsAuthenticated, CanViewOrManageServiceCatalog]
    search_fields = ["name_ar", "name_en", "slug"]
    pagination_class = None
    audit_entity_type = "ServiceCategory"
    audit_fields = ("name_ar", "name_en", "parent_id", "sort_order", "show_on_public_site", "is_active")

    def get_queryset(self):
        queryset = super().get_queryset()
        if not is_platform_super_admin(self.request.user):
            org_ids = active_memberships_for_user(self.request.user).values_list("organization_id", flat=True)
            queryset = queryset.filter(Q(services__organization__in=org_ids) | Q(services__organization__isnull=True)).distinct()
        active = _as_bool(self.request.query_params.get("is_active"))
        public = _as_bool(self.request.query_params.get("show_on_public_site"))
        parent_id = self.request.query_params.get("parent")
        if active is not None:
            queryset = queryset.filter(is_active=active)
        if public is not None:
            queryset = queryset.filter(show_on_public_site=public)
        if parent_id == "root":
            queryset = queryset.filter(parent__isnull=True)
        elif parent_id:
            queryset = queryset.filter(parent_id=parent_id)
        return queryset.annotate(active_services_count=Count("services", filter=Q(services__is_active=True), distinct=True)).order_by(
            "sort_order", "display_order", "name_ar"
        )

    def destroy(self, request, *args, **kwargs):
        self.enforce_delete_guard(request)
        instance = self.get_object()
        old_value = _snapshot(instance, self.audit_fields)
        instance.is_active = False
        try:
            instance.save(update_fields=["is_active", "updated_at"])
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise ValidationError(exc.message_dict)
            raise ValidationError(exc.messages)
        self._log_change(request, "disable_service_category", instance, old_value=old_value, new_value=_snapshot(instance, self.audit_fields))
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        if (
            not is_platform_super_admin(request.user)
            and not is_partner_admin(request.user)
            and not request.user.has_perm("services.manage_service_prices")
        ):
            raise PermissionDenied("You do not have permission to reorder service categories.")

        items = request.data.get("items", [])
        if not isinstance(items, list):
            return Response({"items": "Items must be a list."}, status=status.HTTP_400_BAD_REQUEST)

        scoped_categories = self.get_queryset()
        requested_ids = []
        parsed_items = []
        for item in items:
            try:
                category_id = int(item.get("id"))
            except (TypeError, ValueError):
                return Response({"items": "Each item must include a valid category id."}, status=status.HTTP_400_BAD_REQUEST)
            requested_ids.append(category_id)
            parsed_items.append((category_id, item))

        visible_categories = {category.pk: category for category in scoped_categories.filter(pk__in=requested_ids)}
        missing_ids = [category_id for category_id in requested_ids if category_id not in visible_categories]
        if missing_ids:
            return Response(
                {"items": f"Categories are invalid or outside your scope: {missing_ids}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            for category_id, item in parsed_items:
                category = visible_categories[category_id]
                try:
                    sort_order = int(item.get("sort_order", category.sort_order))
                except (TypeError, ValueError):
                    raise ValidationError({"items": f"Invalid sort_order for category {category_id}."})
                category.sort_order = sort_order
                category.display_order = sort_order
                category.save(update_fields=["sort_order", "display_order", "updated_at"])
                create_audit_log(
                    request=request,
                    user=request.user,
                    action="reorder_service_category",
                    entity_type="ServiceCategory",
                    entity_id=category.pk,
                    new_value=category_snapshot(category),
                )
        return Response({"detail": "Categories reordered."})


class RequiredDocumentAdminViewSet(AdminDeleteGuardMixin, AdminAuditMixin, viewsets.ModelViewSet):
    serializer_class = AdminRequiredDocumentRuleSerializer
    queryset = ServiceRequiredDocument.objects.select_related("service").all()
    permission_classes = [permissions.IsAuthenticated, CanViewOrManageServiceCatalog]
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
        self.enforce_delete_guard(request)
        instance = self.get_object()
        old_value = _snapshot(instance, self.audit_fields)
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        self._log_change(request, "disable_service_document_rule", instance, old_value=old_value, new_value=_snapshot(instance, self.audit_fields))
        return Response(status=status.HTTP_204_NO_CONTENT)


class ServiceRelationAdminViewSet(AdminDeleteGuardMixin, viewsets.ModelViewSet):
    serializer_class = ServiceRelationAdminSerializer
    queryset = ServiceRelation.objects.select_related(
        "source_service",
        "target_service",
        "created_by",
    ).all()
    permission_classes = [permissions.IsAuthenticated, CanManageServiceRelations]
    search_fields = [
        "source_service__name_ar",
        "source_service__name_en",
        "target_service__name_ar",
        "target_service__name_en",
        "message_to_customer",
    ]

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.select_related("source_service__organization", "target_service__organization")
        if not is_platform_super_admin(self.request.user):
            org_ids = active_memberships_for_user(self.request.user).values_list("organization_id", flat=True)
            queryset = queryset.filter(
                Q(source_service__organization__in=org_ids)
                | Q(target_service__organization__in=org_ids)
                | Q(source_service__organization__isnull=True, target_service__organization__isnull=True)
            ).distinct()
        source_service_id = self.request.query_params.get("source_service")
        target_service_id = self.request.query_params.get("target_service")
        relation_type = self.request.query_params.get("relation_type")
        active = _as_bool(self.request.query_params.get("is_active"))

        if source_service_id:
            queryset = queryset.filter(source_service_id=source_service_id)
        if target_service_id:
            queryset = queryset.filter(target_service_id=target_service_id)
        if relation_type:
            queryset = queryset.filter(relation_type=relation_type)
        if active is not None:
            queryset = queryset.filter(is_active=active)
        return queryset

    def perform_create(self, serializer):
        relation = serializer.save(created_by=self.request.user)
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="create_service_relation",
            entity_type="ServiceRelation",
            entity_id=relation.pk,
            new_value=relation_snapshot(relation),
        )

    def perform_update(self, serializer):
        relation = self.get_object()
        old_value = relation_snapshot(relation)
        relation = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="update_service_relation",
            entity_type="ServiceRelation",
            entity_id=relation.pk,
            old_value=old_value,
            new_value=relation_snapshot(relation),
        )

    def destroy(self, request, *args, **kwargs):
        self.enforce_delete_guard(request)
        relation = self.get_object()
        if request.user.role == request.user.Role.SUPPORT and not request.user.has_perm("services.manage_service_prices"):
            raise PermissionDenied("You do not have permission to deactivate service relations.")

        old_value = relation_snapshot(relation)
        relation.is_active = False
        relation.save(update_fields=["is_active", "updated_at"])
        create_audit_log(
            request=request,
            user=request.user,
            action="deactivate_service_relation",
            entity_type="ServiceRelation",
            entity_id=relation.pk,
            old_value=old_value,
            new_value=relation_snapshot(relation),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["delete"], url_path="hard-delete")
    def hard_delete(self, request, pk=None):
        self.enforce_delete_guard(request)
        if request.user.role != request.user.Role.ADMIN:
            raise PermissionDenied("Only admin users can permanently delete service relations.")

        relation = self.get_object()
        old_value = relation_snapshot(relation)
        relation_id = relation.pk
        relation.delete()
        create_audit_log(
            request=request,
            user=request.user,
            action="delete_service_relation",
            entity_type="ServiceRelation",
            entity_id=relation_id,
            old_value=old_value,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class ServiceProviderAssignmentAdminViewSet(AdminDeleteGuardMixin, AdminAuditMixin, viewsets.ModelViewSet):
    serializer_class = AdminServiceProviderAssignmentSerializer
    queryset = ServiceProviderAssignment.objects.select_related("service", "provider", "provider__user").all()
    permission_classes = [permissions.IsAuthenticated, CanViewOrManageServiceCatalog]
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
        self.enforce_delete_guard(request)
        instance = self.get_object()
        old_value = _snapshot(instance, self.audit_fields)
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        self._log_change(request, "disable_service_provider_assignment", instance, old_value=old_value, new_value=_snapshot(instance, self.audit_fields))
        return Response(status=status.HTTP_204_NO_CONTENT)


class AddressAdminViewSet(AdminDeleteGuardMixin, viewsets.ModelViewSet):
    serializer_class = AddressAdminSerializer
    queryset = Address.objects.select_related("user").all()
    permission_classes = [permissions.IsAuthenticated, CanViewOrManageServiceCatalog]
    search_fields = ["user__full_name", "city", "area", "street"]
