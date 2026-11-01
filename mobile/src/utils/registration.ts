import type { ApiError } from '../types/common';

// Customer-facing summary of the backend password rules
// (AUTH_PASSWORD_VALIDATORS, enforced by POST /api/auth/register/). Same list
// as the web hint, frontend/src/utils/passwordPolicy.js. The server stays the
// authority: its messages (Arabic for Accept-Language: ar) are shown on the field.
export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_RULES_AR = [
  `${PASSWORD_MIN_LENGTH} أحرف على الأقل`,
  'لا تتكون من أرقام فقط',
  'ليست كلمة مرور شائعة أو سهلة التخمين',
  'لا تشبه اسمك أو بريدك الإلكتروني أو رقم هاتفك',
];

// Same guidance as the web phone field (frontend/src/utils/phoneInput.js). The
// server stores the canonical E.164 number and treats a number without a
// country code as Jordanian (+962), so 079..., +96279... and 0096279... are
// all accepted; the mobile app sends what the customer typed.
export const PHONE_PLACEHOLDER = '0791234567';
export const PHONE_FORMAT_HINT_AR = 'مثال: 0791234567 أو ‎+962791234567. للأرقام من خارج الأردن أضف رمز الدولة مسبوقاً بـ +.';

export const REGISTER_FIELDS = ['full_name', 'phone', 'email', 'national_id', 'password'] as const;
export type RegisterField = (typeof REGISTER_FIELDS)[number];

export interface RegisterForm {
  full_name: string;
  phone: string;
  email: string;
  national_id: string;
  password: string;
}

export interface RegisterPayload {
  full_name: string;
  phone: string;
  email: string;
  national_id?: string;
  password: string;
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Required-field checks done before calling the server; everything else is the server's call. */
export function validateRegisterForm(form: RegisterForm) {
  const errors: Partial<Record<RegisterField, string>> = {};
  if (!form.full_name.trim()) errors.full_name = 'الاسم الكامل مطلوب.';
  if (!form.phone.trim()) errors.phone = 'رقم الهاتف مطلوب.';
  if (!form.email.trim()) errors.email = 'البريد الإلكتروني مطلوب.';
  else if (!EMAIL_SHAPE.test(form.email.trim())) errors.email = 'أدخل بريداً إلكترونياً صحيحاً.';
  if (!form.password) errors.password = 'كلمة المرور مطلوبة.';
  else if (form.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `كلمة المرور يجب أن تكون ${PASSWORD_MIN_LENGTH} أحرف على الأقل.`;
  }
  return errors;
}

/**
 * Body of POST /api/auth/register/. Text fields are trimmed; the password is
 * sent exactly as typed (the server does not trim it either). An empty
 * national ID is left out because the field is optional.
 */
export function buildRegisterPayload(form: RegisterForm): RegisterPayload {
  const payload: RegisterPayload = {
    full_name: form.full_name.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    password: form.password,
  };
  const nationalId = form.national_id.trim();
  if (nationalId) payload.national_id = nationalId;
  return payload;
}

/**
 * Splits a normalized API error into messages for the registration fields
 * (first server message per field) and one general message for the rest
 * (non_field_errors, throttling, network). Same behaviour as the web
 * RegisterPage: when a field error exists, no generic banner is added.
 */
export function mapRegisterErrors(error: ApiError) {
  const fieldErrors: Partial<Record<RegisterField, string>> = {};
  const otherMessages: string[] = [];
  Object.entries(error.fieldErrors ?? {}).forEach(([key, messages]) => {
    const message = (messages ?? []).find((item) => String(item || '').trim());
    if (!message) return;
    if ((REGISTER_FIELDS as readonly string[]).includes(key)) {
      fieldErrors[key as RegisterField] = message;
    } else {
      otherMessages.push(message);
    }
  });
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const general = otherMessages.length
    ? otherMessages.join(' ')
    : hasFieldErrors
      ? ''
      : error.message;
  return { fieldErrors, general };
}
