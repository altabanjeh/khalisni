import type { Order } from './order';

export interface SummaryCardSet {
  [key: string]: number | string | null;
}

export interface AdminDashboardReport {
  cards: SummaryCardSet;
  orders_by_status?: Array<{ status: string; total: number }>;
  top_services?: Array<{ service__name_ar?: string; total: number }>;
  provider_performance?: Array<{ assigned_provider__user__full_name?: string; total: number }>;
}

export interface EmployeeDashboardReport {
  summary: SummaryCardSet;
  queues?: Record<string, Order[]>;
}

export interface OperationalSummaryReport {
  totals?: SummaryCardSet;
  orders_by_status?: Array<{ status: string; total: number }>;
  missing_documents?: Array<{ document_type: string; total: number }>;
  payment_summary?: SummaryCardSet;
  employee_workload?: unknown;
  provider_performance?: unknown;
  completed_orders?: { total: number; orders: Order[] };
  delayed_orders?: { total: number; orders: Order[] };
}
