const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const ARABIC_DECIMAL_SEPARATOR = '٫';
const ARABIC_THOUSANDS_SEPARATOR = '٬';
export const CURRENCY_SUFFIX_AR = 'د.أ';

/** Latin digits written as Arabic-Indic digits (the app is Arabic only). */
export function toArabicDigits(value: string | number) {
  return String(value).replace(/[0-9]/g, (digit) => ARABIC_INDIC_DIGITS[Number(digit)]);
}

/** Arabic-Indic and Extended Arabic-Indic digits read as Latin digits (for input sent to the API). */
export function toLatinDigits(value: string) {
  return String(value ?? '')
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

export function formatDate(value?: string | null) {
  if (!value) return 'غير متوفر';
  try {
    return new Intl.DateTimeFormat('ar-JO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatDateTime(value?: string | null) {
  if (!value) return 'غير متوفر';
  try {
    return new Intl.DateTimeFormat('ar-JO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

/**
 * Jordanian dinars in Arabic, the way the web shows them with the ar locale:
 * "٥٠٫٠٠ د.أ", "١٬٢٥٠٫٥٠ د.أ". Built by hand instead of Intl so the result is
 * the same on Hermes builds with partial locale data.
 */
export function formatCurrency(value?: number | string | null) {
  if (value === null || value === undefined || value === '') return 'غير محدد';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'غير محدد';
  const negative = amount < 0;
  const [whole, fraction] = Math.abs(amount).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ARABIC_THOUSANDS_SEPARATOR);
  const number = toArabicDigits(`${grouped}${ARABIC_DECIMAL_SEPARATOR}${fraction}`);
  return `${negative ? '-' : ''}${number} ${CURRENCY_SUFFIX_AR}`;
}

/** Step label for list position `index` (0-based): "١", "٢", ... "١٠" (never "010"). */
export function formatStepNumber(index: number) {
  return toArabicDigits(index + 1);
}
