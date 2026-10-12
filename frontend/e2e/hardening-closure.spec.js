import { test, expect } from '@playwright/test'

const API = process.env.E2E_API_URL || 'http://127.0.0.1:8009'
const PREFIX = 'client-audit-qa-202610'

test.skip(process.env.E2E_QA_MODE !== '1', 'Requires isolated client-audit QA fixtures')
test.setTimeout(120_000)

async function signIn(browser, role, language) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.addInitScript((lang) => localStorage.setItem('khalisni-language', lang), language)
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(`${PREFIX}-${role}@example.test`)
  await page.locator('input[type="password"]').fill(process.env.KHALSNI_QA_PASSWORD)
  await page.locator('form button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
  return { context, page }
}

async function firstOrder(request, role, path) {
  const login = await request.post(`${API}/api/auth/login/`, {
    data: { email: `${PREFIX}-${role}@example.test`, password: process.env.KHALSNI_QA_PASSWORD },
  })
  expect(login.ok()).toBeTruthy()
  const data = await (await request.get(`${API}/api${path}`, {
    headers: { Authorization: `Bearer ${(await login.json()).access}` },
  })).json()
  return (data.results || data)[0]
}

// KHS-037
test('customer order details are complete in English and Arabic with no internal identifiers', async ({ browser, request }) => {
  const order = await firstOrder(request, 'customer_a', '/customer/orders/')
  expect(order).toBeTruthy()

  const english = await signIn(browser, 'customer_a', 'en')
  await english.page.goto(`/customer/orders/${order.id}`)
  const main = english.page.locator('#root')
  await expect(main.getByText(order.order_number).first()).toBeVisible()
  await expect(english.page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(main.getByText('Uploaded documents')).toBeVisible()
  await expect(main.getByText('Timeline')).toBeVisible()
  // Interface text is English. Customer-entered and catalog data may be Arabic,
  // so only the page's own section headings and labels are checked here.
  for (const heading of await main.locator('h1, h2').allTextContents()) {
    expect(heading, heading).not.toMatch(/[؀-ۿ]/)
  }
  const englishText = await main.innerText()
  for (const raw of [order.status, 'client-audit-qa-202610-authorization', 'FINAL_RESULT', 'pending_review']) {
    expect(englishText).not.toContain(raw)
  }
  await english.context.close()

  const arabic = await signIn(browser, 'customer_a', 'ar')
  await arabic.page.goto(`/customer/orders/${order.id}`)
  await expect(arabic.page.locator('html')).toHaveAttribute('dir', 'rtl')
  const arabicMain = arabic.page.locator('#root')
  await expect(arabicMain.getByText('الوثائق المرفوعة')).toBeVisible()
  await expect(arabicMain.locator('bdi[dir="ltr"]', { hasText: order.order_number })).toBeVisible()
  const arabicText = await arabicMain.innerText()
  expect(arabicText).not.toContain('Uploaded documents')
  expect(arabicText).not.toContain(order.status)
  await arabic.context.close()
})

// KHS-036
test('staff rejection needs a written reason and irreversible actions ask first', async ({ browser, request }) => {
  const order = await firstOrder(request, 'employee', '/admin/orders/?status=UNDER_REVIEW')
  test.skip(!order, 'No order under review in the QA fixture')

  const employee = await signIn(browser, 'employee', 'en')
  await employee.page.goto(`/employee/orders/${order.id}`)
  await expect(employee.page.getByText(order.order_number).first()).toBeVisible()

  const reject = employee.page.getByRole('button', { name: 'Reject request' })
  await reject.click()
  const confirm = employee.page.getByRole('button', { name: 'Yes, reject it' })
  await expect(confirm).toBeDisabled()
  await employee.page.getByLabel(/Rejection reason/).fill('   ')
  await expect(confirm).toBeDisabled()
  await employee.page.getByLabel(/Rejection reason/).fill('Reason typed by the reviewer')
  await expect(confirm).toBeEnabled()
  // Close without rejecting: the QA order stays usable for other specs.
  await employee.page.getByRole('button', { name: 'Cancel' }).click()
  await expect(confirm).toHaveCount(0)

  const after = await firstOrder(request, 'employee', `/admin/orders/?status=UNDER_REVIEW`)
  expect(after.id).toBe(order.id)
  await employee.context.close()
})
