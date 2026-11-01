// Item 15: customer complaints (customer side) and the staff follow-up panel.
import { fireEvent, render, screen, within } from '@testing-library/react'
import OrderComplaints from './OrderComplaints'
import StaffComplaintsPanel from './StaffComplaintsPanel'
import { LanguageProvider } from '../context/LanguageContext'
import { api } from '../api/services'

function renderWith(ui, language = 'ar') {
  localStorage.setItem('khalisni-language', language)
  return render(<LanguageProvider>{ui}</LanguageProvider>)
}

const open = { id: 1, description: 'تأخر التسليم', is_resolved: false, created_at: '2026-05-01T10:00:00Z', resolved_at: null }
const resolved = { id: 2, description: 'خطأ في الاسم', is_resolved: true, created_at: '2026-04-01T10:00:00Z', resolved_at: '2026-04-02T10:00:00Z' }

afterEach(() => vi.restoreAllMocks())

test('customer sees each complaint status in Arabic', async () => {
  vi.spyOn(api, 'getCustomerOrderComplaints').mockResolvedValue([open, resolved])
  renderWith(<OrderComplaints orderId={9} />)
  const statuses = await screen.findAllByTestId('complaint-status')
  expect(statuses.map((node) => node.textContent)).toEqual(['قيد المتابعة', 'تمت المعالجة'])
})

test('customer sees English status labels', async () => {
  vi.spyOn(api, 'getCustomerOrderComplaints').mockResolvedValue([open, resolved])
  renderWith(<OrderComplaints orderId={9} />, 'en')
  const statuses = await screen.findAllByTestId('complaint-status')
  expect(statuses.map((node) => node.textContent)).toEqual(['In follow-up', 'Resolved'])
})

test('customer files a complaint and the list refreshes', async () => {
  const listSpy = vi.spyOn(api, 'getCustomerOrderComplaints').mockResolvedValueOnce([]).mockResolvedValueOnce([open])
  const createSpy = vi.spyOn(api, 'createCustomerOrderComplaint').mockResolvedValue(open)
  renderWith(<OrderComplaints orderId={9} />)
  expect(await screen.findByText('لم تقدّم أي شكوى على هذا الطلب.')).toBeInTheDocument()
  const box = screen.getByLabelText('صف المشكلة')
  expect(box).toHaveAttribute('maxLength', '4000')
  fireEvent.change(box, { target: { value: 'تأخر التسليم' } })
  fireEvent.click(screen.getByRole('button', { name: 'تقديم الشكوى' }))
  expect(createSpy).toHaveBeenCalledWith(9, 'تأخر التسليم')
  expect(await screen.findByText('تأخر التسليم', { selector: 'bdi' })).toBeInTheDocument()
  expect(listSpy).toHaveBeenCalledTimes(2)
  expect(screen.getByRole('status')).toHaveTextContent('تم إرسال شكواك')
})

test('customer sees the localized field error when filing fails', async () => {
  vi.spyOn(api, 'getCustomerOrderComplaints').mockResolvedValue([])
  vi.spyOn(api, 'createCustomerOrderComplaint').mockRejectedValue(
    Object.assign(new Error('x'), { response: { status: 400, data: { description: ['هذا الحقل مطلوب.'] } } }),
  )
  renderWith(<OrderComplaints orderId={9} />)
  fireEvent.change(await screen.findByLabelText('صف المشكلة'), { target: { value: 'x' } })
  fireEvent.click(screen.getByRole('button', { name: 'تقديم الشكوى' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('هذا الحقل مطلوب.')
})

test('staff resolve an open complaint with a required note', async () => {
  const listSpy = vi.spyOn(api, 'getStaffOrderComplaints')
    .mockResolvedValueOnce([open, resolved])
    .mockResolvedValueOnce([{ ...open, is_resolved: true, resolved_at: '2026-05-02T10:00:00Z' }, resolved])
  const resolveSpy = vi.spyOn(api, 'resolveStaffOrderComplaint').mockResolvedValue({ ...open, is_resolved: true })
  const onChanged = vi.fn()
  renderWith(<StaffComplaintsPanel onChanged={onChanged} orderId={5} />)

  const panel = await screen.findByTestId('staff-complaints')
  expect(within(panel).getByRole('heading', { name: 'شكاوى العميل' })).toBeInTheDocument()
  const cards = await within(panel).findAllByTestId('staff-complaint')
  expect(cards).toHaveLength(2)
  // only the open one has a resolve form
  expect(within(cards[1]).queryByRole('button', { name: 'معالجة الشكوى' })).not.toBeInTheDocument()

  const button = within(cards[0]).getByRole('button', { name: 'معالجة الشكوى' })
  fireEvent.click(button)
  expect(resolveSpy).not.toHaveBeenCalled()
  expect(within(cards[0]).getByRole('alert')).toHaveTextContent('اكتب ملاحظة المعالجة')

  fireEvent.change(within(cards[0]).getByLabelText(/ملاحظة المعالجة \(تُرسل للعميل كرسالة\)/), { target: { value: 'تم تسريع الطلب' } })
  fireEvent.click(button)
  expect(resolveSpy).toHaveBeenCalledWith(5, 1, 'تم تسريع الطلب')
  await vi.waitFor(() => expect(listSpy).toHaveBeenCalledTimes(2))
  await vi.waitFor(() => expect(screen.queryByRole('button', { name: 'معالجة الشكوى' })).not.toBeInTheDocument())
  expect(within(panel).getAllByTestId('complaint-status').map((node) => node.textContent)).toEqual(['تمت المعالجة', 'تمت المعالجة'])
  expect(onChanged).toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: 'معالجة الشكوى' })).not.toBeInTheDocument()
})

test('staff see the server error when the complaint was already resolved', async () => {
  vi.spyOn(api, 'getStaffOrderComplaints').mockResolvedValue([open])
  vi.spyOn(api, 'resolveStaffOrderComplaint').mockRejectedValue(
    Object.assign(new Error('x'), { displayMessage: 'تمت معالجة هذه الشكوى مسبقاً.', response: { status: 400, data: { detail: 'تمت معالجة هذه الشكوى مسبقاً.' } } }),
  )
  renderWith(<StaffComplaintsPanel orderId={5} />)
  const card = await screen.findByTestId('staff-complaint')
  fireEvent.change(within(card).getByRole('textbox'), { target: { value: 'ok' } })
  fireEvent.click(within(card).getByRole('button', { name: 'معالجة الشكوى' }))
  expect(await within(card).findByRole('alert')).toHaveTextContent('تمت معالجة هذه الشكوى مسبقاً.')
})
