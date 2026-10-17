import { apiClient, buildQuery, fetchPage, unwrapListData } from './client';
import type { ApiListParams } from '../types/common';
import type { AppNotification, NotificationTemplate } from '../types/notification';

export const notificationsApi = {
  getNotifications(params: ApiListParams = {}) {
    return apiClient.get<AppNotification[]>('/notifications/', { params: buildQuery(params) }).then((res) => unwrapListData(res.data));
  },
  // One page of the caller's notifications ({results, next, count}); screens load more on demand.
  getNotificationsPage(params: ApiListParams = {}) {
    return fetchPage<AppNotification>('/notifications/', params);
  },
  getAdminNotificationsPage(params: ApiListParams = {}) {
    return fetchPage<AppNotification>('/admin/notifications/', params);
  },
  // Server-side count, so the badge is right however many pages exist.
  getUnreadCount() {
    return apiClient.get<{ unread: number }>('/notifications/unread-count/').then((res) => Number(res.data?.unread ?? 0));
  },
  markAllAsRead() {
    return apiClient.post('/notifications/mark-all-read/').then((res) => res.data);
  },
  getAdminNotifications(params: ApiListParams = {}) {
    return apiClient.get<AppNotification[]>('/admin/notifications/', { params: buildQuery(params) }).then((res) => unwrapListData(res.data));
  },
  getEmployeeNotificationTemplates() {
    return apiClient.get<NotificationTemplate[]>('/employee/notification-templates/').then((res) => unwrapListData(res.data));
  },
  getAdminNotificationTemplates(params: ApiListParams = {}) {
    return apiClient.get<NotificationTemplate[]>('/admin/notification-templates/', { params: buildQuery(params) }).then((res) => unwrapListData(res.data));
  },
  sendManualOrderNotification(orderId: number | string, payload: { template_id?: number; title?: string; message?: string }) {
    return apiClient.post(`/orders/${orderId}/manual-notification/`, payload).then((res) => res.data);
  },
  markAsRead(notificationId: number | string) {
    return apiClient.patch(`/notifications/${notificationId}/read/`).then((res) => res.data);
  },
};
