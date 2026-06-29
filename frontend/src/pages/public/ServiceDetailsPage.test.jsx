import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import ServiceDetailsPage from './ServiceDetailsPage'
import { api } from '../../api/services'

test('service details renders structured pricing delivery and required document payloads', async () => {
  vi.spyOn(api, 'getService').mockResolvedValueOnce({
    id: 99,
    slug: 'service-with-documents',
    name_ar: 'خدمة تجريبية',
    description_ar: 'تفاصيل الخدمة',
    category: { id: 1, name_ar: 'تصنيف' },
    pricing: {
      total_price: 25,
      government_fee: null,
      company_fee: null,
      public_note_ar: 'يتم تأكيد الرسوم بعد المراجعة.',
    },
    delivery_time: {
      mode: 'date_range',
      label_ar: 'من 2026-07-01 إلى 2026-09-30',
      start_date: '2026-07-01',
      end_date: '2026-09-30',
    },
    required_documents: [
      { id: 1, definition_id: 7, document_type: 'national_id', name_ar: 'الهوية الشخصية', instructions_ar: 'نسخة واضحة من الوجهين' },
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

  expect(screen.getByText('من 2026-07-01 إلى 2026-09-30')).toBeInTheDocument()
  expect(screen.getByText('يتم تأكيد الرسوم بعد المراجعة.')).toBeInTheDocument()
  expect(screen.getByText('الهوية الشخصية')).toBeInTheDocument()
  expect(screen.getByText('نسخة واضحة من الوجهين')).toBeInTheDocument()
})
