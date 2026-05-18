import { apiClient, buildQuery } from './client';
import type { ApiListParams } from '../types/common';
import type { Service, ServiceCategory } from '../types/service';

export const servicesApi = {
  getServices(params: ApiListParams = {}) {
    return apiClient.get<Service[]>('/services/', { params: buildQuery(params) }).then((res) => res.data);
  },
  getCategories() {
    return apiClient.get<ServiceCategory[]>('/services/categories/').then((res) => res.data);
  },
  getService(slug: string) {
    return apiClient.get<Service>(`/services/${slug}/`).then((res) => res.data);
  },
  getAdminServices(params: ApiListParams = {}) {
    return apiClient.get<Service[]>('/admin/services/', { params: buildQuery(params) }).then((res) => res.data);
  },
  createAdminService(payload: Partial<Service>) {
    return apiClient.post<Service>('/admin/services/', payload).then((res) => res.data);
  },
  updateAdminService(serviceId: number | string, payload: Partial<Service>) {
    return apiClient.patch<Service>(`/admin/services/${serviceId}/`, payload).then((res) => res.data);
  },
  deleteAdminService(serviceId: number | string) {
    return apiClient.delete(`/admin/services/${serviceId}/`).then((res) => res.data);
  },
  getAdminCategories(params: ApiListParams = {}) {
    return apiClient.get<ServiceCategory[]>('/admin/categories/', { params: buildQuery(params) }).then((res) => res.data);
  },
};
