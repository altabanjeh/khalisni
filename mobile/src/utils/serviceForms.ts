import type { UploadableDocument } from '../types/document';
import type { Service, ServiceRequirement } from '../types/service';

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
}

function normalizeExtension(value: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  return normalized.startsWith('.') ? normalized : `.${normalized}`;
}

function normalizeOptions(options: unknown): Array<{ value: string; label: string }> {
  if (!Array.isArray(options)) return [];

  return options
    .map((option) => {
      if (option && typeof option === 'object') {
        const record = option as Record<string, unknown>;
        const value = record.value ?? record.id ?? record.key ?? record.slug;
        const label = record.label ?? record.name_ar ?? record.name ?? record.title ?? value;
        if (value == null || value === '') return null;
        return { value: String(value), label: String(label) };
      }

      if (option == null || option === '') return null;
      return { value: String(option), label: String(option) };
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

export function getRequiredDocumentLabel(item?: string | ServiceRequirement | null) {
  if (typeof item === 'string') return item;
  if (!item) return '';
  return (
    item.name_ar ||
    item.document_definition?.name_ar ||
    item.name_en ||
    item.document_definition?.name_en ||
    item.document_type ||
    ''
  );
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
      const label = record.label_ar || record.label || record.name_ar || record.title || record.placeholder || `Field ${index + 1}`;

      return {
        key: String(rawKey),
        inputName,
        label: String(label),
        type: normalizeSchemaType(record.type || record.field_type || record.input_type),
        required: Boolean(record.required),
        placeholder: String(record.placeholder || ''),
        helpText: String(record.help_text || record.description || ''),
        options: normalizeOptions(record.options || record.choices || record.values),
      };
    })
    .filter((field): field is ServiceSchemaField => Boolean(field));
}

export function buildDynamicNotes(
  baseNotes: string,
  schemaFields: ServiceSchemaField[],
  values: Record<string, string | boolean>,
) {
  const extraLines = schemaFields
    .map((field) => {
      const rawValue = values[field.inputName];
      if (field.type === 'checkbox') {
        return rawValue ? `${field.label}: نعم` : '';
      }

      if (rawValue == null) return '';
      const normalizedValue = String(rawValue).trim();
      return normalizedValue ? `${field.label}: ${normalizedValue}` : '';
    })
    .filter(Boolean);

  const sections: string[] = [];
  const trimmedNotes = String(baseNotes || '').trim();
  if (trimmedNotes) {
    sections.push(trimmedNotes);
  }
  if (extraLines.length) {
    sections.push('البيانات الإضافية المطلوبة:');
    sections.push(...extraLines);
  }

  return sections.join('\n');
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

  if (rules.max_file_size && file.size && file.size > rules.max_file_size) {
    return `حجم الملف يتجاوز الحد المسموح (${formatBytes(rules.max_file_size)}).`;
  }

  return null;
}
