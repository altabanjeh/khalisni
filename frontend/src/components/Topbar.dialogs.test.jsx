import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Topbar from './Topbar'

// DEF-U02: notification and help panels behave as dialogs.

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'customer', full_name: 'QA' }, logout: vi.fn() }),
}))

vi.mock('../context/NotificationContext', () => ({
  useNotifications: () => ({
    notifications: [{ id: 1, title: 'Document needed', message: 'Upload', is_read: false, created_at: '2026-10-01T10:00:00Z' }],
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    loading: false,
    error: null,
  }),
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

test('the notification panel takes focus, closes on Escape and returns focus to the bell', async () => {
  const user = userEvent.setup()
  renderTopbar()
  const bell = screen.getByRole('button', { name: 'الإشعارات' })

  await user.click(bell)
  const dialog = screen.getByRole('dialog', { name: 'مركز الإشعارات' })
  expect(bell).toHaveAttribute('aria-expanded', 'true')
  expect(bell).toHaveAttribute('aria-controls', dialog.id)
  await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))

  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog', { name: 'مركز الإشعارات' })).not.toBeInTheDocument()
  expect(bell).toHaveFocus()
})

test('the help panel is a modal dialog that traps Tab, closes on Escape and restores focus', async () => {
  const user = userEvent.setup()
  renderTopbar()
  const trigger = screen.getByRole('button', { name: 'الدليل' })

  await user.click(trigger)
  const dialog = await screen.findByRole('dialog')
  expect(dialog).toHaveAttribute('aria-modal', 'true')
  const labelledBy = dialog.getAttribute('aria-labelledby')
  expect(labelledBy).toBeTruthy()
  expect(document.getElementById(labelledBy)).toBeInTheDocument()
  expect(dialog).toHaveFocus()

  for (let index = 0; index < 30; index += 1) {
    await user.tab()
    expect(dialog.contains(document.activeElement)).toBe(true)
  }
  await user.tab({ shift: true })
  expect(dialog.contains(document.activeElement)).toBe(true)

  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})
