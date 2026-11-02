import type { ApiError } from '../types/common';
import type { LegalDocument, LegalKind } from '../types/publicSite';

// In-app privacy policy and terms: GET /api/public-site/legal/<kind>/ with kind
// "privacy" or "terms". A document still waiting for the owner's or legal
// counsel's approval is shown with a draft banner; a kind that is not
// published yet answers 404 and the screen says so instead of failing.
export const LEGAL_KINDS: readonly LegalKind[] = ['privacy', 'terms'];
export const LEGAL_TITLES: Record<LegalKind, string> = {
  privacy: 'سياسة الخصوصية',
  terms: 'شروط الاستخدام',
};
export const LEGAL_DRAFT_STATUS = 'draft_requires_approval';
export const LEGAL_DRAFT_BANNER = 'مسودة — تتطلب موافقة المالك/المستشار القانوني قبل الاعتماد';
export const LEGAL_NOT_PUBLISHED = 'لم تُنشر بعد';

/** The stored version id stays exact (consent records cite it); Arabic reads "-draft" as «(مسودة)». */
export function displayLegalVersion(version: string | null | undefined) {
  return String(version ?? '').replace(/-draft$/i, ' (مسودة)');
}

export function isLegalKind(value: unknown): value is LegalKind {
  return typeof value === 'string' && (LEGAL_KINDS as readonly string[]).includes(value);
}

export function isLegalDraft(document?: Pick<LegalDocument, 'approval_status'> | null) {
  return document?.approval_status === LEGAL_DRAFT_STATUS;
}

export type LegalLoadResult =
  | { state: 'published'; document: LegalDocument; draft: boolean }
  | { state: 'not_published' }
  | { state: 'error'; message: string };

export async function loadLegalDocument(
  kind: LegalKind,
  fetcher: (kind: LegalKind) => Promise<LegalDocument>,
): Promise<LegalLoadResult> {
  try {
    const document = await fetcher(kind);
    if (!document || !String(document.body_ar ?? '').trim()) return { state: 'not_published' };
    return { state: 'published', document, draft: isLegalDraft(document) };
  } catch (error) {
    if ((error as ApiError | null)?.status === 404) return { state: 'not_published' };
    const message = (error as ApiError | null)?.message;
    return { state: 'error', message: typeof message === 'string' && message ? message : 'تعذر تحميل الصفحة.' };
  }
}

export type LegalBlock = { type: 'heading' | 'paragraph' | 'bullet'; text: string };

/**
 * Splits `body_ar` into blocks for display: "#" lines are headings, "-"/"*"/"•"
 * lines are list items, other lines are paragraphs. No HTML is interpreted.
 */
export function splitLegalBody(body?: string | null): LegalBlock[] {
  return String(body ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const heading = /^#{1,6}\s+(.*)$/.exec(line);
      if (heading) return { type: 'heading', text: heading[1].trim() } as LegalBlock;
      const bullet = /^[-*•]\s+(.*)$/.exec(line);
      if (bullet) return { type: 'bullet', text: bullet[1].trim() } as LegalBlock;
      return { type: 'paragraph', text: line } as LegalBlock;
    });
}
