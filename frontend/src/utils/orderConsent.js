// The order consent statement shown on the request form. The server keeps the
// same texts under this version id (backend/orders/consent.py) and stores the
// accepted version with each order, together with the versions of the privacy
// policy and terms of use published at that time. Changing a text means adding
// a new version on both sides, never editing one. The mobile app shows the same
// statement under "order-consent-mobile-v2".
export const ORDER_CONSENT_VERSION = 'order-consent-web-v2'

export const ORDER_CONSENT_TEXT = {
  ar: 'أوافق على شروط الاستخدام وسياسة الخصوصية، وعلى استخدام بياناتي ومستنداتي لإنجاز هذه الخدمة فقط وإشعاري بأي نواقص.',
  en: 'I agree to the Terms of Use and the Privacy Policy, and that my details and documents are used only to complete this service and to notify me of anything missing.',
}

// The phrases of the statement that link to the legal pages.
export const ORDER_CONSENT_LINKS = {
  ar: [
    { text: 'شروط الاستخدام', to: '/terms' },
    { text: 'سياسة الخصوصية', to: '/privacy' },
  ],
  en: [
    { text: 'Terms of Use', to: '/terms' },
    { text: 'Privacy Policy', to: '/privacy' },
  ],
}

// Split the statement into plain text and link segments, keeping the exact wording.
export function consentSegments(language) {
  const text = ORDER_CONSENT_TEXT[language] || ORDER_CONSENT_TEXT.ar
  const links = ORDER_CONSENT_LINKS[language] || ORDER_CONSENT_LINKS.ar
  const segments = []
  let rest = text
  for (const link of links) {
    const index = rest.indexOf(link.text)
    if (index < 0) continue
    if (index > 0) segments.push({ text: rest.slice(0, index) })
    segments.push(link)
    rest = rest.slice(index + link.text.length)
  }
  if (rest) segments.push({ text: rest })
  return segments
}
