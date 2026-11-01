import { describe, expect, it, vi } from 'vitest'
import {
  REPEATER_MAX_ITEMS,
  applyServerFieldErrors,
  buildDynamicNotes,
  buildServiceAnswers,
  buildUploadHint,
  canRemoveRepeaterRow,
  emptyRepeaterRow,
  getServiceSchemaFields,
  getUploadRules,
  repeaterItemInputNames,
  repeaterRowsToAdd,
  validateFile,
} from './serviceForms'

// CN-BIZ-01 (partners) and CN-BIZ-04 (plots): the schema shapes the backend
// migration writes for business_company_registration and
// request-property-consolidation.
const GATE = 'field_2fa52c6cfa'
const COMPANY = {
  required_information_schema: [
    { key: 'partners_count', label_ar: 'عدد الشركاء', label_en: 'Number of partners', type: 'number', required: true },
    {
      key: 'partners', type: 'repeater', label_ar: 'بيانات الشركاء', label_en: "Partners' details", required: true,
      min_items: 1, max_items: 20, help_text_ar: 'حسب عدد الشركاء', help_text_en: 'Depending on the number of partners',
      item_fields: [
        { key: 'name', type: 'text', label_ar: 'اسم كل شريك', label_en: 'Name of each partner', required: true },
        { key: 'id', type: 'text', label_ar: 'الرقم الوطني / رقم الجواز للشريك', label_en: "Partner's national ID / passport number", required: true },
        { key: 'nationality', type: 'text', label_ar: 'جنسية كل شريك', label_en: 'Nationality of each partner', required: true },
        { key: 'share', type: 'text', label_ar: 'حصة كل شريك', label_en: 'Share of each partner', required: true },
      ],
    },
  ],
}
const CONSOLIDATION = {
  required_information_schema: [
    {
      key: GATE, type: 'select', label_ar: 'هل تعرف رقم القطعة والحوض؟', label_en: 'Do you know the parcel and basin numbers?', required: false,
      options: [{ value: 'yes', label_ar: 'نعم', label_en: 'Yes' }, { value: 'no', label_ar: 'لا', label_en: 'No' }],
    },
    {
      key: 'plots', type: 'repeater', label_ar: 'أرقام القطع المطلوب توحيدها', label_en: 'Numbers of the plots to consolidate',
      required: true, min_items: 2, max_items: 20, visible_when: { field: GATE, equals: 'yes' },
      item_fields: [
        { key: 'parcel_number', type: 'text', label_ar: 'رقم القطعة', label_en: 'Parcel number', required: true },
        { key: 'basin_number', type: 'text', label_ar: 'رقم الحوض', label_en: 'Basin number', required: true },
      ],
    },
  ],
}

describe('repeater normalization', () => {
  it('keeps the repeater type with its item fields, limits and effective minimum', () => {
    const partners = getServiceSchemaFields(COMPANY, 'en').find((field) => field.key === 'partners')
    expect(partners.type).toBe('repeater')
    expect(partners.label).toBe("Partners' details")
    expect(partners.helpText).toBe('Depending on the number of partners')
    expect(partners.inputName).toBe('service_info_partners')
    expect(partners.itemFields.map((item) => item.key)).toEqual(['name', 'id', 'nationality', 'share'])
    // The `id` schema key never becomes a bare `id` form key (react-hook-form owns row ids).
    expect(partners.itemFields.map((item) => item.inputKey)).toEqual(['f_name', 'f_id', 'f_nationality', 'f_share'])
    expect(partners.minItems).toBe(1)
    expect(partners.maxItems).toBe(20)
    expect(partners.effectiveMin).toBe(1)
    expect(emptyRepeaterRow(partners)).toEqual({ f_name: '', f_id: '', f_nationality: '', f_share: '' })
  })

  it('uses Arabic labels in Arabic and caps max_items at the hard limit', () => {
    const schema = {
      required_information_schema: [
        { key: 'rows', type: 'repeater', label_ar: 'صفوف', required: false, max_items: 99, item_fields: [{ key: 'a', type: 'repeater', label_ar: 'أ' }] },
      ],
    }
    const [field] = getServiceSchemaFields(schema, 'ar')
    expect(field.label).toBe('صفوف')
    expect(field.maxItems).toBe(REPEATER_MAX_ITEMS)
    expect(field.effectiveMin).toBe(0)
    // Item fields never nest repeaters.
    expect(field.itemFields[0].type).toBe('text')
  })

  it('a required repeater with min_items 2 starts with and keeps two rows', () => {
    const plots = getServiceSchemaFields(CONSOLIDATION, 'ar').find((field) => field.key === 'plots')
    expect(plots.effectiveMin).toBe(2)
    expect(canRemoveRepeaterRow(plots, 2)).toBe(false)
    expect(canRemoveRepeaterRow(plots, 3)).toBe(true)
    expect(repeaterRowsToAdd(plots, 19)).toBe(1)
    expect(repeaterRowsToAdd(plots, 20)).toBe(0)
    expect(repeaterItemInputNames(plots, 2)).toEqual([
      'service_info_plots.0.f_parcel_number', 'service_info_plots.0.f_basin_number',
      'service_info_plots.1.f_parcel_number', 'service_info_plots.1.f_basin_number',
    ])
  })

  it('an optional repeater with a minimum may be empty, or hold at least the minimum', () => {
    const [field] = getServiceSchemaFields({
      required_information_schema: [{ key: 'r', type: 'repeater', label_ar: 'ر', required: false, min_items: 2, item_fields: [{ key: 'a', label_ar: 'أ' }] }],
    })
    expect(repeaterRowsToAdd(field, 0)).toBe(2)
    expect(canRemoveRepeaterRow(field, 2)).toBe(false)
    expect(canRemoveRepeaterRow(field, 3)).toBe(true)
    expect(canRemoveRepeaterRow(field, 1)).toBe(true)
  })
})

describe('repeater answers and notes', () => {
  it('sends every displayed row, trimmed and keyed by the schema item keys', () => {
    const fields = getServiceSchemaFields(COMPANY, 'ar')
    const answers = buildServiceAnswers(fields, {
      service_info_partners_count: '2',
      service_info_partners: [
        { f_name: ' أحمد ', f_id: '9981', f_nationality: 'أردني', f_share: '50' },
        { f_name: '', f_id: '', f_nationality: '', f_share: '' },
      ],
    })
    expect(answers).toEqual({
      partners_count: '2',
      partners: [{ name: 'أحمد', id: '9981', nationality: 'أردني', share: '50' }, {}],
    })
  })

  it('does not send plots while the parcel gate is not "yes"', () => {
    const fields = getServiceSchemaFields(CONSOLIDATION, 'ar')
    const rows = [{ f_parcel_number: '012', f_basin_number: '7' }, { f_parcel_number: '013', f_basin_number: '7' }]
    expect(buildServiceAnswers(fields, { [`service_info_${GATE}`]: 'no', service_info_plots: rows })).toEqual({ [GATE]: 'no' })
    expect(buildServiceAnswers(fields, { [`service_info_${GATE}`]: 'yes', service_info_plots: rows })).toEqual({
      [GATE]: 'yes',
      plots: [{ parcel_number: '012', basin_number: '7' }, { parcel_number: '013', basin_number: '7' }],
    })
  })

  it('writes readable numbered rows into the notes', () => {
    const fields = getServiceSchemaFields(CONSOLIDATION, 'ar')
    const notes = buildDynamicNotes('', fields, {
      [`service_info_${GATE}`]: 'yes',
      service_info_plots: [{ f_parcel_number: '012', f_basin_number: '7' }, { f_parcel_number: '013', f_basin_number: '8' }],
    })
    expect(notes).toContain('أرقام القطع المطلوب توحيدها:\n  1. رقم القطعة: 012؛ رقم الحوض: 7\n  2. رقم القطعة: 013؛ رقم الحوض: 8')
  })
})

describe('repeater server errors', () => {
  function run(serviceAnswers, schema = COMPANY, knownFields) {
    const setError = vi.fn()
    const schemaFields = getServiceSchemaFields(schema, 'ar')
    const outcome = applyServerFieldErrors({
      error: { apiError: { fieldErrors: { service_answers: [serviceAnswers] }, rawData: { service_answers: serviceAnswers } } },
      setError,
      knownFields: knownFields || schemaFields.map((field) => field.inputName),
      schemaFields,
    })
    return { outcome, placed: Object.fromEntries(setError.mock.calls.map(([name, value]) => [name, value.message])) }
  }

  it('places a whole-field message on the repeater', () => {
    const { placed, outcome } = run({ partners: 'أضف 1 إدخالاً على الأقل.' })
    expect(placed).toEqual({ service_info_partners: 'أضف 1 إدخالاً على الأقل.' })
    expect(outcome.general).toBe('')
  })

  it('places per-row item messages under the item of that row', () => {
    const { placed, outcome } = run({ partners: { 1: { name: 'هذا الحقل مطلوب.', share: 'هذا الحقل مطلوب.' } } })
    expect(placed).toEqual({
      'service_info_partners.1.f_name': 'هذا الحقل مطلوب.',
      'service_info_partners.1.f_share': 'هذا الحقل مطلوب.',
    })
    expect(outcome.fields).toEqual(['service_info_partners.1.f_name', 'service_info_partners.1.f_share'])
  })

  it('shows an unknown item key in the general error area', () => {
    const { placed } = run({ partners: { 0: { colour: 'هذا الحقل ليس من نموذج الخدمة.' } } })
    expect(placed).toEqual({ 'root.server': 'هذا الحقل ليس من نموذج الخدمة.' })
  })
})

describe('per-document upload limits (CN-BIZ-09)', () => {
  const drawings = { document_type: 'document_3443627d36', name_ar: 'المخططات الهندسية', max_file_size: 50 * 1024 * 1024, allowed_extensions: ['.pdf'] }

  it('shows and enforces the requirement limit, not the global 10 MB', () => {
    expect(getUploadRules(drawings).max_file_size).toBe(50 * 1024 * 1024)
    expect(buildUploadHint(drawings, 'en')).toBe('Allowed files: PDF | Maximum size: 50 MB')
    expect(buildUploadHint(drawings, 'ar')).toContain('الحد الأقصى: 50 MB')
    const thirtyMb = { name: 'plans.pdf', size: 30 * 1024 * 1024 }
    expect(validateFile(thirtyMb, drawings, 'en')).toBe(true)
    expect(validateFile(thirtyMb, undefined, 'en')).toContain('10 MB')
  })
})
