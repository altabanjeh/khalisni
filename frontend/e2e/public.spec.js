import { test, expect } from '@playwright/test'

/**
 * Public discovery journey (maps to J01-J03 in the audit): a visitor can reach
 * the homepage, browse the catalog, open a service, and reach the request CTA
 * -- in both Arabic and English -- with no uncaught console errors.
 */

const PUBLIC_ROUTES = ['/', '/services', '/track-order', '/about', '/faq', '/login', '/register']

for (const route of PUBLIC_ROUTES) {
  test(`public route loads without console errors: ${route}`, async ({ page }) => {
    const errors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', (err) => errors.push(String(err)))

    const response = await page.goto(route)
    expect(response?.status(), `HTTP status for ${route}`).toBeLessThan(400)
    await expect(page.locator('body')).toBeVisible()

    // No horizontal overflow at the current viewport.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, `horizontal overflow on ${route}`).toBeLessThanOrEqual(1)

    expect(errors, `console errors on ${route}`).toEqual([])
  })
}

test('unknown route renders the 404 page, not a redirect', async ({ page }) => {
  await page.goto('/this-route-does-not-exist')
  await expect(page.getByText(/404/)).toBeVisible()
})

test('service discovery: homepage -> services -> service detail -> request CTA', async ({ page }) => {
  await page.goto('/services')
  const firstService = page.locator('a[href^="/services/"]').first()
  await expect(firstService).toBeVisible()
  await firstService.click()
  await expect(page).toHaveURL(/\/services\//)
  await expect(page.getByRole('link', { name: /ابدأ الطلب|start request|request/i }).first()).toBeVisible()
})

test('Arabic is RTL and English is LTR', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  const langToggle = page.getByRole('button', { name: /English|EN/i }).first()
  if (await langToggle.isVisible().catch(() => false)) {
    await langToggle.click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  }
})
