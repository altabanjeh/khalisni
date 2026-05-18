import type { BaseEntity } from './common';

export interface DocumentOrderReference {
  id: number;
  order_number: string;
  status: string;
  service_name?: string;
}

export interface OrderDocument extends BaseEntity {
  document_type: string;
  original_filename: string;
  file_size?: number;
  mime_type?: string;
  status?: string;
  is_final_document?: boolean;
  is_verified?: boolean;
  verification_note?: string;
  rejection_reason?: string;
  uploaded_by_role?: string;
  uploaded_by_name?: string;
  verified_by_name?: string;
  verified_at?: string;
  download_url?: string | null;
  order?: DocumentOrderReference | null;
}

export interface DocumentVerificationPayload {
  is_verified: boolean;
  note?: string;
}

export interface UploadableDocument {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}
