// DEF-U04 regression (item 12): public and portal layouts start with a skip
// link that moves focus to the single <main> landmark.
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PublicLayout from '../layouts/PublicLayout'
import DashboardLayout from '../layouts/DashboardLayout'

vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext')
  return { ...actual, useAuth: () => ({ user: null }) }
})
vi.mock('./Sidebar', () => ({ default: () => <nav aria-label="القائمة">nav</nav> }))
vi.mock('./Topbar', () => ({ default: () => <header>top</header> }))

async function expectSkipLinkMovesFocus() {
  const user = userEvent.setup()
  await user.tab()
  const skip = screen.getByRole('link', { name: 'تخطَّ إلى المحتوى الرئيسي' })
  expect(skip).toHaveFocus()
  expect(skip).toHaveAttribute('href', '#main-content')
  await user.click(skip)
  const main = screen.getByRole('main')
  expect(main).toHaveAttribute('id', 'main-content')
  expect(main).toHaveFocus()
  expect(screen.getAllByRole('main')).toHaveLength(1)
}

test('public layout: the first Tab stop is the skip link and it focuses main', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes><Route element={<PublicLayout />}><Route index element={<p>home</p>} /></Route></Routes>
    </MemoryRouter>,
  )
  await expectSkipLinkMovesFocus()
})

test('portal layout: the first Tab stop is the skip link and it focuses main', async () => {
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route element={<DashboardLayout links={[]} title="لوحة" />} path="/admin">
          <Route index element={<p>محتوى</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
  await expectSkipLinkMovesFocus()
})
