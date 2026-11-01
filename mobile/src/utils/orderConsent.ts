// The order consent statement shown on the mobile request screen. The server
// keeps the same text under this version id (backend/orders/consent.py) and
// stores the accepted version with each order (consent_source=mobile). A
// changed text needs a new version on both sides; never edit a text in place.
// v2 (owner decision, 2026-11): adds the terms of use and privacy policy
// (linked next to the switch) and notification of missing items.
export const ORDER_CONSENT_VERSION = 'order-consent-mobile-v2';

export const ORDER_CONSENT_TEXT = 'أوافق على شروط الاستخدام وسياسة الخصوصية، وعلى استخدام بياناتي ومستنداتي لإنجاز هذه الخدمة فقط وإشعاري بأي نواقص.';

export const ORDER_CONSENT_SOURCE = 'mobile';
