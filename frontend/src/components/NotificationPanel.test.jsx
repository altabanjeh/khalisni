import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotificationPanel from './NotificationPanel'
import { api } from '../api/services'

afterEach(() => {
  vi.restoreAllMocks()
})

// Regression for defect D8: the notification centre exposes a working
// "mark all read" action backed by the new bulk endpoint.
test('mark all read calls the API and refreshes the list', async () => {
  const unread = [
    { id: 1, title: 'One', message: 'a', is_read: false, created_at: '2026-05-01T08:00:00Z' },
    { id: 2, title: 'Two', message: 'b', is_read: false, created_at: '2026-05-02T08:00:00Z' },
  ]
  const getSpy = vi
    .spyOn(api, 'getNotificationCenter')
    .mockResolvedValueOnce(unread)
    .mockResolvedValue(unread.map((n) => ({ ...n, is_read: true })))
  const markAllSpy = vi.spyOn(api, 'markAllNotificationsRead').mockResolvedValue(2)

  render(
    <MemoryRouter>
      <NotificationPanel user={{ role: 'customer' }} />
    </MemoryRouter>,
  )

  const button = await screen.findByRole('button', { name: /تعليم الكل كمقروء|mark all/i })
  await userEvent.click(button)

  await waitFor(() => expect(markAllSpy).toHaveBeenCalledTimes(1))
  expect(getSpy.mock.calls.length).toBeGreaterThanOrEqual(2)
})
