// DEF-C05: the bell shows an unread badge from the server count, not from the
// first page of notifications.
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import Topbar from './Topbar'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'customer', full_name: 'QA' }, logout: vi.fn() }),
}))

const notificationState = { current: null }
vi.mock('../context/NotificationContext', () => ({
  useNotifications: () => notificationState.current,
}))

vi.mock('../context/HelpGuideContext', () => ({
  useHelpGuideContext: () => ({ currentHelp: {}, currentHelpError: '', currentHelpLoading: false, pageHelp: {} }),
}))

function renderTopbar() {
  return render(
    <MemoryRouter initialEntries={['/customer']}>
      <Topbar onMenuClick={() => {}} title="لوحتي" />
    </MemoryRouter>,
  )
}

const base = { markRead: vi.fn(), markAllRead: vi.fn(), loading: false, error: null, hasMore: false, loadMore: vi.fn() }

test('the bell badge shows the server unread count and describes it to assistive tech', () => {
  notificationState.current = { ...base, notifications: [{ id: 1, title: 'A', is_read: false }], unreadCount: 37 }
  renderTopbar()
  const bell = screen.getByRole('button', { name: 'الإشعارات' })
  const badge = screen.getByTestId('bell-unread-badge')
  expect(badge).toHaveTextContent('37')
  expect(bell).toHaveAttribute('aria-describedby', badge.id)
  expect(badge).toHaveTextContent('37 إشعارات غير مقروءة')
})

test('no badge when everything is read; large counts are capped visually', () => {
  notificationState.current = { ...base, notifications: [], unreadCount: 0 }
  const { unmount } = renderTopbar()
  expect(screen.queryByTestId('bell-unread-badge')).not.toBeInTheDocument()
  unmount()
  notificationState.current = { ...base, notifications: [], unreadCount: 250 }
  renderTopbar()
  expect(screen.getByTestId('bell-unread-badge')).toHaveTextContent('99+')
})
