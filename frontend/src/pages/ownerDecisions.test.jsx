// Owner decisions implemented in the UI: F04 rejection reason, B10-1/2/3 parcel
// gate, B10-4 notes, B10-7 count labels, consent version, staff <main>.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from '../api/services'
import DynamicServiceFields from '../components/DynamicServiceFields'
import DocumentList from '../components/DocumentList'
import DashboardLayout from '../layouts/DashboardLayout'
import EmployeeVerifyDocumentsPage from './employee/EmployeeVerifyDocumentsPage'
import ServicesManagementPage from './admin/ServicesManagementPage'
import { buildDynamicNotes, getServiceSchemaFields, visibleSchemaFields } from '../utils/serviceForms'
import { ORDER_CONSENT_TEXT, ORDER_CONSENT_VERSION } from '../utils/orderConsent'

vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext')
  return { ...actual, useAuth: () => ({ user: { full_name: 'Staff', role: 'admin' }, logout: vi.fn() }) }
})

// The layout test is about the landmark, not the navigation chrome.
vi.mock('../components/Sidebar', () => ({ default: () => <nav aria-label="القائمة">nav</nav> }))
vi.mock('../components/Topbar', () => ({ default: () => <header>top</header> }))

afterEach(() => vi.restoreAllMocks())

// The schema as stored after migration services.0014.
const LAND_SERVICE = {
  required_information_schema: [
    { key: 'full_name', label_ar: 'الاسم الكامل', type: 'text', required: true },
    {
      key: 'field_2fa52c6cfa', label_ar: 'هل تعرف رقم القطعة والحوض؟', type: 'select', required: false,
      options: [{ value: 'yes', label_ar: 'نعم', label_en: 'Yes' }, { value: 'no', label_ar: 'لا', label_en: 'No' }],
      help_text_ar: 'إذا لم تكن تعرف رقمي القطعة والحوض فاختر «لا»، ويساعدك فريقنا في تحديدهما أثناء مراجعة الطلب.',
    },
    { key: 'parcel_number', label_ar: 'رقم القطعة', type: 'text', required: true, visible_when: { field: 'field_2fa52c6cfa', equals: 'yes' } },
    { key: 'basin_number', label_ar: 'رقم الحوض', type: 'text', required: true, visible_when: { field: 'field_2fa52c6cfa', equals: 'yes' } },
    { key: 'additional_notes', label_ar: 'ملاحظات إضافية', type: 'textarea', required: false },
  ],
}

function GatedForm({ onValid }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ mode: 'onSubmit' })
  return (
    <form onSubmit={handleSubmit(onValid)}>
      <DynamicServiceFields errors={errors} register={register} service={LAND_SERVICE} watch={watch} />
      <button type="submit">إرسال</button>
    </form>
  )
}

// 12-14 (unit side)
test('the parcel question is a yes/no choice and controls the parcel and basin fields', () => {
  const fields = getServiceSchemaFields(LAND_SERVICE, 'ar')
  const question = fields.find((field) => field.key === 'field_2fa52c6cfa')
  expect(question.type).toBe('select')
  expect(question.options.map((option) => option.label)).toEqual(['نعم', 'لا'])
  const visibleKeys = (answer) => visibleSchemaFields(fields, { service_info_field_2fa52c6cfa: answer }).map((field) => field.key)
  expect(visibleKeys('yes')).toEqual(expect.arrayContaining(['parcel_number', 'basin_number']))
  expect(visibleKeys('no')).not.toContain('parcel_number')
  expect(visibleKeys('')).not.toContain('basin_number')
})

test('hidden answers are not sent and a select answer is sent as its label', () => {
  const fields = getServiceSchemaFields(LAND_SERVICE, 'ar')
  const notes = buildDynamicNotes('', fields, {
    service_info_full_name: 'Customer', service_info_field_2fa52c6cfa: 'no', service_info_parcel_number: '012',
  })
  expect(notes).toContain('هل تعرف رقم القطعة والحوض؟: لا')
  expect(notes).not.toContain('رقم القطعة: 012')
  const withNumbers = buildDynamicNotes('', fields, {
    service_info_full_name: 'Customer', service_info_field_2fa52c6cfa: 'yes', service_info_parcel_number: '012', service_info_basin_number: '007',
  })
  // 15: text identifiers keep their leading zeros.
  expect(withNumbers).toContain('رقم القطعة: 012')
  expect(withNumbers).toContain('رقم الحوض: 007')
})

// 13, 14, 16 (rendered form)
test('yes makes parcel and basin required; no hides them; notes stay optional', async () => {
  const user = userEvent.setup()
  const onValid = vi.fn()
  render(<GatedForm onValid={onValid} />)
  expect(screen.getByText('إذا لم تكن تعرف رقمي القطعة والحوض فاختر «لا»، ويساعدك فريقنا في تحديدهما أثناء مراجعة الطلب.')).toBeInTheDocument()
  expect(screen.queryByText('رقم القطعة')).not.toBeInTheDocument()

  const [nameInput] = screen.getAllByRole('textbox')
  await user.type(nameInput, 'Customer')
  const question = screen.getByRole('combobox')
  await user.selectOptions(question, 'yes')
  expect(screen.getByText('رقم القطعة')).toBeInTheDocument()
  expect(screen.getByText('رقم الحوض')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'إرسال' }))
  expect(await screen.findByText('الحقل رقم القطعة مطلوب')).toBeInTheDocument()
  expect(onValid).not.toHaveBeenCalled()

  await user.selectOptions(question, 'no')
  expect(screen.queryByText('رقم القطعة')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'إرسال' }))
  await waitFor(() => expect(onValid).toHaveBeenCalledTimes(1))
  expect(screen.queryByText('الحقل ملاحظات إضافية مطلوب')).not.toBeInTheDocument()
})

// 3 (UI side)
test('a rejected document shows the reason the API sent; no reason, nothing shown', () => {
  render(
    <DocumentList
      documents={[
        { id: 1, original_filename: 'id.pdf', status: 'rejected', rejection_reason: 'الصورة غير واضحة، يرجى رفع نسخة أوضح.' },
        { id: 2, original_filename: 'other.pdf', status: 'rejected' },
        { id: 3, original_filename: 'ok.pdf', status: 'approved', rejection_reason: '' },
      ]}
    />,
  )
  expect(screen.getByText('الصورة غير واضحة، يرجى رفع نسخة أوضح.')).toBeInTheDocument()
  expect(screen.getAllByText(/سبب الرفض/)).toHaveLength(1)
})

// 6
test('the reject reason box says the reason will be shown to the customer', async () => {
  const doc = {
    id: 9, document_type: 'national_id', document_type_label: { ar: 'هوية', en: 'ID' }, original_filename: 'a.pdf',
    status: 'pending_review', mime_type: 'application/pdf', order: { order_number: 'KH-2026-000009' },
  }
  if (api.getStaffDocumentsPage) {
    vi.spyOn(api, 'getStaffDocumentsPage').mockResolvedValue({ results: [doc], count: 1, hasNext: false, hasPrevious: false })
  }
  vi.spyOn(api, 'getStaffDocuments').mockResolvedValue([doc])
  vi.spyOn(api, 'downloadDocumentWithToken').mockResolvedValue(new Blob(['%PDF']))
  render(<MemoryRouter><EmployeeVerifyDocumentsPage /></MemoryRouter>)
  const box = await screen.findByLabelText('ملاحظة الاعتماد أو سبب الرفض')
  expect(box.tagName).toBe('TEXTAREA')
  const description = document.getElementById(box.getAttribute('aria-describedby'))
  expect(description).toHaveTextContent('سيظهر هذا السبب للعميل')
  expect(box.getAttribute('placeholder')).not.toMatch(/داخلية/)
})

// 32
test('the staff layout has one main landmark around the page content', () => {
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route element={<DashboardLayout links={[]} title="لوحة" />} path="/admin">
          <Route index element={<p>محتوى الصفحة</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
  const main = screen.getByRole('main')
  expect(within(main).getByText('محتوى الصفحة')).toBeInTheDocument()
  expect(screen.getAllByRole('main')).toHaveLength(1)
})

// 17 (UI side)
test('service counts are shown with explicit labels from the server', async () => {
  vi.spyOn(api, 'getAdminCategories').mockResolvedValue([])
  vi.spyOn(api, 'getAdminRequiredDocumentDefinitions').mockResolvedValue([])
  vi.spyOn(api, 'getAdminServicesPage').mockResolvedValue({ results: [], count: 38, hasNext: false, hasPrevious: false })
  const counts = vi.spyOn(api, 'getAdminServiceCounts').mockResolvedValue({ total: 38, active: 37, published: 32, customer_visible: 32 })
  render(<MemoryRouter><ServicesManagementPage /></MemoryRouter>)
  const region = await screen.findByRole('region', { name: 'أعداد الخدمات' })
  expect(counts).toHaveBeenCalled()
  for (const [label, value] of [['إجمالي الخدمات', '38'], ['نشطة', '37'], ['منشورة للعامة', '32'], ['ظاهرة للعميل', '32']]) {
    const term = within(region).getByText(label)
    expect(term.tagName).toBe('DT')
    expect(term.parentElement).toHaveTextContent(value)
  }
})

// 25 (client side): the statement the form shows is the one the server records.
test('the web consent statement matches the server registry', () => {
  const registry = readFileSync(resolve(__dirname, '../../../backend/orders/consent.py'), 'utf8')
  expect(registry).toContain(`"${ORDER_CONSENT_VERSION}"`)
  expect(registry).toContain(`"ar": "${ORDER_CONSENT_TEXT.ar}"`)
  expect(registry).toContain(`"en": "${ORDER_CONSENT_TEXT.en}"`)
})
