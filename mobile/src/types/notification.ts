import type { BaseEntity } from './common';

export interface AppNotification extends BaseEntity {
  title?: string;
  message: string;
  is_read?: boolean;
  order?: number | null;
  order_number?: string;
}

export interface NotificationTemplate extends BaseEntity {
  template_id?: number;
  key: string;
  channel?: string;
  title_ar?: string;
  title_en?: string;
  message_ar?: string;
  message_en?: string;
}
