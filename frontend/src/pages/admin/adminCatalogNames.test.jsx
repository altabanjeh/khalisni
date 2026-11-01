// DEF-A03: admin/staff tables show catalogue names in the screen language,
// falling back to the Arabic name when the English one is empty.
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ServiceProviderAssignmentsPage from './ServiceProviderAssignmentsPage'
import ReportsPage from './ReportsPage'
import { api } from '../../api/services'
import { LanguageProvider } from '../../context/LanguageContext'
import { getAdminCategoryPath, getAdminName, resolveCatalogName } from '../../utils/servicePresentation'

afterEach(() => vi.restoreAllMocks())

test('admin name helpers prefer the screen language and fall back to the other one', () => {
  expect(getAdminName({ name_ar: 'تسجيل شركة', name_en: 'Company registration' }, 'en')).toBe('Company registration')
  expect(getAdminName({ name_ar: 'تسجيل شركة', name_en: '' }, 'en')).toBe('تسجيل شركة')
  expect(getAdminName({ name_ar: 'تسجيل شركة', name_en: 'Company registration' }, 'ar')).toBe('تسجيل شركة')
  expect(getAdminCategoryPath({ full_path_name: 'الأعمال / الشركات', full_path_name_en: 'Business / Companies', name_ar: 'الشركات' }, 'en')).toBe('Business / Companies')
  expect(resolveCatalogName(3, [{ id: 3, name_ar: 'خدمة', name_en: 'Service three' }], 'خدمة', 'en')).toBe('Service three')
  expect(resolveCatalogName(9, [], 'خدمة غير معروفة', 'en')).toBe('خدمة غير معروفة')
})

test('the provider-services table shows English service names in English mode', async () => {
  localStorage.setItem('khalisni-language', 'en')
  vi.spyOn(api, 'getAdminServiceAssignments').mockResolvedValue([
    { id: 1, service_id: 3, service_name: 'خدمة ضريبية', provider_id: 8, provider_name: 'Provider Two', is_active: true },
  ])
  vi.spyOn(api, 'getAdminServices').mockResolvedValue([{ id: 3, name_ar: 'خدمة ضريبية', name_en: 'Tax clearance' }])
  vi.spyOn(api, 'getProviders').mockResolvedValue([{ id: 8, full_name: 'Provider Two' }])
  render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/admin/provider-services']}>
        <Routes><Route element={<ServiceProviderAssignmentsPage />} path="/admin/provider-services" /></Routes>
      </MemoryRouter>
    </LanguageProvider>,
  )
  expect((await screen.findAllByText('Tax clearance')).length).toBeGreaterThan(0)
  expect(screen.queryByText('خدمة ضريبية')).not.toBeInTheDocument()
})

test('the reports top-services table uses the English service name', async () => {
  localStorage.setItem('khalisni-language', 'en')
  vi.spyOn(api, 'getDailyReport').mockResolvedValue({ top_services: [{ service__name_ar: 'تسجيل شركة', service__name_en: 'Company registration', total: 4 }] })
  render(<LanguageProvider><MemoryRouter><ReportsPage /></MemoryRouter></LanguageProvider>)
  const cell = await screen.findByText('Company registration')
  expect(within(cell.closest('tr')).getByText('4')).toBeInTheDocument()
})
