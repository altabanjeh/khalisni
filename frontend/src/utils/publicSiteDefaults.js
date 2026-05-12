export const fallbackPublicTheme = {
  id: 1,
  theme_id: 1,
  name: 'Default Khalisni Theme',
  primary_color: '#0b67b2',
  secondary_color: '#147fd1',
  background_color: '#f4faff',
  text_color: '#0f3554',
  header_background_color: '#ffffff',
  footer_background_color: '#0f3554',
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
  primary_button_url: '/create-order',
  secondary_button_text: 'تتبع طلبك',
  secondary_button_url: '/track-order',
  hero_image_url: '',
  how_it_works_text: 'اختر الخدمة، ارفع الوثائق المطلوبة، تابع حالة الطلب، ثم استلم النتيجة النهائية.',
  contact_phone: '+962790000000',
  whatsapp_number: '+962790000000',
  email: 'info@khalisni.local',
  office_address: 'Amman, Jordan',
  footer_text: 'Khalisni منصة أردنية لإدارة طلبات الخدمات الحكومية والإدارية.',
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
  }
}

export function isExternalUrl(url) {
  return /^(https?:|mailto:|tel:)/i.test(String(url || ''))
}


