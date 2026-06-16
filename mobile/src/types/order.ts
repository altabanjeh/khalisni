import type { OrderDocument } from './document';
import type { BaseEntity } from './common';
import type { Service } from './service';
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
  [key: string]: boolean | undefined;
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
  provider_instructions?: string | null;
  missing_document_types?: string[];
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
  consent: boolean;
  document_types?: string[];
  documents?: unknown[];
}
