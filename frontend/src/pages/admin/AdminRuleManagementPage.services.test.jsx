// Duplicate service/price editors (audit §9, P3): /admin/services is the one
// canonical editor. The rules "services and prices" tab is a read-only overview
// whose rows link to that editor with the service preselected.
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor, within } from '@testing-library/react'
import AdminRuleManagementPage from './AdminRuleManagementPage'
import ServicesManagementPage from './ServicesManagementPage'
import { api } from '../../api/services'

afterEach(() => vi.restoreAllMocks())

const services = [
  { id: 7, slug: 'company-registration', name_ar: 'تسجيل شركة', name_en: 'Company registration', category: { id: 2, name_ar: 'خدمات الأعمال', name_en: 'Business services' }, category_name: 'خدمات الأعمال', base_price: '10.00', provider_required: true, requires_manual_review: true, is_active: true },
]

test('the rules services tab is read-only and links each row to the Services editor', async () => {
  vi.spyOn(api, 'getAdminServices').mockResolvedValue(services)
  const createSpy = vi.spyOn(api, 'createAdminService')
  const updateSpy = vi.spyOn(api, 'updateAdminService')
  render(<MemoryRouter><AdminRuleManagementPage /></MemoryRouter>)
  const table = await screen.findByRole('region', { name: 'الخدمات والأسعار' })
  expect(await within(table).findByText('تسجيل شركة')).toBeInTheDocument()

  // no second editor: no "new service" / inline edit / disable buttons
  expect(screen.queryByRole('button', { name: 'خدمة جديدة' })).not.toBeInTheDocument()
  expect(within(table).queryByRole('button', { name: 'تعديل' })).not.toBeInTheDocument()
  expect(within(table).queryByRole('button', { name: 'تعطيل' })).not.toBeInTheDocument()

  const edit = within(table).getByRole('link', { name: 'تعديل تسجيل شركة في إدارة الخدمات' })
  expect(edit).toHaveAttribute('href', '/admin/services?edit=7&search=company-registration')
  expect(screen.getByRole('link', { name: 'فتح إدارة الخدمات' })).toHaveAttribute('href', '/admin/services')
  expect(createSpy).not.toHaveBeenCalled()
  expect(updateSpy).not.toHaveBeenCalled()
})

test('the Services page opens the editor for the service named in ?edit', async () => {
  vi.spyOn(api, 'getAdminCategories').mockResolvedValue([{ id: 2, name_ar: 'خدمات الأعمال', is_deleted: false }])
  vi.spyOn(api, 'getAdminRequiredDocumentDefinitions').mockResolvedValue([])
  const pageSpy = vi.spyOn(api, 'getAdminServicesPage').mockResolvedValue({ results: services, count: 1, hasNext: false, hasPrevious: false })
  render(
    <MemoryRouter initialEntries={['/admin/services?edit=7&search=company-registration']}>
      <Routes><Route element={<ServicesManagementPage />} path="/admin/services" /></Routes>
    </MemoryRouter>,
  )
  await waitFor(() => expect(pageSpy).toHaveBeenCalledWith(expect.objectContaining({ search: 'company-registration' })))
  expect(await screen.findByText('تعديل الخدمة: تسجيل شركة')).toBeInTheDocument()
})
