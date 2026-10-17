import { render, screen, within } from '@testing-library/react'
import HelpGuideManagementPage from './HelpGuideManagementPage'
import { api } from '../../api/services'
import { LanguageProvider } from '../../context/LanguageContext'
import { LANGUAGE_STORAGE_KEY } from '../../utils/i18n'

// DEF-A01: the help-guide admin interface follows the active language; the
// guide content itself (stored in the database) is shown as written.

const GUIDE = {
  id: 1,
  title: 'Orders guide (DB content)',
  category: 'general',
  screen_key: 'admin_orders',
  role: 'all_users',
  role_label: 'All users',
  display_order: 1,
  is_active: true,
}

function renderPage(language) {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  vi.spyOn(api, 'getHelpGuideMetadata').mockResolvedValue({
    screens: [{ screen_key: 'admin_orders', label: 'Orders Management' }],
    roles: [{ value: 'all_users', label: 'All users' }],
    categories: [{ value: 'general', label: 'General' }],
    workflow_statuses: [],
  })
  vi.spyOn(api, 'getAvailablePermissions').mockResolvedValue({})
  vi.spyOn(api, 'getAdminServices').mockResolvedValue([])
  vi.spyOn(api, 'getAdminHelpScreens').mockResolvedValue([GUIDE])
  vi.spyOn(api, 'getAdminHelpScreenshots').mockResolvedValue([])
  vi.spyOn(api, 'getAdminHelpFields').mockResolvedValue([])
  vi.spyOn(api, 'getAdminHelpActions').mockResolvedValue([])
  vi.spyOn(api, 'getAdminHelpServices').mockResolvedValue([])
  vi.spyOn(api, 'getAdminHelpWorkflows').mockResolvedValue([])
  return render(
    <LanguageProvider>
      <HelpGuideManagementPage />
    </LanguageProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

test('Arabic mode shows an Arabic interface and keeps guide content as stored', async () => {
  renderPage('ar')
  const table = await screen.findByRole('table')
  await within(table).findByText('Orders guide (DB content)')

  expect(screen.getByText('المساعدة داخل التطبيق')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '+ دليل شاشة جديد' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'كل الأدوار' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'كل الشاشات' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'كل الخدمات' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'النشطة' })).toBeInTheDocument()
  expect(within(table).getByRole('columnheader', { name: 'العنوان' })).toBeInTheDocument()
  expect(within(table).getByRole('columnheader', { name: 'الفئة' })).toBeInTheDocument()
  expect(within(table).getByRole('button', { name: 'تعديل' })).toBeInTheDocument()
  expect(within(table).getByRole('button', { name: 'تعطيل' })).toBeInTheDocument()
  expect(within(table).getAllByText('عام').length).toBeGreaterThan(0)
  expect(within(table).getByText('جميع المستخدمين')).toBeInTheDocument()

  for (const english of ['In-App Help', 'All roles', 'All screens', 'All services', 'Edit', 'Deactivate', 'general', 'Title']) {
    expect(screen.queryByText(english)).not.toBeInTheDocument()
  }
})

test('English mode shows an English interface', async () => {
  renderPage('en')
  const table = await screen.findByRole('table')
  await within(table).findByText('Orders guide (DB content)')

  expect(screen.getByText('In-App Help')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '+ New screen guide' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'All roles' })).toBeInTheDocument()
  expect(within(table).getByRole('columnheader', { name: 'Title' })).toBeInTheDocument()
  expect(within(table).getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  expect(within(table).getByRole('button', { name: 'Deactivate' })).toBeInTheDocument()
  expect(within(table).getAllByText('General').length).toBeGreaterThan(0)
  expect(within(table).queryByText('general')).not.toBeInTheDocument()
})
