import { apiClient, buildQuery, secureAdminDelete, unwrapListData } from './client';
import type { ApiListParams } from '../types/common';
import type { Service, ServiceCategory } from '../types/service';

export const servicesApi = {
  getServices(params: ApiListParams = {}) {
    return apiClient.get<Service[]>('/services/', { params: buildQuery(params) }).then((res) => unwrapListData(res.data));
  },
  getCategories() {
    return apiClient.get<ServiceCategory[]>('/services/categories/').then((res) => unwrapListData(res.data));
  },
  getService(slug: string) {
    return apiClient.get<Service>(`/services/${slug}/`).then((res) => res.data);
  },
  getAdminServices(params: ApiListParams = {}) {
    return apiClient.get<Service[]>('/admin/services/', { params: buildQuery(params) }).then((res) => unwrapListData(res.data));
  },
  createAdminService(payload: Partial<Service>) {
    return apiClient.post<Service>('/admin/services/', payload).then((res) => res.data);
  },
  updateAdminService(serviceId: number | string, payload: Partial<Service>) {
    return apiClient.patch<Service>(`/admin/services/${serviceId}/`, payload).then((res) => res.data);
  },
  deleteAdminService(serviceId: number | string, deletePassword: string) {
    return secureAdminDelete(`/admin/services/${serviceId}/`, deletePassword);
  },
  getAdminCategories(params: ApiListParams = {}) {
    return apiClient.get<ServiceCategory[]>('/admin/categories/', { params: buildQuery(params) }).then((res) => unwrapListData(res.data));
  },
};
