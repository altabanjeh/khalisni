import { apiClient, buildQuery, unwrapListData } from './client';
import type { ApiListParams } from '../types/common';
import type { DocumentVerificationPayload, OrderDocument } from '../types/document';

export const documentsApi = {
  uploadCustomerDocument(orderId: number | string, payload: FormData) {
    return apiClient.post(`/customer/orders/${orderId}/documents/`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res) => res.data);
  },
  uploadAdminFinalDocument(orderId: number | string, payload: FormData) {
    return apiClient.post(`/admin/orders/${orderId}/final-document/`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res) => res.data);
  },
  uploadProviderFinalDocument(orderId: number | string, payload: FormData) {
    return apiClient.post(`/provider/orders/${orderId}/final-document/`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res) => res.data);
  },
  getStaffDocuments(params: ApiListParams = {}) {
    return apiClient.get<OrderDocument[]>('/staff/documents/', { params: buildQuery(params) }).then((res) => unwrapListData(res.data));
  },
  verifyStaffDocument(documentId: number | string, payload: DocumentVerificationPayload) {
    return apiClient.post(`/staff/documents/${documentId}/verify/`, payload).then((res) => res.data);
  },
  getDownloadToken(documentId: number | string) {
    return apiClient.get<{ token: string }>(`/documents/${documentId}/download-token/`).then((res) => res.data);
  },
};
