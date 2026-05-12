from rest_framework.permissions import SAFE_METHODS, BasePermission


def _normalized_role(user):
    return (getattr(user, "role", "") or "").lower()


def _has_perm(user, perm_name):
    return bool(user and user.is_authenticated and user.has_perm(perm_name))


def is_admin(user):
    return _normalized_role(user) == "admin"


def is_employee(user):
    return _normalized_role(user) in {"employee", "support"}


def is_provider(user):
    return _normalized_role(user) == "provider"


def is_client(user):
    return _normalized_role(user) == "customer"


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


class IsSupportRole(HasRole):
    allowed_roles = {"support"}


class IsProviderRole(HasRole):
    allowed_roles = {"provider"}


class IsCustomerRole(HasRole):
    allowed_roles = {"customer"}


class IsAdminOrSupportReadOnly(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = _normalized_role(request.user)
        if role == "admin":
            return True
        return role == "support" and request.method in SAFE_METHODS


class IsAdminOrSupport(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and _normalized_role(request.user) in {"admin", "support"}
        )


class HasDjangoPermission(BasePermission):
    permission_name = ""

    def has_permission(self, request, view):
        return _has_perm(request.user, self.permission_name)


class CanReviewOrders(HasDjangoPermission):
    permission_name = "orders.review_order"


class CanRequestMissingDocuments(HasDjangoPermission):
    permission_name = "orders.request_missing_documents"


class CanCancelOrders(HasDjangoPermission):
    permission_name = "orders.cancel_order"


class CanAssignOrders(HasDjangoPermission):
    permission_name = "orders.assign_order"


class CanProcessOrders(HasDjangoPermission):
    permission_name = "orders.process_order"


class CanCompleteOrders(HasDjangoPermission):
    permission_name = "orders.complete_order"


class CanRejectOrders(HasDjangoPermission):
    permission_name = "orders.reject_order"


class CanManageOrderWorkflow(HasDjangoPermission):
    permission_name = "orders.manage_order_workflow"


class CanVerifyDocuments(HasDjangoPermission):
    permission_name = "documents.verify_document"


class CanUploadFinalDocuments(HasDjangoPermission):
    permission_name = "documents.upload_final_document"


class CanViewReportsDashboard(HasDjangoPermission):
    permission_name = "orders.view_reports_dashboard"


class CanViewScopedReports(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        role = _normalized_role(request.user)
        if role in {"customer", "provider"}:
            return True
        return _has_perm(request.user, "orders.view_reports_dashboard")


class CanExportReports(HasDjangoPermission):
    permission_name = "orders.export_order_reports"


class CanManageServicePrices(HasDjangoPermission):
    permission_name = "services.manage_service_prices"


class CanManageUserRoles(HasDjangoPermission):
    permission_name = "accounts.manage_user_roles"


class CanSendManualNotifications(HasDjangoPermission):
    permission_name = "notifications.send_manual_notification"


class CanViewPaymentStatus(HasDjangoPermission):
    permission_name = "payment.view_payment_status"


class CanCreatePaymentRecord(HasDjangoPermission):
    permission_name = "payment.create_payment_record"


class CanRefundPayment(HasDjangoPermission):
    permission_name = "payment.refund_payment"
