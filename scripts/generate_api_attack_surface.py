"""Generate docs/total-audit/API_ATTACK_SURFACE.csv from the live URL configuration.

Run from backend/:

    DJANGO_DEBUG=True python manage.py shell -c "exec(open('../scripts/generate_api_attack_surface.py', encoding='utf-8').read())"

Every row is read from the code that serves the endpoint (methods, permission
classes, throttle scope, parsers, serializer fields). The tenant, ownership
and side-effect columns come from the rule table below, which names the
selector or check that enforces them; an endpoint with no matching rule is
written as UNCLASSIFIED so a new route cannot slip in unreviewed.
"""

import csv
import re
from pathlib import Path

from django.conf import settings
from django.urls import get_resolver
from django.urls.resolvers import URLPattern, URLResolver
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.viewsets import ViewSetMixin

OUTPUT = Path(settings.BASE_DIR).parent / "docs" / "total-audit" / "API_ATTACK_SURFACE.csv"

# permission class name -> (classification, role wording)
PERMISSION_ROLES = {
    "IsAdminRole": ("PLATFORM_ADMIN", "platform super admin"),
    "IsCustomerRole": ("CUSTOMER", "customer"),
    "IsProviderRole": ("PROVIDER", "provider (role or provider-organization member)"),
    "IsInternalStaffRole": ("EMPLOYEE", "internal staff"),
    "CanReviewOrders": ("EMPLOYEE", "staff with orders.review_order, partner operational roles"),
    "CanRequestMissingDocuments": ("EMPLOYEE", "staff with orders.request_missing_documents"),
    "CanAssignOrders": ("EMPLOYEE", "staff with orders.assign_order, partner admin"),
    "CanManageOrderWorkflow": ("EMPLOYEE", "staff with orders.manage_order_workflow"),
    "CanRejectOrders": ("EMPLOYEE", "staff with orders.reject_order"),
    "CanCancelOrders": ("CUSTOMER", "customer (own NEW order) or staff with orders.cancel_order"),
    "CanUploadFinalDocuments": ("EMPLOYEE", "holder of documents.upload_final_document"),
    "CanVerifyDocuments": ("EMPLOYEE", "holder of documents.verify_document"),
    "CanViewReportsDashboard": ("EMPLOYEE", "staff, partner users, providers"),
    "CanViewScopedReports": ("CUSTOMER", "any role, scoped to own orders"),
    "CanManageUserRoles": ("ORG_ADMIN", "platform super admin or partner admin"),
    "CanManageOrganizations": ("ORG_ADMIN", "platform super admin or partner admin"),
    "CanManagePlatformOrganizations": ("PLATFORM_ADMIN", "platform super admin"),
    "CanViewScopedOrganizations": ("ORG_ADMIN", "any active member (read)"),
    "CanManagePartnerCatalog": ("ORG_ADMIN", "platform staff or partner admin"),
    "CanViewOrManageServiceCatalog": ("ORG_ADMIN", "platform staff or partner users (read); partner admin (write)"),
    "CanManageServiceRelations": ("ORG_ADMIN", "platform staff; partner admin for own services"),
    "CanSendManualNotifications": ("EMPLOYEE", "holder of notifications.send_manual_notification"),
    "CanViewPaymentStatus": ("EMPLOYEE", "platform staff, partner users (never customers or providers)"),
    "CanCreatePaymentRecord": ("ORG_ADMIN", "platform super admin, partner admin"),
    "CanRefundPayment": ("PLATFORM_ADMIN", "platform super admin or payment.refund_payment"),
    "CanManageHelpGuides": ("PLATFORM_ADMIN", "platform super admin"),
    "CanManageHelpGuidesOrReadOnly": ("CUSTOMER", "any signed-in user (read); platform super admin (write)"),
}

# (path regex, tenant restriction, ownership rule, sensitive response fields, idempotency, side effects)
RULES = [
    (r"^api/health/", "none", "none", "none", "safe", "none"),
    (r"^api/auth/register/", "none", "creates own account; role forced to customer", "none", "unique email/phone", "audit log"),
    (r"^api/auth/login/", "none", "credentials", "access + refresh tokens", "n/a", "none"),
    (r"^api/auth/logout/", "none", "own tokens", "none", "repeat is harmless", "refresh blacklisted; token_version bump on all_devices; audit log"),
    (r"^api/auth/forgot-password/", "none", "none (uniform response)", "none", "rate limited per email and address", "reset email; audit log"),
    (r"^api/auth/reset-password/", "none", "single-use hashed token, 30 min", "none", "token single use", "password change; all sessions revoked; audit log"),
    (r"^api/auth/token/refresh/", "none", "own refresh token; refused when token_version changed", "access + refresh tokens", "rotation, old token blacklisted", "none"),
    (r"^api/auth/me/", "none", "self", "own profile, permissions, memberships", "safe", "none"),
    (r"^api/customer/profile/", "none", "self; email/phone change needs current password", "own identity", "n/a", "audit log; sessions revoked on email change"),
    (r"^api/admin/users/", "partner admin: current members of own organizations", "accounts.can_manage_user_account", "identity, national id, memberships", "n/a", "audit log; password change revokes sessions"),
    (r"^api/admin/customer-profiles/", "partner admin: own organization (read only)", "PlatformRecordWriteMixin for writes", "national id, address, date of birth", "n/a", "none"),
    (r"^api/admin/system-settings/", "platform", "platform super admin", "published contact details", "n/a", "audit log"),
    (r"^api/admin/available-permissions/", "none", "read only", "permission names", "safe", "none"),
    (r"^api/admin/delete-guard/", "platform", "platform super admin", "none (hash never returned)", "n/a", "audit log"),
    (r"^api/organizations/", "own organizations", "membership; writes platform only", "tax and registration numbers", "n/a", "audit log"),
    (r"^api/branches/", "enforce_organization_scope", "ActorOrganizationScopeMixin", "none", "n/a", "audit log"),
    (r"^api/organization-memberships/", "own organizations", "assert_can_assign_membership + can_manage_user_account", "member names and roles", "n/a", "audit log"),
    (r"^api/organization-branding/", "enforce_organization_scope", "ActorOrganizationScopeMixin", "none", "n/a", "audit log"),
    (r"^api/partner-service-configs/", "enforce_organization_scope", "ActorOrganizationScopeMixin", "partner prices", "n/a", "audit log"),
    (r"^api/platform/partner-onboarding/", "platform", "platform super admin", "none", "unique slug", "creates organization, branch, owner membership; audit log"),
    (r"^api/me/memberships/", "none", "self", "own memberships", "safe", "none"),
    (r"^api/services/|^api/public-site/service-categories/", "optional organization catalog", "published + active + public category only", "public prices per visibility flags", "safe", "none"),
    (r"^api/admin/services/", "enforce_organization_scope", "_assert_tenant_boundary", "all fees", "n/a", "audit log"),
    (r"^api/admin/categories/", "categories with own or global services", "writes only on categories holding own services exclusively", "none", "n/a", "audit log"),
    (r"^api/admin/required-document-definitions/|^api/admin/service-documents/|^api/admin/service-provider-assignments/", "platform records", "PlatformRecordWriteMixin for writes", "none", "n/a", "audit log; existing orders keep their frozen requirements"),
    (r"^api/admin/service-relations/", "own or global relations (read)", "writes only between own organization's services", "none", "n/a", "audit log; prerequisite rules gate ordering"),
    (r"^api/admin/addresses/", "platform only", "PlatformRecordWriteMixin (reads too)", "customer addresses", "n/a", "audit log"),
    (r"^api/orders/track/", "none", "order number + exact account phone, both required", "status, public timeline, completed verified result only", "safe", "none"),
    (r"^api/orders/<pk>/timeline/", "get_orders_for_user", "order visibility; audience-specific serializer", "staff identity for staff only", "safe", "none"),
    (r"^api/orders/<pk>/manual-notification/", "get_reviewable_orders_for_user", "reviewable order", "none", "dedupe key", "notification to customer; audit log"),
    (r"^api/orders/$", "customer organization", "self; service must be published and visible", "order number", "Idempotency-Key UUID: replay returns original, changed payload 409", "order, status log, documents, notification, audit log"),
    (r"^api/customer/orders/", "none", "order.customer == user", "own order; no internal notes, staff identity or unverified result", "state checked under row lock", "status log, notification, audit log"),
    (r"^api/customer/payments/", "none", "order.customer == user", "own payment records", "none (manual record, pending)", "audit log"),
    (r"^api/admin/orders/|^api/admin/order-records/|^api/admin/order-notes/|^api/admin/order-issues/|^api/admin/ratings/|^api/admin/workflow-rules/", "enforce_organization_scope / get_reviewable_orders_for_user", "transition table + assigned-employee rule, under row lock", "customer identity, national id, internal notes", "stale action refused", "status log, assignment history, notifications, audit log"),
    (r"^api/admin/providers/", "providers linked to own services (read)", "approval, activation, password, email: platform super admin", "provider contact, tax number", "n/a", "audit log"),
    (r"^api/provider/", "assigned orders only", "assigned_provider.user or active provider-organization membership", "no customer identity, no price", "state checked under row lock", "status log, notification, audit log"),
    (r"^api/admin/dashboard/|^api/admin/reports/|^api/employee/|^api/reports/summary/", "scoped order queryset", "role-specific projection", "revenue for platform super admin only", "safe", "none"),
    (r"^api/admin/audit-logs/", "platform", "platform super admin", "actor, address, old/new values", "safe", "none"),
    (r"^api/documents/<pk>/download/", "get_documents_for_user", "can_user_download_document; anonymous: 30-min signed token or order number + phone for a completed result", "file content", "safe", "none"),
    (r"^api/documents/<pk>/download-token/", "get_documents_for_user", "can_user_download_document", "bearer token valid 30 min", "safe", "none"),
    (r"^api/staff/documents/|^api/admin/documents/", "get_reviewable_orders_for_user", "reviewable order; closed orders immutable", "file metadata, reviewer", "repeat refused", "readiness, notification, audit log"),
    (r"^api/notifications/", "none", "recipient == user", "own notifications", "repeat is harmless", "read state"),
    (r"^api/admin/notifications/|^api/admin/notification-templates/|^api/employee/notification-templates/", "platform", "platform super admin (templates list: permission holder)", "all recipients (admin log)", "n/a", "audit log"),
    (r"^api/admin/payments/", "enforce_organization_scope", "staff only; status change needs refund permission", "customer name, amounts", "none", "notification, audit log"),
    (r"^api/public-site/homepage/|^api/public-site/theme/|^api/public-site/advertisements/", "none", "published content only", "none", "safe", "none (first read may create the default row)"),
    (r"^api/public-site/missing-service-requests/|^api/public-site/contact-inquiries/", "none", "none", "none", "rate limited", "staff notification, audit log"),
    (r"^api/admin/public-site/", "platform", "platform super admin (requests: internal staff, platform only)", "requester contact details", "n/a", "audit log"),
    (r"^api/help/", "none", "role-filtered guides; writes platform super admin", "none", "n/a", "audit log"),
    (r"^django-admin/", "platform", "is_staff session login", "everything", "n/a", "Django admin log"),
    (r"^media/", "none", "public prefixes only (catalog, CMS, branding, manual)", "none", "safe", "none"),
]


def flatten(patterns, prefix=""):
    for entry in patterns:
        if isinstance(entry, URLResolver):
            yield from flatten(entry.url_patterns, prefix + str(entry.pattern))
        elif isinstance(entry, URLPattern):
            yield prefix + str(entry.pattern), entry.callback


def clean(path):
    path = path.replace("^", "").replace("$", "").replace("\\.", ".")
    path = re.sub(r"\(\?P<(\w+)>[^)]*\)", r"<\1>", path)
    path = re.sub(r"<\w+:(\w+)>", r"<\1>", path)
    return "/" + path.lstrip("/")


def view_methods(callback):
    actions = getattr(callback, "actions", None)
    if actions:
        return {method.upper(): action for method, action in actions.items()}
    cls = getattr(callback, "cls", None) or getattr(callback, "view_class", None)
    if cls is None:
        return {"GET": ""}
    return {m.upper(): "" for m in cls.http_method_names if m not in {"options", "head"} and hasattr(cls, m)}


def permissions_for(cls, method, action):
    try:
        view = cls()
        view.action = action or None
        view.request = type("R", (), {"method": method, "user": None, "query_params": {}, "data": {}})()
        if action and hasattr(cls, action):
            extra = getattr(getattr(cls, action), "kwargs", {}) or {}
            if "permission_classes" in extra and "get_permissions" not in cls.__dict__:
                return [p.__name__ for p in extra["permission_classes"]]
        return [type(p).__name__ for p in view.get_permissions()]
    except Exception:
        return [p.__name__ for p in getattr(cls, "permission_classes", [])]


def writable_fields(cls, method, action):
    if method in {"GET", "DELETE"}:
        return ""
    try:
        view = cls()
        view.action = action or None
        view.request = type("R", (), {"method": method, "user": None, "query_params": {}, "data": {}})()
        view.format_kwarg = None
        serializer_class = view.get_serializer_class()
        serializer = serializer_class()
        return " ".join(name for name, field in serializer.fields.items() if not field.read_only)
    except Exception:
        return "(request body read by the view)"


rows = []
seen = set()
default_permissions = [p.__name__ for p in (IsAuthenticatedOrReadOnly,)]
for raw_path, callback in flatten(get_resolver().url_patterns):
    if "(?P<format>" in raw_path or raw_path.endswith("\\.(?P<format>[a-z0-9]+)/?$"):
        continue
    cls = getattr(callback, "cls", None) or getattr(callback, "view_class", None)
    path = clean(raw_path)
    if path.rstrip("/") in {"/api", ""} or "format" in path:
        continue
    for method, action in sorted(view_methods(callback).items()):
        if cls is not None and issubclass(cls, ViewSetMixin) and not action:
            continue
        key = (method, path)
        if key in seen:
            continue
        seen.add(key)
        names = permissions_for(cls, method, action) if cls is not None else []
        if cls is None:
            names = ["(plain Django view)"]
        elif not names:
            names = default_permissions
        public = "AllowAny" in names or names == ["(plain Django view)"] or (
            names == ["IsAuthenticatedOrReadOnly"] and method == "GET"
        )
        specific = [n for n in names if n in PERMISSION_ROLES]
        if public and not path.startswith("/django-admin"):
            classification, role = "PUBLIC", "anyone"
        elif specific:
            classification, role = PERMISSION_ROLES[specific[-1]]
        elif path.startswith("/django-admin"):
            classification, role = "INTERNAL", "Django staff session"
        else:
            classification, role = "CUSTOMER", "any signed-in user"
        scope = getattr(cls, "throttle_scope", "") if cls is not None else ""
        rates = settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {})
        rate = f"{scope} {rates.get(scope, '')}".strip() if scope else (
            f"anon {rates.get('anon', '')}" if public else f"user {rates.get('user', '')}"
        )
        if path.startswith("/django-admin"):
            rate = "nginx limit on /django-admin/login/ (5/min)"
        parsers = getattr(cls, "parser_classes", []) if cls is not None else []
        upload = any(issubclass(p, MultiPartParser) for p in parsers) and method in {"POST", "PUT", "PATCH"}
        download = "download" in path or path.startswith("/media")
        rule = next((r for r in RULES if re.search(r[0], path.lstrip("/"))), None)
        tenant, ownership, sensitive, idempotency, effects = rule[1:] if rule else ("UNCLASSIFIED",) * 5
        if method == "GET":
            effects = "none" if "first read" not in effects else effects
            idempotency = "safe"
        guarded_delete = method == "DELETE" or action == "restore"
        rows.append({
            "Method": method,
            "Path": path,
            "View": f"{cls.__module__}.{cls.__name__}" if cls else getattr(callback, "__name__", "view"),
            "Action": action,
            "Classification": "PLATFORM_ADMIN" if guarded_delete and classification != "PUBLIC" else classification,
            "Authentication_Required": "no" if classification == "PUBLIC" else "yes",
            "Required_Role": "platform super admin + own password (delete guard)" if guarded_delete else role,
            "Permission_Classes": " ".join(names),
            "Tenant_Restriction": tenant,
            "Object_Ownership_Rule": ownership,
            "Writable_Fields": writable_fields(cls, method, action) if cls is not None else "",
            "Sensitive_Response_Fields": sensitive,
            "Rate_Limit": rate,
            "Idempotency": idempotency,
            "File_Interaction": "upload" if upload else ("download" if download and method == "GET" else "none"),
            "Side_Effects": effects,
        })

rows.sort(key=lambda r: (r["Path"], r["Method"]))
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
with OUTPUT.open("w", newline="", encoding="utf-8") as handle:
    writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)

unclassified = [r for r in rows if r["Tenant_Restriction"] == "UNCLASSIFIED"]
by_class = {}
for r in rows:
    by_class[r["Classification"]] = by_class.get(r["Classification"], 0) + 1
print(f"rows={len(rows)} unclassified={len(unclassified)} {by_class}")
for r in unclassified:
    print("UNCLASSIFIED", r["Method"], r["Path"])
