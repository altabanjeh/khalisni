export interface PublicSiteTheme {
  theme_id?: number;
  name?: string;
  primary_color?: string;
  secondary_color?: string;
  background_color?: string;
  text_color?: string;
  header_background_color?: string;
  footer_background_color?: string;
  logo_url?: string;
  favicon_url?: string;
  active_theme?: boolean;
}

export interface PublicHomepageContent {
  content_id?: number;
  version_name?: string;
  hero_title_ar?: string;
  hero_title_en?: string;
  hero_subtitle_ar?: string;
  hero_subtitle_en?: string;
  primary_button_text?: string;
  primary_button_url?: string;
  secondary_button_text?: string;
  secondary_button_url?: string;
  hero_image_url?: string;
  how_it_works_text?: string;
  contact_phone?: string;
  whatsapp_number?: string;
  email?: string;
  office_address?: string;
  footer_text?: string;
  active_content?: boolean;
}

export interface PublicAdvertisement {
  id?: number;
  advertisement_id?: number;
  title_ar?: string;
  title_en?: string;
  description_ar?: string;
  description_en?: string;
  advertisement_type: string;
  image_url?: string;
  button_text_ar?: string;
  button_text_en?: string;
  button_url?: string;
  background_color?: string;
  text_color?: string;
  display_order?: number;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
  is_currently_public?: boolean;
}

export interface PublicHomepagePayload {
  content: PublicHomepageContent;
  advertisements: PublicAdvertisement[];
  important_alert?: PublicAdvertisement | null;
}
