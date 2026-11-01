// Item 13: customer <-> support messages on an order.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import OrderMessages from './OrderMessages'
import { LanguageProvider } from '../context/LanguageContext'
import { api } from '../api/services'

function renderMessages(language = 'ar', props = {}) {
  localStorage.setItem('khalisni-language', language)
  return render(
    <LanguageProvider>
      <OrderMessages orderId={7} {...props} />
    </LanguageProvider>,
  )
}

const thread = [
  { id: 1, message: 'متى يجهز الطلب؟', author_role: 'customer', created_at: '2026-05-01T10:00:00Z' },
  { id: 2, message: 'خلال يومين عمل.', author_role: 'staff', created_at: '2026-05-01T11:00:00Z', user_name: 'Staff Person' },
]

afterEach(() => vi.restoreAllMocks())

test('shows "you" vs "Khalsni team" and never a staff name', async () => {
  vi.spyOn(api, 'getCustomerOrderMessages').mockResolvedValue(thread)
  renderMessages('ar')
  const list = await screen.findByRole('list', { name: 'الرسائل' })
  const items = within(list).getAllByRole('listitem')
  expect(items).toHaveLength(2)
  expect(items[0]).toHaveTextContent('أنت')
  expect(items[0]).toHaveTextContent('متى يجهز الطلب؟')
  expect(items[1]).toHaveTextContent('فريق خلصني')
  expect(document.body.textContent).not.toMatch(/Staff Person/)
})

test('English labels', async () => {
  vi.spyOn(api, 'getCustomerOrderMessages').mockResolvedValue(thread)
  renderMessages('en')
  const list = await screen.findByRole('list', { name: 'Messages' })
  expect(within(list).getByText('You')).toBeInTheDocument()
  expect(within(list).getByText('Khalsni team')).toBeInTheDocument()
})

test('empty state, then sending a message refreshes the thread', async () => {
  const getSpy = vi.spyOn(api, 'getCustomerOrderMessages')
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ id: 3, message: 'سؤال جديد', author_role: 'customer', created_at: '2026-05-02T10:00:00Z' }])
  let resolveSend
  const sendSpy = vi.spyOn(api, 'sendCustomerOrderMessage').mockImplementation(() => new Promise((resolve) => { resolveSend = resolve }))
  renderMessages('ar')
  expect(await screen.findByText(/لا توجد رسائل بعد/)).toBeInTheDocument()

  const box = screen.getByLabelText('رسالتك إلى فريق الدعم')
  expect(box).toHaveAttribute('maxLength', '2000')
  const send = screen.getByRole('button', { name: /إرسال الرسالة/ })
  expect(send).toBeDisabled()
  fireEvent.change(box, { target: { value: '  سؤال جديد  ' } })
  fireEvent.click(send)
  expect(sendSpy).toHaveBeenCalledWith(7, 'سؤال جديد')
  // disabled while sending
  expect(screen.getByRole('button', { name: /جارٍ الإرسال/ })).toBeDisabled()
  resolveSend({ id: 3 })
  expect(await screen.findByText('سؤال جديد', { selector: 'bdi' })).toBeInTheDocument()
  expect(getSpy).toHaveBeenCalledTimes(2)
  expect(box).toHaveValue('')
})

test('a refused message shows the localized field error and keeps the text', async () => {
  vi.spyOn(api, 'getCustomerOrderMessages').mockResolvedValue([])
  const error = Object.assign(new Error('bad'), { response: { status: 400, data: { message: ['لا يمكن إرسال رسائل على طلب مؤرشف.'] } } })
  vi.spyOn(api, 'sendCustomerOrderMessage').mockRejectedValue(error)
  renderMessages('ar')
  const box = await screen.findByLabelText('رسالتك إلى فريق الدعم')
  fireEvent.change(box, { target: { value: 'مرحبا' } })
  fireEvent.click(screen.getByRole('button', { name: /إرسال الرسالة/ }))
  expect(await screen.findByRole('alert')).toHaveTextContent('لا يمكن إرسال رسائل على طلب مؤرشف.')
  expect(box).toHaveValue('مرحبا')
})

test('no send box when sending is not possible', async () => {
  vi.spyOn(api, 'getCustomerOrderMessages').mockResolvedValue(thread)
  renderMessages('ar', { canSend: false })
  await screen.findByRole('list', { name: 'الرسائل' })
  await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument())
})
