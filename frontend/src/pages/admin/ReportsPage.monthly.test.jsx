import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ReportsPage from './ReportsPage'
import { LanguageProvider } from '../../context/LanguageContext'
import { ToastProvider } from '../../context/ToastContext'
import { api } from '../../api/services'

vi.mock('../../api/services', () => ({
  api: {
    getDailyReport: vi.fn(async () => ({ date: '2026-11-01', created_orders: 1, completed_orders: 1, top_services: [] })),
    getWeeklyReport: vi.fn(async () => ({ revenue_summary: 0, provider_performance: [], orders_by_category: [] })),
    getOperationalSummary: vi.fn(async () => null),
    getMonthlyReport: vi.fn(async (month) => ({
      month, created_orders: 12, completed_orders: 7, revenue_summary: 420,
      payments_by_method: [{ method: 'bank_transfer', records: 4, amount: '120.00' }],
    })),
    exportReport: vi.fn(async () => new Blob(['x'], { type: 'text/csv' })),
  },
}))

describe('ReportsPage monthly report and CSV export (PROP-WEB-05)', () => {
  it('shows payment methods and exports the selected month', async () => {
    window.localStorage.setItem('khalisni-language', 'en')
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    render(<LanguageProvider><ToastProvider><ReportsPage /></ToastProvider></LanguageProvider>)
    expect(await screen.findByRole('heading', { name: 'Monthly report' })).toBeInTheDocument()
    expect(await screen.findByText('Bank transfer')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-10' } })
    await waitFor(() => expect(api.getMonthlyReport).toHaveBeenLastCalledWith('2026-10'))
    fireEvent.click(screen.getByRole('button', { name: 'Export month (CSV)' }))
    await waitFor(() => expect(api.exportReport).toHaveBeenCalledWith({ period: 'monthly', month: '2026-10' }))
    window.localStorage.removeItem('khalisni-language')
  })
})
