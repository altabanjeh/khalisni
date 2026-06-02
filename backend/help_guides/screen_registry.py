HELP_SCREEN_REGISTRY = [
    {"screen_key": "customer_dashboard", "route_path": "/customer", "label": "Customer Dashboard"},
    {"screen_key": "customer_create_order", "route_path": "/customer/orders/new", "label": "Customer Create Order"},
    {"screen_key": "customer_orders", "route_path": "/customer/orders", "label": "Customer Orders"},
    {"screen_key": "customer_order_details", "route_path": "/customer/orders/:id", "label": "Customer Order Details"},
    {
        "screen_key": "customer_missing_documents",
        "route_path": "/customer/orders/:id/missing-docs",
        "label": "Customer Missing Documents Response",
    },
    {"screen_key": "customer_profile", "route_path": "/customer/profile", "label": "Customer Profile"},
    {"screen_key": "employee_dashboard", "route_path": "/employee", "label": "Employee Dashboard"},
    {"screen_key": "employee_review_queue", "route_path": "/employee/orders", "label": "Employee Review Queue"},
    {"screen_key": "employee_order_review", "route_path": "/employee/orders/:id", "label": "Employee Order Review"},
    {
        "screen_key": "employee_verify_documents",
        "route_path": "/employee/documents/verify",
        "label": "Employee Verify Documents",
    },
    {"screen_key": "employee_reports", "route_path": "/employee/reports", "label": "Employee Reports"},
    {
        "screen_key": "employee_missing_service_requests",
        "route_path": "/employee/missing-service-requests",
        "label": "Employee Missing Service Requests",
    },
    {
        "screen_key": "employee_service_categories",
        "route_path": "/employee/service-categories",
        "label": "Employee Service Categories",
    },
    {
        "screen_key": "employee_service_relations",
        "route_path": "/employee/service-relations",
        "label": "Employee Service Relations",
    },
    {"screen_key": "admin_dashboard", "route_path": "/admin", "label": "Admin Dashboard"},
    {"screen_key": "admin_orders", "route_path": "/admin/orders", "label": "Admin Orders Management"},
    {"screen_key": "admin_order_details", "route_path": "/admin/orders/:id", "label": "Admin Order Details"},
    {"screen_key": "admin_rules", "route_path": "/admin/rules", "label": "Admin Rule Management"},
    {"screen_key": "admin_system_settings", "route_path": "/admin/cms", "label": "Admin System Settings"},
    {
        "screen_key": "admin_service_categories",
        "route_path": "/admin/service-categories",
        "label": "Admin Service Categories",
    },
    {"screen_key": "admin_services", "route_path": "/admin/services", "label": "Admin Services"},
    {
        "screen_key": "admin_service_relations",
        "route_path": "/admin/service-relations",
        "label": "Admin Service Relations",
    },
    {"screen_key": "admin_public_site", "route_path": "/admin/public-site", "label": "Admin Public Site"},
    {
        "screen_key": "admin_homepage_content",
        "route_path": "/admin/public-site/content",
        "label": "Admin Homepage Content",
    },
    {
        "screen_key": "admin_advertisements",
        "route_path": "/admin/public-site/advertisements",
        "label": "Admin Advertisements",
    },
    {
        "screen_key": "admin_theme_settings",
        "route_path": "/admin/public-site/theme",
        "label": "Admin Theme Settings",
    },
    {
        "screen_key": "admin_missing_service_requests",
        "route_path": "/admin/missing-service-requests",
        "label": "Admin Missing Service Requests",
    },
    {"screen_key": "admin_users_roles", "route_path": "/admin/users", "label": "Admin Users And Roles"},
    {"screen_key": "admin_providers", "route_path": "/admin/providers", "label": "Admin Providers"},
    {
        "screen_key": "admin_provider_services",
        "route_path": "/admin/provider-services",
        "label": "Admin Provider Service Assignments",
    },
    {"screen_key": "admin_reports", "route_path": "/admin/reports", "label": "Admin Reports"},
    {"screen_key": "admin_notifications", "route_path": "/admin/notifications", "label": "Admin Notifications"},
    {"screen_key": "admin_payments", "route_path": "/admin/payments", "label": "Admin Payments"},
    {"screen_key": "admin_audit_log", "route_path": "/admin/audit", "label": "Admin Audit Log"},
    {"screen_key": "admin_help_guides", "route_path": "/admin/help-guides", "label": "Admin Help Guides"},
    {"screen_key": "provider_dashboard", "route_path": "/provider", "label": "Provider Dashboard"},
    {"screen_key": "provider_orders", "route_path": "/provider/orders", "label": "Provider Assigned Orders"},
    {"screen_key": "provider_order_details", "route_path": "/provider/orders/:id", "label": "Provider Order Details"},
]


HELP_SCREEN_MAP = {item["screen_key"]: item for item in HELP_SCREEN_REGISTRY}


def get_help_screen_label(screen_key: str) -> str:
    return HELP_SCREEN_MAP.get(screen_key, {}).get("label", screen_key or "General")

