import type { OrderDocument } from './document';
import type { BaseEntity } from './common';
import type { Service, ServiceRequirement } from './service';
import type { User } from './user';

export interface ProviderProfileBrief {
  id: number;
  full_name: string;
  provider_type?: string;
  city?: string;
  rating?: number;
  is_available?: boolean;
}

export interface OrderNote {
  id: number;
  user?: number;
  user_name?: string;
  note: string;
  visibility?: string;
  created_at?: string;
}

export interface OrderStatusLog {
  id: number;
  old_status?: string;
  new_status: string;
  changed_by?: number;
  changed_by_name?: string;
  note?: string;
  // Code of a system-written note (backend orders/system_events.py); the
  // screen renders it in Arabic. Empty for notes a person typed.
  system_event?: string;
  system_event_params?: Record<string, string>;
  created_at?: string;
}

export interface OrderAllowedActions {
  can_upload_documents?: boolean;
  can_cancel?: boolean;
  can_rate?: boolean;
  can_review?: boolean;
  can_request_documents?: boolean;
  can_assign_provider?: boolean;
  can_update_status?: boolean;
  can_complete?: boolean;
  can_upload_final_document?: boolean;
  can_verify_document?: boolean;
  can_send_manual_notification?: boolean;
  can_reject?: boolean;
  can_upload_customer_document?: boolean;
  can_view_missing_documents_form?: boolean;
  // false: the order waits for the customer but its request names nothing the
  // customer can upload (only staff recovery can move it). null when not waiting.
  missing_document_request_valid?: boolean | null;
  [key: string]: unknown;
}

export interface Order extends BaseEntity {
  order_number: string;
  customer?: Pick<User, 'id' | 'full_name' | 'phone' | 'email' | 'national_id'>;
  city?: string;
  service?: Service;
  status: string;
  priority?: string;
  assigned_employee?: Pick<User, 'id' | 'full_name' | 'email' | 'role'> | null;
  assigned_provider?: ProviderProfileBrief | null;
  expected_delivery_date?: string | null;
  final_price?: number | null;
  customer_notes?: string;
  internal_notes?: string;
  provider_instructions?: string[] | null;
  missing_document_types?: string[];
  // The order's requirement snapshot (backend orders/readiness.py SNAPSHOT_FIELDS).
  required_documents?: ServiceRequirement[];
  rejection_reason?: string;
  is_archived?: boolean;
  completed_at?: string | null;
  documents?: OrderDocument[];
  status_logs?: OrderStatusLog[];
  notes?: OrderNote[];
  rating?: {
    id: number;
    score: number;
    comment?: string;
    created_at?: string;
  } | null;
  allowed_actions?: OrderAllowedActions;
}

export interface CreateOrderPayload {
  service: number;
  full_name: string;
  phone: string;
  national_id?: string;
  city: string;
  notes?: string;
  service_answers?: string;
  consent: boolean;
  document_types?: string[];
  documents?: unknown[];
}
