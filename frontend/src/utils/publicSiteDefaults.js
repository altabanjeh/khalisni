export const fallbackPublicTheme = {
  id: 1,
  theme_id: 1,
  name: 'Default Khalisni Theme',
  primary_color: '#1252f7',
  secondary_color: '#0e47da',
  background_color: '#ffffff',
  text_color: '#17213a',
  header_background_color: '#ffffff',
  footer_background_color: '#0b1533',
  logo_url: '',
  favicon_url: '',
  active_theme: true,
}

export const fallbackPublicContent = {
  id: 1,
  content_id: 1,
  version_name: 'Default Homepage Content',
  hero_title_ar: 'خلّص معاملاتك الحكومية والإدارية بدون تعب',
  hero_title_en: 'Finish your government and admin requests without the hassle',
  hero_subtitle_ar: 'اختر الخدمة، ارفع الوثائق، تابع التنفيذ، واستلم النتيجة من مكان واحد.',
  hero_subtitle_en: 'Choose the service, upload documents, track execution, and receive the result from one place.',
  primary_button_text: 'ابدأ الآن',
  primary_button_text_en: 'Get started',
  primary_button_url: '/register',
  secondary_button_text: 'تتبع طلبك',
  secondary_button_text_en: 'Track your order',
  secondary_button_url: '/track-order',
  hero_image_url: '',
  how_it_works_text: 'اختر الخدمة، ارفع الوثائق المطلوبة، تابع حالة الطلب، ثم استلم النتيجة النهائية.',
  how_it_works_text_en: 'Choose the service, upload the required documents, track the order status, and receive the final result.',
  contact_phone: '',
  whatsapp_number: '',
  email: '',
  office_address: '',
  office_address_en: '',
  footer_text: 'Khalisni منصة أردنية لإدارة طلبات الخدمات الحكومية والإدارية.',
  footer_text_en: 'Khalisni is a Jordanian platform for managing government and administrative service requests.',
  active_content: true,
}

export const fallbackHomepagePayload = {
  content: fallbackPublicContent,
  advertisements: [],
  important_alert: null,
}

export function mergePublicTheme(theme) {
  return { ...fallbackPublicTheme, ...(theme || {}) }
}

export function mergePublicContent(content) {
  return { ...fallbackPublicContent, ...(content || {}) }
}

export function mergeHomepagePayload(payload) {
  return {
    ...fallbackHomepagePayload,
    ...(payload || {}),
    content: mergePublicContent(payload?.content),
    advertisements: Array.isArray(payload?.advertisements) ? payload.advertisements : [],
    important_alert: payload?.important_alert || null,
  }
}

export function getPublicSiteCssVariables(theme) {
  const mergedTheme = mergePublicTheme(theme)
  return {
    '--public-primary-color': mergedTheme.primary_color,
    '--public-secondary-color': mergedTheme.secondary_color,
    '--public-background-color': mergedTheme.background_color,
    '--public-text-color': mergedTheme.text_color,
    '--public-header-background-color': mergedTheme.header_background_color,
    '--public-footer-background-color': mergedTheme.footer_background_color,
    '--public-header-text-color': mergedTheme.text_color,
    '--public-footer-text-color': '#ffffff',
    '--khalsni-public-bg': mergedTheme.background_color || '#ffffff',
    '--khalsni-public-bg-secondary': '#f7faff',
    '--khalsni-public-surface': '#ffffff',
    '--khalsni-public-surface-elevated': '#ffffff',
    '--khalsni-public-primary': mergedTheme.primary_color || '#1252f7',
    '--khalsni-public-primary-hover': mergedTheme.secondary_color || '#0e47da',
    '--khalsni-public-text': mergedTheme.text_color || '#17213a',
    '--khalsni-public-text-secondary': '#667085',
    '--khalsni-public-text-muted': '#98a2b3',
    '--khalsni-public-border': '#e4eaf2',
  }
}

export function isExternalUrl(url) {
  return /^(https?:|mailto:|tel:)/i.test(String(url || ''))
}


