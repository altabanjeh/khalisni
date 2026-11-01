// Published contact details (D05). The active CMS content row is the one source;
// these helpers only format what it publishes.

// A tel: URI carries only the digits and a leading +; the visible text keeps
// the spacing the content editor typed ("+962 6 560 9000" -> "tel:+96265609000").
export function telHref(phone) {
  const value = String(phone || '').trim()
  return (value.startsWith('+') ? '+' : '') + value.replace(/\D/g, '')
}

// wa.me takes the full international number as digits only (no +, no 00).
export function whatsappHref(number) {
  let digits = String(number || '').replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  return digits ? `https://wa.me/${digits}` : ''
}

export function localizedContact(content, isArabic) {
  const pick = (ar, en) => String((isArabic ? content?.[ar] || content?.[en] : content?.[en] || content?.[ar]) || '').trim()
  return {
    phone: String(content?.contact_phone || '').trim(),
    whatsapp: String(content?.whatsapp_number || '').trim(),
    email: String(content?.email || '').trim(),
    address: pick('office_address', 'office_address_en'),
    hours: pick('office_hours_ar', 'office_hours_en'),
  }
}

export function hasPublishedContact(contact) {
  return Boolean(contact.phone || contact.whatsapp || contact.email || contact.address || contact.hours)
}

export const NO_CONTACT_TEXT = {
  ar: 'معلومات التواصل غير منشورة حالياً.',
  en: 'Contact details are not published yet.',
}
