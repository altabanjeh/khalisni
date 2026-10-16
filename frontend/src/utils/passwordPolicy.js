// Customer-facing summary of the backend password rules (AUTH_PASSWORD_VALIDATORS
// in backend/config/settings.py). The backend stays the authority: this text
// only explains what it checks. accounts.tests_p2_remediation fails when a
// validator is added or removed there without updating this list.
export const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_RULES = [
  {
    validator: 'MinimumLengthValidator',
    ar: `${PASSWORD_MIN_LENGTH} أحرف على الأقل`,
    en: `At least ${PASSWORD_MIN_LENGTH} characters`,
  },
  {
    validator: 'NumericPasswordValidator',
    ar: 'لا تتكون من أرقام فقط',
    en: 'Not only numbers',
  },
  {
    validator: 'CommonPasswordValidator',
    ar: 'ليست كلمة مرور شائعة أو سهلة التخمين',
    en: 'Not a common or easy-to-guess password',
  },
  {
    validator: 'UserAttributeSimilarityValidator',
    ar: 'لا تشبه اسمك أو بريدك الإلكتروني أو رقم هاتفك',
    en: 'Not similar to your name, email or phone number',
  },
]

export function getPasswordRules(language) {
  return PASSWORD_RULES.map((rule) => (language === 'en' ? rule.en : rule.ar))
}
