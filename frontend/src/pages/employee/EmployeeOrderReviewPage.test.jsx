import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EmployeeOrderReviewPage from './EmployeeOrderReviewPage'
import { api } from '../../api/services'

const serviceLabel = '\u062e\u062f\u0645\u0629'
const startReviewLabel = '\u0628\u062f\u0621 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629'
const reviewStartedNote = '\u0628\u062f\u0623 \u0627\u0644\u0645\u0648\u0638\u0641 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0637\u0644\u0628.'
const workflowStepsTitle = '\u062e\u0637\u0648\u0627\u062a \u0627\u0644\u0639\u0645\u0644 \u0639\u0644\u0649 \u0627\u0644\u0637\u0644\u0628'
const verifyFirstLabel = '\u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a \u0623\u0648\u0644\u0627\u064b'

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      permissions: ['orders.assign_order'],
    },
  }),
}))

test('employee can start review for new orders from the review page', async () => {
  vi.spyOn(api, 'getEmployeeOrder').mockResolvedValue({
    id: 9,
    order_number: 'KH-2026-000009',
    status: 'NEW',
    city: 'Amman',
    customer: { full_name: 'Customer' },
    service: { name_ar: serviceLabel, slug: 'service-slug' },
    documents: [],
    status_logs: [],
    allowed_actions: {
      available_status_transitions: ['UNDER_REVIEW'],
      can_request_documents: true,
      can_assign_provider: true,
      can_add_internal_note: true,
      can_reject: true,
      can_verify_documents: true,
    },
  })
  vi.spyOn(api, 'getProviders').mockResolvedValue([])
  vi.spyOn(api, 'getEmployeeNotificationTemplates').mockResolvedValue([])
  vi.spyOn(api, 'getService').mockResolvedValue({ slug: 'service-slug', required_documents: [] })
  const updateSpy = vi.spyOn(api, 'updateEmployeeStatus').mockResolvedValue({ status: 'UNDER_REVIEW' })

  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/employee/orders/9']}>
      <Routes>
        <Route path="/employee/orders/:id" element={<EmployeeOrderReviewPage />} />
      </Routes>
    </MemoryRouter>,
  )

  await waitFor(() => {
    expect(screen.getByText('KH-2026-000009')).toBeInTheDocument()
  })

  await user.click(screen.getByRole('button', { name: startReviewLabel }))

  await waitFor(() => {
    expect(updateSpy).toHaveBeenCalledWith('9', {
      status: 'UNDER_REVIEW',
      note: reviewStartedNote,
    })
  })
})

test('employee can still see provider candidates before assignment is allowed', async () => {
  vi.spyOn(api, 'getEmployeeOrder').mockResolvedValue({
    id: 11,
    order_number: 'KH-2026-000011',
    status: 'UNDER_REVIEW',
    city: 'Amman',
    customer: { full_name: 'Customer' },
    service: { name_ar: serviceLabel, slug: 'service-slug' },
    documents: [],
    status_logs: [],
    allowed_actions: {
      available_status_transitions: [],
      can_request_documents: true,
      can_assign_provider: false,
      can_add_internal_note: true,
      can_reject: true,
      can_verify_documents: true,
    },
  })
  vi.spyOn(api, 'getProviders').mockResolvedValue([
    {
      id: 21,
      full_name: 'Provider One',
      city: 'Amman',
      is_available: true,
      is_approved: true,
      service_categories: ['Category A'],
    },
  ])
  vi.spyOn(api, 'getEmployeeNotificationTemplates').mockResolvedValue([])
  vi.spyOn(api, 'getService').mockResolvedValue({ slug: 'service-slug', required_documents: [] })

  render(
    <MemoryRouter initialEntries={['/employee/orders/11']}>
      <Routes>
        <Route path="/employee/orders/:id" element={<EmployeeOrderReviewPage />} />
      </Routes>
    </MemoryRouter>,
  )

  await waitFor(() => {
    expect(screen.getByText('Provider One')).toBeInTheDocument()
  })

  expect(screen.getByText(workflowStepsTitle)).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: verifyFirstLabel }).length).toBeGreaterThan(0)

  const providerSection = screen.getByText('Provider One').closest('section')
  expect(providerSection).not.toBeNull()

  const providerSelect = providerSection.querySelector('select')
  const assignmentNote = providerSection.querySelector('textarea')
  const assignButton = providerSection.querySelector('button[type="submit"]')

  expect(providerSelect).toBeDisabled()
  expect(assignmentNote).toBeDisabled()
  expect(assignButton).toBeDisabled()
})
