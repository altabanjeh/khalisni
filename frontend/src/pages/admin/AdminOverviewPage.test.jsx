// DEF-A05: overview charts carry localized labels, a legend and integer axes.
import { render, screen, within } from '@testing-library/react'
import AdminOverviewPage from './AdminOverviewPage'
import { api } from '../../api/services'
import { LanguageProvider } from '../../context/LanguageContext'
import { buildOverviewChartData } from '../../utils/overviewCharts'

afterEach(() => vi.restoreAllMocks())

const dashboard = {
  cards: { new_orders_today: 1, orders_in_progress: 2, waiting_customer: 0, completed_this_week: 1, delayed_orders: 0, revenue_estimate: 10 },
  orders_by_status: [{ status: 'SUBMITTED', total: 1 }, { status: 'IN_PROGRESS', total: 2 }],
  top_services: [{ service__name_ar: 'تسجيل شركة', total: 3 }, { service__name_ar: 'سند تسجيل', total: 1 }],
}
const catalogue = [
  { id: 1, name_ar: 'تسجيل شركة', name_en: 'Company registration' },
  { id: 2, name_ar: 'سند تسجيل', name_en: '' },
]

test('chart rows get localized status and service labels', () => {
  const ar = buildOverviewChartData(dashboard, 'ar', catalogue)
  expect(ar.statusRows.map((row) => row.status)).toEqual(['SUBMITTED', 'IN_PROGRESS'])
  expect(ar.statusRows.every((row) => row.label && row.label !== row.status)).toBe(true)
  expect(ar.serviceRows.map((row) => row.label)).toEqual(['تسجيل شركة', 'سند تسجيل'])

  const en = buildOverviewChartData(dashboard, 'en', catalogue)
  // English name when the catalogue has one, Arabic name otherwise (never blank)
  expect(en.serviceRows.map((row) => row.label)).toEqual(['Company registration', 'سند تسجيل'])
  expect(new Set(en.serviceRows.map((row) => row.color)).size).toBe(2)
})

test('the most-requested services chart has a legend with localized names and counts', async () => {
  localStorage.setItem('khalisni-language', 'en')
  vi.spyOn(api, 'getAdminDashboard').mockResolvedValue(dashboard)
  vi.spyOn(api, 'getAdminServices').mockResolvedValue(catalogue)
  render(<LanguageProvider><AdminOverviewPage /></LanguageProvider>)
  const legend = await screen.findByTestId('top-services-legend')
  expect(await within(legend).findByText('Company registration')).toBeInTheDocument()
  expect(within(legend).getByText('3')).toBeInTheDocument()
  expect(within(legend).getAllByRole('listitem')).toHaveLength(2)
})
