import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DataTable from './DataTable'
import PublicLayout from '../layouts/PublicLayout'

vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext')
  return { ...actual, useAuth: () => ({ user: null }) }
})

afterEach(() => vi.restoreAllMocks())

const columns = [{ key: 'name', label: 'الاسم' }]
const rows = Array.from({ length: 30 }, (_, index) => ({ id: index + 1, name: `صف ${index + 1}` }))

// 22. the scrolling table region can be reached and scrolled with the keyboard
test('data table scroll region is a named, focusable region with a visible focus style', async () => {
  const user = userEvent.setup()
  render(<DataTable ariaLabel="قواعد سير العمل" columns={columns} rows={rows} />)
  const region = screen.getByRole('region', { name: 'قواعد سير العمل' })
  expect(region).toHaveAttribute('tabindex', '0')
  expect(region.className).toMatch(/overflow-auto/)
  expect(region.className).toMatch(/focus-visible:ring-2/)
  await user.tab()
  expect(region).toHaveFocus()
})

test('data table region gets a default name', () => {
  render(<DataTable columns={columns} rows={rows} />)
  expect(screen.getByRole('region', { name: 'جدول البيانات' })).toBeInTheDocument()
})

// 23 (unit side): footer links reserve at least 24px of height
test('footer links carry the minimum target-size classes', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes><Route element={<PublicLayout />}><Route index element={<p>home</p>} /></Route></Routes>
    </MemoryRouter>,
  )
  const links = [...document.querySelectorAll('footer a')]
  expect(links.length).toBeGreaterThanOrEqual(7)
  for (const link of links) {
    expect(link).toHaveClass('min-h-6')
    expect(link).toHaveClass('inline-flex')
    expect(link).toHaveClass('kh-focusable')
  }
})
