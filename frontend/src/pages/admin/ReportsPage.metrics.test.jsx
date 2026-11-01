import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ReportsPage from './ReportsPage'
import { LanguageProvider } from '../../context/LanguageContext'
import { ToastProvider } from '../../context/ToastContext'

vi.mock('../../api/services', () => ({
  api: {
    getDailyReport: vi.fn(async () => ({ date: '2026-11-01', created_orders: 1, completed_orders: 1, top_services: [] })),
    getWeeklyReport: vi.fn(async () => ({ revenue_summary: 0, provider_performance: [], orders_by_category: [] })),
    getMonthlyReport: vi.fn(async () => null),
    exportReport: vi.fn(),
    getOperationalSummary: vi.fn(async () => ({
      success_metrics: {
        time_to_create_request: { measured_orders: 2, median_seconds: 210 },
        completed_without_follow_up: { completed_orders: 2, without_missing_document_request: 1, percent: 50 },
        processing_duration_by_service: [{ service_name_ar: 'خدمة', service_name_en: 'Service A', completed_orders: 2, average_hours: 10 }],
        provider_throughput: [{ provider_name: 'Provider Gamma', total_orders: 3, completed_orders: 2, completion_rate: 66.7 }],
        customer_satisfaction: { ratings: 2, average_score: 4, distribution: { 3: 1, 5: 1 } },
      },
    })),
  },
}))

describe('ReportsPage success metrics (PRD-M)', () => {
  it('shows the five PRD success metrics in English', async () => {
    window.localStorage.setItem('khalisni-language', 'en')
    render(<LanguageProvider><ToastProvider><ReportsPage /></ToastProvider></LanguageProvider>)
    expect(await screen.findByRole('heading', { name: 'Success metrics' })).toBeInTheDocument()
    expect(screen.getByText('4 min')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('Service A')).toBeInTheDocument()
    expect(screen.getByText('66.7%')).toBeInTheDocument()
    expect(screen.getByText('From 2 ratings')).toBeInTheDocument()
    window.localStorage.removeItem('khalisni-language')
  })
})
