// Audit D02: the approved price sentence is shown once on a service page, not
// in the hero chip, the summary strip and every related card.
import { afterEach, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import ServiceDetailsPage from './ServiceDetailsPage'
import { api } from '../../api/services'

const PRICE_NOTE_AR = 'يتم تأكيد الرسوم النهائية بعد مراجعة الوثائق.'
const DELIVERY_NOTE_AR = 'حسب إجراءات دائرة الأراضي والمساحة.'

function quotationService(overrides = {}) {
  return {
    id: 10,
    slug: 'quotation-service',
    name_ar: 'خدمة بعرض سعر',
    description_ar: 'وصف',
    category: { id: 1, name_ar: 'أراضي', slug: 'land' },
    pricing: { total_price: null, public_note_ar: PRICE_NOTE_AR, public_note_en: 'Final fees are confirmed after document review.' },
    delivery_time: { mode: 'text', label_ar: 'حسب الدائرة', note_ar: DELIVERY_NOTE_AR },
    required_documents: [],
    required_information_schema: [],
    ...overrides,
  }
}

function relatedQuotation(id) {
  return { id, slug: `related-${id}`, name_ar: `خدمة مرتبطة ${id}`, pricing: { total_price: null, public_note_ar: PRICE_NOTE_AR } }
}

function countText(text) {
  return document.body.textContent.split(text).length - 1
}

function renderPage(slug) {
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

test('a quotation service shows the approved price sentence exactly once, related cards included', async () => {
  vi.spyOn(api, 'getService').mockResolvedValueOnce(quotationService({
    related_services: [relatedQuotation(11), relatedQuotation(12), relatedQuotation(13), relatedQuotation(14)],
  }))
  renderPage('quotation-service')
  await waitFor(() => expect(screen.getAllByText('خدمة بعرض سعر').length).toBeGreaterThan(0))
  await waitFor(() => expect(screen.getByText('خدمة مرتبطة 14')).toBeInTheDocument())

  expect(countText(PRICE_NOTE_AR)).toBe(1)
  // The wording itself is unchanged and still visible.
  expect(screen.getByText(PRICE_NOTE_AR)).toBeInTheDocument()
  // The delivery note is a different sentence and keeps its own place.
  expect(countText(DELIVERY_NOTE_AR)).toBe(1)
})

test('a fixed-price service shows its total in the hero and its note once', async () => {
  vi.spyOn(api, 'getService').mockResolvedValueOnce(quotationService({
    slug: 'fixed-service',
    pricing: { total_price: '64.00', public_note_ar: PRICE_NOTE_AR },
    delivery_time: { mode: 'text', label_ar: 'يومان' },
    related_services: [],
  }))
  renderPage('fixed-service')
  await waitFor(() => expect(screen.getAllByText('خدمة بعرض سعر').length).toBeGreaterThan(0))

  expect(countText(PRICE_NOTE_AR)).toBe(1)
  expect(document.body.textContent).toMatch(/64|٦٤/)
})

test('a related card with a known total still shows its price', async () => {
  vi.spyOn(api, 'getService').mockResolvedValueOnce(quotationService({
    related_services: [{ id: 21, slug: 'fixed-related', name_ar: 'خدمة بسعر ثابت', pricing: { total_price: '25.00', public_note_ar: PRICE_NOTE_AR } }],
  }))
  renderPage('quotation-service')
  await waitFor(() => expect(screen.getByText('خدمة بسعر ثابت')).toBeInTheDocument())

  expect(document.body.textContent).toMatch(/25|٢٥/)
  expect(countText(PRICE_NOTE_AR)).toBe(1)
})
