import { afterEach, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import ServiceDetailsPage from './ServiceDetailsPage'
import { api } from '../../api/services'

function renderServiceDetails(slug = 'service-with-documents') {
  return render(
    <MemoryRouter initialEntries={[`/services/${slug}`]}>
      <Routes>
        <Route path="/services/:slug" element={<ServiceDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

test('service details respects hidden pricing while rendering duration documents and CTA', async () => {
  vi.spyOn(api, 'getService').mockResolvedValueOnce({
    id: 99,
    slug: 'service-with-documents',
    name_ar: 'خدمة تجريبية',
    description_ar: 'تفاصيل الخدمة',
    category: { id: 1, name_ar: 'تصنيف', slug: 'category-a' },
    total_fee: 999,
    government_fee: 777,
    service_fee: 555,
    pricing: {
      total_price: null,
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
    required_information_schema: [{ key: 'national_id', label_ar: 'الرقم الوطني', type: 'text', required: true }],
    steps: ['الخطوة الأولى', 'الخطوة الثانية'],
    related_services: [],
  })

  renderServiceDetails()

  await waitFor(() => {
    expect(screen.getAllByText('خدمة تجريبية').length).toBeGreaterThan(0)
  })

  expect(screen.getAllByText('من 2026-07-01 إلى 2026-09-30').length).toBeGreaterThan(0)
  expect(screen.getAllByText('يتم تأكيد الرسوم بعد المراجعة.').length).toBeGreaterThan(0)
  expect(screen.getByText('الهوية الشخصية')).toBeInTheDocument()
  expect(screen.getByText('نسخة واضحة من الوجهين')).toBeInTheDocument()
  expect(screen.getByText('الرقم الوطني')).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: /ابدأ الطلب/ })[0]).toHaveAttribute('href', '/create-order?service=99')
  expect(screen.queryByText(/999/)).not.toBeInTheDocument()
  expect(screen.queryByText(/777/)).not.toBeInTheDocument()
  expect(screen.queryByText(/555/)).not.toBeInTheDocument()
  // No uploaded image → the hero shows a curated Khalsni fallback illustration
  // (a real bundled <img>, never a broken image or bare gradient). It is
  // decorative (alt="") since the service name is the adjacent H1.
  const heroImg = document.querySelector('section img')
  expect(heroImg).not.toBeNull()
  expect(heroImg.getAttribute('src')).toMatch(/\/images\/khalsni\//)
})

test('service details renders visible pricing and related services from the public payload', async () => {
  vi.spyOn(api, 'getService').mockResolvedValueOnce({
    id: 100,
    slug: 'visible-price-service',
    name_ar: 'خدمة برسوم ظاهرة',
    description_ar: 'وصف الخدمة',
    image_url: '/media/services/visible.jpg',
    category: { id: 1, name_ar: 'تصنيف', slug: 'category-a' },
    pricing: {
      total_price: 42,
      government_fee: 7,
      company_fee: 5,
      public_note_ar: 'السعر منشور للعامة.',
    },
    delivery_time: {
      label_ar: '3-5 أيام عمل',
    },
    required_documents: [],
    steps: ['تقديم الطلب'],
    related_services: [
      {
        id: 101,
        slug: 'related-service',
        name_ar: 'خدمة مرتبطة',
        description_ar: 'وصف مختصر',
        pricing: { total_price: 12 },
        delivery_time: { label_ar: 'يومان' },
      },
    ],
  })

  renderServiceDetails('visible-price-service')

  await waitFor(() => {
    expect(screen.getAllByText('خدمة برسوم ظاهرة').length).toBeGreaterThan(0)
  })

  expect(screen.getByRole('img', { name: 'خدمة برسوم ظاهرة' })).toHaveAttribute('src', '/media/services/visible.jpg')
  expect(screen.getAllByText('3-5 أيام عمل').length).toBeGreaterThan(0)
  expect(screen.getByText('رسوم حكومية')).toBeInTheDocument()
  expect(screen.getByText('رسوم خدمة')).toBeInTheDocument()
  expect(screen.getByText('خدمة مرتبطة')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /عرض الخدمة/ })).toHaveAttribute('href', '/services/related-service')
})
