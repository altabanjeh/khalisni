import { test, expect } from '@playwright/test'

const API = process.env.E2E_API_URL || 'http://127.0.0.1:8009'
const PREFIX = 'client-audit-qa-202610'

test.skip(process.env.E2E_QA_MODE !== '1', 'Run with the isolated client-audit QA fixture')
test.setTimeout(120_000)

test('mobile work header keeps secondary controls in its menu', async ({ page, request }, testInfo) => {
  const login = await request.post(`${API}/api/auth/login/`, {
    data: { email: `${PREFIX}-admin@example.test`, password: process.env.KHALSNI_QA_PASSWORD },
  })
  expect(login.ok()).toBeTruthy()
  const token = (await login.json()).access
  await page.addInitScript((access) => {
    localStorage.setItem('khalisni_access', access)
    localStorage.setItem('khalisni_auth_storage', 'local')
    localStorage.setItem('khalisni-language', 'en')
  }, token)
  await page.goto('/admin', { waitUntil: 'domcontentloaded' })
  const more = page.getByRole('button', { name: /المزيد من الخيارات|More options/ })
  await expect(more).toBeVisible()
  await expect(page.getByRole('button', { name: /Log out|تسجيل الخروج/ })).toBeHidden()
  await expect(page.getByText('New requests today')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('U01-mobile-header.png'), fullPage: false })
  await more.click()
  await expect(page.getByRole('button', { name: /Log out|تسجيل الخروج/ })).toBeVisible()
})

test('search results and localized tracking action are visible on mobile', async ({ page, request }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('khalisni-language', 'en'))
  await page.goto('/services?search=Client%20audit', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Available services' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Choose the right category' })).toHaveCount(0)
  await expect(page.getByText('Client audit QA journey').first()).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('U02-search-first.png'), fullPage: false })

  const auth = await request.post(`${API}/api/auth/login/`, {
    data: { email: `${PREFIX}-admin@example.test`, password: process.env.KHALSNI_QA_PASSWORD },
  })
  const token = (await auth.json()).access
  const service = await (await request.get(`${API}/api/services/${PREFIX}-service/`)).json()
  const listResponse = await request.get(`${API}/api/admin/orders/?status=WAITING_CUSTOMER&service=${service.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(listResponse.ok()).toBeTruthy()
  const body = await listResponse.json()
  const rows = Array.isArray(body) ? body : body.results
  let missingOrder
  for (const candidate of rows) {
    const detail = await (await request.get(`${API}/api/admin/orders/${candidate.id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    if (detail.customer_notes?.includes(`[${PREFIX}:missing]`)) {
      missingOrder = detail
      break
    }
  }
  expect(missingOrder).toBeTruthy()
  await page.goto('/track-order', { waitUntil: 'domcontentloaded' })
  await page.getByRole('textbox', { name: 'Order number' }).fill(missingOrder.order_number)
  await page.getByRole('textbox', { name: 'Phone number' }).fill('0798800103')
  await page.getByRole('button', { name: 'Show status' }).click()
  await expect(page.getByText('QA authorization', { exact: true })).toBeVisible()
  await expect(page.getByText(`${PREFIX}-authorization`)).toHaveCount(0)
  const action = page.getByRole('link', { name: 'Sign in to upload documents' })
  await expect(action).toHaveAttribute('href', `/login?next=%2Fcustomer%2Forders%2F${missingOrder.id}%2Fmissing-docs`)
  await page.screenshot({ path: testInfo.outputPath('U03-tracking-action.png'), fullPage: true })
})

test('contact form confirms a stored inquiry', async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('khalisni-language', 'en'))
  await page.goto('/contact', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('textbox', { name: /Name.*Required/ })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /Email.*Optional/ })).toBeVisible()
  await page.getByRole('textbox', { name: /Name.*Required/ }).fill('QA Contact')
  await page.getByRole('textbox', { name: /Phone.*Required/ }).fill('0791234599')
  await page.getByRole('textbox', { name: /Message.*Required/ }).fill('Please review this QA inquiry')
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/public-site/contact-inquiries/') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Send' }).click()
  const response = await responsePromise
  expect(response.status()).toBe(201)
  expect((await response.json()).inquiry_id).toBeTruthy()
  await expect(page.getByText('Your message was recorded for the support team to review.')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('U04-contact-required.png'), fullPage: false })
})
