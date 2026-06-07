import { getCurrentLanguage, translateMessage } from '../utils/i18n'

const HELP_SCREEN_REGISTRY = [
  { screen_key: 'manual_navigation', labelKey: 'screen.manualNavigation', fallbackLabel: 'كيفية التنقل داخل النظام', pattern: /^\/help\/manual\/navigation\/?$/ },
  { screen_key: 'manual_account_access', labelKey: 'screen.manualAccountAccess', fallbackLabel: 'تسجيل الدخول والوصول للحساب', pattern: /^\/login\/?$/ },
  { screen_key: 'manual_add_screenshots', labelKey: 'screen.manualAddScreenshots', fallbackLabel: 'كيفية إضافة الصور إلى الدليل', pattern: /^\/help\/manual\/screenshots\/?$/ },
  { screen_key: 'customer_missing_documents', labels: { ar: 'استكمال المستندات الناقصة', en: 'Missing Documents Response' }, pattern: /^\/customer\/orders\/[^/]+\/missing-docs\/?$/ },
  { screen_key: 'customer_order_details', labels: { ar: 'تفاصيل الطلب للعميل', en: 'Customer Order Details' }, pattern: /^\/customer\/orders\/[^/]+\/?$/ },
  { screen_key: 'customer_create_order', labels: { ar: 'إنشاء طلب جديد', en: 'Create New Order' }, pattern: /^\/customer\/orders\/new\/?$/ },
  { screen_key: 'customer_orders', labels: { ar: 'طلباتي', en: 'My Orders' }, pattern: /^\/customer\/orders\/?$/ },
  { screen_key: 'customer_profile', labels: { ar: 'الملف الشخصي', en: 'Profile' }, pattern: /^\/customer\/profile\/?$/ },
  { screen_key: 'customer_dashboard', labels: { ar: 'لوحة العميل', en: 'Customer Dashboard' }, pattern: /^\/customer\/?$/ },
  { screen_key: 'employee_order_review', labels: { ar: 'مراجعة الطلب', en: 'Order Review' }, pattern: /^\/employee\/orders\/[^/]+\/?$/ },
  { screen_key: 'employee_verify_documents', labels: { ar: 'التحقق من الوثائق', en: 'Document Verification' }, pattern: /^\/employee\/documents\/verify\/?$/ },
  { screen_key: 'employee_service_categories', labels: { ar: 'تصنيفات الخدمات', en: 'Service Categories' }, pattern: /^\/employee\/service-categories\/?$/ },
  { screen_key: 'employee_service_relations', labels: { ar: 'علاقات الخدمات', en: 'Service Relations' }, pattern: /^\/employee\/service-relations\/?$/ },
  { screen_key: 'employee_missing_service_requests', labels: { ar: 'طلبات الخدمات الجديدة', en: 'Missing Service Requests' }, pattern: /^\/employee\/missing-service-requests\/?$/ },
  { screen_key: 'employee_review_queue', labels: { ar: 'قائمة المراجعة', en: 'Review Queue' }, pattern: /^\/employee\/orders\/?$/ },
  { screen_key: 'employee_reports', labels: { ar: 'تقارير الموظف', en: 'Employee Reports' }, pattern: /^\/employee\/reports\/?$/ },
  { screen_key: 'employee_dashboard', labels: { ar: 'لوحة الموظف', en: 'Employee Dashboard' }, pattern: /^\/employee\/?$/ },
  { screen_key: 'admin_order_details', labels: { ar: 'تفاصيل الطلب للإدارة', en: 'Admin Order Details' }, pattern: /^\/admin\/orders\/[^/]+\/?$/ },
  { screen_key: 'admin_orders', labels: { ar: 'إدارة الطلبات', en: 'Orders Management' }, pattern: /^\/admin\/orders\/?$/ },
  { screen_key: 'admin_rules', labels: { ar: 'قواعد التشغيل', en: 'Rule Management' }, pattern: /^\/admin\/rules\/?$/ },
  { screen_key: 'admin_system_settings', labels: { ar: 'إعدادات النظام', en: 'System Settings' }, pattern: /^\/admin\/cms\/?$/ },
  { screen_key: 'admin_service_categories', labels: { ar: 'تصنيفات الخدمات', en: 'Service Category Management' }, pattern: /^\/admin\/service-categories\/?$/ },
  { screen_key: 'admin_service_relations', labels: { ar: 'علاقات الخدمات', en: 'Service Relations Management' }, pattern: /^\/admin\/service-relations\/?$/ },
  { screen_key: 'admin_services', labels: { ar: 'الخدمات', en: 'Services Management' }, pattern: /^\/admin\/services\/?$/ },
  { screen_key: 'admin_homepage_content', labels: { ar: 'محتوى الصفحة الرئيسية', en: 'Homepage Content Editor' }, pattern: /^\/admin\/public-site\/content\/?$/ },
  { screen_key: 'admin_advertisements', labels: { ar: 'الإعلانات', en: 'Advertisement Manager' }, pattern: /^\/admin\/public-site\/advertisements\/?$/ },
  { screen_key: 'admin_theme_settings', labels: { ar: 'المظهر العام', en: 'Theme Settings' }, pattern: /^\/admin\/public-site\/theme\/?$/ },
  { screen_key: 'admin_public_site', labels: { ar: 'الموقع العام', en: 'Public Site Management' }, pattern: /^\/admin\/public-site\/?$/ },
  { screen_key: 'admin_missing_service_requests', labels: { ar: 'طلبات الخدمات الجديدة', en: 'Missing Service Requests' }, pattern: /^\/admin\/missing-service-requests\/?$/ },
  { screen_key: 'admin_help_guides', labels: { ar: 'دليل المستخدم داخل النظام', en: 'Help Guide Management' }, pattern: /^\/admin\/help-guides\/?$/ },
  { screen_key: 'admin_users_roles', labels: { ar: 'المستخدمون والأدوار', en: 'Users and Roles' }, pattern: /^\/admin\/users\/?$/ },
  { screen_key: 'admin_provider_services', labels: { ar: 'خدمات المزودين', en: 'Provider Services' }, pattern: /^\/admin\/provider-services\/?$/ },
  { screen_key: 'admin_providers', labels: { ar: 'المزودون', en: 'Providers' }, pattern: /^\/admin\/providers\/?$/ },
  { screen_key: 'admin_notifications', labels: { ar: 'الإشعارات', en: 'Notifications' }, pattern: /^\/admin\/notifications\/?$/ },
  { screen_key: 'admin_payments', labels: { ar: 'المدفوعات', en: 'Payments' }, pattern: /^\/admin\/payments\/?$/ },
  { screen_key: 'admin_reports', labels: { ar: 'التقارير', en: 'Reports' }, pattern: /^\/admin\/reports\/?$/ },
  { screen_key: 'admin_audit_log', labels: { ar: 'سجل التدقيق', en: 'Audit Log' }, pattern: /^\/admin\/audit\/?$/ },
  { screen_key: 'admin_dashboard', labels: { ar: 'لوحة الإدارة', en: 'Admin Dashboard' }, pattern: /^\/admin\/?$/ },
  { screen_key: 'provider_order_details', labels: { ar: 'تفاصيل الطلب للمزود', en: 'Provider Order Details' }, pattern: /^\/provider\/orders\/[^/]+\/?$/ },
  { screen_key: 'provider_orders', labels: { ar: 'الطلبات المعينة', en: 'Assigned Orders' }, pattern: /^\/provider\/orders\/?$/ },
  { screen_key: 'provider_dashboard', labels: { ar: 'لوحة المزود', en: 'Provider Dashboard' }, pattern: /^\/provider\/?$/ },
]

function getLabel(item) {
  if (item.labelKey) {
    return translateMessage(getCurrentLanguage(), item.labelKey, item.fallbackLabel)
  }

  const language = getCurrentLanguage()
  return item.labels?.[language] || item.labels?.ar || item.fallbackLabel || item.screen_key
}

function buildScreenMap() {
  return Object.fromEntries(HELP_SCREEN_REGISTRY.map((item) => [item.screen_key, getLabel(item)]))
}

export function matchHelpScreen(pathname) {
  const match = HELP_SCREEN_REGISTRY.find((item) => item.pattern.test(pathname)) || null
  return match ? { ...match, label: getLabel(match) } : null
}

export function getHelpScreenLabel(screenKey) {
  return buildScreenMap()[screenKey] || screenKey || translateMessage(getCurrentLanguage(), 'manual.general', 'دليل عام')
}

export { HELP_SCREEN_REGISTRY }
