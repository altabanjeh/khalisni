from rest_framework.permissions import SAFE_METHODS, BasePermission

from organizations.selectors import (
    active_memberships_for_user,
    is_branch_manager,
    is_customer_user,
    is_partner_admin,
    is_partner_operational_user,
    is_partner_user,
    is_platform_super_admin,
    is_platform_support,
    is_provider_user,
)


def _normalized_role(user):
    return (getattr(user, "role", "") or "").lower()


def _has_perm(user, perm_name):
    return bool(user and user.is_authenticated and user.has_perm(perm_name))


def is_admin(user):
    return is_platform_super_admin(user)


def is_employee(user):
    return _normalized_role(user) in {"employee", "support"} or is_partner_user(user) or is_platform_support(user)


def is_provider(user):
    return is_provider_user(user)


def is_client(user):
    return is_customer_user(user)


def can_view_order(user, order):
    from orders.selectors import can_view_order as selector_can_view_order

    return selector_can_view_order(user, order)


def can_edit_order(user, order):
    if not user or not user.is_authenticated:
        return False
    if is_admin(user):
        return True
    if is_employee(user):
        return can_view_order(user, order) and not order.is_final_state
    if is_provider(user):
        return bool(order.assigned_provider and order.assigned_provider.user_id == user.id and order.is_active)
    if is_client(user):
        return order.customer_id == user.id and not order.is_final_state
    return False


def can_download_document(user, document):
    from documents.services import can_user_download_document

    return can_user_download_document(user=user, document=document)


class HasRole(BasePermission):
    allowed_roles = set()

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and _normalized_role(request.user) in self.allowed_roles
        )


class IsAdminRole(HasRole):
    allowed_roles = {"admin"}

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and is_platform_super_admin(request.user))


class IsSupportRole(HasRole):
    allowed_roles = {"support"}

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and is_platform_support(request.user))


class IsProviderRole(HasRole):
    allowed_roles = {"provider"}

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and is_provider_user(request.user))


class IsCustomerRole(HasRole):
    allowed_roles = {"customer"}

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and is_customer_user(request.user))


class IsAdminOrSupportReadOnly(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if is_platform_super_admin(request.user):
            return True
        return is_platform_support(request.user) and request.method in SAFE_METHODS


class IsAdminOrSupport(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (is_platform_super_admin(request.user) or is_platform_support(request.user)))


class IsInternalStaffRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (is_admin(request.user) or is_employee(request.user)))


class HasDjangoPermission(BasePermission):
    permission_name = ""

    def has_permission(self, request, view):
        return _has_perm(request.user, self.permission_name)


class CanReviewOrders(HasDjangoPermission):
    permission_name = "orders.review_order"

    def has_permission(self, request, view):
        if is_platform_super_admin(request.user) or is_platform_support(request.user):
            return True
        if is_partner_operational_user(request.user):
            return True
        return super().has_permission(request, view)


class CanRequestMissingDocuments(HasDjangoPermission):
    permission_name = "orders.request_missing_documents"

    def has_permission(self, request, view):
        if is_platform_super_admin(request.user) or is_partner_operational_user(request.user):
            return True
        return super().has_permission(request, view)


class CanCancelOrders(HasDjangoPermission):
    permission_name = "orders.cancel_order"

    def has_permission(self, request, view):
        if is_platform_super_admin(request.user) or is_partner_operational_user(request.user) or is_customer_user(request.user):
            return True
        return super().has_permission(request, view)


class CanAssignOrders(HasDjangoPermission):
    permission_name = "orders.assign_order"

    def has_permission(self, request, view):
        if is_platform_super_admin(request.user) or is_partner_admin(request.user):
            return True
        return super().has_permission(request, view)


class CanProcessOrders(HasDjangoPermission):
    permission_name = "orders.process_order"

    def has_permission(self, request, view):
        if is_platform_super_admin(request.user) or is_partner_operational_user(request.user) or is_provider_user(request.user):
            return True
        return super().has_permission(request, view)


class CanCompleteOrders(HasDjangoPermission):
    permission_name = "orders.complete_order"

    def has_permission(self, request, view):
        if is_platform_super_admin(request.user) or is_partner_operational_user(request.user):
            return True
        return super().has_permission(request, view)


class CanRejectOrders(HasDjangoPermission):
    permission_name = "orders.reject_order"

    def has_permission(self, request, view):
        if is_platform_super_admin(request.user) or is_partner_operational_user(request.user):
            return True
        return super().has_permission(request, view)


class CanManageOrderWorkflow(HasDjangoPermission):
    permission_name = "orders.manage_order_workflow"

    def has_permission(self, request, view):
        if is_platform_super_admin(request.user) or is_partner_operational_user(request.user):
            return True
        return super().has_permission(request, view)


class CanVerifyDocuments(HasDjangoPermission):
    permission_name = "documents.verify_document"


class CanUploadFinalDocuments(HasDjangoPermission):
    permission_name = "documents.upload_final_document"


class CanViewReportsDashboard(HasDjangoPermission):
    permission_name = "orders.view_reports_dashboard"

    def has_permission(self, request, view):
        if is_platform_super_admin(request.user) or is_platform_support(request.user):
            return True
        if is_partner_user(request.user) or is_provider_user(request.user):
            return True
        return super().has_permission(request, view)


class CanViewScopedReports(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if is_customer_user(request.user) or is_provider_user(request.user):
            return True
        if is_partner_user(request.user):
            return True
        return _has_perm(request.user, "orders.view_reports_dashboard")


class CanExportReports(HasDjangoPermission):
    permission_name = "orders.export_order_reports"


class CanManageServicePrices(HasDjangoPermission):
    permission_name = "services.manage_service_prices"


class CanViewOrManageServiceCatalog(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if is_platform_super_admin(request.user):
            return True

        if is_platform_support(request.user):
            return request.method in SAFE_METHODS or _has_perm(request.user, "services.manage_service_prices")

        if is_partner_user(request.user):
            if request.method in SAFE_METHODS:
                return True
            return is_partner_admin(request.user) or _has_perm(request.user, "services.manage_service_prices")

        return False


class CanManageServiceRelations(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if is_platform_super_admin(request.user):
            return True

        if is_platform_support(request.user):
            if request.method in SAFE_METHODS:
                return True
            if getattr(view, "action", "") == "destroy":
                return _has_perm(request.user, "services.manage_service_prices")
            return True

        if is_partner_user(request.user):
            if request.method in SAFE_METHODS:
                return True
            return is_partner_admin(request.user)

        return False


class CanManageUserRoles(HasDjangoPermission):
    permission_name = "accounts.manage_user_roles"

    def has_permission(self, request, view):
        if is_platform_super_admin(request.user):
            return True
        if is_partner_admin(request.user):
            return True
        return super().has_permission(request, view)


class CanSendManualNotifications(HasDjangoPermission):
    permission_name = "notifications.send_manual_notification"


class CanViewPaymentStatus(HasDjangoPermission):
    permission_name = "payment.view_payment_status"

    def has_permission(self, request, view):
        if is_platform_super_admin(request.user) or is_platform_support(request.user):
            return True
        if is_partner_user(request.user):
            return True
        return super().has_permission(request, view)


class CanCreatePaymentRecord(HasDjangoPermission):
    permission_name = "payment.create_payment_record"

    def has_permission(self, request, view):
        if is_platform_super_admin(request.user):
            return True
        if is_partner_admin(request.user):
            return True
        return super().has_permission(request, view)


class CanRefundPayment(HasDjangoPermission):
    permission_name = "payment.refund_payment"

    def has_permission(self, request, view):
        if is_platform_super_admin(request.user):
            return True
        return super().has_permission(request, view)


class CanViewScopedOrganizations(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if is_platform_super_admin(request.user) or is_platform_support(request.user):
            return True
        return active_memberships_for_user(request.user).exists()


class CanManageOrganizations(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if is_platform_super_admin(request.user):
            return True
        if is_partner_admin(request.user):
            return True
        return _has_perm(request.user, "organizations.manage_organizations")


class CanManagePlatformOrganizations(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if is_platform_super_admin(request.user):
            return True
        return _has_perm(request.user, "organizations.manage_organizations") and is_platform_support(request.user)


class CanManagePartnerCatalog(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if is_platform_super_admin(request.user) or is_platform_support(request.user):
            return True
        if is_partner_admin(request.user):
            return True
        return _has_perm(request.user, "organizations.manage_partner_service_config")
