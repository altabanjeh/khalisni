import { http } from './client'

// Versioned legal documents (privacy policy, terms of use), audit D06.
// Public contract: GET /public-site/legal/ -> { privacy, terms } (null when none
// is published) and GET /public-site/legal/<kind>/ (404 when none is published).
export const LEGAL_KINDS = ['privacy', 'terms']
export const LEGAL_DRAFT_STATUS = 'draft_requires_approval'

export function isDraftLegalDocument(document) {
  return Boolean(document) && document.approval_status !== 'approved'
}

export const legalApi = {
  getPublicLegalDocuments: () => http.get('/public-site/legal/'),
  getPublicLegalDocument: (kind) => http.get(`/public-site/legal/${encodeURIComponent(kind)}/`),
  getAdminLegalDocuments: (params = {}) => http.get('/admin/public-site/legal-documents/', { params }),
  createAdminLegalDocument: (payload) => http.post('/admin/public-site/legal-documents/', payload),
  updateAdminLegalDocument: (id, payload) => http.patch(`/admin/public-site/legal-documents/${id}/`, payload),
  publishAdminLegalDocument: (id) => http.post(`/admin/public-site/legal-documents/${id}/publish/`),
}
