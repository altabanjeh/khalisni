import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { KhalsniAppIcon, KhalsniLockup, KhalsniLogo, KHALSNI_APP_ICON_SRC, KHALSNI_WORDMARK_SRC } from './KhalsniLogo'

test('KhalsniLogo renders the official supplied wordmark asset', () => {
  render(<KhalsniLogo />)
  const img = screen.getByRole('img')
  expect(img).toHaveAttribute('src', KHALSNI_WORDMARK_SRC)
  expect(img.getAttribute('src')).toBe('/brand/khalsni-wordmark.png')
  // Arabic-first default label
  expect(img).toHaveAccessibleName('خلصني')
})

test('KhalsniLogo can be overridden by an admin-managed logo but never falls back to plain text', () => {
  render(<KhalsniLogo overrideSrc="/media/public_site/custom-logo.png" />)
  expect(screen.getByRole('img')).toHaveAttribute('src', '/media/public_site/custom-logo.png')
})

test('KhalsniAppIcon renders the official supplied checkmark icon asset', () => {
  render(<KhalsniAppIcon />)
  const img = screen.getByRole('img')
  expect(img).toHaveAttribute('src', KHALSNI_APP_ICON_SRC)
  expect(img.getAttribute('src')).toBe('/brand/khalsni-app-icon.png')
})

test('KhalsniLockup wraps icon + wordmark in a single link when given a target', () => {
  render(
    <MemoryRouter>
      <KhalsniLockup to="/" />
    </MemoryRouter>,
  )
  const link = screen.getByRole('link', { name: 'خلصني' })
  const images = screen.getAllByRole('img')
  expect(images.map((i) => i.getAttribute('src'))).toEqual([
    '/brand/khalsni-app-icon.png',
    '/brand/khalsni-wordmark.png',
  ])
  expect(link).toContainElement(images[0])
})
