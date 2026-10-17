import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ServicesManagementPage from './ServicesManagementPage'
import { api } from '../../api/services'

// 38 services, the size of the audited catalogue; the server pages them by 20.
const ALL = Array.from({ length: 38 }, (_, index) => ({
  id: index + 1,
  name_ar: `خدمة رقم ${index + 1}`,
  name_en: `Service ${index + 1}`,
  slug: `service-${index + 1}`,
  category: index % 2 ? 2 : 1,
  is_active: true,
  is_deleted: false,
}))

function serverPage({ page = 1, category = '', search = '' } = {}) {
  const rows = ALL.filter((row) => (!category || String(row.category) === String(category)) && (!search || row.slug.includes(search)))
  const results = rows.slice((page - 1) * 20, page * 20)
  return Promise.resolve({ results, count: rows.length, hasNext: page * 20 < rows.length, hasPrevious: page > 1 })
}

function servicesTable() {
  return screen.getByRole('region', { name: 'جدول الخدمات' })
}

beforeEach(() => {
  vi.spyOn(api, 'getAdminCategories').mockResolvedValue([
    { id: 1, name_ar: 'الأولى', is_deleted: false },
    { id: 2, name_ar: 'الثانية', is_deleted: false },
  ])
  vi.spyOn(api, 'getAdminRequiredDocumentDefinitions').mockResolvedValue([])
})

afterEach(() => vi.restoreAllMocks())

test('every service is reachable with next and previous, and the current page is announced', async () => {
  const spy = vi.spyOn(api, 'getAdminServicesPage').mockImplementation(serverPage)
  const user = userEvent.setup()
  render(<MemoryRouter><ServicesManagementPage /></MemoryRouter>)

  expect(await within(await screen.findByRole('region', { name: 'جدول الخدمات' })).findByText('خدمة رقم 1')).toBeInTheDocument()
  expect(within(servicesTable()).getAllByRole('row')).toHaveLength(21) // header + 20
  expect(screen.getByText('عرض 1 - 20 من 38')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'الصفحة 1 من 2' })).toHaveAttribute('aria-current', 'page')

  await user.click(screen.getByRole('button', { name: 'الصفحة التالية' }))
  await waitFor(() => expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })))
  expect(await within(servicesTable()).findByText('خدمة رقم 38')).toBeInTheDocument()
  expect(within(servicesTable()).getAllByRole('row')).toHaveLength(19) // header + 18
  expect(screen.getByText('عرض 21 - 38 من 38')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'الصفحة 2 من 2' })).toHaveAttribute('aria-current', 'page')

  await user.click(screen.getByRole('button', { name: 'الصفحة السابقة' }))
  expect(await within(servicesTable()).findByText('خدمة رقم 20')).toBeInTheDocument()
  expect(within(servicesTable()).queryByText('خدمة رقم 21')).not.toBeInTheDocument()

  const seen = new Set()
  for (const call of spy.mock.calls) (await serverPage(call[0])).results.forEach((row) => seen.add(row.id))
  expect(seen.size).toBe(38)
})

test('category filter and search go to the server and restart at page one', async () => {
  const spy = vi.spyOn(api, 'getAdminServicesPage').mockImplementation(serverPage)
  const user = userEvent.setup()
  render(<MemoryRouter><ServicesManagementPage /></MemoryRouter>)
  await screen.findByText('عرض 1 - 20 من 38')
  await user.click(screen.getByRole('button', { name: 'الصفحة التالية' }))
  await waitFor(() => expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })))

  await user.selectOptions(screen.getByRole('combobox', { name: 'تصفية حسب التصنيف' }), '2')
  await waitFor(() => expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, category: '2', status: 'active' })))
  expect(await screen.findByText('خدمة رقم 2')).toBeInTheDocument()
  expect(screen.queryByText('خدمة رقم 1')).not.toBeInTheDocument()

  await user.type(screen.getByTestId('admin-services-search'), 'service-38')
  await waitFor(() => expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, category: '2', search: 'service-38' })))
  expect(await within(servicesTable()).findByText('خدمة رقم 38')).toBeInTheDocument()
  expect(within(servicesTable()).getAllByRole('row')).toHaveLength(2)

  await user.selectOptions(screen.getByRole('combobox', { name: 'حالة الخدمات' }), 'deleted')
  await waitFor(() => expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'deleted', search: 'service-38', category: '2', page: 1 })))
})
