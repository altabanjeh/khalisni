import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const API = process.env.E2E_API_URL || 'http://127.0.0.1:8009'
const PREFIX = 'client-audit-qa-202610'
const DOC = `${PREFIX}-authorization`
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n')

test.skip(process.env.E2E_QA_MODE !== '1', 'Run with E2E_QA_MODE=1 and KHALSNI_QA_PASSWORD set')
test.setTimeout(180_000)

test('fresh client audit request completes through customer, employee, and provider', async ({ page, request, browser }, testInfo) => {
  const password = process.env.KHALSNI_QA_PASSWORD
  expect(password?.length).toBeGreaterThanOrEqual(12)

  async function login(role) {
    const response = await request.post(`${API}/api/auth/login/`, {
      data: { email: `${PREFIX}-${role}@example.test`, password },
    })
    expect(response.ok(), `${role} login: ${response.status()} ${await response.text()}`).toBeTruthy()
    return (await response.json()).access
  }
  const tokens = Object.fromEntries(await Promise.all(
    ['admin', 'employee', 'customer_a', 'customer_b', 'provider_a', 'provider_b']
      .map(async (role) => [role, await login(role)]),
  ))
  async function call(role, method, path, options = {}) {
    const response = await request.fetch(`${API}/api${path}`, {
      method, headers: { Authorization: `Bearer ${tokens[role]}` }, ...options,
    })
    return response
  }
  async function good(role, method, path, options = {}) {
    const response = await call(role, method, path, options)
    expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBeTruthy()
    return response
  }
  async function asCustomer() {
    await page.addInitScript((access) => {
      localStorage.setItem('khalisni_access', access)
      localStorage.setItem('khalisni_auth_storage', 'local')
      localStorage.setItem('khalisni-language', 'en')
    }, tokens.customer_a)
  }

  const serviceResponse = await good('customer_a', 'GET', `/services/${PREFIX}-service/`)
  const service = await serviceResponse.json()
  expect(service.required_documents.some((item) => item.document_type === DOC && item.is_required)).toBeTruthy()

  const qaWaitingBody = await (await good('admin', 'GET', `/admin/orders/?status=WAITING_CUSTOMER&service=${service.id}`)).json()
  const qaWaitingRows = Array.isArray(qaWaitingBody) ? qaWaitingBody : qaWaitingBody.results
  let qaMissingId
  for (const candidate of qaWaitingRows) {
    const candidateDetail = await (await good('admin', 'GET', `/admin/orders/${candidate.id}/`)).json()
    if (candidateDetail.customer_notes?.includes(`[${PREFIX}:missing]`)) {
      qaMissingId = candidate.id
      break
    }
  }
  expect(qaMissingId).toBeTruthy()
  const qaBlocked = await (await good('admin', 'GET', `/admin/orders/${qaMissingId}/`)).json()
  const resume = qaBlocked.allowed_actions.workflow_transitions.find((item) => item.action === 'resume_review')
  expect(resume.available).toBeFalsy()
  expect(resume.blocked_reasons.join(' ')).toContain(DOC)
  expect(qaBlocked.allowed_actions.readiness.documents[0].state).toBe('not_uploaded')

  async function rolePage(role, path) {
    const roleBrowserPage = await browser.newPage()
    await roleBrowserPage.addInitScript((access) => {
      localStorage.setItem('khalisni_access', access)
      localStorage.setItem('khalisni_auth_storage', 'local')
      localStorage.setItem('khalisni-language', 'en')
    }, tokens[role])
    await roleBrowserPage.goto(path, { waitUntil: 'domcontentloaded' })
    return roleBrowserPage
  }
  const employeePage = await rolePage('employee', `/employee/orders/${qaMissingId}`)
  await expect(employeePage.getByText('Not uploaded', { exact: true })).toBeVisible()
  await employeePage.screenshot({ path: testInfo.outputPath('F04-not-uploaded.png'), fullPage: true })
  await employeePage.close()
  const adminPage = await rolePage('admin', `/admin/orders/${qaMissingId}`)
  await expect(adminPage.getByText(/Next workflow action is blocked/)).toBeVisible()
  await adminPage.screenshot({ path: testInfo.outputPath('F05-blocked-transition.png'), fullPage: true })
  await adminPage.close()

  const created = await good('customer_a', 'POST', '/orders/', {
    multipart: {
      service: String(service.id), full_name: 'QA Customer A', phone: '0798800103',
      city: 'Amman', notes: 'Fresh client audit acceptance request', consent: 'true',
      document_types: DOC,
      documents: { name: 'initial-authorization.pdf', mimeType: 'application/pdf', buffer: PDF },
    },
  })
  const { id, order_number: number } = await created.json()
  const detailPath = `/customer/orders/${id}/`
  let detail = await (await good('customer_a', 'GET', detailPath)).json()
  expect(detail.status).toBe('NEW')
  expect(detail.documents.filter((doc) => doc.document_type === DOC)).toHaveLength(1)
  const firstDocument = detail.documents.find((doc) => doc.document_type === DOC)

  await good('employee', 'PATCH', `/admin/orders/${id}/status/`, {
    data: { status: 'UNDER_REVIEW', note: 'QA employee review' },
  })
  await good('employee', 'POST', `/staff/documents/${firstDocument.id}/verify/`, {
    data: { is_verified: false, note: 'Replacement requested for audit test' },
  })
  await good('employee', 'POST', `/admin/orders/${id}/request-documents/`, {
    data: { note: 'Please upload a readable authorization PDF.', document_types: [DOC] },
  })
  await good('employee', 'POST', `/admin/orders/${id}/notes/`, {
    data: { note: 'INTERNAL QA ACCEPTANCE NOTE', visibility: 'INTERNAL' },
  })

  detail = await (await good('customer_a', 'GET', detailPath)).json()
  expect(detail.status).toBe('WAITING_CUSTOMER')
  expect(JSON.stringify(detail)).not.toContain('INTERNAL QA ACCEPTANCE NOTE')
  const customerBOrder = await call('customer_b', 'GET', detailPath)
  expect(customerBOrder.status()).toBe(404)
  const providerBOrder = await call('provider_b', 'GET', `/provider/orders/${id}/`)
  expect(providerBOrder.status()).toBe(404)

  await asCustomer()
  const notificationsBody = await (await good('customer_a', 'GET', '/notifications/')).json()
  const notifications = Array.isArray(notificationsBody) ? notificationsBody : notificationsBody.results
  const missingNotice = notifications.find((item) => item.order_number === number && item.template_key === 'missing_documents_requested')
  expect(missingNotice).toBeTruthy()
  await page.goto('/customer', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(missingNotice.title).first()).toBeVisible()
  await page.getByRole('button', { name: 'Notifications' }).click()
  await expect(page.getByText(missingNotice.title).last()).toBeVisible()
  await page.locator('button').filter({ hasText: missingNotice.title }).last().click()
  await expect(page).toHaveURL(new RegExp(`/customer/orders/${id}/missing-docs$`))
  const readNotice = await (await good('customer_a', 'GET', '/notifications/')).json()
  const readItems = Array.isArray(readNotice) ? readNotice : readNotice.results
  expect(readItems.find((item) => item.id === missingNotice.id).is_read).toBeTruthy()
  await expect(page.getByText(number, { exact: false }).first()).toBeVisible()
  await expect(page.locator('input[type="file"]')).toHaveCount(1)
  await page.locator('input[type="file"]').setInputFiles({
    name: 'replacement-authorization.pdf', mimeType: 'application/pdf', buffer: PDF,
  })
  await page.getByRole('button', { name: 'Upload documents & resubmit' }).click()
  await expect(page).toHaveURL(new RegExp(`/customer/orders/${id}$`))

  detail = await (await good('customer_a', 'GET', detailPath)).json()
  expect(detail.status).toBe('UNDER_REVIEW')
  const replacement = detail.documents.find((doc) => doc.document_type === DOC && doc.id !== firstDocument.id)
  expect(replacement).toBeTruthy()
  await good('employee', 'POST', `/staff/documents/${replacement.id}/verify/`, {
    data: { is_verified: true, note: 'Readable QA replacement approved' },
  })
  const reviewed = await (await good('employee', 'GET', `/admin/orders/${id}/`)).json()
  expect(reviewed.allowed_actions.readiness.requirements_complete).toBeTruthy()

  const providersResponse = await good('admin', 'GET', `/admin/providers/?order=${id}`)
  const providersBody = await providersResponse.json()
  const providers = Array.isArray(providersBody) ? providersBody : providersBody.results
  const providerA = providers.find((provider) => provider.email === `${PREFIX}-provider_a@example.test`)
  expect(providerA).toBeTruthy()
  await good('employee', 'PATCH', `/admin/orders/${id}/assign/`, {
    data: { provider_id: providerA.id, note: 'Requirements approved' },
  })
  const providerDetail = await (await good('provider_a', 'GET', `/provider/orders/${id}/`)).json()
  expect(providerDetail.status).toBe('ASSIGNED')
  expect(JSON.stringify(providerDetail)).not.toContain('INTERNAL QA ACCEPTANCE NOTE')
  expect((await call('provider_b', 'GET', `/provider/orders/${id}/`)).status()).toBe(404)
  const providerPage = await rolePage('provider_a', `/provider/orders/${id}`)
  await expect(providerPage.getByText(number, { exact: false }).first()).toBeVisible()
  await providerPage.close()

  await good('provider_a', 'PATCH', `/provider/orders/${id}/status/`, {
    data: { status: 'IN_PROGRESS', note: 'QA provider working' },
  })
  await page.goto(`/customer/orders/${id}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(number, { exact: false }).first()).toBeVisible()
  await expect(page.getByText(/In progress/i).first()).toBeVisible()
  await expect(page.getByText('إجراء مطلوب منك', { exact: true })).toHaveCount(0)
  expect((await (await good('customer_a', 'GET', detailPath)).json()).status).toBe('IN_PROGRESS')

  const finalResponse = await good('provider_a', 'POST', `/provider/orders/${id}/final-document/`, {
    multipart: {
      document_type: 'FINAL_RESULT',
      file: { name: 'qa-final-result.pdf', mimeType: 'application/pdf', buffer: PDF },
    },
  })
  const finalId = (await finalResponse.json()).id
  await good('employee', 'POST', `/staff/documents/${finalId}/verify/`, {
    data: { is_verified: true, note: 'Final result approved' },
  })
  await good('employee', 'POST', `/admin/orders/${id}/complete/`, { data: { admin_confirmation: false } })
  detail = await (await good('customer_a', 'GET', detailPath)).json()
  expect(detail.status).toBe('COMPLETED')
  expect(detail.documents.some((doc) => doc.id === finalId && doc.is_final_document)).toBeTruthy()
  const completedNoticesBody = await (await good('customer_a', 'GET', '/notifications/')).json()
  const completedNotices = Array.isArray(completedNoticesBody) ? completedNoticesBody : completedNoticesBody.results
  expect(completedNotices.some((item) => item.order_number === number && item.template_key === 'order_completed')).toBeTruthy()
  const finalDownload = await good('customer_a', 'GET', `/documents/${finalId}/download/`)
  expect((await finalDownload.body()).subarray(0, 8).toString()).toBe('%PDF-1.4')
  expect([403, 404]).toContain((await call('customer_b', 'GET', `/documents/${finalId}/download/`)).status())
  expect([403, 404]).toContain((await call('provider_b', 'GET', `/documents/${finalId}/download/`)).status())

  const customerList = await (await good('customer_a', 'GET', '/customer/orders/')).json()
  const orders = Array.isArray(customerList) ? customerList : customerList.results
  expect(orders.filter((order) => order.id === id)).toHaveLength(1)
  const timeline = detail.status_logs || detail.timeline || []
  for (const status of ['WAITING_CUSTOMER', 'ASSIGNED', 'IN_PROGRESS', 'READY_FOR_DELIVERY', 'COMPLETED']) {
    expect(timeline.filter((event) => event.new_status === status), `${status} timeline duplicate`).toHaveLength(1)
  }
  await page.reload()
  await expect(page.getByText(number, { exact: false }).first()).toBeVisible()
  await expect(page.getByText(/Completed/i).first()).toBeVisible()
  const browserDownloadPromise = page.waitForEvent('download')
  await page.getByText('qa-final-result.pdf').locator('..').locator('..').getByRole('button', { name: 'Download' }).click()
  const browserDownload = await browserDownloadPromise
  expect(browserDownload.suggestedFilename()).toBe('qa-final-result.pdf')
  expect((await readFile(await browserDownload.path())).subarray(0, 8).toString()).toBe('%PDF-1.4')
})

test('published CMS content appears on the public homepage and its admin preview', async ({ page, request, browser }, testInfo) => {
  const password = process.env.KHALSNI_QA_PASSWORD
  const login = await request.post(`${API}/api/auth/login/`, {
    data: { email: `${PREFIX}-admin@example.test`, password },
  })
  expect(login.ok()).toBeTruthy()
  const token = (await login.json()).access
  const headers = { Authorization: `Bearer ${token}` }
  const current = await request.get(`${API}/api/admin/public-site/content/`, { headers })
  expect(current.ok()).toBeTruthy()
  const content = await current.json()
  const title = `Client audit published hero ${Date.now()}`
  const payload = {
    ...content,
    hero_title_en: title,
    hero_subtitle_en: 'Published content reaches the live homepage and preview.',
    primary_button_text_en: 'Browse QA services',
    primary_button_url: '/services',
    active_content: true,
  }
  const saved = await request.put(`${API}/api/admin/public-site/content/`, { headers, data: payload })
  expect(saved.ok(), `CMS save: ${saved.status()} ${await saved.text()}`).toBeTruthy()
  const publicContent = await request.get(`${API}/api/public-site/homepage/`)
  expect(publicContent.ok()).toBeTruthy()
  expect((await publicContent.json()).content.hero_title_en).toBe(title)

  await page.addInitScript(() => localStorage.setItem('khalisni-language', 'en'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible()
  await expect(page.getByText('Published content reaches the live homepage and preview.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Browse QA services' })).toHaveAttribute('href', '/services')
  await page.screenshot({ path: testInfo.outputPath('F06-published-homepage.png'), fullPage: true })

  const adminPage = await browser.newPage()
  await adminPage.addInitScript((access) => {
    localStorage.setItem('khalisni_access', access)
    localStorage.setItem('khalisni_auth_storage', 'local')
    localStorage.setItem('khalisni-language', 'en')
  }, token)
  await adminPage.goto('/admin/public-site/preview', { waitUntil: 'domcontentloaded' })
  const preview = adminPage.frameLocator('iframe[title="Published homepage"]')
  await expect(preview.getByRole('heading', { name: title, level: 1 })).toBeVisible()
  await expect(preview.getByRole('link', { name: 'Browse QA services' })).toHaveAttribute('href', '/services')
  await adminPage.screenshot({ path: testInfo.outputPath('F06-admin-preview.png'), fullPage: true })
  await adminPage.close()
})
