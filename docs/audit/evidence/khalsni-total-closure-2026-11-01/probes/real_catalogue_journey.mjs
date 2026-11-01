// Real-catalogue journey (total closure §25): a REAL imported business service that previously
// could not be submitted, from registration to byte-checked final download, through the UI.
// Staff accounts are created on a disposable copy of the real catalogue database; the customer
// registers through the UI. Passwords come from the environment and are never written out.
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { launch, ctx, watch, settle, snap, WEB, QA, QA_PW, uiLogin, out, HERE } from './pw.mjs'

const BASE = WEB.A, API = process.env.API_A
const SLUG = process.env.SERVICE_SLUG || 'business_trademark_services'
const PDF = path.join(HERE, 'files', 'qa-valid.pdf')
const FINAL = path.join(HERE, 'files', 'qa-final-distinct.pdf')
const steps = []
const log = (n, ok, detail) => { steps.push({ step: n, result: ok ? 'PASS' : 'FAIL', detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${n} :: ${JSON.stringify(detail).slice(0, 300)}`) }
const email = `journey-${Date.now()}@example.org`
const password = `Jr-${crypto.randomBytes(6).toString('hex')}9!`
const phone = `079${String(crypto.randomInt(1000000, 9999999))}`
async function api(emailAddr, pw) {
  const { access } = await (await fetch(`${API}/auth/login/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailAddr, password: pw }) })).json()
  return async (p, init = {}) => { const r = await fetch(API + p, { ...init, headers: { Authorization: 'Bearer ' + access, 'Accept-Language': 'ar', ...(init.headers || {}) } }); return [r.status, await r.json().catch(() => null)] }
}
const browser = await launch()
const pages = {}
async function page(role, emailAddr, pw) {
  if (pages[role]) return pages[role]
  const c = await ctx(browser, { lang: 'ar' }); const p = await c.newPage(); watch(p)
  await uiLogin(p, BASE, emailAddr, pw); pages[role] = p; return p
}
let id, number
try {
  // 1. register
  const rc = await ctx(browser, { lang: 'ar' }); const cust = await rc.newPage(); watch(cust)
  await cust.goto(`${BASE}/register`); await settle(cust, 800)
  await cust.locator('#reg-full-name').fill('عميل رحلة الكتالوج')
  await cust.locator('input[name="phone"]').fill(phone)
  await cust.locator('#reg-email').fill(email)
  await cust.locator('#reg-password').fill(password)
  await cust.locator('form button[type="submit"]').first().click(); await settle(cust, 1500)
  log('1 register (UI)', cust.url().includes('/login'), cust.url().replace(BASE, ''))
  await uiLogin(cust, BASE, email, password)
  log('1b login', cust.url().includes('/customer'), cust.url().replace(BASE, ''))
  const custApi = await api(email, password)
  // 2-3. browse real category and open the real service
  await cust.goto(`${BASE}/services`); await settle(cust, 1500)
  const [, service] = await custApi(`/services/${SLUG}/`)
  const categorySlug = service.category?.slug
  await cust.goto(`${BASE}/services/category/${categorySlug}`); await settle(cust, 1500)
  const catText = await (await snap(cust, 'RJ02-category')).text
  log('2 browse real category', catText.includes(service.name_ar), { category: service.category?.name_ar })
  await cust.goto(`${BASE}/services/${SLUG}`); await settle(cust, 1200)
  await snap(cust, 'RJ03-service')
  log('3 open real service (orderable)', service.orderable === true, { slug: SLUG, orderable: service.orderable })
  // 4-6. dynamic form, uploads, submit
  await cust.goto(`${BASE}/customer/orders/new?service=${service.id}`); await settle(cust, 1500)
  const next = () => cust.locator('button', { hasText: /^التالي$/ }).first()
  for (let i = 0; i < 4 && !(await cust.locator('input[name="full_name"]').isVisible().catch(() => false)); i++) { await next().click(); await settle(cust, 500) }
  await cust.locator('input[name="city"]').fill('عمّان')
  await cust.evaluate(() => {
    const set = (el, v) => { Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) }
    for (const el of document.querySelectorAll('main input, main textarea')) {
      if (!el.offsetParent || el.value || ['file', 'checkbox', 'radio', 'hidden'].includes(el.type)) continue
      set(el, el.type === 'number' ? '12' : el.type === 'date' ? '2026-11-20' : el.type === 'email' ? 'journey@example.org' : el.type === 'tel' ? '0791234570' : 'قيمة رحلة الكتالوج')
    }
  })
  // A national ID is unique per account: give this run its own.
  await cust.locator('input[name="national_id"]').fill(String(crypto.randomInt(1000000000, 9999999999))).catch(() => {})
  for (const s of await cust.locator('main select').all()) {
    if (!(await s.isVisible())) continue
    const opts = await s.locator('option').evaluateAll((os) => os.filter((o) => o.value).map((o) => o.value))
    if (opts.length && !(await s.inputValue())) await s.selectOption(opts[0])
  }
  await snap(cust, 'RJ04-dynamic-form')
  await next().click(); await settle(cust, 800)
  const files = cust.locator('input[type=file]')
  for (let i = 0; i < await files.count(); i++) await files.nth(i).setInputFiles(PDF)
  await cust.locator('input[name="consent"]').check()
  await next().click(); await settle(cust, 800)
  await cust.locator('button[type="submit"]', { hasText: 'إرسال الطلب' }).first().click(); await settle(cust, 2500)
  const done = await snap(cust, 'RJ06-submitted')
  number = (done.text.match(/KH-\d{4}-\d{6}/) || [])[0]
  const [, mine] = await custApi('/customer/orders/')
  id = (mine.results || mine).find((o) => o.order_number === number)?.id
  log('4-6 dynamic form + uploads + submit', Boolean(number && id), { number, id })
  // 7-8. employee review + missing-document request (UI)
  const empApi = await api(process.env.STAFF_EMPLOYEE, QA_PW)
  const emp = await page('employee', process.env.STAFF_EMPLOYEE, QA_PW)
  await emp.goto(`${BASE}/employee/orders/${id}`); await settle(emp, 1500)
  await emp.locator('button', { hasText: 'بدء المراجعة' }).first().click(); await settle(emp, 1500)
  let [, d] = await empApi(`/admin/orders/${id}/`)
  log('7 employee review (UI)', d.status === 'UNDER_REVIEW', d.status)
  const requested = d.allowed_actions?.readiness?.documents?.[0]?.document_type
  await emp.locator('textarea[aria-label="ملاحظة الطلب"]').fill('يرجى رفع نسخة أوضح من المستند')
  await emp.locator(`input[type=checkbox][value="${requested}"]`).check()
  await emp.locator('button', { hasText: 'إرسال الطلب' }).first().click(); await settle(emp, 1500)
  ;[, d] = await empApi(`/admin/orders/${id}/`)
  log('8 missing-document request (UI)', d.status === 'WAITING_CUSTOMER', { status: d.status, requested })
  // 9-10. customer notification + resubmission (UI)
  await cust.goto(`${BASE}/customer`); await settle(cust, 1500)
  await cust.locator('button[aria-haspopup="dialog"]').first().click(); await cust.waitForTimeout(800)
  const bell = await cust.evaluate(() => document.body.innerText)
  log('9 customer notification (bell)', bell.includes(number), 'bell')
  await cust.keyboard.press('Escape')
  await cust.goto(`${BASE}/customer/orders/${id}/missing-docs`); await settle(cust, 1500)
  await cust.locator('input[type=file]').first().setInputFiles(PDF)
  await cust.locator('button', { hasText: 'رفع المستندات وإعادة الإرسال' }).first().click(); await settle(cust, 2000)
  ;[, d] = await custApi(`/customer/orders/${id}/`)
  log('10 customer resubmission (UI)', d.status === 'UNDER_REVIEW', d.status)
  // 11. employee verifies every pending document (UI)
  await emp.goto(`${BASE}/employee/documents/verify`); await settle(emp, 2000)
  for (let i = 0; i < 12; i++) {
    const row = emp.locator('button, li, a', { hasText: number }).first()
    if (!(await row.count())) break
    await row.click(); await settle(emp, 1500)
    const approve = emp.locator('button', { hasText: 'اعتماد الوثيقة' }).first()
    if (!(await approve.count()) || (await approve.isDisabled())) break
    await approve.click(); await settle(emp, 1500)
  }
  ;[, d] = await empApi(`/admin/orders/${id}/`)
  log('11 employee verification (UI)', d.allowed_actions.readiness.requirements_complete === true, d.allowed_actions.readiness.blocking_reasons)
  // 12. provider assignment (UI)
  await emp.goto(`${BASE}/employee/orders/${id}`); await settle(emp, 2000)
  const sel = emp.locator('select[name="provider_id"]')
  const opts = await sel.locator('option').allInnerTexts()
  await sel.selectOption({ label: opts.find((o) => o.includes('Journey Provider')) })
  await emp.locator('button', { hasText: 'تعيين المزوّد' }).first().click(); await settle(emp, 800)
  const confirm = emp.locator('[role="dialog"] button, [role="alertdialog"] button').filter({ hasText: /تأكيد|نعم|تعيين/ }).last()
  if (await confirm.count()) { await confirm.click(); await settle(emp, 1500) }
  ;[, d] = await empApi(`/admin/orders/${id}/`)
  log('12 provider assignment (UI)', d.status === 'ASSIGNED', d.status)
  // 13-14. provider starts and uploads the final output (UI)
  const prov = await page('provider', process.env.STAFF_PROVIDER, QA_PW)
  await prov.goto(`${BASE}/provider/orders/${id}`); await settle(prov, 1500)
  await prov.locator('#provider-status').selectOption('IN_PROGRESS')
  await prov.locator('button[type="submit"]', { hasText: 'تحديث الحالة' }).click(); await settle(prov, 1500)
  ;[, d] = await empApi(`/admin/orders/${id}/`)
  log('13 provider accepts/starts (UI)', d.status === 'IN_PROGRESS', d.status)
  await prov.reload(); await settle(prov, 1500)
  await prov.locator('input[type=file]').last().setInputFiles(FINAL)
  await prov.locator('button[type="submit"]', { hasText: 'رفع النتيجة' }).click(); await settle(prov, 2000)
  ;[, d] = await empApi(`/admin/orders/${id}/`)
  const finalDoc = d.documents.find((x) => x.is_final_document)
  log('14 provider uploads final output (UI)', d.status === 'READY_FOR_DELIVERY' && Boolean(finalDoc), { status: d.status, final: finalDoc?.id })
  // 15-16. employee approves the final result and completes (UI)
  await emp.goto(`${BASE}/employee/documents/verify`); await settle(emp, 2000)
  const item = emp.locator('button', { hasText: number }).first()
  if (await item.count()) { await item.click(); await settle(emp, 2000) }
  await emp.locator('button', { hasText: 'اعتماد الوثيقة' }).first().click(); await settle(emp, 2000)
  await emp.goto(`${BASE}/employee/orders/${id}`); await settle(emp, 2000)
  await emp.locator('button', { hasText: 'اعتماد النتيجة وإكمال الطلب' }).first().click(); await settle(emp, 800)
  await emp.locator('button', { hasText: 'نعم، أكمل الطلب' }).first().click(); await settle(emp, 2000)
  ;[, d] = await empApi(`/admin/orders/${id}/`)
  log('15-16 approval + completed order (UI)', d.status === 'COMPLETED', d.status)
  // 17. customer notification
  const [, notes] = await custApi('/notifications/')
  log('17 completion notification', (notes.results || notes).some((n) => n.order_number === number && n.template_key === 'order_completed'), 'order_completed')
  // 18. final download, bytes compared with the provider upload
  await cust.goto(`${BASE}/customer/orders/${id}`); await settle(cust, 1500)
  const card = cust.locator('li, article, div', { hasText: /النتيجة النهائية/ }).filter({ has: cust.locator('button', { hasText: /تنزيل/ }) }).last()
  const [dl] = await Promise.all([cust.waitForEvent('download', { timeout: 20000 }).catch(() => null), card.locator('button', { hasText: /تنزيل/ }).first().click()])
  const got = dl ? fs.readFileSync(await dl.path()) : Buffer.alloc(0)
  const sameBytes = Buffer.compare(got, fs.readFileSync(FINAL)) === 0
  await snap(cust, 'RJ18-customer-completed')
  log('18 final download bytes == provider upload', sameBytes, { name: dl?.suggestedFilename(), bytes: got.length })
  // 19. re-login
  const c2 = await ctx(browser, { lang: 'ar' }); const cust2 = await c2.newPage(); watch(cust2)
  await uiLogin(cust2, BASE, email, password); await cust2.goto(`${BASE}/customer/orders/${id}`); await settle(cust2, 1500)
  log('19 re-login keeps COMPLETED', /مكتمل/.test(await cust2.evaluate(() => document.body.innerText)), '')
  // 20. no duplicates
  const [, fin] = await empApi(`/admin/orders/${id}/`)
  const tl = fin.status_logs.map((x) => `${x.old_status}->${x.new_status}`)
  const [, n2] = await custApi('/notifications/')
  const mineN = (n2.results || n2).filter((n) => n.order_number === number).map((n) => n.context_data?.dedupe_key || `${n.template_key}#${n.id}`)
  const [, list] = await custApi('/customer/orders/')
  const sameOrder = (list.results || list).filter((o) => o.order_number === number).length
  log('20 no duplicate order/transition/notification', sameOrder === 1 && new Set(tl).size === tl.length && new Set(mineN).size === mineN.length, { transitions: tl, notifications: mineN })
} catch (e) { log('EXCEPTION', false, String(e).slice(0, 500)); for (const [r, p] of Object.entries(pages)) await snap(p, 'RJ-ERROR-' + r).catch(() => {}) }
out('REAL-CATALOGUE-JOURNEY-results.json', { service: SLUG, id, number, steps })
await browser.close()
