const SCREENSHOT_MAP = {
  admin_orders: [
    { file: 'Screenshot (156).png', step: 'overview', caption: { ar: 'قائمة الطلبات الحالية مع البحث والحالات', en: 'Current orders list with search and status badges' } },
  ],
  admin_rules: [
    { file: 'Screenshot (157).png', step: 'tabs', caption: { ar: 'شاشة قواعد التشغيل وتبويبات الإدارة الآمنة', en: 'Rule management tabs for safe admin controls' } },
    { file: 'Screenshot (158).png', step: 'services-list', caption: { ar: 'قائمة الخدمات داخل شاشة القواعد', en: 'Service list inside the rules screen' } },
    { file: 'Screenshot (159).png', step: 'new-service-basic', caption: { ar: 'نافذة خدمة جديدة: البيانات الأساسية', en: 'New service modal: basic details' } },
    { file: 'Screenshot (160).png', step: 'new-service-pricing', caption: { ar: 'نافذة خدمة جديدة: التسعير والوصف', en: 'New service modal: pricing and description' } },
    { file: 'Screenshot (161).png', step: 'new-service-flags', caption: { ar: 'نافذة خدمة جديدة: الخيارات التشغيلية', en: 'New service modal: operational flags' } },
    { file: 'Screenshot (162).png', step: 'document-rule-basic', caption: { ar: 'نافذة وثيقة مطلوبة: الحقول الأساسية', en: 'Document rule modal: basic fields' } },
    { file: 'Screenshot (163).png', step: 'document-rule-limits', caption: { ar: 'نافذة وثيقة مطلوبة: الامتدادات والحجم', en: 'Document rule modal: extensions and size limits' } },
    { file: 'Screenshot (164).png', step: 'document-rule-options', caption: { ar: 'نافذة وثيقة مطلوبة: خيارات الإلزام والتحقق', en: 'Document rule modal: requirement and verification options' } },
    { file: 'Screenshot (165).png', step: 'assignment-rule', caption: { ar: 'نافذة ربط مزود بخدمة', en: 'Provider assignment rule modal' } },
    { file: 'Screenshot (166).png', step: 'notifications-empty', caption: { ar: 'تبويب قوالب الإشعارات قبل إضافة القوالب', en: 'Notification templates tab before templates are added' } },
    { file: 'Screenshot (167).png', step: 'notification-template-basic', caption: { ar: 'قالب إشعار جديد: البيانات الأساسية', en: 'New notification template: basic fields' } },
    { file: 'Screenshot (168).png', step: 'notification-template-body', caption: { ar: 'قالب إشعار جديد: نصوص الرسالة', en: 'New notification template: message text fields' } },
    { file: 'Screenshot (169).png', step: 'notification-template-state', caption: { ar: 'قالب إشعار جديد: التفعيل والنوع', en: 'New notification template: type and active state' } },
    { file: 'Screenshot (170).png', step: 'payments-empty', caption: { ar: 'تبويب المدفوعات عند عدم وجود بيانات', en: 'Payments tab when no records exist' } },
    { file: 'Screenshot (171).png', step: 'templates-list', caption: { ar: 'قائمة قوالب الإشعارات بعد الإضافة', en: 'Notification template list after records are added' } },
    { file: 'Screenshot (172).png', step: 'user-basic', caption: { ar: 'مستخدم جديد: بيانات الحساب الأساسية', en: 'New user modal: core account details' } },
    { file: 'Screenshot (173).png', step: 'user-status', caption: { ar: 'مستخدم جديد: الدور والحالة', en: 'New user modal: role and status options' } },
    { file: 'Screenshot (174).png', step: 'audit-filters', caption: { ar: 'تبويب السجل مع مرشحات التدقيق', en: 'Audit tab with log filters' } },
    { file: 'Screenshot (175).png', step: 'audit-list', caption: { ar: 'قائمة سجلات التدقيق', en: 'Audit log list' } },
    { file: 'Screenshot (176).png', step: 'setting-basic', caption: { ar: 'إعداد نظام جديد: الحقول الأساسية', en: 'New system setting: basic fields' } },
    { file: 'Screenshot (177).png', step: 'setting-description', caption: { ar: 'إعداد نظام جديد: وصف وتلميحات', en: 'New system setting: description and guidance fields' } },
    { file: 'Screenshot (178).png', step: 'setting-arabic', caption: { ar: 'إعداد نظام جديد بالعربية', en: 'System setting form in Arabic' } },
    { file: 'Screenshot (179).png', step: 'setting-arabic-details', caption: { ar: 'إعداد نظام جديد: مثال عربي موسع', en: 'System setting form: expanded Arabic example' } },
  ],
  admin_service_categories: [
    { file: 'Screenshot (180).png', step: 'overview', caption: { ar: 'إدارة تصنيفات الخدمات مع المرشحات والجدول', en: 'Service category management with filters and grid' } },
    { file: 'Screenshot (181).png', step: 'new-category-en', caption: { ar: 'فئة جديدة: النسخة الإنجليزية من الحقول', en: 'New category modal: English field set' } },
    { file: 'Screenshot (182).png', step: 'new-category-en-options', caption: { ar: 'فئة جديدة: خيارات العرض والتفعيل', en: 'New category modal: display and activation options' } },
  ],
  admin_services: [
    { file: 'Screenshot (183).png', step: 'overview', caption: { ar: 'إدارة الخدمات مع الفئات والوثائق', en: 'Services management with categories and document rules' } },
    { file: 'Screenshot (184).png', step: 'new-category-ar', caption: { ar: 'فئة خدمة جديدة بالعربية', en: 'New service category form in Arabic' } },
    { file: 'Screenshot (185).png', step: 'new-category-ar-options', caption: { ar: 'فئة خدمة جديدة: خيارات عربية إضافية', en: 'New service category form: additional Arabic options' } },
  ],
  admin_service_relations: [
    { file: 'Screenshot (186).png', step: 'overview', caption: { ar: 'إدارة علاقات الخدمات وأنواع الربط', en: 'Service relations overview and relation types' } },
    { file: 'Screenshot (187).png', step: 'new-relation-basic', caption: { ar: 'علاقة خدمة جديدة: اختيار المصدر والهدف', en: 'New relation modal: source and target selection' } },
    { file: 'Screenshot (188).png', step: 'new-relation-options', caption: { ar: 'علاقة خدمة جديدة: الإلزام والرسالة', en: 'New relation modal: requirement and customer message' } },
  ],
  admin_public_site: [
    { file: 'Screenshot (189).png', step: 'overview', caption: { ar: 'بوابة إدارة الموقع العام', en: 'Public site management landing page' } },
  ],
  admin_homepage_content: [
    { file: 'Screenshot (190).png', step: 'hero-overview', caption: { ar: 'محرر محتوى الصفحة الرئيسية', en: 'Homepage content editor overview' } },
    { file: 'Screenshot (191).png', step: 'footer-fields', caption: { ar: 'حقول المحتوى والتذييل الثنائية اللغة', en: 'Bilingual content and footer fields' } },
    { file: 'Screenshot (192).png', step: 'footer-ar-en', caption: { ar: 'تفاصيل حقول التذييل والعنوان', en: 'Footer and title field details' } },
    { file: 'Screenshot (193).png', step: 'cta-preview', caption: { ar: 'الأزرار والنصوص مع التفعيل والمعاينة', en: 'CTA content, active state, and preview actions' } },
  ],
  admin_advertisements: [
    { file: 'Screenshot (194).png', step: 'overview', caption: { ar: 'إدارة الإعلانات والجدول الرئيسي', en: 'Advertisement manager and main list' } },
    { file: 'Screenshot (195).png', step: 'ad-basic-ar', caption: { ar: 'إعلان جديد: العنوان والوصف بالعربية', en: 'New advertisement: Arabic title and description' } },
    { file: 'Screenshot (196).png', step: 'ad-basic-en', caption: { ar: 'إعلان جديد: الحقول الإنجليزية', en: 'New advertisement: English fields' } },
    { file: 'Screenshot (197).png', step: 'ad-buttons', caption: { ar: 'إعلان جديد: أزرار وروابط العرض', en: 'New advertisement: button texts and URL' } },
    { file: 'Screenshot (198).png', step: 'ad-colors', caption: { ar: 'إعلان جديد: الألوان والمرئيات', en: 'New advertisement: colors and visuals' } },
    { file: 'Screenshot (199).png', step: 'ad-schedule', caption: { ar: 'إعلان جديد: الجدولة والتفعيل', en: 'New advertisement: schedule and active state' } },
  ],
  admin_theme_settings: [
    { file: 'Screenshot (200).png', step: 'overview', caption: { ar: 'إعدادات المظهر العام مع متغيرات الألوان', en: 'Theme settings with color variables' } },
    { file: 'Screenshot (201).png', step: 'preview', caption: { ar: 'معاينة النمط مع الشعار والتذييل', en: 'Theme preview with branding and footer' } },
  ],
  admin_missing_service_requests: [
    { file: 'Screenshot (202).png', step: 'overview-empty', caption: { ar: 'طلبات الخدمات غير الموجودة بدون عناصر', en: 'Missing service requests page with no records' } },
    { file: 'Screenshot (203).png', step: 'overview-sidebar', caption: { ar: 'طلبات الخدمات غير الموجودة مع القائمة الكاملة', en: 'Missing service requests page with expanded sidebar' } },
  ],
  admin_users_roles: [
    { file: 'Screenshot (204).png', step: 'overview', caption: { ar: 'إدارة المستخدمين والأدوار', en: 'Users and roles management overview' } },
    { file: 'Screenshot (205).png', step: 'new-user', caption: { ar: 'نافذة مستخدم جديد من شاشة الإدارة المتخصصة', en: 'New user modal from the dedicated users page' } },
  ],
  admin_providers: [
    { file: 'Screenshot (206).png', step: 'overview', caption: { ar: 'إدارة المزوّدين مع حالات الاعتماد', en: 'Providers management with approval states' } },
    { file: 'Screenshot (207).png', step: 'new-provider-basic', caption: { ar: 'مزود جديد: البيانات الأساسية', en: 'New provider modal: core data' } },
    { file: 'Screenshot (208).png', step: 'new-provider-details', caption: { ar: 'مزود جديد: تفاصيل إضافية وخيارات التفعيل', en: 'New provider modal: extra details and activation settings' } },
  ],
  admin_provider_services: [
    { file: 'Screenshot (209).png', step: 'new-link', caption: { ar: 'ربط جديد بين المزوّد والخدمة', en: 'New provider-service link modal' } },
  ],
  admin_help_guides: [
    { file: 'Screenshot (210).png', step: 'new-screenshot', caption: { ar: 'إضافة صورة جديدة إلى دليل المستخدم', en: 'Add a new screenshot to the manual' } },
  ],
}

function toPublicPath(fileName) {
  return `/manual/screenshots/${fileName}`
}

export function getManualScreenshots(screenKey, language = 'ar') {
  return (SCREENSHOT_MAP[screenKey] || []).map((item, index) => ({
    id: `${screenKey}-${index + 1}`,
    caption: item.caption?.[language] || item.caption?.ar || item.caption?.en || item.file,
    alt_text: item.caption?.[language] || item.caption?.ar || item.caption?.en || item.file,
    step_reference: item.step,
    display_order: index + 1,
    image_url: toPublicPath(item.file),
    is_active: true,
  }))
}
