import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ServicesManagementPage from './ServicesManagementPage'
import { api } from '../../api/services'

// The stored shapes (services migration for CN-BIZ-01 / CN-BIZ-04) must survive
// an admin save untouched: English labels, option values, visible_when gates,
// import metadata and repeater item fields.
const GATE = 'field_2fa52c6cfa'
const SCHEMA = [
  {
    key: GATE, label_ar: 'هل تعرف رقم القطعة والحوض؟', label_en: 'Do you know the parcel and basin numbers?', type: 'select', required: false,
    options: [{ value: 'yes', label_ar: 'نعم', label_en: 'Yes' }, { value: 'no', label_ar: 'لا', label_en: 'No' }],
    help_text_ar: 'إذا لم تكن تعرف رقمي القطعة والحوض فاختر «لا».', help_text_en: 'If you do not know them, choose “No”.',
    source_section: 'B10-1/2/3', display_order: 1,
  },
  {
    key: 'plots', type: 'repeater', label_ar: 'أرقام القطع المطلوب توحيدها', label_en: 'Numbers of the plots to consolidate',
    required: true, min_items: 2, max_items: 20, display_order: 2, visible_when: { field: GATE, equals: 'yes' },
    item_fields: [
      { key: 'parcel_number', type: 'text', label_ar: 'رقم القطعة', label_en: 'Parcel number', required: true },
      { key: 'basin_number', type: 'text', label_ar: 'رقم الحوض', label_en: 'Basin number', required: true },
    ],
  },
  { key: 'additional_notes', label_ar: 'ملاحظات إضافية', label_en: 'Additional notes', type: 'textarea', required: false, display_order: 3 },
]

const SERVICE = {
  id: 7,
  name_ar: 'طلب توحيد عقار',
  name_en: 'Property consolidation',
  slug: 'request-property-consolidation',
  category: { id: 1 },
  description_ar: 'وصف الخدمة',
  is_active: true,
  is_deleted: false,
  required_documents: [],
  required_information_schema: SCHEMA,
}

beforeEach(() => {
  vi.spyOn(api, 'getAdminCategories').mockResolvedValue([{ id: 1, name_ar: 'العقارات والأراضي', is_deleted: false }])
  vi.spyOn(api, 'getAdminRequiredDocumentDefinitions').mockResolvedValue([])
  vi.spyOn(api, 'getAdminServicesPage').mockResolvedValue({ results: [SERVICE], count: 1, hasNext: false, hasPrevious: false })
})

afterEach(() => vi.restoreAllMocks())

async function openEditor(user) {
  const table = () => screen.getByRole('region', { name: 'جدول الخدمات' })
  await waitFor(() => expect(within(table()).getByRole('button', { name: 'تعديل' })).toBeInTheDocument())
  await user.click(within(table()).getByRole('button', { name: 'تعديل' }))
  await screen.findByTestId('repeater-items-editor')
}

test('saving a service keeps its repeater, gate and bilingual fields unchanged', async () => {
  const update = vi.spyOn(api, 'updateAdminService').mockResolvedValue({ id: 7 })
  const user = userEvent.setup()
  render(<MemoryRouter><ServicesManagementPage /></MemoryRouter>)
  await openEditor(user)

  await user.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))
  await waitFor(() => expect(update).toHaveBeenCalled())
  expect(update.mock.calls[0][1].required_information_schema).toEqual(SCHEMA)
}, 30000)

test('the admin edits repeater limits and item fields', async () => {
  const update = vi.spyOn(api, 'updateAdminService').mockResolvedValue({ id: 7 })
  const user = userEvent.setup()
  render(<MemoryRouter><ServicesManagementPage /></MemoryRouter>)
  await openEditor(user)
  const editor = screen.getByTestId('repeater-items-editor')

  const max = within(editor).getByLabelText(/أكبر عدد من الصفوف/)
  await user.clear(max)
  await user.type(max, '10')
  await user.click(within(editor).getByRole('button', { name: '+ بند في الصف' }))
  const arabicNames = within(editor).getAllByLabelText('الاسم الظاهر بالعربية')
  const englishNames = within(editor).getAllByLabelText('الاسم الظاهر بالإنجليزية')
  const keys = within(editor).getAllByLabelText('المعرّف التقني')
  await user.type(arabicNames[2], 'المساحة')
  await user.type(englishNames[2], 'Area')
  await user.type(keys[2], 'area')
  await user.click(within(editor).getByRole('button', { name: 'حذف البند 2' }))

  await user.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))
  await waitFor(() => expect(update).toHaveBeenCalled())
  const plots = update.mock.calls[0][1].required_information_schema.find((field) => field.key === 'plots')
  expect(plots.max_items).toBe(10)
  expect(plots.min_items).toBe(2)
  expect(plots.visible_when).toEqual({ field: GATE, equals: 'yes' })
  expect(plots.item_fields).toEqual([
    { key: 'parcel_number', type: 'text', label_ar: 'رقم القطعة', label_en: 'Parcel number', required: true },
    { key: 'area', type: 'text', label_ar: 'المساحة', label_en: 'Area', required: false },
  ])
}, 30000)

test('repeater limits over the 20-row cap or with min above max are refused before saving', async () => {
  const update = vi.spyOn(api, 'updateAdminService').mockResolvedValue({ id: 7 })
  const user = userEvent.setup()
  render(<MemoryRouter><ServicesManagementPage /></MemoryRouter>)
  await openEditor(user)
  const max = within(screen.getByTestId('repeater-items-editor')).getByLabelText(/أكبر عدد من الصفوف/)
  await user.clear(max)
  await user.type(max, '25')
  // The browser refuses a value above the cap before the form is sent.
  expect(max.validity.rangeOverflow).toBe(true)
  await user.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))
  expect(update).not.toHaveBeenCalled()

  // A minimum above the maximum is refused by the builder's own checks.
  const min = within(screen.getByTestId('repeater-items-editor')).getByLabelText(/أقل عدد من الصفوف/)
  await user.clear(max)
  await user.type(max, '3')
  await user.clear(min)
  await user.type(min, '5')
  await user.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))
  expect(await screen.findByText(/الحد الأدنى أكبر من الحد الأقصى/)).toBeInTheDocument()
  expect(update).not.toHaveBeenCalled()
}, 30000)
