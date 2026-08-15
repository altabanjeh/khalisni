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

  return getLocalizedField(record, fields, language, fallback)
}

export function getServiceName(service, language, fallback = '') {
  return getPresentationField(service, { ar: 'name_ar', en: 'name_en' }, language, fallback || 'Service')
}

export function getServiceDescription(service, language, fallback = '') {
  return getPresentationField(service, { ar: 'description_ar', en: 'description_en' }, language, fallback || 'Service details are being prepared.')
}

export function getCategoryName(category, language, fallback = '') {
  return getPresentationField(category, { ar: 'name_ar', en: 'name_en' }, language, fallback || 'Category')
}

export function getCategoryDescription(category, language, fallback = '') {
  return getPresentationField(category, { ar: 'description_ar', en: 'description_en' }, language, fallback || 'Services grouped under this category.')
}

export function getServicePublicPrice(service, language) {
  const normalizedLanguage = normalizeLanguage(language)
  const pricing = service?.pricing || {}
  const note = normalizedLanguage === 'en' ? pricing.public_note_en : pricing.public_note_ar

  if (pricing.total_price != null) {
    return {
      label: formatCurrency(pricing.total_price, language),
      amount: Number(pricing.total_price),
      note: note || '',
      isKnown: true,
    }
  }

  if (service?.total_fee != null) {
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
