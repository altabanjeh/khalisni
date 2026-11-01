// Item 16: result delivery method (staff edit, customer read-only).
import { act, fireEvent, render, screen } from '@testing-library/react'
import StaffDeliveryPanel, { CustomerDeliveryCard } from './OrderDelivery'
import { LanguageProvider } from '../context/LanguageContext'
import { api } from '../api/services'

function renderWith(ui, language = 'ar') {
  localStorage.setItem('khalisni-language', language)
  return render(<LanguageProvider>{ui}</LanguageProvider>)
}

const electronic = {
  delivery_method: 'electronic',
  delivery_method_label_ar: 'تسليم إلكتروني (تنزيل النتيجة)',
  delivery_method_label_en: 'Electronic (download the result)',
  delivery_instructions: '',
}
const pickup = {
  delivery_method: 'paper_pickup',
  delivery_method_label_ar: 'تسليم ورقي - استلام',
  delivery_method_label_en: 'Paper - pickup',
  delivery_instructions: 'استلم الأصل من مكتب عمّان مع الهوية.',
}

afterEach(() => vi.restoreAllMocks())

// Wait until the loaded delivery is applied, then query fresh nodes.
async function readySelect() {
  await screen.findByLabelText('طريقة التسليم')
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)) })
  return screen.getByLabelText('طريقة التسليم')
}

test('staff save a paper method with instructions', async () => {
  vi.spyOn(api, 'getStaffOrderDelivery').mockResolvedValue(electronic)
  const save = vi.spyOn(api, 'updateStaffOrderDelivery').mockResolvedValue(pickup)
  const onChanged = vi.fn()
  renderWith(<StaffDeliveryPanel onChanged={onChanged} orderId={5} orderStatus="IN_PROGRESS" />)
  const select = await readySelect()
  expect(select).toBeEnabled()
  fireEvent.change(select, { target: { value: 'paper_pickup' } })
  const box = screen.getByLabelText('تعليمات التسليم للعميل (مطلوبة)')
  fireEvent.change(box, { target: { value: '  استلم الأصل من مكتب عمّان مع الهوية.  ' } })
  fireEvent.click(screen.getByRole('button', { name: 'حفظ التسليم' }))
  await vi.waitFor(() => expect(save).toHaveBeenCalledWith(5, { delivery_method: 'paper_pickup', delivery_instructions: 'استلم الأصل من مكتب عمّان مع الهوية.' }))
  expect(await screen.findByRole('status')).toHaveTextContent('تم حفظ تفاصيل التسليم.')
  expect(onChanged).toHaveBeenCalled()
})

test('paper methods need instructions before anything is sent', async () => {
  vi.spyOn(api, 'getStaffOrderDelivery').mockResolvedValue(electronic)
  const save = vi.spyOn(api, 'updateStaffOrderDelivery')
  renderWith(<StaffDeliveryPanel orderId={5} orderStatus="IN_PROGRESS" />)
  const select = await readySelect()
  expect(select).toBeEnabled()
  fireEvent.change(select, { target: { value: 'paper_courier' } })
  fireEvent.click(screen.getByRole('button', { name: 'حفظ التسليم' }))
  expect(screen.getByRole('alert')).toHaveTextContent('اكتب تعليمات التسليم الورقي للعميل.')
  expect(save).not.toHaveBeenCalled()
})

test('a server refusal (finished order) is shown', async () => {
  vi.spyOn(api, 'getStaffOrderDelivery').mockResolvedValue(electronic)
  vi.spyOn(api, 'updateStaffOrderDelivery').mockRejectedValue(
    Object.assign(new Error('x'), { displayMessage: 'لا يمكن تعديل تفاصيل التسليم لطلب منتهٍ.', response: { status: 400, data: { detail: 'لا يمكن تعديل تفاصيل التسليم لطلب منتهٍ.' } } }),
  )
  renderWith(<StaffDeliveryPanel orderId={5} orderStatus="READY_FOR_DELIVERY" />)
  const select = await readySelect()
  expect(select).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'حفظ التسليم' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('لا يمكن تعديل تفاصيل التسليم لطلب منتهٍ.')
})

test('a localized field error from the server is shown under the instructions', async () => {
  vi.spyOn(api, 'getStaffOrderDelivery').mockResolvedValue(pickup)
  vi.spyOn(api, 'updateStaffOrderDelivery').mockRejectedValue(
    Object.assign(new Error('x'), { response: { status: 400, data: { delivery_instructions: ['التسليم الورقي يحتاج تعليمات للعميل.'] } } }),
  )
  renderWith(<StaffDeliveryPanel orderId={5} orderStatus="IN_PROGRESS" />)
  await vi.waitFor(() => expect(screen.getByLabelText('تعليمات التسليم للعميل (مطلوبة)')).toHaveValue(pickup.delivery_instructions))
  fireEvent.click(screen.getByRole('button', { name: 'حفظ التسليم' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('التسليم الورقي يحتاج تعليمات للعميل.')
})

test('editing is disabled on a finished order', async () => {
  vi.spyOn(api, 'getStaffOrderDelivery').mockResolvedValue(pickup)
  renderWith(<StaffDeliveryPanel orderId={5} orderStatus="COMPLETED" />)
  expect(await screen.findByText('لا يمكن تعديل التسليم بعد انتهاء الطلب.')).toBeInTheDocument()
  expect(screen.getByLabelText('طريقة التسليم')).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'حفظ التسليم' })).not.toBeInTheDocument()
})

test('customer sees the localized method and instructions', async () => {
  vi.spyOn(api, 'getCustomerOrderDelivery').mockResolvedValue(pickup)
  renderWith(<CustomerDeliveryCard orderId={31} />, 'en')
  const card = await screen.findByTestId('customer-delivery')
  expect(card).toHaveTextContent('Paper - pickup')
  expect(card).toHaveTextContent(pickup.delivery_instructions)
})

test('customer card is hidden for electronic delivery without instructions', async () => {
  const spy = vi.spyOn(api, 'getCustomerOrderDelivery').mockResolvedValue(electronic)
  renderWith(<CustomerDeliveryCard orderId={31} />)
  await vi.waitFor(() => expect(spy).toHaveBeenCalledWith(31))
  await Promise.resolve()
  expect(screen.queryByTestId('customer-delivery')).not.toBeInTheDocument()
})

test('customer card shows electronic delivery when there are instructions (Arabic label)', async () => {
  vi.spyOn(api, 'getCustomerOrderDelivery').mockResolvedValue({ ...electronic, delivery_instructions: 'ستصلك النسخة على البريد أيضاً.' })
  renderWith(<CustomerDeliveryCard orderId={31} />)
  const card = await screen.findByTestId('customer-delivery')
  expect(card).toHaveTextContent('تسليم إلكتروني (تنزيل النتيجة)')
})
