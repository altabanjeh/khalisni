import type { BaseEntity } from './common';

export interface ServiceCategory extends BaseEntity {
  name_ar: string;
  name_en?: string;
  slug?: string;
}

export interface ServiceRequirement {
  id?: number;
  service?: number;
  name_ar?: string;
  name_en?: string;
  document_type: string;
  is_required?: boolean;
  allowed_extensions?: string[];
  max_file_size?: number;
  requires_verification?: boolean;
  client_can_replace_file?: boolean;
  provider_can_view_file?: boolean;
  display_order?: number;
  is_active?: boolean;
}

export interface Service extends BaseEntity {
  name_ar: string;
  name_en?: string;
  slug: string;
  short_description_ar?: string;
  short_description_en?: string;
  description_ar?: string;
  description_en?: string;
  estimated_duration?: string | number;
  estimated_duration_unit?: string;
  base_price?: number;
  service_fee?: number;
  government_fee?: number;
  final_price?: number;
  total_fee?: number;
  category?: ServiceCategory;
  category_name?: string;
  is_active?: boolean;
  is_online?: boolean;
  is_featured?: boolean;
  price_type?: string;
  provider_required?: boolean;
  requires_manual_review?: boolean;
  requires_appointment?: boolean;
  display_order?: number;
  document_requirements?: ServiceRequirement[];
  required_documents?: ServiceRequirement[];
  required_information_schema?: Array<Record<string, unknown>>;
  terms_ar?: string;
  terms_en?: string;
  steps?: string[];
  related_services?: Service[];
}
