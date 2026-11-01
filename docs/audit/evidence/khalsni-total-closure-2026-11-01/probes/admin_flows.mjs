// Admin runtime flows on the migrated REAL catalogue copy (rows CN-ACT-12, CN-VIS-06, PROP-WEB-02/04,
// CE7/SD, CN-OPS-04, FR7): service edit, category image upload, soft delete + restore with the
// delete guard, manual payment record, order rejection with a customer-visible reason, support scope.
// Disposable accounts; passwords from the environment, never written out.
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { launch, ctx, watch, settle, snap, WEB, QA_PW, uiLogin, out, HERE } from './pw.mjs'

const BASE = WEB.A, API = process.env.API_A
const steps = []
const log = (n, ok, detail) => { steps.push({ step: n, result: ok ? 'PASS' : 'FAIL', detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${n} :: ${JSON.stringify(detail).slice(0, 300)}`) }
async function api(email, password) {
  const { access } = await (await fetch(`${API}/auth/login/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).json()
  return async (p, init = {}) => {
    const headers = { Authorization: 'Bearer ' + access, 'Accept-Language': 'ar', ...(init.headers || {}) }
    if (init.json !== undefined) { headers['Content-Type'] = 'application/json'; init = { ...init, body: JSON.stringify(init.json) } }
    const r = await fetch(API + p, { ...init, headers })
    return [r.status, await r.json().catch(() => null)]
  }
}
const browser = await launch()
try {
  const adm = await api(process.env.STAFF_ADMIN, QA_PW)
  // 1. edit a real service, check the public API, then restore the original value
  const [, services] = await adm('/admin/services/?page_size=200')
  const svc = (services.results || services).find((s) => s.slug === 'tax-clearance') || (services.results || services)[0]
  const original = svc.short_description_en || ''
  const [eStatus] = await adm(`/admin/services/${svc.id}/`, { method: 'PATCH', json: { short_description_en: 'Edited by the admin flow probe.' } })
  const pub = await (await fetch(`${API}/services/${svc.slug}/`)).json()
  await adm(`/admin/services/${svc.id}/`, { method: 'PATCH', json: { short_description_en: original } })
  log('1 admin edits a service; public API reflects it', eStatus === 200 && pub.short_description_en === 'Edited by the admin flow probe.', { service: svc.slug, eStatus })
  // 2. category image upload (multipart)
  const [, cats] = await adm('/admin/categories/?page_size=50')
  const cat = (cats.results || cats)[0]
  const form = new FormData()
  form.append('image', new Blob([fs.readFileSync('D:/ghassan/frontend/public/apple-touch-icon.png')], { type: 'image/png' }), 'probe-category.png')
  const login = await (await fetch(`${API}/auth/login/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.STAFF_ADMIN, password: QA_PW }) })).json()
  const up = await fetch(`${API}/admin/categories/${cat.id}/`, { method: 'PATCH', headers: { Authorization: 'Bearer ' + login.access }, body: form })
  const upBody = await up.json().catch(() => null)
  log('2 admin uploads a category image', up.status === 200 && Boolean(upBody?.image), { category: cat.slug, status: up.status, image: Boolean(upBody?.image), body: up.status === 200 ? '' : upBody })
  // 3. soft delete with the delete guard, deleted filter, restore
  const [, defs] = await adm('/admin/required-document-definitions/?page_size=200')
  const created = await adm('/admin/required-document-definitions/', { method: 'POST', json: { code: `probe_doc_${Date.now()}`, name_ar: `مستند تجريبي للمسبار ${Date.now()}`, name_en: `Probe document ${Date.now()}`, is_active: true } })
  const defId = created[1]?.id
  const [noPw] = await adm(`/admin/required-document-definitions/${defId}/`, { method: 'DELETE', json: { delete_reason: 'probe' } })
  const [del] = await adm(`/admin/required-document-definitions/${defId}/`, { method: 'DELETE', json: { delete_reason: 'تجربة الحذف المؤقت', delete_password: QA_PW } })
  const [, active] = await adm('/admin/required-document-definitions/?page_size=500')
  const [, withDeleted] = await adm('/admin/required-document-definitions/?include_deleted=1&page_size=500')
  const [res] = await adm(`/admin/required-document-definitions/${defId}/restore/`, { method: 'POST', json: {} })
  const [, after] = await adm('/admin/required-document-definitions/?page_size=500')
  const ids = (x) => (x?.results || x || []).map((d) => d.id)
  log('3 soft delete (guarded) + deleted filter + restore', created[0] === 201 && noPw === 400 && [200, 204].includes(del)
    && !ids(active).includes(defId) && ids(withDeleted).includes(defId) && res === 200 && ids(after).includes(defId),
    { created: created[0], createdBody: created[0] === 201 ? '' : created[1], withoutPassword: noPw, deleted: del, restored: res, definitionsBefore: ids(defs).length })
  // 4-6. disposable customer, order, manual payment, rejection with reason
  const email = `admin-flow-${Date.now()}@example.org`
  const password = `Af-${crypto.randomBytes(6).toString('hex')}9!`
  const phone = `079${crypto.randomInt(1000000, 9999999)}`
  const reg = await fetch(`${API}/auth/register/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name: 'عميل مسار الإدارة', email, phone, password }) })
  const cust = await api(email, password)
  const detail = await (await fetch(`${API}/services/${svc.slug}/`)).json()
  const orderForm = new FormData()
  for (const [k, v] of Object.entries({ service: svc.id, full_name: 'عميل مسار الإدارة', phone, city: 'عمّان', consent: 'true', form_duration_seconds: 75 })) orderForm.append(k, String(v))
  for (const doc of (detail.required_documents || []).filter((d) => d.is_required)) {
    orderForm.append('document_types', doc.document_type || doc.code)
    orderForm.append('documents', new Blob([fs.readFileSync(path.join(HERE, 'files', 'qa-valid.pdf'))], { type: 'application/pdf' }), 'qa-valid.pdf')
  }
  const custLogin = await (await fetch(`${API}/auth/login/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).json()
  const oRes = await fetch(`${API}/orders/`, { method: 'POST', headers: { Authorization: 'Bearer ' + custLogin.access, 'Accept-Language': 'ar' }, body: orderForm })
  const oStatus = oRes.status
  const order = await oRes.json().catch(() => null)
  log('4 disposable customer + order (form timing recorded)', reg.status === 201 && oStatus === 201, { reg: reg.status, oStatus, order: order?.order_number, detail: oStatus === 201 ? '' : order })
  const [pStatus, payment] = await adm('/admin/payments/', { method: 'POST', json: { order: order.id, payment_type: 'full', method: 'cash', amount: '10.00', currency: 'JOD', notes: 'دفعة نقدية مسجلة من الموظف' } })
  log('5 staff records a manual payment (B05: staff records only)', pStatus === 201, { pStatus, payment: payment?.payment_number || payment })
  const [custPay] = await cust('/customer/payments/', { method: 'POST', json: { order: order.id, amount: '1.00' } })
  log('5b customer cannot create payments (B05)', custPay === 405 || custPay === 403, { custPay })
  const reason = 'الوثائق المرفقة لا تخص هذه الخدمة.'
  const [rvStatus] = await adm(`/admin/orders/${order.id}/status/`, { method: 'PATCH', json: { status: 'UNDER_REVIEW' } })
  const [rjStatus, rejected] = await adm(`/admin/orders/${order.id}/reject/`, { method: 'POST', json: { reason } })
  const [, mine] = await cust(`/customer/orders/${order.id}/`)
  log('6 rejection with reason; owning customer sees it', rjStatus === 200 && mine.status === 'REJECTED' && JSON.stringify(mine).includes(reason), { rvStatus, rjStatus, status: mine.status, body: rjStatus === 200 ? '' : rejected })
  const pages = await ctx(browser, { lang: 'ar' }); const p = await pages.newPage(); watch(p)
  await uiLogin(p, BASE, email, password); await p.goto(`${BASE}/customer/orders/${order.id}`); await settle(p, 1500)
  const shot = await snap(p, 'AF06-customer-rejected-reason')
  log('6b reason shown in the customer UI', shot.text.includes(reason), '')
  const pa = await ctx(browser, { lang: 'ar' }); const ap = await pa.newPage(); watch(ap)
  await uiLogin(ap, BASE, process.env.STAFF_ADMIN, QA_PW)
  for (const [path, name] of [['/admin/services', 'AF-admin-services'], ['/admin/payments', 'AF-admin-payments'], ['/admin/reports', 'AF-admin-reports']]) {
    await ap.goto(BASE + path); await settle(ap, 1800); await snap(ap, name)
  }
  log('7 admin pages render (services, payments, reports)', ap._audit.console.length === 0, { consoleErrors: ap._audit.console.slice(0, 3) })
} catch (e) { log('EXCEPTION', false, String(e).slice(0, 500)) }
out('ADMIN-FLOWS-results.json', { steps })
await browser.close()
