import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotificationPanel from './NotificationPanel'
import { NotificationProvider, useNotifications } from '../context/NotificationContext'
import { api } from '../api/services'

afterEach(() => vi.restoreAllMocks())

function DashboardMirror() {
  const { notifications } = useNotifications()
  return <div data-testid="dashboard-notifications">{notifications.filter((item) => !item.is_read).length}</div>
}

function renderCenter(onNavigate = vi.fn()) {
  render(
    <MemoryRouter>
      <NotificationProvider user={{ id: 7, role: 'customer' }}>
        <DashboardMirror />
        <NotificationPanel user={{ role: 'customer' }} onNavigate={onNavigate} />
      </NotificationProvider>
    </MemoryRouter>,
  )
  return onNavigate
}

test('dashboard and bell share read state; opening an item marks it read and navigates', async () => {
  const event = {
    id: 13, order_id: 42, template_key: 'missing_documents_requested',
    title: 'Document needed', message: 'Upload authorization', is_read: false,
    created_at: '2026-10-01T15:54:00Z',
  }
  vi.spyOn(api, 'getNotificationCenter').mockResolvedValue([event])
  const markRead = vi.spyOn(api, 'markNotificationRead').mockResolvedValue({})
  const navigate = renderCenter()

  await screen.findByRole('button', { name: /Document needed/i })
  expect(screen.getByTestId('dashboard-notifications')).toHaveTextContent('1')
  await userEvent.click(screen.getByRole('button', { name: /Document needed/i }))

  await waitFor(() => expect(markRead).toHaveBeenCalledWith(13))
  expect(screen.getByTestId('dashboard-notifications')).toHaveTextContent('0')
  expect(navigate).toHaveBeenCalledWith(event)
})

test('mark all read updates the dashboard and bell from one state', async () => {
  const unread = [
    { id: 1, title: 'One', message: 'a', is_read: false, created_at: '2026-05-01T08:00:00Z' },
    { id: 2, title: 'Two', message: 'b', is_read: false, created_at: '2026-05-02T08:00:00Z' },
  ]
  vi.spyOn(api, 'getNotificationCenter').mockResolvedValue(unread)
  const markAll = vi.spyOn(api, 'markAllNotificationsRead').mockResolvedValue(2)
  renderCenter()

  await screen.findByRole('button', { name: /One/i })
  expect(screen.getByTestId('dashboard-notifications')).toHaveTextContent('2')
  await userEvent.click(screen.getByRole('button', { name: /تعليم الكل كمقروء|mark all/i }))

  await waitFor(() => expect(markAll).toHaveBeenCalledTimes(1))
  expect(screen.getByTestId('dashboard-notifications')).toHaveTextContent('0')
})
