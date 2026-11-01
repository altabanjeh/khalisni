import type { UploadableDocument } from '../types/document';
import type { Service, ServiceRequirement } from '../types/service';
import { GENERIC_REQUIRED_DOCUMENT_LABEL, getRequirementLabel } from './documentPresentation';
import { toLatinDigits } from './format';

const globalUploadRules = {
  allowed_extensions: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
  max_file_size: 10 * 1024 * 1024,
};

export interface ServiceSchemaField {
  key: string;
  inputName: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'tel' | 'date' | 'select' | 'checkbox';
  required: boolean;
  placeholder: string;
  helpText: string;
  options: Array<{ value: string; label: string }>;
  visibleWhen: { field: string; equals: string } | null;
}

function normalizeExtension(value: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  return normalized.startsWith('.') ? normalized : `.${normalized}`;
}

const ARABIC_TEXT = /[؀-ۿ]/;
const DIGITS_ONLY = /^\d+$/;
// A Latin placeholder is kept only when it is a format example such as "0791234567".
const FORMAT_EXAMPLE = /^[\d\s+\-./:]+$/;

/** First candidate that contains Arabic text (the app shows no English copy). */
function firstArabic(...candidates: unknown[]) {
  for (const candidate of candidates) {
    const text = candidate == null ? '' : String(candidate).trim();
    if (text && ARABIC_TEXT.test(text)) return text;
  }
  return '';
}

/**
 * Select options with Arabic labels only. An option without an Arabic label is
 * shown as "خيار N" (same masking as the web, frontend/src/utils/serviceForms.js);
 * a purely numeric value is shown as is. The submitted value never changes.
 */
function normalizeOptions(options: unknown): Array<{ value: string; label: string }> {
  if (!Array.isArray(options)) return [];

  return options
    .map((option, index) => {
      const fallback = `خيار ${index + 1}`;
      if (option && typeof option === 'object') {
        const record = option as Record<string, unknown>;
        // First non-empty of value/id/key/slug, as the server reads it.
        const value = [record.value, record.id, record.key, record.slug].find((item) => item != null && item !== '');
        if (value == null || value === '') return null;
        const label = firstArabic(record.label_ar, record.name_ar, record.label, record.name, record.title)
          || (DIGITS_ONLY.test(String(value)) ? String(value) : fallback);
        return { value: String(value), label };
      }

      if (option == null || option === '') return null;
      const text = String(option);
      return { value: text, label: ARABIC_TEXT.test(text) || DIGITS_ONLY.test(text) ? text : fallback };
    })
    .filter((option): option is { value: string; label: string } => Boolean(option));
}

function normalizeSchemaType(value: unknown): ServiceSchemaField['type'] {
  const normalized = String(value || 'text').trim().toLowerCase();
  if (['textarea', 'number', 'email', 'tel', 'date', 'select', 'checkbox'].includes(normalized)) {
    return normalized as ServiceSchemaField['type'];
  }
  return 'text';
}

function sanitizeFieldToken(value: unknown, fallback: string) {
  const normalized = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || fallback;
}

export function formatBytes(bytes: number) {
  const numericValue = Number(bytes || 0);
  if (!numericValue) return '0 B';
  if (numericValue < 1024) return `${numericValue} B`;

  const units = ['KB', 'MB', 'GB'];
  let size = numericValue / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

// Arabic name only: never the internal document code or an English name.
export function getRequiredDocumentLabel(item?: string | ServiceRequirement | null) {
  if (typeof item === 'string') return /[؀-ۿ]/.test(item) ? item : GENERIC_REQUIRED_DOCUMENT_LABEL;
  if (!item) return '';
  return getRequirementLabel(item);
}

export function getRequiredDocumentType(item?: string | ServiceRequirement | null, index = 0) {
  if (item && typeof item === 'object' && item.document_type) {
    return String(item.document_type).trim().toLowerCase();
  }

  if (typeof item === 'string' && item.trim()) {
    return String(item).trim().toLowerCase();
  }

  return `document_${index}`;
}

export function getDocumentFieldName(item?: string | ServiceRequirement | null, index = 0) {
  return `document_${sanitizeFieldToken(getRequiredDocumentType(item, index), `document_${index}`)}`;
}

export function getServiceSchemaFields(service?: Service | null): ServiceSchemaField[] {
  const schema = Array.isArray(service?.required_information_schema) ? service.required_information_schema : [];

  return schema
    .map((field, index) => {
      if (!field || typeof field !== 'object') return null;

      const record = field as Record<string, unknown>;
      const rawKey = record.name ?? record.key ?? record.field ?? record.id ?? `field_${index + 1}`;
      const inputName = `service_info_${sanitizeFieldToken(rawKey, `field_${index + 1}`)}`;
      // Arabic copy only: label_ar first, then any Arabic label; otherwise the
      // same neutral fallback as the web ("معلومة مطلوبة N"), never English.
      const label = firstArabic(record.label_ar, record.label, record.name_ar, record.title, record.placeholder_ar)
        || `معلومة مطلوبة ${index + 1}`;
      const type = normalizeSchemaType(record.type || record.field_type || record.input_type);
      const latinPlaceholder = String(record.placeholder ?? '').trim();

      return {
        key: String(rawKey),
        inputName,
        label,
        type,
        required: Boolean(record.required),
        placeholder: firstArabic(record.placeholder_ar, record.placeholder)
          || (FORMAT_EXAMPLE.test(latinPlaceholder) ? latinPlaceholder : '')
          || (type === 'date' ? DATE_PLACEHOLDER : ''),
        helpText: firstArabic(record.help_text_ar, record.help_text, record.description_ar, record.description)
          || (type === 'date' ? DATE_HINT_AR : ''),
        options: normalizeOptions(record.options || record.choices || record.values),
        visibleWhen: normalizeVisibleWhen(record.visible_when),
      };
    })
    .filter((field): field is ServiceSchemaField => Boolean(field));
}

function normalizeVisibleWhen(condition: unknown): ServiceSchemaField['visibleWhen'] {
  if (!condition || typeof condition !== 'object') return null;
  const record = condition as Record<string, unknown>;
  if (record.field == null) return null;
  return { field: String(record.field), equals: String(record.equals ?? '') };
}

/**
 * A field with `visible_when` is shown only while the field it names holds the
 * expected answer (parcel and basin numbers appear after "yes" to "do you know
 * them?"). A hidden field is neither required nor sent. Same rule as the web app.
 */
const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);

function isTruthyAnswer(value: unknown) {
  if (typeof value === 'boolean') return value;
  return TRUE_VALUES.has(String(value ?? '').trim().toLowerCase());
}

export function isSchemaFieldVisible(
  field: ServiceSchemaField,
  schemaFields: ServiceSchemaField[],
  values: Record<string, string | boolean>,
  depth = 0,
): boolean {
  if (!field.visibleWhen) return true;
  if (depth > schemaFields.length) return true;
  // Same matching as the server (backend services/schema_rules.py _is_visible):
  // the controlling key is compared trimmed and case-insensitively, and a
  // checkbox controller compares as true/false.
  const target = field.visibleWhen.field.trim().toLowerCase();
  const controller = schemaFields.find((candidate) => candidate.key.trim().toLowerCase() === target);
  if (!controller || !isSchemaFieldVisible(controller, schemaFields, values, depth + 1)) return false;
  const answer = values[controller.inputName];
  if (controller.type === 'checkbox') {
    return isTruthyAnswer(answer) === TRUE_VALUES.has(field.visibleWhen.equals.trim().toLowerCase());
  }
  return String(answer ?? '') === field.visibleWhen.equals;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// Date fields are typed (no date-picker package is installed): the expected
// form is shown as placeholder and hint, and validated before sending.
export const DATE_PLACEHOLDER = '2026-01-31';
export const DATE_HINT_AR = 'اكتب التاريخ بالصيغة سنة-شهر-يوم (YYYY-MM-DD)، مثل 2026-01-31.';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Arabic format error for a filled answer, mirroring the server checks; null when valid. */
export function validateSchemaAnswerFormat(field: ServiceSchemaField, value: unknown) {
  if (field.type === 'checkbox' || value == null || typeof value === 'boolean') return null;
  const text = normalizeAnswerText(field, value);
  if (!text) return null;
  if (field.type === 'number' && !Number.isFinite(Number(text.replace(',', '.')))) {
    return 'أدخل رقماً صحيحاً.';
  }
  if (field.type === 'email' && !EMAIL.test(text)) {
    return 'أدخل بريداً إلكترونياً صحيحاً.';
  }
  if (field.type === 'date') {
    const valid = ISO_DATE.test(text) && !Number.isNaN(Date.parse(`${text}T00:00:00Z`))
      && new Date(`${text}T00:00:00Z`).toISOString().slice(0, 10) === text;
    if (!valid) return 'أدخل التاريخ بالصيغة سنة-شهر-يوم، مثل 2026-01-31.';
  }
  if (field.type === 'select' && field.options.length && !field.options.some((option) => option.value === text)) {
    return 'اختر أحد الخيارات المتاحة.';
  }
  return null;
}

// Numbers, dates and phone numbers typed on an Arabic keyboard arrive with
// Arabic-Indic digits; they are checked and sent with Latin digits.
function normalizeAnswerText(field: ServiceSchemaField, value: unknown) {
  const text = String(value ?? '').trim();
  return field.type === 'number' || field.type === 'date' || field.type === 'tel' ? toLatinDigits(text) : text;
}

export type ServiceAnswerValue = string | boolean;

/**
 * The `service_answers` object sent with POST /api/orders/: one entry per
 * VISIBLE schema field, keyed by the schema field key (`name ?? key ?? field
 * ?? id ?? field_N`, not the sanitized input name). Hidden `visible_when`
 * fields are left out entirely. Checkboxes are booleans; select fields send
 * the option value; other types send trimmed text, and an empty optional
 * answer is omitted. The server validates these answers and builds the
 * "additional information" section of the order notes itself, so `notes`
 * carries only the customer's own text.
 */
export function buildServiceAnswers(
  schemaFields: ServiceSchemaField[],
  values: Record<string, string | boolean>,
) {
  const answers: Record<string, ServiceAnswerValue> = {};
  schemaFields
    .filter((field) => isSchemaFieldVisible(field, schemaFields, values))
    .forEach((field) => {
      const rawValue = values[field.inputName];
      if (field.type === 'checkbox') {
        answers[field.key] = rawValue === true || rawValue === 'true';
        return;
      }
      if (rawValue == null || typeof rawValue === 'boolean') return;
      const text = normalizeAnswerText(field, rawValue);
      if (text) answers[field.key] = text;
    });
  return answers;
}

export function getUploadRules(requirement?: ServiceRequirement | null) {
  const allowedExtensions =
    Array.isArray(requirement?.allowed_extensions) && requirement.allowed_extensions.length
      ? requirement.allowed_extensions.map(normalizeExtension).filter(Boolean)
      : globalUploadRules.allowed_extensions;

  return {
    allowed_extensions: [...new Set(allowedExtensions)],
    max_file_size: Number(requirement?.max_file_size || globalUploadRules.max_file_size),
  };
}

export function buildUploadHint(requirement?: ServiceRequirement | null) {
  const rules = getUploadRules(requirement);
  const extensions = rules.allowed_extensions.map((extension) => extension.replace('.', '').toUpperCase()).join(', ');
  return `الملفات المسموحة: ${extensions} | الحد الأقصى: ${formatBytes(rules.max_file_size)}`;
}

export function validateUploadableFile(file: UploadableDocument, requirement?: ServiceRequirement | null) {
  const rules = getUploadRules(requirement);
  const extension = normalizeExtension(file.name.split('.').pop() ? `.${file.name.split('.').pop()}` : '');

  if (rules.allowed_extensions.length && extension && !rules.allowed_extensions.includes(extension)) {
    return `صيغة الملف غير مدعومة. المسموح: ${rules.allowed_extensions.join(', ')}`;
  }

  // A size the picker could not report is not waved through to the server
  // (audit M-21): screens first try utils/file.ts resolveFileSize, and a file
  // that still has no size is refused with the limit it must respect.
  if (file.size == null || !Number.isFinite(Number(file.size))) {
    return `تعذر التحقق من حجم الملف. اختر ملفاً من ذاكرة الجهاز لا يتجاوز ${formatBytes(rules.max_file_size)}.`;
  }
  if (Number(file.size) <= 0) {
    return 'الملف فارغ. اختر ملفاً آخر.';
  }
  if (rules.max_file_size && file.size > rules.max_file_size) {
    return `حجم الملف يتجاوز الحد المسموح (${formatBytes(rules.max_file_size)}).`;
  }

  return null;
}
