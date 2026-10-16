// The order consent statement shown on the mobile request screen. The server
// keeps the same text under this version id (backend/orders/consent.py) and
// stores the accepted version with each order. A changed text needs a new
// version on both sides.
export const ORDER_CONSENT_VERSION = 'order-consent-mobile-v1';

export const ORDER_CONSENT_TEXT = 'أوافق على استخدام بياناتي ووثائقي لأغراض تنفيذ الخدمة فقط.';
