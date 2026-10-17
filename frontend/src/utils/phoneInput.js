// Shared phone-field presentation for public forms (register, contact), so the
// input type and the format guidance cannot drift between pages. The format
// rules themselves live on the server (accounts/validators.py).

export const PHONE_PLACEHOLDER = '0791234567'

export const PHONE_INPUT_PROPS = {
  autoComplete: 'tel',
  dir: 'ltr',
  inputMode: 'tel',
  placeholder: PHONE_PLACEHOLDER,
  type: 'tel',
}

export function getPhoneFormatHint(isArabic) {
  return isArabic
    ? 'مثال: 0791234567 أو ‎+962791234567. للأرقام من خارج الأردن أضف رمز الدولة مسبوقاً بـ +.'
    : 'Example: 0791234567 or +962791234567. For a number outside Jordan, add the country code after +.'
}
