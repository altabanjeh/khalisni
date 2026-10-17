import type { OrderDocument } from '../types/document';
import type { ServiceRequirement } from '../types/service';

const ARABIC_TEXT = /[؀-ۿ]/;
export const GENERIC_REQUIRED_DOCUMENT_LABEL = 'مستند مطلوب';

function arabicOrEmpty(value?: string | null) {
  const text = String(value ?? '').trim();
  return text && ARABIC_TEXT.test(text) ? text : '';
}

/**
 * Arabic display name of an uploaded document. The backend sends
 * `document_type_label` ({ ar, en }) built from the order's requirement; the
 * internal `document_type` code is never shown (same rule as the web,
 * frontend/src/utils/documentPresentation.js).
 */
export function getDocumentTypeLabel(document?: Pick<OrderDocument, 'document_type_label' | 'is_final_document'> | null) {
  const label = document?.document_type_label;
  if (typeof label === 'string' && label.trim()) return label.trim();
  if (label && typeof label === 'object' && label.ar?.trim()) return label.ar.trim();
  if (document?.is_final_document) return 'النتيجة النهائية';
  return 'مستند';
}

/**
 * Arabic name of a document requirement. Falls back to a generic Arabic word
 * (never the internal code or an English name).
 */
export function getRequirementLabel(requirement?: ServiceRequirement | null) {
  if (!requirement) return GENERIC_REQUIRED_DOCUMENT_LABEL;
  return (
    arabicOrEmpty(requirement.name_ar)
    || arabicOrEmpty(requirement.document_definition?.name_ar)
    || GENERIC_REQUIRED_DOCUMENT_LABEL
  );
}

export function findRequirement(requirements: ServiceRequirement[] | null | undefined, documentType: string) {
  const normalized = String(documentType || '').trim().toLowerCase();
  return (requirements ?? []).find(
    (requirement) => String(requirement?.document_type || '').trim().toLowerCase() === normalized,
  );
}

/** Arabic names of the documents an order is waiting for, in request order. */
export function describeMissingDocuments(
  missingTypes: string[] | null | undefined,
  requirements: ServiceRequirement[] | null | undefined,
) {
  return (missingTypes ?? []).map((documentType) => getRequirementLabel(findRequirement(requirements, documentType)));
}
