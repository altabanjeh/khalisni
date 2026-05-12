import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateOrderPage from './CreateOrderPage'
import { api } from '../../api/services'

test('order form validates required fields', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <CreateOrderPage />
    </MemoryRouter>,
  )

  await user.click(screen.getByRole('button'))
  expect(await screen.findByText('الاسم الكامل مطلوب')).toBeInTheDocument()
  expect(screen.getByText('رقم الهاتف مطلوب')).toBeInTheDocument()
})

test('multi-document services submit each required document with its own type', async () => {
  const user = userEvent.setup()
  vi.spyOn(api, 'getServices').mockResolvedValueOnce([
    { id: 1, slug: 'multi-doc-service', name_ar: 'Service', estimated_duration: 2 },
  ])
  vi.spyOn(api, 'getService').mockResolvedValue({
    id: 1,
    slug: 'multi-doc-service',
    name_ar: 'Service',
    required_documents: [
      { id: 11, document_type: 'national_id', name_ar: 'National ID', is_required: true },
      { id: 12, document_type: 'authorization_letter', name_ar: 'Authorization Letter', is_required: true },
    ],
  })
  const createOrderSpy = vi.spyOn(api, 'createOrder').mockResolvedValueOnce({ order_number: 'KH-2026-000111' })

  const { container } = render(
    <MemoryRouter>
      <CreateOrderPage />
    </MemoryRouter>,
  )

  await waitFor(() => {
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  await user.selectOptions(screen.getByRole('combobox'), '1')
  await waitFor(() => {
    expect(screen.getByText('National ID')).toBeInTheDocument()
    expect(screen.getByText('Authorization Letter')).toBeInTheDocument()
  })

  const fileInputs = container.querySelectorAll('input[type="file"]')
  const textInputs = container.querySelectorAll('input.field:not([type="file"]):not([type="checkbox"])')
  const nationalIdFile = new File(['id'], 'national-id.pdf', { type: 'application/pdf' })
  const authorizationFile = new File(['auth'], 'authorization-letter.pdf', { type: 'application/pdf' })

  await user.type(textInputs[0], 'Test Customer')
  await user.type(textInputs[1], '0799999999')
  await user.type(textInputs[3], 'Amman')
  await user.upload(fileInputs[0], nationalIdFile)
  await user.upload(fileInputs[1], authorizationFile)
  await user.click(container.querySelector('input[type="checkbox"]'))
  await user.click(screen.getByRole('button'))

  await waitFor(() => {
    expect(createOrderSpy).toHaveBeenCalledTimes(1)
  })

  const formData = createOrderSpy.mock.calls[0][0]
  const entries = Array.from(formData.entries())
  expect(
    entries.filter(([key]) => key === 'document_types').map(([, value]) => value),
  ).toEqual(['national_id', 'authorization_letter'])
  expect(entries.filter(([key]) => key === 'documents').map(([, value]) => value.name)).toEqual([
    'national-id.pdf',
    'authorization-letter.pdf',
  ])
})
