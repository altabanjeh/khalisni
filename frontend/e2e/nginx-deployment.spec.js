import { test, expect } from '@playwright/test'

// Runs against the production nginx configuration (frontend/nginx.conf), not
// the Vite preview server. See docs/hardening/KHALSNI_PRODUCTION_ENV_REQUIREMENTS.md
// for how to start that stack. KHS-035.
const BASE = process.env.E2E_BASE_URL || ''
const PREFIX = 'client-audit-qa-202610'

test.skip(process.env.E2E_NGINX !== '1' || process.env.E2E_QA_MODE !== '1', 'Run with E2E_NGINX=1 against the nginx container')
test.setTimeout(180_000)

test('nginx serves only public media and sends security headers', async ({ request }) => {
  const home = await request.get(`${BASE}/`)
  expect(home.status()).toBe(200)
  const headers = home.headers()
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['x-frame-options']).toBe('SAMEORIGIN')
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(headers['content-security-policy']).toContain("script-src 'self'")
  expect(headers['content-security-policy']).toContain("object-src 'none'")

  // Deep links still reach the SPA and carry the same headers.
  const deep = await request.get(`${BASE}/customer/orders/1`)
  expect(deep.status()).toBe(200)
  expect(deep.headers()['content-security-policy']).toBeTruthy()

  // Private by default: uploaded documents, receipts and any unlisted folder.
  for (const path of [
    '/media/secure_orders/KH-2026-000001/documents/secret.pdf',
    '/media/payments/receipt.pdf',
    '/media/future_uploads/new.txt',
    '/media/',
  ]) {
    expect((await request.get(`${BASE}${path}`)).status(), path).toBe(404)
  }
  // Public catalog media is still served, with nosniff.
  const image = await request.get(`${BASE}/media/services/pub.png`)
  expect(image.status()).toBe(200)
  expect(image.headers()['x-content-type-options']).toBe('nosniff')

  // The API keeps Django's own (stricter) frame policy; nginx adds none there.
  const health = await request.get(`${BASE}/api/health/`)
  expect(health.status()).toBe(200)
  expect(health.headers()['x-frame-options']).toBe('DENY')
  expect(health.headers()['content-security-policy']).toBeUndefined()
})

test('the application runs under the content security policy without violations', async ({ browser, request }) => {
  const password = process.env.KHALSNI_QA_PASSWORD
  const violations = []
  const failures = []

  async function session(role) {
    const context = await browser.newContext()
    const page = await context.newPage()
    page.on('console', (message) => {
      if (/content security policy|refused to/i.test(message.text())) violations.push(`${role}: ${message.text()}`)
    })
    page.on('pageerror', (error) => failures.push(`${role}: ${error.message}`))
    if (role !== 'visitor') {
      await page.goto(`${BASE}/login`)
      await page.locator('input[type="email"]').fill(`${PREFIX}-${role}@example.test`)
      await page.locator('input[type="password"]').fill(password)
      await page.locator('form button[type="submit"]').click()
      await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })
    }
    return { context, page }
  }
  async function visit(page, path) {
    await page.goto(`${BASE}${path}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('#root')).not.toBeEmpty()
  }

  const login = await request.post(`${BASE}/api/auth/login/`, {
    data: { email: `${PREFIX}-customer_a@example.test`, password },
  })
  expect(login.ok()).toBeTruthy()
  const orders = await (await request.get(`${BASE}/api/customer/orders/`, {
    headers: { Authorization: `Bearer ${(await login.json()).access}` },
  })).json()
  const order = (orders.results || orders)[0]

  const visitor = await session('visitor')
  for (const path of ['/', '/services', '/track', '/login', '/register', '/contact', '/privacy']) await visit(visitor.page, path)
  await visitor.context.close()

  const customer = await session('customer_a')
  for (const path of ['/customer', '/customer/orders', `/customer/orders/${order.id}`, '/customer/orders/new']) await visit(customer.page, path)
  await customer.context.close()

  const employee = await session('employee')
  for (const path of ['/employee', `/employee/orders/${order.id}`, '/employee/documents/verify']) await visit(employee.page, path)
  await employee.context.close()

  const admin = await session('admin')
  // The preview screen frames the public site from the same origin.
  for (const path of ['/admin', '/admin/orders', '/admin/services', '/admin/preview']) await visit(admin.page, path)
  await admin.context.close()

  expect(violations, violations.join('\n')).toEqual([])
  expect(failures, failures.join('\n')).toEqual([])
})
