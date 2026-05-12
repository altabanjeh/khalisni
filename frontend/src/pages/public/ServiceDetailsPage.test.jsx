import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import ServiceDetailsPage from './ServiceDetailsPage'
import { api } from '../../api/services'

test('service details renders required document objects from the API payload', async () => {
  vi.spyOn(api, 'getService').mockResolvedValueOnce({
    id: 99,
    slug: 'service-with-documents',
    name_ar: 'خدمة تجريبية',
    description_ar: 'تفاصيل الخدمة',
    estimated_duration: 3,
    service_fee: 10,
    government_fee: 5,
    category: { id: 1, name_ar: 'تصنيف' },
    required_documents: [
      { id: 1, document_type: 'national_id', name_ar: 'الهوية الشخصية' },
      { id: 2, document_type: 'authorization_letter', name_ar: 'تفويض' },
    ],
    steps: ['الخطوة الأولى', 'الخطوة الثانية'],
    related_services: [],
  })

  render(
    <MemoryRouter initialEntries={['/services/service-with-documents']}>
      <Routes>
        <Route path="/services/:slug" element={<ServiceDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  )

  await waitFor(() => {
    expect(screen.getByText('خدمة تجريبية')).toBeInTheDocument()
  })

  expect(screen.getByText('الهوية الشخصية')).toBeInTheDocument()
  expect(screen.getByText('تفويض')).toBeInTheDocument()
})
