import { getDisplayError } from '../api/client'
import { getCatalogText } from './servicePresentation'

export const GLOBAL_UPLOAD_RULES = {
  allowed_extensions: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
  max_file_size: 10 * 1024 * 1024,
}

function normalizeExtension(value) {
  const nextValue = String(value || '').trim().toLowerCase()
  if (!nextValue) return ''
  return nextValue.startsWith('.') ? nextValue : `.${nextValue}`
}

function normalizeOptions(options, language = 'ar') {
  if (!Array.isArray(options)) return []

  return options
    .map((option, index) => {
      if (option && typeof option === 'object') {
        const value = option.value ?? option.id ?? option.key ?? option.slug
        const label = getCatalogText(
          option, { ar: 'label_ar', en: 'label_en' }, language,
          language === 'en' ? `Option ${index + 1}` : `خيار ${index + 1}`,
        )
        if (value == null || value === '') return null
        return { value: String(value), label: String(label) }
      }

      if (option == null || option === '') return null
      const label = /[\u0600-\u06FF]/.test(String(option)) || language === 'en'
        ? String(option)
        : `خيار ${index + 1}`
      return { value: String(option), label }
    })
    .filter(Boolean)
}

function normalizeSchemaType(value) {
  const nextValue = String(value || 'text').trim().toLowerCase()
  if (['textarea', 'number', 'email', 'tel', 'date', 'select', 'checkbox'].includes(nextValue)) {
    return nextValue
  }
  return 'text'
}

function sanitizeFieldToken(value, fallback) {
  const nextValue = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return nextValue || fallback
}

export function formatBytes(bytes) {
  const numericValue = Number(bytes || 0)
  if (!numericValue) return '0 B'
  if (numericValue < 1024) return `${numericValue} B`

  const units = ['KB', 'MB', 'GB']
  let size = numericValue / 1024
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export function getRequiredDocumentLabel(item, language = 'ar') {
  if (typeof item === 'string') return /[\u0600-\u06FF]/.test(item) ? item : language === 'en' && !item.includes('_') ? item : language === 'en' ? 'Required document' : 'مستند مطلوب'
  if (!item || typeof item !== 'object') return ''
  return getCatalogText(item, { ar: 'name_ar', en: 'name_en' }, language, language === 'en' ? 'Required document' : 'مستند مطلوب')
}

export function getRequiredDocumentType(item, index = 0) {
  if (item && typeof item === 'object' && item.document_type) {
    return String(item.document_type).trim().toLowerCase()
  }

  if (typeof item === 'string' && item.trim()) {
    return String(item).trim().toLowerCase()
  }

  return `document_${index}`
}

export function getDocumentFieldName(item, index = 0) {
  return `document_${sanitizeFieldToken(getRequiredDocumentType(item, index), `document_${index}`)}`
}

export function getServiceSchemaFields(service, language = 'ar') {
  const schema = Array.isArray(service?.required_information_schema) ? service.required_information_schema : []

  return schema
    .map((field, index) => {
      if (!field || typeof field !== 'object') return null

      const rawKey = field.name ?? field.key ?? field.field ?? field.id ?? `field_${index + 1}`
      const inputName = `service_info_${sanitizeFieldToken(rawKey, `field_${index + 1}`)}`
      const label = getCatalogText(
        field, { ar: 'label_ar', en: 'label_en' }, language,
        language === 'en' ? `Requested information ${index + 1}` : `معلومة مطلوبة ${index + 1}`,
      )

      return {
        key: String(rawKey),
        inputName,
        label: String(label),
        type: normalizeSchemaType(field.type || field.field_type || field.input_type),
        required: Boolean(field.required),
        placeholder: getCatalogText(field, { ar: 'placeholder_ar', en: 'placeholder_en' }, language, ''),
        helpText: getCatalogText(field, { ar: 'help_text_ar', en: 'help_text_en' }, language, ''),
        options: normalizeOptions(field.options || field.choices || field.values, language),
      }
    })
    .filter(Boolean)
}

export function buildDynamicNotes(baseNotes, schemaFields, values) {
  const extraLines = schemaFields
    .map((field) => {
      const rawValue = values?.[field.inputName]

      if (field.type === 'checkbox') {
        return rawValue ? `${field.label}: نعم` : ''
      }

      if (Array.isArray(rawValue)) {
        const items = rawValue.map((item) => String(item).trim()).filter(Boolean)
        return items.length ? `${field.label}: ${items.join(', ')}` : ''
      }

      if (rawValue == null) return ''

      const normalizedValue = String(rawValue).trim()
      return normalizedValue ? `${field.label}: ${normalizedValue}` : ''
    })
    .filter(Boolean)

  const sections = []
  const trimmedNotes = String(baseNotes || '').trim()
  if (trimmedNotes) {
    sections.push(trimmedNotes)
  }
  if (extraLines.length) {
    sections.push('البيانات الإضافية المطلوبة:')
    sections.push(...extraLines)
  }

  return sections.join('\n')
}

export function getUploadRules(requirement) {
  const allowedExtensions =
    Array.isArray(requirement?.allowed_extensions) && requirement.allowed_extensions.length
      ? requirement.allowed_extensions.map(normalizeExtension).filter(Boolean)
      : GLOBAL_UPLOAD_RULES.allowed_extensions

  return {
    allowed_extensions: [...new Set(allowedExtensions)],
    max_file_size: Number(requirement?.max_file_size || GLOBAL_UPLOAD_RULES.max_file_size),
  }
}

export function buildAcceptValue(requirement) {
  return getUploadRules(requirement).allowed_extensions.join(',')
}

export function buildUploadHint(requirement, language = 'ar') {
  const rules = getUploadRules(requirement)
  const extensions = rules.allowed_extensions.map((extension) => extension.replace('.', '').toUpperCase()).join(', ')
  return language === 'en'
    ? `Allowed files: ${extensions} | Maximum size: ${formatBytes(rules.max_file_size)}`
    : `الملفات المسموحة: ${extensions} | الحد الأقصى: ${formatBytes(rules.max_file_size)}`
}

export function validateFile(file, requirement, language = 'ar') {
  if (!file) return true

  const rules = getUploadRules(requirement)
  const extension = normalizeExtension(file.name.split('.').pop() ? `.${file.name.split('.').pop()}` : '')

  if (rules.allowed_extensions.length && extension && !rules.allowed_extensions.includes(extension)) {
    return language === 'en'
      ? `Unsupported file type. Allowed: ${rules.allowed_extensions.join(', ')}`
      : `صيغة الملف غير مدعومة. المسموح: ${rules.allowed_extensions.join(', ')}`
  }

  if (rules.max_file_size && file.size > rules.max_file_size) {
    return language === 'en'
      ? `The file is larger than the allowed size (${formatBytes(rules.max_file_size)}).`
      : `حجم الملف يتجاوز الحد المسموح (${formatBytes(rules.max_file_size)}).`
  }

  return true
}

export function validateSingleFileList(fileList, requirement, requiredMessage, language = 'ar') {
  const file = fileList?.[0]
  if (!file) {
    return requiredMessage || true
  }
  return validateFile(file, requirement, language)
}

export function validateMultipleFiles(fileList, requirement) {
  const files = Array.from(fileList || [])
  if (!files.length) return true

  for (const file of files) {
    const validationResult = validateFile(file, requirement)
    if (validationResult !== true) return validationResult
  }

  return true
}

export function findRequiredDocument(requiredDocuments, documentType) {
  const normalizedType = String(documentType || '').trim().toLowerCase()
  return (requiredDocuments || []).find(
    (document) => getRequiredDocumentType(document).toLowerCase() === normalizedType,
  )
}

/**
 * Put server validation errors where the user can see them.
 *
 * Document errors are matched to a form field by the document's own type
 * (`document_errors` from the API), or, for older responses keyed by position,
 * through `submittedDocuments`: the requirements actually sent, in the order
 * they were sent. Position in the full requirement list is never used, because
 * skipping an optional document shifts every later index.
 *
 * Any error that has no visible field (an unknown key, or a field that is not
 * in `knownFields`) is shown in the general error area instead of being lost.
 *
 * Returns `{ fields, general }`: the field names that received an error and the
 * general message, if any.
 */
export function applyServerFieldErrors({
  error,
  setError,
  documents = [],
  submittedDocuments,
  fieldNameForDocumentIndex,
  knownFields,
  fallbackField = 'root.server',
}) {
  const fieldErrors = error?.apiError?.fieldErrors || {}
  const documentErrors = error?.apiError?.rawData?.document_errors
  const known = knownFields ? new Set(knownFields) : null
  const fields = []
  const general = []

  const firstMessage = (messages) => {
    const message = Array.isArray(messages) ? messages[0] : messages
    return typeof message === 'string' ? message : ''
  }
  const fieldForDocument = (document) => {
    if (!document || typeof fieldNameForDocumentIndex !== 'function') return ''
    const index = documents.indexOf(document)
    return index >= 0 ? fieldNameForDocumentIndex(index, document, documents) : ''
  }
  const assign = (field, message) => {
    if (!message) return
    if (field && field !== fallbackField && (!known || known.has(field))) {
      setError(field, { type: 'server', message })
      fields.push(field)
    } else if (!general.includes(message)) {
      general.push(message)
    }
  }

  const byType = documentErrors && typeof documentErrors === 'object' && !Array.isArray(documentErrors) ? documentErrors : null
  if (byType) {
    Object.entries(byType).forEach(([documentType, messages]) => {
      assign(fieldForDocument(findRequiredDocument(documents, documentType)), firstMessage(messages))
    })
  }

  Object.entries(fieldErrors).forEach(([key, messages]) => {
    if (key === 'document_errors') return
    const message = firstMessage(messages)
    if (!message) return

    const documentIndexMatch = key.match(/^(documents|document_types)\[(\d+)\]$/)
    if (documentIndexMatch) {
      if (byType) return // already placed by document type
      const sent = Array.isArray(submittedDocuments) ? submittedDocuments : documents
      assign(fieldForDocument(sent[Number(documentIndexMatch[2])]), message)
      return
    }

    assign(key === 'documents' || key === 'detail' || key === 'non_field_errors' ? '' : key, message)
  })

  if (!fields.length && !general.length) general.push(getDisplayError(error))
  if (general.length) setError(fallbackField, { type: 'server', message: general.join(' ') })

  return { fields, general: general.join(' ') }
}
