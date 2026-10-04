import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'

const API = process.env.E2E_API_URL || 'http://127.0.0.1:8009'
const PREFIX = 'client-audit-qa-202610'
const DOC = `${PREFIX}-authorization`
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n')

test.skip(process.env.E2E_QA_MODE !== '1', 'Requires isolated client-audit QA fixtures')

test('valid multipart retry creates one logical order and rejects changed payload under the same key', async ({ request }) => {
  const password = process.env.KHALSNI_QA_PASSWORD
  const login = await request.post(`${API}/api/auth/login/`, {
    data: { email: `${PREFIX}-customer_a@example.test`, password },
  })
  expect(login.ok()).toBeTruthy()
  const token = (await login.json()).access
  const serviceResponse = await request.get(`${API}/api/services/${PREFIX}-service/`)
  expect(serviceResponse.ok()).toBeTruthy()
  const service = await serviceResponse.json()
  const submissionKey = randomUUID()
  const multipart = {
    service: String(service.id), full_name: 'QA Customer A', phone: '0798800103',
    city: 'Amman', notes: 'Idempotency browser transport check', consent: 'true',
    document_types: DOC,
    documents: { name: 'authorization.pdf', mimeType: 'application/pdf', buffer: PDF },
  }
  const submit = (body) => request.post(`${API}/api/orders/`, {
    headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': submissionKey },
    multipart: body,
  })
  const first = await submit(multipart)
  expect(first.status()).toBe(201)
  const firstOrder = await first.json()
  const retry = await submit(multipart)
  expect(retry.status()).toBe(200)
  expect((await retry.json()).id).toBe(firstOrder.id)
  const changed = await submit({ ...multipart, city: 'Irbid' })
  expect(changed.status()).toBe(409)
  const detailResponse = await request.get(`${API}/api/customer/orders/${firstOrder.id}/`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(detailResponse.ok()).toBeTruthy()
  const detail = await detailResponse.json()
  expect(detail.order_number).toBe(firstOrder.order_number)
  expect(detail.status_logs.filter((entry) => entry.new_status === 'NEW')).toHaveLength(1)
  const noticesResponse = await request.get(`${API}/api/notifications/`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(noticesResponse.ok()).toBeTruthy()
  const body = await noticesResponse.json()
  const notices = Array.isArray(body) ? body : body.results
  expect(notices.filter((entry) => entry.order_number === firstOrder.order_number && entry.template_key === 'order_submitted')).toHaveLength(1)
})

test('customer draft survives refresh and rapid final submit creates one order', async ({ page, request }) => {
  const password = process.env.KHALSNI_QA_PASSWORD
  const login = await request.post(`${API}/api/auth/login/`, {
    data: { email: `${PREFIX}-customer_a@example.test`, password },
  })
  expect(login.ok()).toBeTruthy()
  const token = (await login.json()).access
  const serviceResponse = await request.get(`${API}/api/services/${PREFIX}-service/`)
  expect(serviceResponse.ok()).toBeTruthy()
  const service = await serviceResponse.json()
  await page.addInitScript((access) => {
    localStorage.setItem('khalisni_access', access)
    localStorage.setItem('khalisni_auth_storage', 'local')
    localStorage.setItem('khalisni-language', 'en')
  }, token)
  await page.goto(`/customer/orders/new?service=${service.id}`)
  await page.getByRole('button', { name: 'Next' }).click()
  await page.locator('input[name="city"]').fill('Amman')
  await page.getByRole('button', { name: 'Save draft' }).click()
  await page.reload()
  await expect(page.locator('input[name="category_slug"]')).toHaveValue(PREFIX)
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.locator('input[name="city"]')).toHaveValue('Amman')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'authorization.pdf', mimeType: 'application/pdf', buffer: PDF,
  })
  await page.locator('input[type="checkbox"]').last().check()
  await page.getByRole('button', { name: 'Next' }).click()
  const submit = page.getByRole('button', { name: 'Submit request' })
  await expect(submit).toBeEnabled()
  await submit.evaluate((button) => { button.click(); button.click() })
  await expect(page.getByText('Your request was received')).toBeVisible()
  const orderNumber = await page.locator('section').filter({ hasText: 'Your request was received' }).locator('span.font-black').first().textContent()
  const noticesResponse = await request.get(`${API}/api/notifications/`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(noticesResponse.ok()).toBeTruthy()
  const body = await noticesResponse.json()
  const notices = Array.isArray(body) ? body : body.results
  expect(notices.filter((entry) => entry.order_number === orderNumber && entry.template_key === 'order_submitted')).toHaveLength(1)
})
