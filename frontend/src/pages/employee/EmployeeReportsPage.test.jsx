import { render, screen, waitFor } from '@testing-library/react'
import EmployeeReportsPage from './EmployeeReportsPage'
import { api } from '../../api/services'

test('employee reports page renders scoped totals', async () => {
  vi.spyOn(api, 'getEmployeeReports').mockResolvedValue({
    period: { date_from: '2026-04-01', date_to: '2026-04-30' },
    totals: {
      orders_reviewed: 4,
      pending_reviews: 2,
      delayed_reviews: 1,
      missing_document_requests: 3,
      provider_returns: 1,
      completed_orders: 2,
    },
    completed_orders_by_day: [{ day: '2026-04-20', total: 2 }],
  })

  render(<EmployeeReportsPage />)

  await waitFor(() => {
    expect(screen.getByText('تقرير المراجعة')).toBeInTheDocument()
  })

  expect(screen.getByText('4')).toBeInTheDocument()
  expect(screen.getByText('طلبات تمت مراجعتها')).toBeInTheDocument()
})
