export interface BaseEntity {
  id: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApiListParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface OptionItem {
  label: string;
  value: string | number;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  fieldErrors?: Record<string, string[]>;
  // `document_errors` from order creation: { document_type: message }.
  documentErrors?: Record<string, string>;
  // `service_answers` from order creation: { schema field key: message }.
  serviceAnswerErrors?: Record<string, string>;
  // The same `service_answers` object as sent: a repeater's entry may be
  // {"<row>": {"<item key>": message}} (see utils/serviceForms.ts).
  serviceAnswerDetails?: Record<string, unknown>;
}
