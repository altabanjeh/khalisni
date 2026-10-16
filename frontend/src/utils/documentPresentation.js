import { normalizeLanguage } from './i18n'

// Display name of an uploaded document. The server sends `document_type_label`
// ({ ar, en }) built from the configured requirement (backend
// documents/presentation.py); the internal `document_type` code is never shown.
export function getDocumentTypeLabel(document, language) {
  const lang = normalizeLanguage(language)
  const label = document?.document_type_label
  if (label?.[lang]) return label[lang]
  if (document?.is_final_document) return lang === 'en' ? 'Final result' : 'النتيجة النهائية'
  return lang === 'en' ? 'Document' : 'مستند'
}
