import { test, expect } from '@playwright/test'

const API = process.env.E2E_API_URL || 'http://127.0.0.1:8009'
const PREFIX = 'client-audit-qa-202610'
const WIDTHS = [390, 430, 768, 1366]

test.skip(process.env.E2E_QA_MODE !== '1', 'Requires isolated client-audit QA fixtures')
test.setTimeout(240_000)

test('public and role pages fit emulated Chromium viewports in Arabic', async ({ browser, request }, testInfo) => {
  const password = process.env.KHALSNI_QA_PASSWORD
  expect(password?.length).toBeGreaterThanOrEqual(12)
  const tokens = {}
  for (const role of ['customer_a', 'employee', 'admin', 'provider_a']) {
    const response = await request.post(`${API}/api/auth/login/`, {
      data: { email: `${PREFIX}-${role}@example.test`, password },
    })
    expect(response.ok()).toBeTruthy()
    tokens[role] = (await response.json()).access
  }
  const serviceResponse = await request.get(`${API}/api/services/${PREFIX}-service/`)
  expect(serviceResponse.ok()).toBeTruthy()
  const service = await serviceResponse.json()
  const orderResponse = await request.get(`${API}/api/admin/orders/?service=${service.id}`, {
    headers: { Authorization: `Bearer ${tokens.admin}` },
  })
  expect(orderResponse.ok()).toBeTruthy()
  const orderBody = await orderResponse.json()
  const orders = Array.isArray(orderBody) ? orderBody : orderBody.results
  const scenario = orders.find((row) => row.status === 'WAITING_CUSTOMER')
  expect(scenario?.id).toBeTruthy()

  const pages = [
    ['home', '/', null],
    ['services', '/services', null],
    ['search', '/services?search=audit', null],
    ['service', `/services/${PREFIX}-service`, null],
    ['register', '/register', null],
    ['login', '/login', null],
    ['tracking', '/track-order', null],
    ['customer', '/customer', 'customer_a'],
    ['missing', `/customer/orders/${scenario.id}/missing-docs`, 'customer_a'],
    ['employee', `/employee/orders/${scenario.id}`, 'employee'],
    ['admin', `/admin/orders/${scenario.id}`, 'admin'],
    ['provider', '/provider', 'provider_a'],
  ]
  for (const width of WIDTHS) {
    for (const [name, path, role] of pages) {
      const context = await browser.newContext({
        viewport: { width, height: width < 768 ? 844 : 900 },
        isMobile: width < 768,
        hasTouch: width < 768,
      })
      const page = await context.newPage()
      await page.addInitScript(({ token }) => {
        localStorage.setItem('khalisni-language', 'ar')
        if (token) {
          localStorage.setItem('khalisni_access', token)
          localStorage.setItem('khalisni_auth_storage', 'local')
        }
      }, { token: role ? tokens[role] : null })
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('h1').first(), `${name} did not render its page content`).toBeVisible()
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        direction: document.documentElement.dir || document.querySelector('main')?.closest('[dir]')?.dir,
      }))
      expect(metrics.scrollWidth, `${name} at ${width}px has horizontal overflow`).toBeLessThanOrEqual(metrics.viewportWidth + 2)
      await page.screenshot({ path: testInfo.outputPath(`B09-${width}-${name}.png`), fullPage: name === 'home' || name === 'missing' })
      await context.close()
    }
  }
})
