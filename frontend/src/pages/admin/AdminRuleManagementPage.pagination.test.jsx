import { MemoryRouter } from 'react-router-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminRuleManagementPage from './AdminRuleManagementPage'
import { api } from '../../api/services'
import { fetchAllPages, http } from '../../api/client'

afterEach(() => vi.restoreAllMocks())

const services = Array.from({ length: 38 }, (_, index) => ({
  id: index + 1,
  name_ar: `خدمة ${index + 1}`,
  name_en: `Service ${index + 1}`,
  category_name: 'تصنيف',
  base_price: '1.00',
  duration_display: 'Expected completion: 3 days',
  duration_display_ar: 'المدة المتوقعة: 3 أيام',
  duration_display_en: 'Expected completion: 3 days',
  provider_required: true,
  requires_manual_review: true,
  is_active: true,
}))

test('the rules services tab shows all 38 services across pages, durations in Arabic', async () => {
  vi.spyOn(api, 'getAdminServices').mockResolvedValue(services)
  const user = userEvent.setup()
  render(<MemoryRouter><AdminRuleManagementPage /></MemoryRouter>)
  const table = await screen.findByRole('region', { name: 'الخدمات والأسعار' })
  expect(await within(table).findByText('خدمة 1')).toBeInTheDocument()
  expect(within(table).getAllByRole('row')).toHaveLength(21)
  expect(within(table).getAllByText('المدة المتوقعة: 3 أيام')).toHaveLength(20)
  expect(document.body.textContent).not.toMatch(/Expected completion/)
  await user.click(screen.getByRole('button', { name: 'الصفحة التالية' }))
  expect(await within(table).findByText('خدمة 38')).toBeInTheDocument()
  expect(within(table).getAllByRole('row')).toHaveLength(19)
})

test('fetchAllPages follows every page and fails loudly instead of truncating', async () => {
  const get = vi.spyOn(http, 'get').mockImplementation(async (url) => {
    const page = Number(new URLSearchParams(url.split('?')[1] || '').get('page') || 1)
    const rows = Array.from({ length: page < 2 ? 20 : 18 }, (_, i) => ({ id: (page - 1) * 20 + i + 1 }))
    return { count: 38, next: page < 2 ? `?page=${page + 1}` : null, previous: page > 1 ? 'x' : null, results: rows }
  })
  const rows = await fetchAllPages('/admin/services/', { category: 3 })
  expect(rows.map((row) => row.id)).toEqual(Array.from({ length: 38 }, (_, i) => i + 1))
  expect(get.mock.calls.map((call) => call[0])).toEqual(['/admin/services/?category=3', '/admin/services/?category=3&page=2'])

  get.mockImplementation(async () => ({ count: 9999, next: '?page=next', results: [{ id: 1 }] }))
  await expect(fetchAllPages('/admin/services/')).rejects.toThrow(/more than 50 pages/)
})
