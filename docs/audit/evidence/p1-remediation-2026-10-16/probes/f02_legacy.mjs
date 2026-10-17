// F02 verification on the migrated legacy copy (env B2): original KH-2026-000001.
import path from 'path'
import { launch, ctx, watch, settle, snap, WEB, DEMO, uiLogin, out, HERE } from './pw.mjs'
const API = 'http://127.0.0.1:8020/api', BASE = WEB.B
const R = {}
async function apiAs([email, password]) {
  const { access } = await (await fetch(API + '/auth/login/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).json()
  return async (p) => (await fetch(API + p, { headers: { Authorization: 'Bearer ' + access } })).json()
}
const cApi = await apiAs(DEMO.customer), aApi = await apiAs(DEMO.admin)
const browser = await launch()

// 1. customer view
const cc = await ctx(browser, { lang: 'ar' }); const cust = await cc.newPage(); watch(cust)
const posts = []
cust.on('request', (r) => { if (r.method() !== 'GET' && r.url().includes('/api/') && !r.url().includes('/auth/')) posts.push(`${r.method()} ${r.url()}`) })
await uiLogin(cust, BASE, ...DEMO.customer)
await cust.goto(BASE + '/customer/orders/1/missing-docs'); await settle(cust, 1500)
const before = await cApi('/customer/orders/1/')
const info = await snap(cust, 'F02-after-fix-legacy-customer-page')
R.customer = {
  statusBefore: before.status,
  flag: before.allowed_actions.missing_document_request_valid,
  safeState: await cust.locator('[data-testid="missing-documents-unavailable"]').count() === 1,
  message: /لا توجد حالياً مستندات قابلة للرفع لهذا الطلب/.test(info.text),
  progress00: /0\s*\/\s*0/.test(info.text),
  fileInputs: await cust.locator('input[type=file]').count(),
  resubmitButtons: await cust.locator('button', { hasText: 'رفع المستندات وإعادة الإرسال' }).count(),
  falseSuccess: /تم رفع المستندات وإعادة إرسال الطلب للمراجعة/.test(info.text),
}
// try every button on the safe state except navigation; none may POST
await cust.locator('button', { hasText: 'العودة إلى تفاصيل الطلب' }).click(); await settle(cust, 800)
R.customer.nonGetRequests = posts
R.customer.statusAfter = (await cApi('/customer/orders/1/')).status

// 2. staff recovery through the admin UI
const ac = await ctx(browser, { lang: 'ar' }); const adm = await ac.newPage(); watch(adm)
await uiLogin(adm, BASE, ...DEMO.admin)
await adm.goto(BASE + '/admin/orders/1'); await settle(adm, 1500)
await snap(adm, 'F02-after-fix-legacy-admin-before-recovery')
const panel = adm.locator('[data-testid="missing-request-recovery"]')
R.staff = { panelVisible: await panel.count() === 1 }
await panel.locator('button').click()
await adm.fill('#missing-request-recovery-reason', 'طلب قديم لا يحدد مستنداً قابلاً للرفع - تدقيق P1')
await adm.locator('button', { hasText: 'نعم، أعده إلى المراجعة' }).click(); await settle(adm, 2000)
const afterAdmin = await aApi('/admin/orders/1/')
R.staff.statusAfter = afterAdmin.status
R.staff.timeline = afterAdmin.status_logs.slice(-1).map((x) => ({ from: x.old_status, to: x.new_status, by: x.changed_by_name || x.changed_by, note: x.note, at: x.created_at }))
const audit = await aApi('/admin/audit-logs/?search=recover_missing_document_request')
R.staff.audit = (audit.results || audit).filter((x) => String(x.action).startsWith('recover_missing')).map((x) => ({ action: x.action, user: x.user_email || x.user, old: x.old_values, new: x.new_values, at: x.created_at }))
await snap(adm, 'F02-after-fix-legacy-admin-after-recovery')

// 3. staff then sends a valid new request naming a configured document; customer can answer it
const form = adm.locator('[data-testid="admin-request-documents"]')
R.staff.requestFormAfterRecovery = await form.count() === 1
if (R.staff.requestFormAfterRecovery) {
  await form.locator('textarea').fill('يرجى رفع صورة أوضح للهوية الشخصية')
  await form.locator('input[type=checkbox]').first().check()
  await form.locator('button[type=submit]').click(); await settle(adm, 2000)
}
const reRequested = await aApi('/admin/orders/1/')
R.newRequest = { status: reRequested.status, missing: reRequested.missing_document_types }
await cust.goto(BASE + '/customer/orders/1/missing-docs'); await settle(cust, 1500)
R.newRequest.customerFileInputs = await cust.locator('input[type=file]').count()
await cust.locator('input[type=file]').first().setInputFiles(path.join(HERE, 'files', 'qa-valid.pdf'))
await cust.locator('button', { hasText: 'رفع المستندات وإعادة الإرسال' }).click(); await settle(cust, 2500)
R.newRequest.afterCustomerUpload = (await cApi('/customer/orders/1/')).status
await snap(cust, 'F02-after-fix-legacy-customer-after-valid-upload')
out('F02-legacy-after-fix.json', R)
console.log(JSON.stringify(R, null, 1))
await browser.close()
