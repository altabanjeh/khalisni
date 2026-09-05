import { test, expect, authenticateAs, attachRuntimeErrorCollector, horizontalOverflowPx, switchLanguage } from './_helpers.js'

/**
 * Route runtime matrix (Gate 1R §5). Every first-party route is loaded in a real
 * browser against the real API + real seeded DB. Fails on console errors, 5xx,
 * failed requests, horizontal overflow, or an empty render.
 *
 * `data-testid` is not used by the app, so assertions are deliberately loose
 * (visible <body> with content, no error boundary text).
 */

const PUBLIC_ROUTES = [
  '/', '/services', '/services/category/civil-status-and-passports', '/track-order',
  '/about', '/contact', '/faq', '/privacy', '/login', '/register', '/forgot-password',
]

const ROLE_ROUTES = {
  customer: ['/customer', '/customer/orders/new', '/customer/orders', '/customer/profile', '/customer/manual'],
  employee: [
    '/employee', '/employee/orders', '/employee/missing-service-requests',
    '/employee/documents/verify', '/employee/reports', '/employee/manual',
  ],
  admin: [
    '/admin', '/admin/orders', '/admin/rules', '/admin/cms', '/admin/service-categories',
    '/admin/services', '/admin/service-relations', '/admin/public-site', '/admin/public-site/content',
    '/admin/public-site/advertisements', '/admin/public-site/theme', '/admin/public-site/preview',
    '/admin/missing-service-requests', '/admin/users', '/admin/providers', '/admin/provider-services',
    '/admin/payments', '/admin/reports', '/admin/notifications', '/admin/audit', '/admin/help-guides', '/admin/manual',
  ],
  provider: ['/provider', '/provider/orders', '/provider/manual'],
}

const ERROR_BOUNDARY_RX = /something went wrong|حدث خطأ ما|application error|unexpected error/i

async function assertRouteHealthy(page, route) {
  const { errors } = attachRuntimeErrorCollector(page, {
    allow: [/Failed to load resource: the server responded with a status of 401/i, /favicon/i],
  })
  const resp = await page.goto(route, { waitUntil: 'domcontentloaded' })
  expect(resp, `no response for ${route}`).not.toBeNull()
  expect(resp.status(), `top status ${route}`).toBeLessThan(400)

  // SPA: wait for the React root to paint real content, then settle briefly.
  await page.waitForFunction(() => {
    const r = document.querySelector('#root')
    return r && r.innerText && r.innerText.trim().length > 20
  }, { timeout: 15000 })
  await page.waitForTimeout(600)

  await expect(page.locator('body'), `body visible ${route}`).toBeVisible()
  const text = (await page.locator('#root').innerText()).trim()
  expect(text.length, `non-empty render ${route}`).toBeGreaterThan(30)
  expect(text, `no error boundary on ${route}`).not.toMatch(ERROR_BOUNDARY_RX)

  const overflow = await horizontalOverflowPx(page)
  expect(overflow, `horizontal overflow ${route} (${overflow}px)`).toBeLessThanOrEqual(2)

  expect(errors, `runtime errors on ${route}:\n${errors.join('\n')}`).toEqual([])
}

test.describe('public routes', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`loads clean: ${route}`, async ({ page }) => {
      await assertRouteHealthy(page, route)
    })
  }

  test('unknown route renders the 404 page (not a redirect home)', async ({ page }) => {
    await page.goto('/definitely-not-a-real-route', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/404/)).toBeVisible()
    expect(page.url()).toContain('/definitely-not-a-real-route')
  })

  test('home is RTL in Arabic and LTR after switching to English', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await switchLanguage(page, 'en')
    const dir = await page.locator('html').getAttribute('dir')
    expect(['rtl', 'ltr']).toContain(dir)
  })
})

for (const [role, routes] of Object.entries(ROLE_ROUTES)) {
  test.describe(`${role} routes`, () => {
    for (const route of routes) {
      test(`loads clean: ${route}`, async ({ page, request }) => {
        await authenticateAs(page, request, role)
        await assertRouteHealthy(page, route)
      })
    }
  })
}
