import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { isDraftLegalDocument } from '../../api/legalApi'
import { PublicPanel } from './PublicPage'
import { LEGAL_DRAFT_BANNER, splitLegalParagraphs } from '../../utils/legalDocuments'

export function LegalDraftBanner({ isArabic }) {
  return (
    <div
      className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-extrabold leading-7 text-amber-900"
      data-testid="legal-draft-banner"
      role="note"
    >
      <AlertTriangle aria-hidden="true" className="mt-1 h-5 w-5 shrink-0" />
      <p>{isArabic ? LEGAL_DRAFT_BANNER.ar : LEGAL_DRAFT_BANNER.en}</p>
    </div>
  )
}

export function LegalDocumentMeta({ document, isArabic }) {
  if (!document) return null
  return (
    <p className="text-sm font-semibold text-[var(--khalsni-public-text-secondary)]" data-testid="legal-document-meta">
      {isArabic
        ? `الإصدار: ${document.version} · تاريخ السريان: ${document.effective_date}`
        : `Version: ${document.version} · Effective: ${document.effective_date}`}
    </p>
  )
}

export function LegalParagraphs({ text }) {
  const paragraphs = splitLegalParagraphs(text)
  return (
    <div className="space-y-4 text-sm font-semibold leading-8 text-slate-600">
      {paragraphs.map((paragraph, index) => (
        <section className="space-y-1" key={`${index}-${paragraph.heading || paragraph.body.slice(0, 24)}`}>
          {paragraph.heading ? <h2 className="text-base font-extrabold text-[var(--khalsni-public-navy)]">{paragraph.heading}</h2> : null}
          <p className="whitespace-pre-line">{paragraph.body}</p>
        </section>
      ))}
    </div>
  )
}

// The body of a published legal document (or of a fallback text) with the
// draft banner while the version is not approved, and a link to the other document.
export function LegalDocumentBody({ document, fallbackText, isArabic, otherLink }) {
  const text = document ? (isArabic ? document.body_ar : document.body_en) : fallbackText
  return (
    <PublicPanel>
      <div className="space-y-5">
        {isDraftLegalDocument(document) ? <LegalDraftBanner isArabic={isArabic} /> : null}
        <LegalDocumentMeta document={document} isArabic={isArabic} />
        <LegalParagraphs text={text} />
        {otherLink ? (
          <p className="border-t border-[var(--khalsni-public-border)] pt-4 text-sm font-bold">
            <Link className="kh-focusable text-[var(--khalsni-public-accent-text)] underline" to={otherLink.to}>
              {otherLink.label}
            </Link>
          </p>
        ) : null}
      </div>
    </PublicPanel>
  )
}
