import { MemoryRouter } from 'react-router-dom'
import { render, screen, within } from '@testing-library/react'
import EmployeeReviewQueuePage from './EmployeeReviewQueuePage'
import { api } from '../../api/services'
import { LanguageProvider } from '../../context/LanguageContext'
import { getPriorityLabel } from '../../utils/format'
import { LANGUAGE_STORAGE_KEY } from '../../utils/i18n'

// DEF-E01: the priority column shows a localized label, never the raw code.

const ROWS = [
  { id: 1, order_number: 'KH-2026-000001', status: 'NEW', priority: 'NORMAL', created_at: '2026-10-01T10:00:00Z' },
  { id: 2, order_number: 'KH-2026-000002', status: 'NEW', priority: 'URGENT', created_at: '2026-10-01T10:00:00Z' },
  { id: 3, order_number: 'KH-2026-000003', status: 'NEW', priority: 'HIGH', created_at: '2026-10-01T10:00:00Z' },
  { id: 4, order_number: 'KH-2026-000004', status: 'NEW', priority: 'LOW', created_at: '2026-10-01T10:00:00Z' },
]

function renderQueue(language) {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  vi.spyOn(api, 'getEmployeeOrders').mockResolvedValue(ROWS)
  vi.spyOn(api, 'getServices').mockResolvedValue([])
  return render(
    <LanguageProvider>
      <MemoryRouter>
        <EmployeeReviewQueuePage />
      </MemoryRouter>
    </LanguageProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

test('every backend priority code has an Arabic and an English label', () => {
  expect(['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((code) => getPriorityLabel(code, 'ar'))).toEqual(['منخفضة', 'عادية', 'عالية', 'عاجلة'])
  expect(['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((code) => getPriorityLabel(code, 'en'))).toEqual(['Low', 'Normal', 'High', 'Urgent'])
  expect(getPriorityLabel('', 'ar')).toBe('عادية')
})

test('the queue prints Arabic priority labels in Arabic mode', async () => {
  renderQueue('ar')
  const table = await screen.findByRole('table')
  await within(table).findByText('#KH-2026-000002')
  for (const label of ['عادية', 'عاجلة', 'عالية', 'منخفضة']) {
    expect(within(table).getByText(label)).toBeInTheDocument()
  }
  for (const code of ['NORMAL', 'URGENT', 'HIGH', 'LOW']) {
    expect(within(table).queryByText(code)).not.toBeInTheDocument()
  }
})

test('the queue prints English priority labels in English mode', async () => {
  renderQueue('en')
  const table = await screen.findByRole('table')
  await within(table).findByText('#KH-2026-000002')
  for (const label of ['Normal', 'Urgent', 'High', 'Low']) {
    expect(within(table).getByText(label)).toBeInTheDocument()
  }
  expect(within(table).queryByText('NORMAL')).not.toBeInTheDocument()
})
