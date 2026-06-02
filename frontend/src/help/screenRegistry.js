const HELP_SCREEN_REGISTRY = [
  { screen_key: 'customer_missing_documents', label: 'استكمال المستندات الناقصة', pattern: /^\/customer\/orders\/[^/]+\/missing-docs\/?$/ },
  { screen_key: 'customer_order_details', label: 'تفاصيل الطلب للعميل', pattern: /^\/customer\/orders\/[^/]+\/?$/ },
  { screen_key: 'customer_create_order', label: 'إنشاء طلب جديد', pattern: /^\/customer\/orders\/new\/?$/ },
  { screen_key: 'customer_orders', label: 'طلباتي', pattern: /^\/customer\/orders\/?$/ },
  { screen_key: 'customer_profile', label: 'الملف الشخصي', pattern: /^\/customer\/profile\/?$/ },
  { screen_key: 'customer_dashboard', label: 'لوحة العميل', pattern: /^\/customer\/?$/ },
  { screen_key: 'employee_order_review', label: 'مراجعة الطلب', pattern: /^\/employee\/orders\/[^/]+\/?$/ },
  { screen_key: 'employee_verify_documents', label: 'التحقق من الوثائق', pattern: /^\/employee\/documents\/verify\/?$/ },
  { screen_key: 'employee_service_categories', label: 'تصنيفات الخدمات', pattern: /^\/employee\/service-categories\/?$/ },
  { screen_key: 'employee_service_relations', label: 'علاقات الخدمات', pattern: /^\/employee\/service-relations\/?$/ },
  { screen_key: 'employee_missing_service_requests', label: 'طلبات الخدمات الجديدة', pattern: /^\/employee\/missing-service-requests\/?$/ },
  { screen_key: 'employee_review_queue', label: 'قائمة المراجعة', pattern: /^\/employee\/orders\/?$/ },
  { screen_key: 'employee_reports', label: 'تقارير الموظف', pattern: /^\/employee\/reports\/?$/ },
  { screen_key: 'employee_dashboard', label: 'لوحة الموظف', pattern: /^\/employee\/?$/ },
  { screen_key: 'admin_order_details', label: 'تفاصيل الطلب للإدارة', pattern: /^\/admin\/orders\/[^/]+\/?$/ },
  { screen_key: 'admin_orders', label: 'إدارة الطلبات', pattern: /^\/admin\/orders\/?$/ },
  { screen_key: 'admin_rules', label: 'قواعد التشغيل', pattern: /^\/admin\/rules\/?$/ },
  { screen_key: 'admin_system_settings', label: 'إعدادات النظام', pattern: /^\/admin\/cms\/?$/ },
  { screen_key: 'admin_service_categories', label: 'تصنيفات الخدمات', pattern: /^\/admin\/service-categories\/?$/ },
  { screen_key: 'admin_service_relations', label: 'علاقات الخدمات', pattern: /^\/admin\/service-relations\/?$/ },
  { screen_key: 'admin_services', label: 'الخدمات', pattern: /^\/admin\/services\/?$/ },
  { screen_key: 'admin_homepage_content', label: 'محتوى الصفحة الرئيسية', pattern: /^\/admin\/public-site\/content\/?$/ },
  { screen_key: 'admin_advertisements', label: 'الإعلانات', pattern: /^\/admin\/public-site\/advertisements\/?$/ },
  { screen_key: 'admin_theme_settings', label: 'المظهر العام', pattern: /^\/admin\/public-site\/theme\/?$/ },
  { screen_key: 'admin_public_site', label: 'الموقع العام', pattern: /^\/admin\/public-site\/?$/ },
  { screen_key: 'admin_missing_service_requests', label: 'طلبات الخدمات الجديدة', pattern: /^\/admin\/missing-service-requests\/?$/ },
  { screen_key: 'admin_help_guides', label: 'دليل المستخدم داخل النظام', pattern: /^\/admin\/help-guides\/?$/ },
  { screen_key: 'admin_users_roles', label: 'المستخدمون والأدوار', pattern: /^\/admin\/users\/?$/ },
  { screen_key: 'admin_provider_services', label: 'خدمات المزودين', pattern: /^\/admin\/provider-services\/?$/ },
  { screen_key: 'admin_providers', label: 'المزودون', pattern: /^\/admin\/providers\/?$/ },
  { screen_key: 'admin_notifications', label: 'الإشعارات', pattern: /^\/admin\/notifications\/?$/ },
  { screen_key: 'admin_payments', label: 'المدفوعات', pattern: /^\/admin\/payments\/?$/ },
  { screen_key: 'admin_reports', label: 'التقارير', pattern: /^\/admin\/reports\/?$/ },
  { screen_key: 'admin_audit_log', label: 'سجل التدقيق', pattern: /^\/admin\/audit\/?$/ },
  { screen_key: 'admin_dashboard', label: 'لوحة الإدارة', pattern: /^\/admin\/?$/ },
  { screen_key: 'provider_order_details', label: 'تفاصيل الطلب للمزود', pattern: /^\/provider\/orders\/[^/]+\/?$/ },
  { screen_key: 'provider_orders', label: 'الطلبات المعيّنة', pattern: /^\/provider\/orders\/?$/ },
  { screen_key: 'provider_dashboard', label: 'لوحة المزود', pattern: /^\/provider\/?$/ },
]

const HELP_SCREEN_LABELS = Object.fromEntries(
  HELP_SCREEN_REGISTRY.map((item) => [item.screen_key, item.label]),
)

export function matchHelpScreen(pathname) {
  return HELP_SCREEN_REGISTRY.find((item) => item.pattern.test(pathname)) || null
}

export function getHelpScreenLabel(screenKey) {
  return HELP_SCREEN_LABELS[screenKey] || screenKey || 'دليل عام'
}

export { HELP_SCREEN_LABELS, HELP_SCREEN_REGISTRY }

