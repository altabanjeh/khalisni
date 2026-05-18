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
  fieldErrors?: Record<string, string[]>;
}
