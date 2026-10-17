import { test, expect } from '@playwright/test'

const API = process.env.E2E_API_URL || 'http://127.0.0.1:8009'
const PREFIX = 'client-audit-qa-202610'
const WIDTHS = [390, 430, 768, 1366]

test.skip(process.env.E2E_QA_MODE !== '1', 'Requires isolated client-audit QA fixtures')
test.setTimeout(240_000)

// Readiness is the route's own content: no route chunk or auth check still
// pending, no route error page, and a visible page heading. "Any h1 visible"
// was not enough: the route error page has an h1 too, and a stuck loader
// surfaced only as a bare timeout. Failed requests are reported with the
// failure so a timeout says what the page was waiting for.
async function waitForPageReady(page, name, failures) {
  const state = () => page.evaluate(() => {
    if (document.querySelector('[data-route-error]')) return 'route-error'
    const loading = document.querySelector('[data-page-loading]')
    if (loading) return `loading:${loading.getAttribute('data-page-loading')}`
    const heading = [...document.querySelectorAll('h1')].find((element) => element.offsetParent !== null)
    return heading ? 'ready' : 'no-heading'
  })
  await expect
    .poll(state, { message: `${name} was not ready; failed requests: ${failures.join(', ') || 'none'}` })
    .toBe('ready')
}

test('public and role pages fit emulated Chromium viewports in Arabic', async ({ browser, request }, testInfo) => {
  // The test sets its own four viewports, so one project is enough; running it
  // under all five projects only multiplied the load (240 cold page loads).
  test.skip(testInfo.project.name !== 'desktop-1440', 'Viewports are set inside the test')
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
      const failures = []
      page.on('requestfailed', (failed) => failures.push(`${failed.url()} (${failed.failure()?.errorText})`))
      page.on('response', (response) => { if (response.status() >= 500) failures.push(`${response.url()} (${response.status()})`) })
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await waitForPageReady(page, `${name} at ${width}px`, failures)
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
