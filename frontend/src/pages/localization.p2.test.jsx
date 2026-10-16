import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import AdminOverviewPage from './admin/AdminOverviewPage'
import EmployeeVerifyDocumentsPage from './employee/EmployeeVerifyDocumentsPage'
import OrderTimeline from '../components/OrderTimeline'
import { api } from '../api/services'
import { describeTimelineNote } from '../utils/timelinePresentation'
import { LANGUAGE_STORAGE_KEY } from '../utils/i18n'

// jsdom cannot measure SVG text, so the chart primitives are replaced by
// stand-ins that print what the X axis would show: data[dataKey] per bar.
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts')
  const { Children, cloneElement, isValidElement } = await vi.importActual('react')
  const passData = ({ data, children }) => (
    <div>{Children.map(children, (child) => (isValidElement(child) ? cloneElement(child, { data }) : child))}</div>
  )
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    BarChart: passData,
    PieChart: () => null,
    XAxis: ({ data = [], dataKey }) => <ul data-testid="x-axis">{data.map((row, index) => <li key={index}>{row[dataKey]}</li>)}</ul>,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Bar: () => null,
  }
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.removeItem(LANGUAGE_STORAGE_KEY)
})

const RAW_STATUS = /\b(NEW|WAITING_CUSTOMER|ASSIGNED|COMPLETED)\b/

// 14. Arabic admin dashboard has no raw status codes
test('admin dashboard chart labels statuses in Arabic', async () => {
  vi.spyOn(api, 'getAdminDashboard').mockResolvedValue({
    cards: { new_orders_today: 1, orders_in_progress: 2, waiting_customer: 1, completed_this_week: 1, delayed_orders: 0, revenue_estimate: 10 },
    orders_by_status: [
      { status: 'NEW', total: 1 }, { status: 'WAITING_CUSTOMER', total: 1 }, { status: 'ASSIGNED', total: 1 }, { status: 'COMPLETED', total: 1 },
    ],
    top_services: [],
  })
  render(<MemoryRouter><AdminOverviewPage /></MemoryRouter>)
  const axis = await screen.findByTestId('x-axis')
  const ticks = [...axis.querySelectorAll('li')].map((node) => node.textContent)
  expect(ticks).toEqual(['جديد', 'بانتظار العميل', 'تم التعيين', 'مكتمل'])
  expect(document.body.textContent).not.toMatch(RAW_STATUS)
})

// 15. verify queue shows localized document names
test('verify queue shows configured document names, never codes', async () => {
  vi.spyOn(api, 'getStaffDocuments').mockResolvedValue([
    {
      id: 1, document_type: 'client-audit-qa-202610-authorization', document_type_label: { ar: 'تفويض تجريبي', en: 'Test authorization' },
      original_filename: 'a.pdf', status: 'pending_review', mime_type: 'application/pdf', order: { order_number: 'KH-2026-000005' },
    },
    {
      id: 2, document_type: 'final-result', is_final_document: true, document_type_label: { ar: 'النتيجة النهائية', en: 'Final result' },
      original_filename: 'r.pdf', status: 'pending_review', mime_type: 'application/pdf', order: { order_number: 'KH-2026-000008' },
    },
  ])
  vi.spyOn(api, 'downloadDocumentWithToken').mockResolvedValue(new Blob(['%PDF']))
  render(<MemoryRouter><EmployeeVerifyDocumentsPage /></MemoryRouter>)
  expect(await screen.findByText('#KH-2026-000005 · تفويض تجريبي')).toBeInTheDocument()
  expect(screen.getByText('#KH-2026-000008 · النتيجة النهائية')).toBeInTheDocument()
  expect(document.body.textContent).not.toMatch(/client-audit-qa-202610-authorization|final-result/)
  // 19 (unit side): the queue meta line no longer uses the 4.37:1 grey.
  expect(screen.getByText('#KH-2026-000005 · تفويض تجريبي')).toHaveClass('text-slate-600')
  expect(screen.getByText('#KH-2026-000005 · تفويض تجريبي')).not.toHaveClass('text-slate-500')
})

// 16. generated timeline text renders in Arabic; typed text stays as written
test('system timeline notes render in the screen language and typed notes are untouched', () => {
  const items = [
    { id: 1, new_status: 'ASSIGNED', note: 'Order assigned to provider.', system_event: 'provider_assigned', created_at: '2026-10-16T10:00:00Z' },
    { id: 2, new_status: 'WAITING_CUSTOMER', note: 'Please upload the QA authorization PDF.', system_event: '', created_at: '2026-10-16T10:05:00Z' },
    {
      id: 3, new_status: 'UNDER_REVIEW', note: 'Missing-document request recovered by staff: طلب قديم',
      system_event: 'missing_request_recovered', system_event_params: { reason: 'طلب قديم' }, created_at: '2026-10-16T10:10:00Z',
    },
  ]
  render(<OrderTimeline items={items} />)
  expect(screen.getByText('تم إسناد الطلب إلى مزود الخدمة.')).toBeInTheDocument()
  expect(screen.getByText('Please upload the QA authorization PDF.')).toBeInTheDocument()
  expect(screen.getByText(/السبب: طلب قديم/)).toBeInTheDocument()
  expect(document.body.textContent).not.toMatch(/Order assigned to provider|recovered by staff/)
  // 21 (unit side): stage and date text use slate-600 (>= 4.5:1 on the brand-50 current card).
  for (const node of document.querySelectorAll('ol span.text-xs, ol span.uppercase')) expect(node).not.toHaveClass('text-slate-500')
})

test('timeline presentation falls back to the note and switches to English', () => {
  expect(describeTimelineNote({ system_event: 'order_completed', note: 'Order completed' }, 'en')).toBe('Request completed.')
  expect(describeTimelineNote({ system_event: 'unknown_code', note: 'typed' }, 'ar')).toBe('typed')
  expect(describeTimelineNote({ note: '' }, 'ar')).toBe('')
})
