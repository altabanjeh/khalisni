import { getDisplayError } from '../api/client'

export const GLOBAL_UPLOAD_RULES = {
  allowed_extensions: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
  max_file_size: 10 * 1024 * 1024,
}

function normalizeExtension(value) {
  const nextValue = String(value || '').trim().toLowerCase()
  if (!nextValue) return ''
  return nextValue.startsWith('.') ? nextValue : `.${nextValue}`
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) return []

  return options
    .map((option) => {
      if (option && typeof option === 'object') {
        const value = option.value ?? option.id ?? option.key ?? option.slug
        const label = option.label ?? option.name_ar ?? option.name ?? option.title ?? value
        if (value == null || value === '') return null
        return { value: String(value), label: String(label) }
      }

      if (option == null || option === '') return null
      return { value: String(option), label: String(option) }
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

export function getRequiredDocumentLabel(item) {
  if (typeof item === 'string') return item
  if (!item || typeof item !== 'object') return ''
  return item.name_ar || item.name_en || item.document_type || ''
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

export function getServiceSchemaFields(service) {
  const schema = Array.isArray(service?.required_information_schema) ? service.required_information_schema : []

  return schema
    .map((field, index) => {
      if (!field || typeof field !== 'object') return null

      const rawKey = field.name ?? field.key ?? field.field ?? field.id ?? `field_${index + 1}`
      const inputName = `service_info_${sanitizeFieldToken(rawKey, `field_${index + 1}`)}`
      const label =
        field.label_ar || field.label || field.name_ar || field.title || field.placeholder || `Field ${index + 1}`

      return {
        key: String(rawKey),
        inputName,
        label: String(label),
        type: normalizeSchemaType(field.type || field.field_type || field.input_type),
        required: Boolean(field.required),
        placeholder: field.placeholder || '',
        helpText: field.help_text || field.description || '',
        options: normalizeOptions(field.options || field.choices || field.values),
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

export function buildUploadHint(requirement) {
  const rules = getUploadRules(requirement)
  const extensions = rules.allowed_extensions.map((extension) => extension.replace('.', '').toUpperCase()).join(', ')
  return `الملفات المسموحة: ${extensions} | الحد الأقصى: ${formatBytes(rules.max_file_size)}`
}

export function validateFile(file, requirement) {
  if (!file) return true

  const rules = getUploadRules(requirement)
  const extension = normalizeExtension(file.name.split('.').pop() ? `.${file.name.split('.').pop()}` : '')

  if (rules.allowed_extensions.length && extension && !rules.allowed_extensions.includes(extension)) {
    return `صيغة الملف غير مدعومة. المسموح: ${rules.allowed_extensions.join(', ')}`
  }

  if (rules.max_file_size && file.size > rules.max_file_size) {
    return `حجم الملف يتجاوز الحد المسموح (${formatBytes(rules.max_file_size)}).`
  }

  return true
}

export function validateSingleFileList(fileList, requirement, requiredMessage) {
  const file = fileList?.[0]
  if (!file) {
    return requiredMessage || true
  }
  return validateFile(file, requirement)
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

export function applyServerFieldErrors({ error, setError, documents = [], fieldNameForDocumentIndex, fallbackField = 'root.server' }) {
  const fieldErrors = error?.apiError?.fieldErrors || {}
  let applied = false

  Object.entries(fieldErrors).forEach(([key, messages]) => {
    const message = Array.isArray(messages) ? messages[0] : messages
    if (!message) return

    const documentIndexMatch = key.match(/^(documents|document_types)\[(\d+)\]$/)
    if (documentIndexMatch && typeof fieldNameForDocumentIndex === 'function') {
      const documentIndex = Number(documentIndexMatch[2])
      const mappedField = fieldNameForDocumentIndex(documentIndex, documents[documentIndex], documents)
      if (mappedField) {
        setError(mappedField, { type: 'server', message })
        applied = true
      }
      return
    }

    setError(key === 'documents' ? fallbackField : key, { type: 'server', message })
    applied = true
  })

  if (!applied) {
    setError(fallbackField, { type: 'server', message: getDisplayError(error) })
  }
}
