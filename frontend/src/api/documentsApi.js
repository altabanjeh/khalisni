import { buildQuery, http, unwrapList } from './client'

export const documentsApi = {
  uploadCustomerDocument(id, formData) {
    return http.post(`/customer/orders/${id}/documents/`, formData)
  },

  async getStaffDocuments(params = {}) {
    return unwrapList(await http.get(`/staff/documents/${buildQuery(params)}`))
  },

  verifyStaffDocument(id, payload) {
    return http.post(`/staff/documents/${id}/verify/`, payload)
  },

  uploadAdminFinalDocument(id, formData) {
    return http.post(`/admin/orders/${id}/final-document/`, formData)
  },

  getDownloadToken(documentId) {
    return http.get(`/documents/${documentId}/download-token/`)
  },

  async downloadDocumentWithToken(documentId) {
    const { token } = await documentsApi.getDownloadToken(documentId)
    const query = buildQuery({ token })
    return http.get(`/documents/${documentId}/download/${query}`, { responseType: 'blob' })
  },

  downloadDocument(documentId, params = {}) {
    const query = buildQuery(params)
    return http.get(`/documents/${documentId}/download/${query}`, {
      responseType: 'blob',
    })
  },
}

export default documentsApi
