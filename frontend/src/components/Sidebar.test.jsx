import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import Sidebar from './Sidebar'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'admin' } }),
}))

const LINKS = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/public-site', label: 'Public site' },
  { to: '/admin/public-site/content', label: 'Homepage content' },
]

function renderSidebar({ path = '/admin', isOpen = false } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar isOpen={isOpen} links={LINKS} onClose={() => {}} title="Admin" />
    </MemoryRouter>,
  )
}

function currentLinks(container) {
  return Array.from(container.querySelectorAll('a[aria-current="page"]'))
}

// DEF-U01: below xl (jsdom has no matchMedia, so the drawer layout applies)
// the closed drawer is inert and hidden from assistive technology.
test('the closed drawer is inert and hidden; its links cannot take focus', () => {
  const { container } = renderSidebar({ isOpen: false })
  const aside = container.querySelector('aside')
  expect(aside).toHaveAttribute('inert')
  expect(aside).toHaveAttribute('aria-hidden', 'true')
  expect(aside).toHaveClass('invisible')
  expect(screen.queryByRole('link', { name: 'Orders' })).not.toBeInTheDocument()
})

test('the open drawer is reachable and receives focus', () => {
  const { container } = renderSidebar({ isOpen: true })
  const aside = container.querySelector('aside')
  expect(aside).not.toHaveAttribute('inert')
  expect(aside).not.toHaveAttribute('aria-hidden')
  expect(aside).toHaveClass('visible')
  expect(screen.getByRole('link', { name: 'Orders' })).toBeInTheDocument()
  expect(aside.contains(document.activeElement)).toBe(true)
})

// DEF-U03: exactly one current item.
test.each([
  ['/admin', '/admin'],
  ['/admin/orders', '/admin/orders'],
  ['/admin/orders/42', '/admin/orders'],
  ['/admin/public-site', '/admin/public-site'],
  ['/admin/public-site/content', '/admin/public-site/content'],
])('on %s only %s is the current page', (path, expected) => {
  const { container } = renderSidebar({ path, isOpen: true })
  const current = currentLinks(container)
  expect(current).toHaveLength(1)
  expect(current[0]).toHaveAttribute('href', expected)
})
