import { describe, expect, it, vi } from 'vitest'
import { applyServerFieldErrors, buildUploadHint, getDocumentFieldName, validateFile } from './serviceForms'

// KHS-037: server validation errors land on the right requirement even when
// optional documents were skipped, and errors without a field stay visible.

const requirements = [
  { document_type: 'national_id', name_ar: 'هوية', name_en: 'National ID', is_required: true },
  { document_type: 'lease_contract', name_ar: 'عقد إيجار', name_en: 'Lease contract', is_required: false },
  { document_type: 'authorization', name_ar: 'تفويض', name_en: 'Authorization letter', is_required: true },
]
const fieldFor = (index, document) => getDocumentFieldName(document, index)
const knownFields = [...requirements.map((d, i) => getDocumentFieldName(d, i)), 'full_name', 'phone', 'city', 'consent']

function apiError(data) {
  const fieldErrors = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, Array.isArray(value) ? value : [value]]),
  )
  return { apiError: { fieldErrors, rawData: data, displayMessage: 'Request failed.' } }
}

function run(data, extra = {}) {
  const setError = vi.fn()
  const outcome = applyServerFieldErrors({
    error: apiError(data),
    setError,
    documents: requirements,
    fieldNameForDocumentIndex: fieldFor,
    knownFields,
    ...extra,
  })
  const placed = Object.fromEntries(setError.mock.calls.map(([field, value]) => [field, value.message]))
  return { outcome, placed }
}

describe('applyServerFieldErrors', () => {
  it('places a positional error on the document that was actually sent at that position', () => {
    // The optional lease contract was skipped, so the server saw two files:
    // index 0 = national_id, index 1 = authorization.
    const submittedDocuments = [requirements[0], requirements[2]]
    const { placed, outcome } = run({ 'documents[1]': 'File content does not match its extension.' }, { submittedDocuments })

    expect(placed).toEqual({ document_authorization: 'File content does not match its extension.' })
    expect(placed.document_lease_contract).toBeUndefined()
    expect(outcome.fields).toEqual(['document_authorization'])
    expect(outcome.general).toBe('')
  })

  it('prefers the document type sent by the server over any position', () => {
    const { placed } = run({
      'documents[1]': 'This document exceeds the allowed file size.',
      document_errors: { authorization: 'This document exceeds the allowed file size.' },
    })

    expect(placed).toEqual({ document_authorization: 'This document exceeds the allowed file size.' })
  })

  it('shows an unknown server error key in the general error area', () => {
    const { placed, outcome } = run({ fraud_score: 'Submission blocked for review.' })

    expect(placed).toEqual({ 'root.server': 'Submission blocked for review.' })
    expect(outcome.fields).toEqual([])
    expect(outcome.general).toBe('Submission blocked for review.')
  })

  it('keeps field errors on their fields and still shows unrelated ones generally', () => {
    const { placed } = run({ phone: 'Enter a valid phone number.', idempotency_key: 'Use a UUID submission key.' })

    expect(placed.phone).toBe('Enter a valid phone number.')
    expect(placed['root.server']).toBe('Use a UUID submission key.')
  })

  it('shows a document error generally when its requirement is not on the form', () => {
    const { placed } = run({ document_errors: { passport: 'This document is not required for the selected service.' } })

    expect(placed).toEqual({ 'root.server': 'This document is not required for the selected service.' })
  })

  it('falls back to the display message when the server gave no usable detail', () => {
    const { placed } = run({})

    expect(placed).toEqual({ 'root.server': 'Request failed.' })
  })
})

describe('upload helper language', () => {
  it('renders hints and validation messages in the requested language', () => {
    expect(buildUploadHint(null, 'en')).toMatch(/^Allowed files: /)
    expect(buildUploadHint(null, 'ar')).toMatch(/^الملفات المسموحة/)
    const file = { name: 'virus.exe', size: 10 }
    expect(validateFile(file, null, 'en')).toMatch(/^Unsupported file type/)
    expect(validateFile(file, null, 'ar')).toMatch(/^صيغة الملف غير مدعومة/)
  })
})
