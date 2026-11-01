// Item 14: staff change the provider of an assigned / in-progress order.
import { fireEvent, render, screen, within } from '@testing-library/react'
import ReassignProviderPanel from './ReassignProviderPanel'
import { LanguageProvider } from '../context/LanguageContext'
import { api } from '../api/services'

const providers = [
  { id: 11, full_name: 'Provider Current', city: 'Amman' },
  { id: 12, full_name: 'Provider Next', city: 'Irbid' },
  { id: 13, full_name: 'Provider Third', city: '' },
]

function order(canReassign = true) {
  return {
    id: 5,
    status: 'ASSIGNED',
    assigned_provider: { id: 11, full_name: 'Provider Current' },
    allowed_actions: { can_reassign_provider: canReassign },
  }
}

function renderPanel(props, language = 'ar') {
  localStorage.setItem('khalisni-language', language)
  return render(
    <LanguageProvider>
      <ReassignProviderPanel providers={providers} {...props} />
    </LanguageProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

test('hidden unless the server allows reassignment', () => {
  renderPanel({ order: order(false) })
  expect(screen.queryByTestId('reassign-provider')).not.toBeInTheDocument()
})

test('lists eligible providers except the current one and requires a reason', () => {
  const spy = vi.spyOn(api, 'reassignOrderProvider')
  renderPanel({ order: order() })
  const panel = screen.getByTestId('reassign-provider')
  expect(within(panel).getByRole('heading', { name: 'تغيير مزود الخدمة' })).toBeInTheDocument()
  const select = within(panel).getByLabelText('المزوّد الجديد')
  const values = [...select.querySelectorAll('option')].map((option) => option.value)
  expect(values).toEqual(['', '12', '13'])

  fireEvent.change(select, { target: { value: '12' } })
  fireEvent.click(within(panel).getByRole('button', { name: 'تغيير المزوّد' }))
  expect(within(panel).getByText('سبب التغيير مطلوب.')).toBeInTheDocument()
  expect(screen.queryByText('تأكيد تغيير المزوّد')).not.toBeInTheDocument()
  expect(spy).not.toHaveBeenCalled()
})

test('posts provider_id and reason after confirmation, then refreshes', async () => {
  const spy = vi.spyOn(api, 'reassignOrderProvider').mockResolvedValue({ assigned_provider: 12, status: 'ASSIGNED' })
  const onReassigned = vi.fn()
  renderPanel({ order: order(), onReassigned })
  fireEvent.change(screen.getByLabelText('المزوّد الجديد'), { target: { value: '12' } })
  fireEvent.change(screen.getByLabelText('سبب التغيير (مطلوب)'), { target: { value: '  المزوّد غير متاح  ' } })
  fireEvent.click(screen.getByRole('button', { name: 'تغيير المزوّد' }))
  expect(spy).not.toHaveBeenCalled()
  expect(screen.getByText('تأكيد تغيير المزوّد')).toBeInTheDocument()
  expect(screen.getByText(/Provider Next/, { selector: 'p' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'نعم، غيّر المزوّد' }))
  await vi.waitFor(() => expect(onReassigned).toHaveBeenCalled())
  expect(spy).toHaveBeenCalledWith(5, { provider_id: 12, reason: 'المزوّد غير متاح' })
})

test('shows the localized server error', async () => {
  vi.spyOn(api, 'reassignOrderProvider').mockRejectedValue(
    Object.assign(new Error('x'), { response: { status: 400, data: { provider_id: ['هذا المزوّد معيّن على الطلب بالفعل.'] } } }),
  )
  const onReassigned = vi.fn()
  renderPanel({ order: order(), onReassigned })
  fireEvent.change(screen.getByLabelText('المزوّد الجديد'), { target: { value: '13' } })
  fireEvent.change(screen.getByLabelText('سبب التغيير (مطلوب)'), { target: { value: 'سبب' } })
  fireEvent.click(screen.getByRole('button', { name: 'تغيير المزوّد' }))
  fireEvent.click(screen.getByRole('button', { name: 'نعم، غيّر المزوّد' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('هذا المزوّد معيّن على الطلب بالفعل.')
  expect(onReassigned).not.toHaveBeenCalled()
})

test('English labels', () => {
  renderPanel({ order: order() }, 'en')
  expect(screen.getByRole('heading', { name: 'Change provider' })).toBeInTheDocument()
  expect(screen.getByLabelText('Reason for the change (required)')).toBeInTheDocument()
})
