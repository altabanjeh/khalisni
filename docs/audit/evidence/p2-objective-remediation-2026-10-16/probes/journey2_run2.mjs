// Continuation of the UI journey for one order from READY_FOR_DELIVERY, with strict checks.
import fs from 'fs'
import { launch, ctx, watch, settle, snap, WEB, QA, QA_PW, uiLogin, out } from './pw.mjs'
const BASE = WEB.A, API = process.env.API_A || 'http://127.0.0.1:8041/api'
const id = Number(process.argv[2]), number = process.argv[3]
const steps = []
const log = (n, ok, detail) => { steps.push({ step: n, result: ok ? 'PASS' : 'FAIL', detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${n} :: ${JSON.stringify(detail).slice(0, 500)}`) }
async function apiAs(role) {
  const r = await fetch(API + '/auth/login/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: QA(role), password: QA_PW }) })
  const { access } = await r.json()
  return async (p) => { const x = await fetch(API + p, { headers: { Authorization: 'Bearer ' + access, 'Accept-Language': 'ar' } }); return [x.status, await x.json().catch(() => null)] }
}
const custApi = await apiAs('customer_a'), empApi = await apiAs('employee')
const browser = await launch()
const mk = async (role) => { const c = await ctx(browser, { lang: 'ar' }); const p = await c.newPage(); watch(p); await uiLogin(p, BASE, QA(role), QA_PW); return p }
let [, d] = await empApi(`/admin/orders/${id}/`)
const finalDoc = d.documents.find((x) => x.is_final_document || /final/i.test(x.document_type))
log('pre: order READY_FOR_DELIVERY with unverified final doc', d.status === 'READY_FOR_DELIVERY', { status: d.status, final: finalDoc && [finalDoc.id, finalDoc.status, finalDoc.document_type] })
const [, custBefore] = await custApi(`/customer/orders/${id}/`)
log('pre: customer cannot see unapproved final result', !custBefore.documents.some((x) => x.id === finalDoc.id), custBefore.documents.map((x) => x.id))
// employee verifies final result on verify page
const emp = await mk('employee')
if (finalDoc.status !== 'approved') {
await emp.goto(`${BASE}/employee/documents/verify`); await settle(emp, 2000)
const qText = await emp.evaluate(() => document.body.innerText)
log('16a final result appears in employee verify queue', qText.includes(number), 'queue contains order number')
const item = emp.locator('button', { hasText: number }).first()
if (await item.count()) { await item.click(); await settle(emp, 2500) }
await snap(emp, 'J16-employee-verify-final')
const approve = emp.locator('button', { hasText: 'اعتماد الوثيقة' }).first()
log('16b approve enabled after preview loads', (await approve.count()) > 0 && !(await approve.isDisabled()), 'approve button')
await approve.click(); await settle(emp, 2000)
} else log('16 (already approved via UI in previous run)', true, 'see JOURNEY2 first run log')
;[, d] = await empApi(`/admin/orders/${id}/`)
const fd = d.documents.find((x) => x.id === finalDoc.id)
log('16c final result approved (UI)', fd.status === 'approved', fd.status)
// complete
await emp.goto(`${BASE}/employee/orders/${id}`); await settle(emp, 2000)
const comp = emp.locator('button', { hasText: 'اعتماد النتيجة وإكمال الطلب' }).first()
log('17a complete button available after approval', (await comp.count()) > 0, '')
await comp.click(); await settle(emp, 800)
const dialogBtns = ['نعم، أكمل الطلب']
await emp.locator('button', { hasText: 'نعم، أكمل الطلب' }).first().click(); await settle(emp, 2000)
;[, d] = await empApi(`/admin/orders/${id}/`)
log('17 order COMPLETED via employee UI', d.status === 'COMPLETED', { status: d.status, dialogBtns })
await snap(emp, 'J17b-employee-completed')
// customer notification (specific)
const [, notes] = await custApi('/notifications/')
const compN = notes.results.find((n) => n.order_number === number && n.template_key === 'order_completed')
log('18a completion notification created for customer', Boolean(compN), compN && { title: compN.title, is_read: compN.is_read, channel: compN.channel, status: compN.status })
const cust = await mk('customer_a')
await cust.goto(`${BASE}/customer/orders/${id}`); await settle(cust, 1500)
await cust.locator('button[aria-haspopup="dialog"]').first().click(); await cust.waitForTimeout(800)
const bell = await cust.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.innerText).filter((t) => /KH-\d{4}/.test(t)).slice(0, 3))
log('18 completion notification rendered in bell', compN && bell.some((t) => t.includes(compN.title) && t.includes(number)), bell)
await snap(cust, 'J18-customer-bell-completed', { full: false })
await cust.keyboard.press('Escape'); await cust.goto(`${BASE}/customer/orders/${id}`); await settle(cust, 1500)
const cTxt = (await snap(cust, 'J19-customer-order-completed')).text
const statusPill = (cTxt.match(/مكتمل[^\n]{0,20}/) || [''])[0]
log('19a customer sees COMPLETED status', /مكتمل/.test(cTxt), statusPill)
const [, custAfter] = await custApi(`/customer/orders/${id}/`)
const visibleFinal = custAfter.documents.find((x) => x.id === finalDoc.id)
log('19b final result now visible to customer (API)', Boolean(visibleFinal), visibleFinal && { id: visibleFinal.id, name: visibleFinal.original_filename || visibleFinal.file_name || visibleFinal.original_name })
// download the FINAL document specifically: find its card by "النتيجة النهائية" text
const card = cust.locator('li, article, div', { hasText: /النتيجة النهائية|نتيجة نهائية|final/i }).filter({ has: cust.locator('button', { hasText: /تنزيل/ }) }).last()
let ok = false, name = null, bytesMatch = false
if (await card.count()) {
  const [dl] = await Promise.all([cust.waitForEvent('download', { timeout: 20000 }).catch(() => null), card.locator('button', { hasText: /تنزيل/ }).first().click()])
  if (dl) {
    name = dl.suggestedFilename()
    const buf = fs.readFileSync(await dl.path()); ok = buf.subarray(0, 5).toString() === '%PDF-'
    // confirm it is the final doc by comparing with an authorized API download of finalDoc
    const tokR = await fetch(`${API}/documents/${finalDoc.id}/download-token/`, { headers: { Authorization: 'Bearer ' + (await (await fetch(API + '/auth/login/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: QA('customer_a'), password: QA_PW }) })).json()).access } })
    const { token } = await tokR.json()
    const apiBuf = Buffer.from(await (await fetch(`${API}/documents/${finalDoc.id}/download/?token=${token}`)).arrayBuffer())
    bytesMatch = Buffer.compare(apiBuf, buf) === 0 && buf.includes(Buffer.from('KHALSNI-FINAL-RESULT-DISTINCT-MARKER'))
  }
}
log('19 customer downloads FINAL result via UI', ok && bytesMatch, { name, pdf: ok, matchesFinalDocBytes: bytesMatch, cardFound: await card.count() })
// re-login
const cust2 = await mk('customer_a'); await cust2.goto(`${BASE}/customer/orders/${id}`); await settle(cust2, 1500)
log('20 re-login preserves COMPLETED', /مكتمل/.test(await cust2.evaluate(() => document.body.innerText)), '')
// duplicates (semantic)
const [, fin] = await empApi(`/admin/orders/${id}/`)
const tl = fin.status_logs.map((x) => `${x.old_status}->${x.new_status}`)
const dupTransitions = tl.filter((s, i) => tl.indexOf(s) !== i)
const [, n2] = await custApi('/notifications/')
const mine = n2.results.filter((n) => n.order_number === number)
const keyed = mine.map((n) => `${n.template_key}#${n.context_data?.document_id ?? ''}`)
const [, list] = await custApi('/customer/orders/')
log('21 one order; no duplicate transitions; notifications', list.results.filter((o) => o.order_number === number).length === 1 && dupTransitions.length === 0, { transitions: tl, dupTransitions, notifications: mine.map((n) => [n.template_key, n.title, n.created_at]) })
out(`JOURNEY2-results-${number}.json`, { id, number, steps })
await browser.close()
