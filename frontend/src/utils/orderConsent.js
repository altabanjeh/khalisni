// The order consent statement shown on the request form. The server keeps the
// same texts under this version id (backend/orders/consent.py) and stores the
// accepted version with each order. Changing a text means adding a new
// version on both sides, never editing this one.
export const ORDER_CONSENT_VERSION = 'order-consent-web-v1'

export const ORDER_CONSENT_TEXT = {
  ar: 'أوافق على استخدام بياناتي ومستنداتي لإنجاز هذه الخدمة فقط، وإشعاري بأي نواقص.',
  en: 'I agree that my details and documents are used only to complete this service, and to be notified of anything missing.',
}
