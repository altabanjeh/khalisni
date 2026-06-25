import { apiClient, buildQuery, secureAdminDelete, unwrapListData } from './client';
import type { ApiListParams } from '../types/common';
import type { Service } from '../types/service';
import type { ProviderProfileBrief } from '../types/order';
import type { PublicAdvertisement, PublicHomepagePayload, PublicSiteTheme } from '../types/publicSite';

interface AdminAuditLogRecord {
  id?: number;
  action?: string;
  entity_type?: string;
  entity_id?: string | number;
  created_at?: string;
}

interface AdminProviderListRecord extends ProviderProfileBrief {
  user?: {
    full_name?: string;
  };
}

export const adminApi = {
  getSystemSettings() {
    return apiClient.get('/admin/system-settings/').then((res) => res.data);
  },
  getProviders(params: ApiListParams = {}) {
    return apiClient
      .get<AdminProviderListRecord[]>('/admin/providers/', { params: buildQuery(params) })
      .then((res) => unwrapListData(res.data));
  },
  updateProviderApproval(providerId: number | string, payload: { decision: 'approve' | 'reject'; reason?: string }) {
    return apiClient.post(`/admin/providers/${providerId}/approval/`, payload).then((res) => res.data);
  },
  updateProviderActivation(providerId: number | string, payload: { is_active: boolean; reason?: string }) {
    return apiClient.post(`/admin/providers/${providerId}/activation/`, payload).then((res) => res.data);
  },
  getAuditLogs(params: ApiListParams = {}) {
    return apiClient
      .get<AdminAuditLogRecord[]>('/admin/audit-logs/', { params: buildQuery(params) })
      .then((res) => unwrapListData(res.data));
  },
  getWorkflowRules() {
    return apiClient.get('/admin/workflow-rules/').then((res) => res.data);
  },
  getAdminAdvertisements(params: ApiListParams = {}) {
    return apiClient
      .get<PublicAdvertisement[]>('/admin/public-site/advertisements/', { params: buildQuery(params) })
      .then((res) => unwrapListData(res.data));
  },
  createAdminAdvertisement(payload: Record<string, unknown>) {
    return apiClient.post('/admin/public-site/advertisements/', payload).then((res) => res.data);
  },
  updateAdminAdvertisement(id: number | string, payload: Record<string, unknown>) {
    return apiClient.patch(`/admin/public-site/advertisements/${id}/`, payload).then((res) => res.data);
  },
  deleteAdminAdvertisement(id: number | string, deletePassword: string) {
    return secureAdminDelete(`/admin/public-site/advertisements/${id}/`, deletePassword);
  },
  getAdminPublicContent() {
    return apiClient.get('/admin/public-site/content/').then((res) => res.data);
  },
  updateAdminPublicContent(payload: Record<string, unknown>) {
    return apiClient.patch('/admin/public-site/content/', payload).then((res) => res.data);
  },
  getAdminTheme() {
    return apiClient.get<PublicSiteTheme>('/admin/public-site/theme/').then((res) => res.data);
  },
  updateAdminTheme(payload: Record<string, unknown>) {
    return apiClient.patch('/admin/public-site/theme/', payload).then((res) => res.data);
  },
  getPayments(params: ApiListParams = {}) {
    return apiClient.get('/admin/payments/', { params: buildQuery(params) }).then((res) => unwrapListData(res.data));
  },
  updatePaymentStatus(paymentId: number | string, payload: { status: string; note?: string }) {
    return apiClient.post(`/admin/payments/${paymentId}/status/`, payload).then((res) => res.data);
  },
  getPublicHomepage() {
    return apiClient.get<PublicHomepagePayload>('/public-site/homepage/').then((res) => res.data);
  },
  getPublicTheme() {
    return apiClient.get<PublicSiteTheme>('/public-site/theme/').then((res) => res.data);
  },
  getPublicAdvertisements() {
    return apiClient.get<PublicAdvertisement[]>('/public-site/advertisements/').then((res) => unwrapListData(res.data));
  },
  createServicePricePayload(service: Partial<Service>) {
    return {
      name_ar: service.name_ar,
      slug: service.slug,
      service_fee: service.service_fee ?? 0,
      government_fee: service.government_fee ?? 0,
      estimated_duration: service.estimated_duration ?? '',
    };
  },
};
