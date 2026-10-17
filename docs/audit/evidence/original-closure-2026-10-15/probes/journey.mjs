// UI-driven end-to-end release journey (section 9). API is used ONLY to read/verify state.
import fs from 'fs'
import path from 'path'
import { launch, ctx, watch, settle, snap, WEB, QA, QA_PW, uiLogin, out, HERE } from './pw.mjs'
const BASE = WEB.A, API = 'http://127.0.0.1:8009/api'
const DOC = 'client-audit-qa-202610-authorization'
const PDF = path.join(HERE, 'files', 'qa-valid.pdf')
const steps = []
const log = (n, ok, detail) => { steps.push({ step: n, result: ok ? 'PASS' : 'FAIL', detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${n} :: ${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 400)}`) }
async function apiAs(role) {
  const r = await fetch(API + '/auth/login/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: QA(role), password: QA_PW }) })
  const { access } = await r.json()
  return async (p) => { const x = await fetch(API + p, { headers: { Authorization: 'Bearer ' + access, 'Accept-Language': 'ar' } }); return [x.status, await x.json().catch(() => null)] }
}
const browser = await launch()
const roles = {}
async function rolePage(role) {
  if (roles[role]) return roles[role]
  const c = await ctx(browser, { lang: 'ar' }); const p = await c.newPage(); watch(p)
  await uiLogin(p, BASE, QA(role), QA_PW)
  roles[role] = p; return p
}
const custApi = await apiAs('customer_a'), empApi = await apiAs('employee')
let id, number
try {
  // 1. customer submits via wizard (double-click submit for B07)
  const [, svcs] = await (await apiAs('customer_a'))('/services/')
  const svc = svcs.find((s) => s.slug === 'client-audit-qa-202610-service')
  const cust = await rolePage('customer_a')
  const [, before] = await custApi('/customer/orders/'); const beforeCount = before.count ?? before.results.length
  await cust.goto(`${BASE}/customer/orders/new?service=${svc.id}`); await settle(cust, 1200)
  const next = () => cust.locator('button', { hasText: /^التالي$/ }).first()
  for (let i = 0; i < 6 && !(await cust.locator('input[name="full_name"]').isVisible().catch(() => false)); i++) { await next().click(); await settle(cust, 500) }
  await cust.locator('input[name="full_name"]').fill('QA Customer A')
  await cust.locator('input[name="phone"]').fill('0798800103')
  await cust.locator('input[name="city"]').fill('Amman')
  await next().click(); await settle(cust, 600)
  const fileInputs = cust.locator('input[type=file]')
  await fileInputs.first().setInputFiles(PDF)
  const consent = cust.locator('input[name="consent"]')
  log('B07 consent unchecked by default', !(await consent.isChecked()), 'consent checkbox initial state')
  await consent.check()
  await cust.locator('textarea[name="notes"]').fill('Journey QA order').catch(() => {})
  await next().click(); await settle(cust, 600)
  await snap(cust, 'J01-customer-review-step')
  const postCount = { n: 0 }
  cust.on('request', (r) => { if (r.method() === 'POST' && /\/api\/orders\/$/.test(r.url())) postCount.n++ })
  const submit = cust.locator('button[type="submit"]', { hasText: 'إرسال الطلب' }).first()
  await submit.dblclick().catch(async () => { await submit.click() })
  await submit.click({ timeout: 1500 }).catch(() => {})
  await settle(cust, 2500)
  const info = await snap(cust, 'J01-customer-success')
  number = (info.text.match(/KH-\d{4}-\d{6}/) || [])[0]
  const [, after] = await custApi('/customer/orders/'); const afterCount = after.count ?? after.results.length
  const mine = after.results.find((o) => o.order_number === number); id = mine?.id
  log('1 customer submits valid request (UI wizard)', Boolean(number && id), { number, id })
  log('B07 double-click submit creates one order', afterCount - beforeCount === 1, { postRequests: postCount.n, ordersCreated: afterCount - beforeCount })
  await cust.reload(); await settle(cust, 1500)
  const [, after2] = await custApi('/customer/orders/'); log('B07 refresh after submit creates no extra order', (after2.count ?? after2.results.length) === afterCount, 'reload on success page')

  // 2-3. employee sees it, starts review, requests missing doc (UI)
  const emp = await rolePage('employee')
  await emp.goto(`${BASE}/employee/orders`); await settle(emp, 1500)
  log('2 employee sees request in queue', (await emp.evaluate(() => document.body.innerText)).includes(number), number)
  await emp.goto(`${BASE}/employee/orders/${id}`); await settle(emp, 1500)
  await snap(emp, 'J02-employee-order-new')
  await emp.locator('button', { hasText: 'بدء المراجعة' }).first().click(); await settle(emp, 1500)
  let [, d] = await empApi(`/admin/orders/${id}/`); log('2b employee starts review (UI)', d.status === 'UNDER_REVIEW', d.status)
  await emp.locator('textarea[aria-label="ملاحظة الطلب"]').fill('يرجى رفع نسخة واضحة من التفويض')
  await emp.locator(`input[type=checkbox][value="${DOC}"]`).check()
  await emp.locator('button', { hasText: 'إرسال الطلب' }).first().click(); await settle(emp, 1500)
  ;[, d] = await empApi(`/admin/orders/${id}/`); log('3 employee requests missing document (UI)', d.status === 'WAITING_CUSTOMER' && d.missing_document_types.includes(DOC), { status: d.status, missing: d.missing_document_types })
  await emp.locator('textarea').filter({ hasNot: emp.locator('[aria-label="ملاحظة الطلب"]') }).last().fill('INTERNAL JOURNEY NOTE - private').catch(() => {})
  const noteBtn = emp.locator('button', { hasText: 'حفظ الملاحظة' }).first()
  if (await noteBtn.count()) { await noteBtn.click(); await settle(emp, 1000) }
  await snap(emp, 'J03-employee-after-request')

  // 4. customer in-app notification via bell
  await cust.goto(`${BASE}/customer`); await settle(cust, 1500)
  await cust.locator('button[aria-haspopup="dialog"]').first().click(); await cust.waitForTimeout(700)
  const bellTxt = await cust.evaluate(() => document.body.innerText)
  log('4 customer receives in-app notification (bell)', bellTxt.includes(number) && /مستندات إضافية مطلوبة|مستند/.test(bellTxt), 'bell shows missing-doc notice for ' + number)
  await snap(cust, 'J04-customer-bell', { full: false })
  await cust.locator('button', { hasText: number }).filter({ hasText: /مستندات/ }).first().click(); await settle(cust, 1500)
  log('4b bell opens the correct missing-docs page', cust.url().endsWith(`/customer/orders/${id}/missing-docs`), cust.url())

  // 5-6. upload + resubmit (UI)
  await cust.locator('input[type=file]').first().setInputFiles(PDF)
  await cust.locator('button', { hasText: 'رفع المستندات وإعادة الإرسال' }).first().click(); await settle(cust, 2000)
  ;[, d] = await custApi(`/customer/orders/${id}/`)
  log('5-6 customer uploads + resubmits (UI)', d.status === 'UNDER_REVIEW', { status: d.status, url: cust.url() })
  await snap(cust, 'J06-customer-after-resubmit')

  // 7-8. employee reviews + approves on verify page (UI)
  await emp.goto(`${BASE}/employee/documents/verify`); await settle(emp, 2000)
  const row = emp.locator('button, li, a', { hasText: number }).first()
  if (await row.count()) { await row.click(); await settle(emp, 2000) }
  await snap(emp, 'J07-employee-verify-page')
  // approve every pending doc of this order (initial + replacement)
  for (let i = 0; i < 3; i++) {
    const approve = emp.locator('button', { hasText: 'اعتماد الوثيقة' }).first()
    if (!(await approve.count()) || (await approve.isDisabled())) break
    const body = await emp.evaluate(() => document.body.innerText)
    if (!body.includes(number)) break
    await approve.click(); await settle(emp, 2000)
  }
  ;[, d] = await empApi(`/admin/orders/${id}/`)
  log('7-8 employee reviews/accepts document (UI)', d.allowed_actions.readiness.requirements_complete === true, d.allowed_actions.readiness)

  // 9. assign provider A (UI)
  await emp.goto(`${BASE}/employee/orders/${id}`); await settle(emp, 2000)
  const ready = await emp.evaluate(() => document.body.innerText.includes('جاهز الآن'))
  const provSel = emp.locator('select[name="provider_id"]')
  const opts = await provSel.locator('option').allInnerTexts()
  await provSel.selectOption({ label: opts.find((o) => o.includes('QA Provider A')) })
  await emp.locator('button', { hasText: 'تعيين المزوّد' }).first().click(); await settle(emp, 800)
  const confirm = emp.locator('[role="dialog"] button, [role="alertdialog"] button').filter({ hasText: /تأكيد|نعم|تعيين/ }).last()
  if (await confirm.count()) { await confirm.click(); await settle(emp, 1500) }
  ;[, d] = await empApi(`/admin/orders/${id}/`)
  log('9 eligible provider assigned (UI); readiness text shown before', d.status === 'ASSIGNED' && ready, { status: d.status, readyTextShown: ready, providerOptions: opts })

  // 10-12. provider receives, opens, updates progress (UI)
  const prov = await rolePage('provider_a')
  await prov.goto(`${BASE}/provider/orders`); await settle(prov, 1500)
  log('10 provider receives the request (list)', (await prov.evaluate(() => document.body.innerText)).includes(number), number)
  await prov.goto(`${BASE}/provider/orders/${id}`); await settle(prov, 1500)
  const pTxt = (await snap(prov, 'J11-provider-order')).text
  log('11 provider opens it; internal note hidden', pTxt.includes(number) && !pTxt.includes('INTERNAL JOURNEY NOTE'), 'provider detail')
  await prov.locator('#provider-status').selectOption('IN_PROGRESS')
  await prov.locator('button[type="submit"]', { hasText: 'تحديث الحالة' }).click(); await settle(prov, 1500)
  ;[, d] = await empApi(`/admin/orders/${id}/`); log('12 provider updates progress (UI)', d.status === 'IN_PROGRESS', d.status)

  // 13-14. customer sees progress; no internal note / provider identity check
  await cust.goto(`${BASE}/customer/orders/${id}`); await settle(cust, 1500)
  const cTxt = (await snap(cust, 'J13-customer-progress')).text
  log('13 customer sees progress', /قيد التنفيذ/.test(cTxt), (cTxt.match(/قيد التنفيذ[^\n]*/) || [''])[0])
  log('14 internal note hidden from customer', !cTxt.includes('INTERNAL JOURNEY NOTE'), { providerNameVisibleToCustomer: cTxt.includes('QA Provider A') })

  // 15. provider uploads final result (UI)
  await prov.reload(); await settle(prov, 1500)
  await prov.locator('input[type=file]').last().setInputFiles(PDF)
  await prov.locator('button[type="submit"]', { hasText: 'رفع النتيجة' }).click(); await settle(prov, 2000)
  ;[, d] = await empApi(`/admin/orders/${id}/`); log('15 provider supplies final result (UI)', d.status === 'READY_FOR_DELIVERY', d.status)
  await snap(prov, 'J15-provider-after-final')

  // 16-17. employee approves result + completes (UI)
  await emp.goto(`${BASE}/employee/orders/${id}`); await settle(emp, 2000)
  const comp = emp.locator('button', { hasText: 'اعتماد النتيجة وإكمال الطلب' }).first()
  log('16a complete action visible to employee', await comp.count() > 0, 'button present')
  if (await comp.count()) {
    await comp.click(); await settle(emp, 700)
    const c2 = emp.locator('[role="dialog"] button, [role="alertdialog"] button').filter({ hasText: /تأكيد|نعم|إكمال|اعتماد/ }).last()
    if (await c2.count()) { await c2.click(); await settle(emp, 2000) }
  }
  ;[, d] = await empApi(`/admin/orders/${id}/`)
  const finalDoc = d.documents.find((x) => x.is_final_document || /final/i.test(x.document_type))
  log('16-17 required approval occurs and order COMPLETED (UI)', d.status === 'COMPLETED' && finalDoc?.status === 'approved', { status: d.status, finalDoc: finalDoc && { id: finalDoc.id, status: finalDoc.status } })
  await snap(emp, 'J17-employee-completed')

  // 18-19. customer notification + download (UI)
  await cust.goto(`${BASE}/customer/orders/${id}`); await settle(cust, 1500)
  await cust.locator('button[aria-haspopup="dialog"]').first().click(); await cust.waitForTimeout(700)
  const bell2 = await cust.evaluate(() => document.body.innerText)
  log('18 customer receives completion notification', /اكتمل|مكتمل|تم إكمال/.test(bell2) && bell2.includes(number), 'bell')
  await cust.keyboard.press('Escape'); await cust.mouse.click(5, 5)
  await snap(cust, 'J19-customer-completed')
  const dlBtn = cust.locator('button, a', { hasText: /تنزيل/ }).first()
  let dlOk = false, dlName = null
  if (await dlBtn.count()) {
    const [dl] = await Promise.all([cust.waitForEvent('download', { timeout: 15000 }).catch(() => null), dlBtn.click()])
    if (dl) { dlName = dl.suggestedFilename(); const p = await dl.path(); dlOk = fs.readFileSync(p).subarray(0, 5).toString() === '%PDF-' }
  }
  log('19 customer downloads final result (UI)', dlOk, { dlName })

  // 20. reload + re-login preserve state
  await cust.reload(); await settle(cust, 1500)
  const r1 = (await cust.evaluate(() => document.body.innerText)).includes('مكتمل')
  const cust2c = await ctx(browser, { lang: 'ar' }); const cust2 = await cust2c.newPage(); watch(cust2)
  await uiLogin(cust2, BASE, QA('customer_a'), QA_PW); await cust2.goto(`${BASE}/customer/orders/${id}`); await settle(cust2, 1500)
  const r2 = (await cust2.evaluate(() => document.body.innerText)).includes('مكتمل')
  log('20 reload and re-login preserve COMPLETED state', r1 && r2, { reload: r1, relogin: r2 })

  // 21. no duplicates
  const [, fin] = await custApi(`/customer/orders/${id}/`)
  const [, list] = await custApi('/customer/orders/')
  const sameNum = list.results.filter((o) => o.order_number === number).length
  const tl = (fin.status_logs || []).map((x) => x.new_status)
  const dupStatuses = tl.filter((s, i) => tl.indexOf(s) !== i)
  const [, notes] = await custApi('/notifications/')
  const mineN = notes.results.filter((n) => (n.order_number === number))
  const keys = mineN.map((n) => n.template_key); const dupKeys = keys.filter((k, i) => keys.indexOf(k) !== i)
  log('21 one order, no duplicate timeline/notifications', sameNum === 1 && dupStatuses.length === 0 && dupKeys.length === 0, { sameNum, timeline: tl, notificationKeys: keys, dupStatuses, dupKeys })
  out('JOURNEY-notifications.json', mineN)
} catch (e) {
  log('EXCEPTION', false, String(e).slice(0, 600))
  for (const [r, p] of Object.entries(roles)) await snap(p, 'J-ERROR-' + r).catch(() => {})
}
out('JOURNEY-results.json', { id, number, steps })
await browser.close()
