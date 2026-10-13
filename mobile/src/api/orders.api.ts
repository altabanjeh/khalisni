import { apiClient, buildQuery, unwrapListData } from './client';
import type { ApiListParams } from '../types/common';
import type { Order } from '../types/order';

export const ordersApi = {
  // The backend answers 201 for a new order and 200 when the same Idempotency-Key
  // and payload are replayed; both carry the order and are treated the same.
  createOrder(payload: FormData | Record<string, unknown>, idempotencyKey?: string) {
    return apiClient.post<Order>('/orders/', payload, {
      headers: {
        ...(payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      timeout: 120_000,
    }).then((res) => res.data);
  },
  // The backend exposes tracking as GET and requires both values.
  trackOrder(payload: { order_number: string; phone: string }) {
    return apiClient.get<Order>('/orders/track/', { params: buildQuery(payload) }).then((res) => res.data);
  },
  getCustomerOrders(params: ApiListParams = {}) {
    return apiClient.get<Order[]>('/customer/orders/', { params: buildQuery(params) }).then((res) => unwrapListData(res.data));
  },
  getCustomerOrder(orderId: number | string) {
    return apiClient.get<Order>(`/customer/orders/${orderId}/`).then((res) => res.data);
  },
  cancelCustomerOrder(orderId: number | string, payload: { reason: string }) {
    return apiClient.post(`/customer/orders/${orderId}/cancel/`, payload).then((res) => res.data);
  },
  submitRating(orderId: number | string, payload: { score: number; comment?: string }) {
    return apiClient.post(`/customer/orders/${orderId}/rating/`, payload).then((res) => res.data);
  },
  getEmployeeOrders(params: ApiListParams = {}) {
    return apiClient.get<Order[]>('/admin/orders/', { params: buildQuery(params) }).then((res) => unwrapListData(res.data));
  },
  getEmployeeOrder(orderId: number | string) {
    return apiClient.get<Order>(`/admin/orders/${orderId}/`).then((res) => res.data);
  },
  updateEmployeeStatus(orderId: number | string, payload: { status: string; note?: string }) {
    return apiClient.patch(`/admin/orders/${orderId}/status/`, payload).then((res) => res.data);
  },
  requestEmployeeDocuments(orderId: number | string, payload: { document_types: string[]; note: string }) {
    return apiClient.post(`/admin/orders/${orderId}/request-documents/`, payload).then((res) => res.data);
  },
  assignEmployeeOrder(orderId: number | string, payload: { provider_id: number; note?: string }) {
    return apiClient.patch(`/admin/orders/${orderId}/assign/`, payload).then((res) => res.data);
  },
  addEmployeeNote(orderId: number | string, payload: { note: string; visibility?: string }) {
    return apiClient.post(`/admin/orders/${orderId}/notes/`, payload).then((res) => res.data);
  },
  completeEmployeeOrder(orderId: number | string, payload?: { note?: string }) {
    return apiClient.post(`/admin/orders/${orderId}/complete/`, payload ?? {}).then((res) => res.data);
  },
  cancelEmployeeOrder(orderId: number | string, payload?: { reason?: string }) {
    return apiClient.post(`/admin/orders/${orderId}/cancel/`, payload ?? {}).then((res) => res.data);
  },
  rejectEmployeeOrder(orderId: number | string, payload: { reason: string }) {
    return apiClient.post(`/admin/orders/${orderId}/reject/`, payload).then((res) => res.data);
  },
  getAdminOrders(params: ApiListParams = {}) {
    return apiClient.get<Order[]>('/admin/orders/', { params: buildQuery(params) }).then((res) => unwrapListData(res.data));
  },
  getAdminOrder(orderId: number | string) {
    return apiClient.get<Order>(`/admin/orders/${orderId}/`).then((res) => res.data);
  },
  changeOrderStatus(orderId: number | string, payload: { status: string; note?: string }) {
    return apiClient.patch(`/admin/orders/${orderId}/status/`, payload).then((res) => res.data);
  },
  assignOrder(orderId: number | string, payload: { provider_id: number; note?: string }) {
    return apiClient.patch(`/admin/orders/${orderId}/assign/`, payload).then((res) => res.data);
  },
  requestDocuments(orderId: number | string, payload: { document_types: string[]; note: string }) {
    return apiClient.post(`/admin/orders/${orderId}/request-documents/`, payload).then((res) => res.data);
  },
  addAdminNote(orderId: number | string, payload: { note: string; visibility?: string }) {
    return apiClient.post(`/admin/orders/${orderId}/notes/`, payload).then((res) => res.data);
  },
  completeOrder(orderId: number | string, payload?: { note?: string }) {
    return apiClient.post(`/admin/orders/${orderId}/complete/`, payload ?? {}).then((res) => res.data);
  },
  rejectOrder(orderId: number | string, payload: { reason: string }) {
    return apiClient.post(`/admin/orders/${orderId}/reject/`, payload).then((res) => res.data);
  },
  getProviderOrders(params: ApiListParams = {}) {
    return apiClient.get<Order[]>('/provider/orders/', { params: buildQuery(params) }).then((res) => unwrapListData(res.data));
  },
  getProviderDashboard() {
    return apiClient.get('/provider/dashboard/').then((res) => res.data);
  },
  getProviderOrder(orderId: number | string) {
    return apiClient.get<Order>(`/provider/orders/${orderId}/`).then((res) => res.data);
  },
  providerChangeStatus(orderId: number | string, payload: { status: string; note?: string }) {
    return apiClient.patch(`/provider/orders/${orderId}/status/`, payload).then((res) => res.data);
  },
  providerAddNote(orderId: number | string, payload: { note: string }) {
    return apiClient.post(`/provider/orders/${orderId}/notes/`, payload).then((res) => res.data);
  },
};
