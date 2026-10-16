import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminOrderDetailsPage from './AdminOrderDetailsPage'
import { LanguageProvider } from '../../context/LanguageContext'
import { api } from '../../api/services'

const DOC = 'client-audit-qa-202610-authorization'
const requiredDocuments = [{ id: 15, document_type: DOC, name_ar: 'تفويض تجريبي', name_en: 'QA authorization', is_required: true }]

function waitingOrder(overrides = {}) {
  return {
    id: 5,
    order_number: 'KH-2026-000005',
    status: 'WAITING_CUSTOMER',
    customer: { full_name: 'QA Customer A', phone: '0798800103' },
    service: { name_ar: 'خدمة', name_en: 'Service' },
    documents: [],
    status_logs: [],
    required_documents: requiredDocuments,
    allowed_actions: {
      can_view: true,
      available_status_transitions: [],
      workflow_transitions: [
        {
          to_status: 'UNDER_REVIEW', action: 'resume_review', channel: 'dedicated', available: false,
          blocked_reasons: [`Requested documents still need upload: ${DOC}.`],
          blocked: [{ code: 'requested_documents_pending', params: { document_types: [DOC] } }],
          reason_required: false,
        },
        { to_status: 'CANCELLED', action: 'cancel_order', channel: 'dedicated', available: true, blocked_reasons: [], blocked: [], reason_required: true },
      ],
      readiness: { requirements_complete: false, documents: requiredDocuments.map((doc) => ({ ...doc, state: 'not_uploaded' })) },
      can_add_internal_note: true,
      can_request_documents: false,
    },
    ...overrides,
  }
}

function renderPage({ english = false } = {}) {
  window.localStorage.setItem('khalisni-language', english ? 'en' : 'ar')
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/admin/orders/5']}>
        <Routes><Route path="/admin/orders/:id" element={<AdminOrderDetailsPage />} /></Routes>
      </MemoryRouter>
    </LanguageProvider>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'getProviders').mockResolvedValue([])
})

test('waiting order shows the admin cancel action the server allows', async () => {
  vi.spyOn(api, 'getAdminOrder').mockResolvedValue(waitingOrder())
  renderPage()
  expect(await screen.findByTestId('admin-cancel-order')).toBeEnabled()
})

test('no cancel control when the server reports cancel as unavailable', async () => {
  const order = waitingOrder()
  order.allowed_actions.workflow_transitions[1] = {
    ...order.allowed_actions.workflow_transitions[1], available: false,
    blocked_reasons: ['Finalized orders cannot be cancelled.'], blocked: [{ code: 'actor_not_assigned', params: {} }],
  }
  vi.spyOn(api, 'getAdminOrder').mockResolvedValue(order)
  renderPage()
  await screen.findByText('#KH-2026-000005')
  expect(screen.queryByTestId('admin-cancel-order')).not.toBeInTheDocument()
})

test('admin cancel needs a reason, calls the dedicated API and refreshes the order', async () => {
  const getOrder = vi.spyOn(api, 'getAdminOrder')
    .mockResolvedValueOnce(waitingOrder())
    .mockResolvedValue(waitingOrder({ status: 'CANCELLED', allowed_actions: { can_view: true, workflow_transitions: [], available_status_transitions: [] } }))
  const cancel = vi.spyOn(api, 'cancelAdminOrder').mockResolvedValue({ status: 'CANCELLED' })
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByTestId('admin-cancel-order'))
  const confirm = screen.getByRole('button', { name: 'نعم، ألغِ الطلب' })
  expect(confirm).toBeDisabled()
  await user.type(screen.getByLabelText('سبب الإلغاء (مطلوب)'), 'العميل سحب الطلب')
  await user.click(confirm)
  await waitFor(() => expect(cancel).toHaveBeenCalledWith('5', { reason: 'العميل سحب الطلب' }))
  await waitFor(() => expect(getOrder).toHaveBeenCalledTimes(2))
  expect((await screen.findAllByText('ملغي')).length).toBeGreaterThan(0)
  expect(screen.queryByTestId('admin-cancel-order')).not.toBeInTheDocument()
})

test('blocked actions are explained in Arabic without codes or English server text', async () => {
  vi.spyOn(api, 'getAdminOrder').mockResolvedValue(waitingOrder())
  renderPage()
  const list = await screen.findByTestId('admin-blocked-actions')
  expect(within(list).getByText('استئناف المراجعة: بانتظار رفع العميل للمستندات: تفويض تجريبي.')).toBeInTheDocument()
  const body = document.body.textContent
  expect(body).not.toMatch(/resume_review|Requested documents still need upload|client-audit-qa-202610-authorization/)
})

test('blocked actions are explained in English in English mode', async () => {
  vi.spyOn(api, 'getAdminOrder').mockResolvedValue(waitingOrder())
  renderPage({ english: true })
  const list = await screen.findByTestId('admin-blocked-actions')
  expect(within(list).getByText('Resume review: Waiting for the customer to upload: QA authorization.')).toBeInTheDocument()
  expect(document.body.textContent).not.toMatch(/resume_review|client-audit-qa-202610-authorization/)
})

test('request-documents form appears only when allowed and sends configured types', async () => {
  vi.spyOn(api, 'getAdminOrder').mockResolvedValueOnce(waitingOrder())
  const { unmount } = renderPage()
  await screen.findByTestId('admin-cancel-order')
  expect(screen.queryByTestId('admin-request-documents')).not.toBeInTheDocument()
  unmount()

  const reviewOrder = waitingOrder({ status: 'UNDER_REVIEW' })
  reviewOrder.allowed_actions = {
    ...reviewOrder.allowed_actions, can_request_documents: true,
    workflow_transitions: [{ to_status: 'WAITING_CUSTOMER', action: 'request_missing_documents', channel: 'dedicated', available: true, blocked_reasons: [], blocked: [], reason_required: true }],
  }
  vi.spyOn(api, 'getAdminOrder').mockResolvedValue(reviewOrder)
  const request = vi.spyOn(api, 'requestDocuments').mockResolvedValue({ detail: 'Request sent' })
  const user = userEvent.setup()
  renderPage()
  const form = await screen.findByTestId('admin-request-documents')
  await user.type(within(form).getByLabelText('ملاحظة للعميل'), 'يرجى رفع التفويض')
  await user.click(within(form).getByRole('button', { name: 'إرسال الطلب للعميل' }))
  expect(await within(form).findByText('اختر مستنداً واحداً على الأقل.')).toBeInTheDocument()
  expect(request).not.toHaveBeenCalled()
  await user.click(within(form).getByLabelText('تفويض تجريبي'))
  await user.click(within(form).getByRole('button', { name: 'إرسال الطلب للعميل' }))
  await waitFor(() => expect(request).toHaveBeenCalledWith('5', { note: 'يرجى رفع التفويض', document_types: [DOC] }))
})

test('staff recovery panel appears for an unusable legacy request and is audited server-side', async () => {
  const legacy = waitingOrder({ required_documents: [] })
  legacy.allowed_actions = {
    ...legacy.allowed_actions,
    missing_document_request_valid: false,
    can_recover_missing_document_request: true,
    workflow_transitions: [{ to_status: 'UNDER_REVIEW', action: 'resume_review', channel: 'dedicated', available: false, blocked_reasons: ['No valid missing-document request exists.'], blocked: [{ code: 'missing_request_invalid', params: {} }], reason_required: false }],
  }
  vi.spyOn(api, 'getAdminOrder').mockResolvedValue(legacy)
  const recover = vi.spyOn(api, 'recoverMissingDocumentRequest').mockResolvedValue({ status: 'UNDER_REVIEW' })
  const user = userEvent.setup()
  renderPage()
  const panel = await screen.findByTestId('missing-request-recovery')
  await user.click(within(panel).getByRole('button', { name: 'إعادة الطلب إلى المراجعة' }))
  await user.type(screen.getByLabelText('السبب (مطلوب)'), 'طلب قديم بلا مستند محدد')
  await user.click(screen.getByRole('button', { name: 'نعم، أعده إلى المراجعة' }))
  await waitFor(() => expect(recover).toHaveBeenCalledWith('5', { reason: 'طلب قديم بلا مستند محدد' }))
  expect(screen.getByText('استئناف المراجعة: لا يوجد طلب مستندات صالح يمكن للعميل الاستجابة له.')).toBeInTheDocument()
})
