import { formatCurrency } from './format'
import { getLocalizedField, normalizeLanguage } from './i18n'

function hasArabicScript(value) {
  return /[\u0600-\u06FF]/.test(String(value || ''))
}

function getPresentationField(record, fields, language, fallback) {
  const normalizedLanguage = normalizeLanguage(language)

  if (normalizedLanguage === 'en') {
    const value = record?.[fields.en]
    if (typeof value === 'string') {
      return value.trim() && !hasArabicScript(value) ? value : fallback
    }
    if (value != null && value !== '') return value
    return fallback
  }

  const value = record?.[fields.ar]
  if (typeof value === 'string' && value.trim() && hasArabicScript(value)) return value
  return fallback
}

export function getCatalogText(record, fields, language, fallback = '') {
  return getPresentationField(record, fields, language, fallback)
}

export function getServiceName(service, language, fallback = '') {
  return getPresentationField(service, { ar: 'name_ar', en: 'name_en' }, language, fallback || (normalizeLanguage(language) === 'en' ? 'Service' : 'خدمة'))
}

export function getServiceDescription(service, language, fallback = '') {
  return getPresentationField(service, { ar: 'description_ar', en: 'description_en' }, language, fallback || (normalizeLanguage(language) === 'en' ? 'Service details are being prepared.' : 'تفاصيل الخدمة قيد الإعداد.'))
}

export function getCategoryName(category, language, fallback = '') {
  return getPresentationField(category, { ar: 'name_ar', en: 'name_en' }, language, fallback || (normalizeLanguage(language) === 'en' ? 'Category' : 'تصنيف'))
}

export function getCategoryDescription(category, language, fallback = '') {
  return getPresentationField(category, { ar: 'description_ar', en: 'description_en' }, language, fallback || (normalizeLanguage(language) === 'en' ? 'Services grouped under this category.' : 'خدمات ضمن هذا التصنيف.'))
}

// Staff/admin tables (DEF-A03): the catalogue name in the screen language,
// falling back to the other language when that one is empty.
export function getAdminName(record, language, fallback = '') {
  return getLocalizedField(record, { ar: 'name_ar', en: 'name_en' }, language, fallback)
}

// A category with its parents ("A / B") in the screen language.
export function getAdminCategoryPath(category, language, fallback = '') {
  if (!category) return fallback
  const order = normalizeLanguage(language) === 'en'
    ? ['full_path_name_en', 'name_en', 'full_path_name', 'name_ar']
    : ['full_path_name', 'name_ar', 'full_path_name_en', 'name_en']
  const field = order.find((key) => typeof category[key] === 'string' && category[key].trim())
  return field ? category[field] : fallback
}

// Several serializers expose only an Arabic flat name (e.g. `service_name`).
// Resolve the record from a catalogue the page already loaded so English mode
// shows the English name; keep the flat value when the record is unknown.
export function resolveCatalogName(id, records, flatName, language, fallback = '') {
  const key = id && typeof id === 'object' ? id.id ?? id.service_id ?? id.category_id : id
  const record = key != null && key !== '' ? (records || []).find((item) => String(item?.id) === String(key)) : null
  if (record) return getAdminName(record, language, flatName || fallback)
  return flatName || fallback
}

export function getServicePublicPrice(service, language) {
  const normalizedLanguage = normalizeLanguage(language)
  const pricing = service?.pricing || {}
  const hasStructuredPricing = Boolean(service?.pricing)
  const note = normalizedLanguage === 'en' ? pricing.public_note_en : pricing.public_note_ar

  if (pricing.total_price != null) {
    return {
      label: formatCurrency(pricing.total_price, language),
      amount: Number(pricing.total_price),
      note: note || '',
      isKnown: true,
    }
  }

  if (!hasStructuredPricing && service?.total_fee != null) {
    return {
      label: formatCurrency(service.total_fee, language),
      amount: Number(service.total_fee),
      note: note || '',
      isKnown: true,
    }
  }

  return {
    label: note || (normalizedLanguage === 'en' ? 'Shared after review' : 'يحدد بعد المراجعة'),
    amount: null,
    note: note || '',
    isKnown: false,
  }
}

export function getServiceDuration(service, language) {
  const normalizedLanguage = normalizeLanguage(language)
  const deliveryTime = service?.delivery_time || {}
  const label = normalizedLanguage === 'en'
    ? deliveryTime.label_en || deliveryTime.label
    : deliveryTime.label_ar || deliveryTime.label

  if (label && deliveryTime.mode === 'after_review') {
    // No approved duration: only the approved "confirmed after review"
    // sentence, never a number (DEF-D02).
    return { label, mode: 'after_review', isKnown: false, note: '' }
  }

  if (label) {
    return {
      label,
      mode: deliveryTime.mode || '',
      isKnown: true,
      note: normalizedLanguage === 'en' ? deliveryTime.note_en || '' : deliveryTime.note_ar || '',
    }
  }

  if (service?.estimated_duration != null) {
    const count = Number(service.estimated_duration)
    return {
      label: normalizedLanguage === 'en'
        ? `${count} day${count === 1 ? '' : 's'}`
        : `${count} يوم`,
      mode: 'duration',
      isKnown: true,
      note: '',
    }
  }

  return {
    label: normalizedLanguage === 'en' ? 'Shared later' : 'يحدد لاحقا',
    mode: '',
    isKnown: false,
    note: '',
  }
}
