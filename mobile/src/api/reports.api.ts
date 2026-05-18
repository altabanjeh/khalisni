import { apiClient, buildQuery } from './client';
import type { ApiListParams } from '../types/common';
import type { AdminDashboardReport, EmployeeDashboardReport, OperationalSummaryReport } from '../types/report';

export const reportsApi = {
  getAdminDashboard() {
    return apiClient.get<AdminDashboardReport>('/admin/dashboard/').then((res) => res.data);
  },
  getDailyReport() {
    return apiClient.get('/admin/reports/daily/').then((res) => res.data);
  },
  getWeeklyReport() {
    return apiClient.get('/admin/reports/weekly/').then((res) => res.data);
  },
  getEmployeeDashboard() {
    return apiClient.get<EmployeeDashboardReport>('/employee/dashboard/').then((res) => res.data);
  },
  getEmployeeReports(params: ApiListParams = {}) {
    return apiClient.get('/employee/reports/summary/', { params: buildQuery(params) }).then((res) => res.data);
  },
  getOperationalSummary(params: ApiListParams = {}) {
    return apiClient.get<OperationalSummaryReport>('/reports/summary/', { params: buildQuery(params) }).then((res) => res.data);
  },
};
