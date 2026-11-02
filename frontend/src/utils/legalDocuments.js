// Shared helpers for the public legal pages (privacy policy, terms of use).

export const LEGAL_DRAFT_BANNER = {
  ar: 'مسودة — تتطلب موافقة المالك/المستشار القانوني قبل الاعتماد',
  en: 'Draft — requires owner/legal approval before production',
}

// Paragraphs are separated by a blank line. A paragraph whose first line is a
// numbered heading ("1. ...") shows that line as a section heading.
export function splitLegalParagraphs(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => {
      const [first, ...rest] = paragraph.split('\n')
      if (/^\d+\.\s/.test(first) && rest.length) return { heading: first.trim(), body: rest.join('\n').trim() }
      return { heading: '', body: paragraph }
    })
}

// The stored version id stays exact (consent records cite it); the Arabic page
// reads a trailing "-draft" as «(مسودة)» instead of an English word.
export function displayLegalVersion(version, isArabic) {
  const value = String(version || '')
  return isArabic ? value.replace(/-draft$/i, ' (مسودة)') : value
}
