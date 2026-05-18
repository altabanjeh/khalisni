import { apiClient, buildQuery } from './client';
import type { ApiListParams } from '../types/common';
import type { AppNotification, NotificationTemplate } from '../types/notification';

export const notificationsApi = {
  getNotifications(params: ApiListParams = {}) {
    return apiClient.get<AppNotification[]>('/notifications/', { params: buildQuery(params) }).then((res) => res.data);
  },
  getAdminNotifications(params: ApiListParams = {}) {
    return apiClient.get<AppNotification[]>('/admin/notifications/', { params: buildQuery(params) }).then((res) => res.data);
  },
  getEmployeeNotificationTemplates() {
    return apiClient.get<NotificationTemplate[]>('/employee/notification-templates/').then((res) => res.data);
  },
  getAdminNotificationTemplates(params: ApiListParams = {}) {
    return apiClient.get<NotificationTemplate[]>('/admin/notification-templates/', { params: buildQuery(params) }).then((res) => res.data);
  },
  sendManualOrderNotification(orderId: number | string, payload: { template_id?: number; title?: string; message?: string }) {
    return apiClient.post(`/orders/${orderId}/manual-notification/`, payload).then((res) => res.data);
  },
  markAsRead(notificationId: number | string) {
    return apiClient.patch(`/notifications/${notificationId}/read/`).then((res) => res.data);
  },
};
