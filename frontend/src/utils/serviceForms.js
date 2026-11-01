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

const ITEM_FIELD_TYPES = ['textarea', 'number', 'email', 'tel', 'date', 'select', 'checkbox']

function normalizeSchemaType(value, { allowRepeater = true } = {}) {
  const nextValue = String(value || 'text').trim().toLowerCase()
  if (ITEM_FIELD_TYPES.includes(nextValue)) return nextValue
  if (allowRepeater && nextValue === 'repeater') return 'repeater'
  return 'text'
}

/** Hard cap on repeater rows; the server refuses more (services/schema_rules.py). */
export const REPEATER_MAX_ITEMS = 20

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

function schemaFieldKey(field, index) {
  return field.name ?? field.key ?? field.field ?? field.id ?? `field_${index + 1}`
}

function wholeNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 ? number : null
}

/**
 * The rows of a repeater (CN-BIZ-01 partners, CN-BIZ-04 plots): its item
 * fields are ordinary fields. In the form each row is an object keyed by the
 * item's `inputKey` (prefixed, so a schema key such as `id` never collides
 * with react-hook-form's own row id); answers are keyed by the schema key.
 */
function normalizeItemFields(itemFields, language) {
  if (!Array.isArray(itemFields)) return []
  return itemFields
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null
      const rawKey = schemaFieldKey(item, index)
      return {
        key: String(rawKey),
        inputKey: `f_${sanitizeFieldToken(rawKey, `item_${index + 1}`)}`,
        label: String(getCatalogText(
          item, { ar: 'label_ar', en: 'label_en' }, language,
          language === 'en' ? `Item ${index + 1}` : `بند ${index + 1}`,
        )),
        type: normalizeSchemaType(item.type || item.field_type || item.input_type, { allowRepeater: false }),
        required: Boolean(item.required),
        placeholder: getCatalogText(item, { ar: 'placeholder_ar', en: 'placeholder_en' }, language, ''),
        helpText: getCatalogText(item, { ar: 'help_text_ar', en: 'help_text_en' }, language, ''),
        options: normalizeOptions(item.options || item.choices || item.values, language),
      }
    })
    .filter(Boolean)
}

export function getServiceSchemaFields(service, language = 'ar') {
  const schema = Array.isArray(service?.required_information_schema) ? service.required_information_schema : []

  return schema
    .map((field, index) => {
      if (!field || typeof field !== 'object') return null

      const rawKey = schemaFieldKey(field, index)
      const inputName = `service_info_${sanitizeFieldToken(rawKey, `field_${index + 1}`)}`
      const label = getCatalogText(
        field, { ar: 'label_ar', en: 'label_en' }, language,
        language === 'en' ? `Requested information ${index + 1}` : `معلومة مطلوبة ${index + 1}`,
      )
      const type = normalizeSchemaType(field.type || field.field_type || field.input_type)

      const normalized = {
        key: String(rawKey),
        inputName,
        label: String(label),
        type,
        required: Boolean(field.required),
        placeholder: getCatalogText(field, { ar: 'placeholder_ar', en: 'placeholder_en' }, language, ''),
        helpText: getCatalogText(field, { ar: 'help_text_ar', en: 'help_text_en' }, language, ''),
        options: normalizeOptions(field.options || field.choices || field.values, language),
        visibleWhen: normalizeVisibleWhen(field.visible_when),
      }
      if (type === 'repeater') {
        const requestedMax = wholeNumber(field.max_items)
        const maxItems = Math.max(1, Math.min(requestedMax || REPEATER_MAX_ITEMS, REPEATER_MAX_ITEMS))
        normalized.itemFields = normalizeItemFields(field.item_fields, language)
        normalized.minItems = Math.min(wholeNumber(field.min_items) ?? 0, maxItems)
        normalized.maxItems = maxItems
        // A required repeater needs at least one row; an optional one may stay empty.
        normalized.effectiveMin = normalized.required ? Math.max(normalized.minItems, 1) : 0
      }
      return normalized
    })
    .filter(Boolean)
}

/** A blank row for a repeater, keyed by its item input keys. */
export function emptyRepeaterRow(field) {
  return Object.fromEntries((field?.itemFields || []).map((item) => [item.inputKey, item.type === 'checkbox' ? false : '']))
}

/** Rows to add when the customer presses "add": an optional repeater with a minimum starts at that minimum. */
export function repeaterRowsToAdd(field, count) {
  if (!field || count >= field.maxItems) return 0
  if (count === 0 && field.minItems > 1) return Math.min(field.minItems, field.maxItems)
  return 1
}

/** A row may be removed while the remaining rows still satisfy the minimum (zero rows is fine when optional). */
export function canRemoveRepeaterRow(field, count) {
  if (!field || count <= 0) return false
  const remaining = count - 1
  if (remaining < field.effectiveMin) return false
  return remaining === 0 || remaining >= field.minItems
}

/** Form names of every item input of a repeater, for step validation. */
export function repeaterItemInputNames(field, rowCount) {
  const names = []
  for (let row = 0; row < rowCount; row += 1) {
    (field?.itemFields || []).forEach((item) => names.push(`${field.inputName}.${row}.${item.inputKey}`))
  }
  return names
}

function repeaterRowAnswer(field, row) {
  const answer = {}
  field.itemFields.forEach((item) => {
    const rawValue = row?.[item.inputKey]
    if (item.type === 'checkbox') {
      answer[item.key] = Boolean(rawValue)
      return
    }
    if (rawValue == null) return
    const text = String(rawValue).trim()
    if (text) answer[item.key] = text
  })
  return answer
}

function itemDisplayValue(item, rawValue, language = 'ar') {
  if (item.type === 'checkbox') return rawValue ? (language === 'en' ? 'Yes' : 'نعم') : ''
  if (item.type === 'select') {
    const option = item.options.find((candidate) => candidate.value === String(rawValue ?? ''))
    if (option) return option.label
  }
  return rawValue == null ? '' : String(rawValue).trim()
}

/** Readable lines for repeater rows: "1. itemLabel: value؛ itemLabel: value". */
export function repeaterRowLines(field, rows, language = 'ar') {
  const separator = language === 'en' ? '; ' : '؛ '
  return (Array.isArray(rows) ? rows : [])
    .map((row, index) => {
      const parts = field.itemFields
        .map((item) => {
          const value = itemDisplayValue(item, row?.[item.inputKey], language)
          return value ? `${item.label}: ${value}` : ''
        })
        .filter(Boolean)
      return parts.length ? `${index + 1}. ${parts.join(separator)}` : ''
    })
    .filter(Boolean)
}

function normalizeVisibleWhen(condition) {
  if (!condition || typeof condition !== 'object' || condition.field == null) return null
  return { field: String(condition.field), equals: String(condition.equals ?? '') }
}

/**
 * A field with `visible_when` is shown only while the field it names holds
 * the expected answer (owner decision B10-1/2/3: parcel and basin numbers
 * appear when the customer answers "yes" to "do you know them?"). A hidden
 * field is neither required nor sent.
 */
export function isSchemaFieldVisible(field, schemaFields, values) {
  if (!field?.visibleWhen) return true
  const controller = schemaFields.find((candidate) => candidate.key === field.visibleWhen.field)
  if (!controller || !isSchemaFieldVisible(controller, schemaFields, values)) return false
  return String(values?.[controller.inputName] ?? '') === field.visibleWhen.equals
}

export function visibleSchemaFields(schemaFields, values) {
  return schemaFields.filter((field) => isSchemaFieldVisible(field, schemaFields, values))
}

/**
 * The answers sent as `service_answers`: visible fields only, keyed by the
 * schema key. The server validates them against the same schema (required,
 * options, visible_when) and writes the answers block into the order notes,
 * so `notes` carries only the customer's own text (audit B10-3).
 */
export function buildServiceAnswers(schemaFields, values) {
  const answers = {}
  visibleSchemaFields(schemaFields, values).forEach((field) => {
    const rawValue = values?.[field.inputName]
    if (field.type === 'repeater') {
      // Every displayed row is sent, blank or not, so server errors keyed by
      // row index point at the row the customer sees.
      const rows = Array.isArray(rawValue) ? rawValue : []
      if (rows.length) answers[field.key] = rows.map((row) => repeaterRowAnswer(field, row))
      return
    }
    if (field.type === 'checkbox') {
      answers[field.key] = Boolean(rawValue)
      return
    }
    if (rawValue == null) return
    const text = String(rawValue).trim()
    if (text) answers[field.key] = text
  })
  return answers
}

export function buildDynamicNotes(baseNotes, schemaFields, values) {
  const extraLines = visibleSchemaFields(schemaFields, values)
    .map((field) => {
      const rawValue = values?.[field.inputName]

      if (field.type === 'repeater') {
        const rows = repeaterRowLines(field, rawValue)
        return rows.length ? [`${field.label}:`, ...rows.map((line) => `  ${line}`)].join('\n') : ''
      }

      if (field.type === 'checkbox') {
        return rawValue ? `${field.label}: نعم` : ''
      }

      if (field.type === 'select') {
        // Staff read the answer as the customer saw it, not the option code.
        const option = field.options.find((candidate) => candidate.value === String(rawValue ?? ''))
        if (option) return `${field.label}: ${option.label}`
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

export function validateMultipleFiles(fileList, requirement, language = 'ar') {
  const files = Array.from(fileList || [])
  if (!files.length) return true

  for (const file of files) {
    const validationResult = validateFile(file, requirement, language)
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
  schemaFields = [],
}) {
  const fieldErrors = error?.apiError?.fieldErrors || {}
  const documentErrors = error?.apiError?.rawData?.document_errors
  const answerErrors = error?.apiError?.rawData?.service_answers
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

  // Server-side form validation: {"service_answers": {"<schema key>": message}}.
  const answersByKey = answerErrors && typeof answerErrors === 'object' && !Array.isArray(answerErrors) ? answerErrors : null
  if (answersByKey) {
    Object.entries(answersByKey).forEach(([key, messages]) => {
      const field = schemaFields.find((candidate) => candidate.key === key)
      if (field?.type === 'repeater' && messages && typeof messages === 'object' && !Array.isArray(messages)) {
        // Per-row errors: {"<row index>": {"<item key>": message}}.
        Object.entries(messages).forEach(([row, rowErrors]) => {
          if (!rowErrors || typeof rowErrors !== 'object' || Array.isArray(rowErrors)) {
            assign('', firstMessage(rowErrors))
            return
          }
          Object.entries(rowErrors).forEach(([itemKey, itemMessages]) => {
            const item = field.itemFields.find((candidate) => candidate.key === itemKey)
            const message = firstMessage(itemMessages)
            if (message && item && /^\d+$/.test(row) && (!known || known.has(field.inputName))) {
              const name = `${field.inputName}.${row}.${item.inputKey}`
              setError(name, { type: 'server', message })
              fields.push(name)
            } else {
              assign('', message)
            }
          })
        })
        return
      }
      assign(field?.inputName || '', firstMessage(messages))
    })
  }

  Object.entries(fieldErrors).forEach(([key, messages]) => {
    if (key === 'document_errors') return
    if (key === 'service_answers' && answersByKey) return
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
