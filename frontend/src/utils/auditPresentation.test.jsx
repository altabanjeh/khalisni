// DEF-A04: raw audit / notification codes become readable AR/EN labels.
import { render, screen } from '@testing-library/react'
import {
  getAuditActionLabel,
  getAuditSourceLabel,
  getAuditStatusLabel,
  getNotificationStatusLabel,
  humanizeCode,
} from './auditPresentation'
import AuditLogPage from '../pages/admin/AuditLogPage'
import NotificationsPage from '../pages/admin/NotificationsPage'
import { api } from '../api/services'
import { LanguageProvider } from '../context/LanguageContext'

afterEach(() => vi.restoreAllMocks())

test('known codes map to Arabic and English labels', () => {
  expect(getAuditActionLabel('mark_ready_for_delivery', 'ar')).toBe('تجهيز الطلب للتسليم')
  expect(getAuditActionLabel('mark_ready_for_delivery', 'en')).toBe('Marked ready for delivery')
  expect(getAuditActionLabel('notification_event_dispatched', 'en')).toBe('Event notification sent')
  expect(getAuditActionLabel('create_order', 'ar')).toBe('إنشاء طلب')
  expect(getAuditSourceLabel('provider_portal', 'ar')).toBe('بوابة المزود')
  expect(getAuditSourceLabel('provider_portal', 'en')).toBe('Provider portal')
  expect(getAuditStatusLabel('success', 'ar')).toBe('نجح')
  expect(getNotificationStatusLabel('sent', 'en')).toBe('Sent')
})

test('unknown codes are humanized instead of shown raw', () => {
  expect(humanizeCode('some_new_backend_event')).toBe('Some new backend event')
  expect(getAuditActionLabel('some_new_backend_event', 'ar')).toBe('Some new backend event')
  expect(getAuditStatusLabel('', 'ar')).toBe('—')
})

test('the audit log page shows labels, not raw codes', async () => {
  localStorage.setItem('khalisni-language', 'ar')
  vi.spyOn(api, 'getAuditLogs').mockResolvedValue([
    { id: 1, user_name: 'مشرف', user_role: 'admin', action: 'mark_ready_for_delivery', entity_type: 'Order', entity_id: 5, source: 'provider_portal', status: 'success', created_at: '2026-05-01T10:00:00Z' },
    { id: 2, user_name: 'النظام', user_role: 'system', action: 'notification_event_dispatched', entity_type: 'Notification', entity_id: 9, source: 'system', status: 'success', created_at: '2026-05-01T10:00:00Z' },
  ])
  render(<LanguageProvider><AuditLogPage /></LanguageProvider>)
  expect((await screen.findAllByText('تجهيز الطلب للتسليم')).length).toBeGreaterThan(0)
  expect(screen.getAllByText('بوابة المزود').length).toBeGreaterThan(0)
  expect(screen.getAllByText('نجح').length).toBeGreaterThan(0)
  const visibleText = document.body.textContent
  for (const raw of ['mark_ready_for_delivery', 'notification_event_dispatched', 'provider_portal']) {
    expect(visibleText).not.toContain(raw)
  }
})

test('the admin notifications page shows a readable status', async () => {
  localStorage.setItem('khalisni-language', 'en')
  vi.spyOn(api, 'getNotificationsPage').mockResolvedValue({ results: [
    { id: 1, title: 'Update', recipient_name: 'A', order_number: 'KH-1', status: 'sent', created_at: '2026-05-01T10:00:00Z' },
  ], count: 1, hasNext: false, hasPrevious: false })
  render(<LanguageProvider><NotificationsPage /></LanguageProvider>)
  expect((await screen.findAllByText('Sent')).length).toBeGreaterThan(0)
  expect(screen.queryByText('sent')).not.toBeInTheDocument()
})
