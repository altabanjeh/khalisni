import arMessages from '../locales/ar.json'
import enMessages from '../locales/en.json'

export const DEFAULT_LANGUAGE = 'ar'
export const SUPPORTED_LANGUAGES = ['ar', 'en']
export const LANGUAGE_STORAGE_KEY = 'khalisni-language'
export const MESSAGES = {
  ar: arMessages,
  en: enMessages,
}

export function normalizeLanguage(value) {
  return value === 'en' ? 'en' : DEFAULT_LANGUAGE
}

export function isRtlLanguage(language) {
  return normalizeLanguage(language) === 'ar'
}

export function getDirectionForLanguage(language) {
  return isRtlLanguage(language) ? 'rtl' : 'ltr'
}

export function getLocaleForLanguage(language) {
  return normalizeLanguage(language) === 'en' ? 'en-US' : 'ar-JO'
}

export function getCurrentLanguage() {
  if (typeof document === 'undefined') return DEFAULT_LANGUAGE
  return normalizeLanguage(document.documentElement.lang)
}

export function getCurrentLocale(language) {
  if (language) return getLocaleForLanguage(language)
  return getLocaleForLanguage(getCurrentLanguage())
}

export function getInitialLanguage() {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (SUPPORTED_LANGUAGES.includes(stored)) return stored

  return DEFAULT_LANGUAGE
}

export function getLocalizedField(record, fields, language, fallback = '') {
  const preferredFields = normalizeLanguage(language) === 'en'
    ? [fields.en, fields.ar]
    : [fields.ar, fields.en]

  for (const field of preferredFields) {
    if (!field) continue
    const value = record?.[field]
    if (typeof value === 'string' && value.trim()) return value
    if (value != null && value !== '') return value
  }

  return fallback
}

export function interpolateMessage(template, values = {}) {
  return String(template || '').replace(/\{(\w+)\}/g, (_match, key) => {
    const value = values[key]
    return value == null ? '' : String(value)
  })
}

export function translateMessage(language, key, fallback = '', values = {}) {
  const normalizedLanguage = normalizeLanguage(language)
  const dictionary = MESSAGES[normalizedLanguage] || MESSAGES[DEFAULT_LANGUAGE]
  const message = dictionary?.[key]

  if (typeof message === 'string') {
    return interpolateMessage(message, values)
  }

  return interpolateMessage(fallback || key, values)
}
