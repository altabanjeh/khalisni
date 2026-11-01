import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ServicesManagementPage from './ServicesManagementPage'
import OrderRequestDetails from '../../components/OrderRequestDetails'
import { api } from '../../api/services'

// CN-BIZ-09: the engineering drawings definition allows 50 MB files.
const DRAWINGS = {
  id: 31,
  code: 'document_3443627d36',
  name_ar: 'المخططات الهندسية',
  name_en: 'Engineering drawings',
  description_ar: '',
  description_en: '',
  allowed_extensions: ['.pdf'],
  max_file_size: 50 * 1024 * 1024,
  max_file_size_mb: 50,
  max_file_size_mb_ceiling: 50,
  sort_order: 0,
  is_active: true,
  is_deleted: false,
}

beforeEach(() => {
  vi.spyOn(api, 'getAdminCategories').mockResolvedValue([])
  vi.spyOn(api, 'getAdminServicesPage').mockResolvedValue({ results: [], count: 0, hasNext: false, hasPrevious: false })
  vi.spyOn(api, 'getAdminRequiredDocumentDefinitions').mockResolvedValue([DRAWINGS])
})

afterEach(() => vi.restoreAllMocks())

test('the document definition editor shows and saves the size limit in MB', async () => {
  const update = vi.spyOn(api, 'updateAdminRequiredDocumentDefinition').mockResolvedValue(DRAWINGS)
  const user = userEvent.setup()
  render(<MemoryRouter><ServicesManagementPage /></MemoryRouter>)

  const name = await screen.findByText('المخططات الهندسية')
  const row = name.closest('tr')
  expect(within(row).getByText('50 MB')).toBeInTheDocument()
  await user.click(within(row).getByRole('button', { name: 'تعديل' }))

  const input = await screen.findByLabelText(/الحد الأقصى لحجم الملف \(ميغابايت\)/)
  expect(input).toHaveValue(50)
  expect(screen.getByText(/الحد الأعلى 50 ميغابايت/)).toBeInTheDocument()

  await user.clear(input)
  await user.type(input, '40')
  await user.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))
  await waitFor(() => expect(update).toHaveBeenCalled())
  expect(update.mock.calls[0][1]).toEqual(expect.objectContaining({ max_file_size_mb: 40 }))
}, 30000)

test('an empty MB limit is sent as null (the default limit)', async () => {
  const update = vi.spyOn(api, 'updateAdminRequiredDocumentDefinition').mockResolvedValue(DRAWINGS)
  const user = userEvent.setup()
  render(<MemoryRouter><ServicesManagementPage /></MemoryRouter>)
  const row = (await screen.findByText('المخططات الهندسية')).closest('tr')
  await user.click(within(row).getByRole('button', { name: 'تعديل' }))
  const input = await screen.findByLabelText(/الحد الأقصى لحجم الملف \(ميغابايت\)/)
  await user.clear(input)
  await user.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))
  await waitFor(() => expect(update).toHaveBeenCalled())
  expect(update.mock.calls[0][1].max_file_size_mb).toBeNull()
}, 30000)

test('request details keep each answer and each repeater row on its own line', () => {
  const text = 'ملاحظة العميل\nالبيانات الإضافية المطلوبة:\nبيانات الشركاء:\n  1. اسم كل شريك: أحمد\n  2. اسم كل شريك: سارة'
  render(<OrderRequestDetails text={text} />)
  const block = screen.getByTestId('order-request-details')
  const paragraph = block.querySelector('p')
  expect(paragraph.className).toContain('whitespace-pre-line')
  expect(paragraph.textContent).toBe(text)
})
