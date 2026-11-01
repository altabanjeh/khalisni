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
  // Provider detail: the customer's notes and the service answers block (multi-line).
  assigned_work_details?: string;
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

// GET /api/orders/track/ (backend orders/serializers.py TrackOrderSerializer).
export interface TrackOrderResult {
  id: number;
  order_number: string;
  status: string;
  timeline?: OrderStatusLog[];
  missing_documents?: string[];
  missing_document_details?: Array<{ document_type: string; name_ar?: string; name_en?: string }>;
  final_documents?: OrderDocument[];
}

// GET/POST /api/customer/orders/<id>/messages/.
export interface OrderMessage {
  id: number;
  message: string;
  author_role: 'customer' | 'staff';
  created_at?: string;
}

// GET /api/customer/orders/<id>/delivery/ (backend orders/delivery.py).
export interface OrderDelivery {
  delivery_method: 'electronic' | 'paper_pickup' | 'paper_courier' | string;
  delivery_method_label_ar?: string;
  delivery_method_label_en?: string;
  delivery_instructions?: string;
}

// GET/POST /api/customer/orders/<id>/complaints/ (backend orders/complaints.py).
export interface OrderComplaint {
  id: number;
  description: string;
  is_resolved: boolean;
  created_at?: string;
  resolved_at?: string | null;
}
