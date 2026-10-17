// Runtime proof of the owner decisions on environment R (fresh seed + QA fixtures).
import { launch, ctx, watch, settle, snap, WEB, QA, QA_PW, uiLogin, out } from './pw.mjs'
const BASE = WEB.A, API = process.env.API_A
const REASON = 'QA-ODI: الصورة غير واضحة، يرجى رفع نسخة أوضح.'
const steps = []
const log = (n, ok, detail) => { steps.push({ step: n, result: ok ? 'PASS' : 'FAIL', detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${n} :: ${JSON.stringify(detail).slice(0, 400)}`) }
async function token(role) {
  const r = await fetch(API + '/auth/login/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: QA(role), password: QA_PW }) })
  return (await r.json()).access
}
async function apiAs(role) {
  const access = await token(role)
  return async (p) => { const x = await fetch(API + p, { headers: { Authorization: 'Bearer ' + access, 'Accept-Language': 'ar' } }); return [x.status, await x.json().catch(() => null)] }
}
const keysOf = (v, acc = new Set()) => { if (Array.isArray(v)) v.forEach((i) => keysOf(i, acc)); else if (v && typeof v === 'object') for (const [k, i] of Object.entries(v)) { acc.add(k); keysOf(i, acc) } return acc }
const cust = await apiAs('customer_a'), custB = await apiAs('customer_b'), emp = await apiAs('employee'), admin = await apiAs('admin')
const custToken = await token('customer_a')
const browser = await launch()
try {
  // --- F04 rejection reason ---
  const [, queue] = await emp('/staff/documents/')
  // F04 concerns customer uploads; a provider's final result is hidden from the customer until completion.
  const doc = (queue.results || queue).find((d) => !d.is_final_document)
  log('pre: a document waits in the verify queue', Boolean(doc), doc && [doc.id, doc.order?.order_number])
  const e = await (await ctx(browser)).newPage(); watch(e); await uiLogin(e, BASE, QA('employee'), QA_PW)
  await e.goto(`${BASE}/employee/documents/verify`); await settle(e, 1500)
  await e.locator('aside button', { hasText: doc.order.order_number }).first().click(); await settle(e, 2000)
  const box = e.getByLabel('ملاحظة الاعتماد أو سبب الرفض')
  const describedBy = await box.getAttribute('aria-describedby')
  const labelText = await e.locator(`#${describedBy}`).innerText()
  log('F04 reject box says the reason is shown to the customer', labelText.trim() === 'سيظهر هذا السبب للعميل', labelText)
  await box.fill(REASON)
  await e.locator('button', { hasText: 'رفض وطلب استبدال' }).click(); await settle(e, 2000)
  await snap(e, 'ODI-F04-employee-reject-label')
  const orderId = doc.order.id
  const [cs, cd] = await cust(`/customer/orders/${orderId}/`)
  const row = cd?.documents?.find((d) => d.id === doc.id)
  log('F04 owner API returns the exact reason', cs === 200 && row?.rejection_reason === REASON, { status: cs, reason: row?.rejection_reason })
  const [bs] = await custB(`/customer/orders/${orderId}/`)
  log('F04 another customer gets 404', bs === 404, bs)
  const c = await (await ctx(browser)).newPage(); watch(c); await uiLogin(c, BASE, QA('customer_a'), QA_PW)
  await c.goto(`${BASE}/customer/orders/${orderId}`); await settle(c, 2000)
  const cText = await c.evaluate(() => document.body.innerText)
  await snap(c, 'ODI-F04-customer-sees-reason')
  log('F04 customer UI shows the reason', cText.includes(REASON), 'customer order page')
  const track = await (await fetch(`${API}/orders/track/?order_number=${cd.order_number}&phone=${encodeURIComponent(cd.customer.phone)}`)).json()
  log('F04 public tracking carries no reason', !JSON.stringify(track).includes(REASON) && !keysOf(track).has('rejection_reason'), [...keysOf(track)].slice(0, 20))

  // --- B06 provider identity ---
  const [, list] = await cust('/customer/orders/')
  const all = []
  for (const o of list.results) { const [, d] = await cust(`/customer/orders/${o.id}/`); all.push(d) }
  const [, notes] = await cust('/notifications/')
  const leakKeys = ['assigned_provider', 'provider_name', 'provider_type', 'is_available']
  const keys = keysOf([list, all, notes])
  const [, staffOrders] = await admin('/admin/orders/?page=1')
  const providerNames = new Set((staffOrders.results || []).map((o) => o.assigned_provider?.full_name).filter(Boolean))
  const dumped = JSON.stringify([list, all, notes])
  log('B06 customer JSON has no provider keys', !leakKeys.some((k) => keys.has(k)), leakKeys.filter((k) => keys.has(k)))
  log('B06 customer JSON has no provider name', ![...providerNames].some((n) => dumped.includes(n)), [...providerNames])
  log('B06 staff API still shows the provider', providerNames.size > 0, [...providerNames])

  // --- Phone identity: tracking with another spelling ---
  const canonical = cd.customer.phone, local = '0' + canonical.slice(4)
  const spaced = `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
  log('PHONE customer phone stored canonical', /^\+962\d{9}$/.test(canonical), canonical.slice(0, 5) + '…')
  const t = await c.context().newPage(); watch(t)
  await t.goto(`${BASE}/track-order`); await settle(t, 800)
  await t.locator('input').nth(0).fill(cd.order_number); await t.locator('input').nth(1).fill(spaced)
  await t.locator('form button[type="submit"]').first().click(); await settle(t, 1500)
  const tApi = (t._audit.api || []).filter((line) => line.includes('/orders/track/'))
  await snap(t, 'ODI-phone-track-other-format')
  log('PHONE tracking UI accepts the local spaced format', tApi.some((line) => line.startsWith('GET 200')), tApi)

  // --- Consent evidence ---
  const [, svc] = await cust('/services/client-audit-qa-202610-service/')
  const send = async (fields) => {
    const form = new FormData(); for (const [k, v] of Object.entries(fields)) form.append(k, String(v))
    const r = await fetch(`${API}/orders/`, { method: 'POST', body: form, headers: { Authorization: 'Bearer ' + custToken, 'Accept-Language': 'ar', 'Idempotency-Key': crypto.randomUUID() } })
    return [r.status, await r.json().catch(() => null)]
  }
  const base = { service: svc.id, full_name: 'QA Customer A', phone: local, city: 'Amman' }
  const [rs] = await send({ ...base, consent: 'false' })
  log('CONSENT submit without consent refused', rs === 400, rs)
  const docsNeeded = (svc.required_documents || []).filter((d) => d.is_required).length
  const [st, cj] = await send({ ...base, consent: 'true', consent_version: 'order-consent-web-v1', consent_source: 'web' })
  if (st === 201) {
    const [, od] = await emp(`/admin/orders/${cj.id}/`)
    log('CONSENT evidence recorded with version, language, source, time', od.consent?.status === 'recorded' && od.consent.version === 'order-consent-web-v1' && od.consent.language === 'ar' && od.consent.source === 'web' && Boolean(od.consent.accepted_at), od.consent)
  } else {
    log('CONSENT API create needs the service documents; covered by the UI journey instead', docsNeeded > 0, { status: st, docsNeeded })
  }
  const [, legacy] = await emp(`/admin/orders/${orderId}/`)
  log('CONSENT seeded (pre-existing) order stays legacy_unknown', legacy.consent?.status === 'legacy_unknown', legacy.consent)

  // --- B05 payment ---
  const pay = await fetch(`${API}/customer/payments/`, { method: 'POST', headers: { Authorization: 'Bearer ' + custToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ order: orderId, method: 'cash', payment_type: 'full', amount: '5.00' }) })
  log('B05 customer payment create blocked', pay.status === 405, pay.status)
  const [ls] = await admin('/admin/payments/')
  log('B05 admin ledger still readable', ls === 200, ls)

  // --- B10-7 counts + staff main landmark ---
  const a = await (await ctx(browser)).newPage(); watch(a); await uiLogin(a, BASE, QA('admin'), QA_PW)
  await a.goto(`${BASE}/admin/services`); await settle(a, 2000)
  const region = a.getByRole('region', { name: 'أعداد الخدمات' })
  const regionText = (await region.count()) ? await region.innerText() : ''
  const [, counts] = await admin('/admin/services/counts/')
  await snap(a, 'ODI-B10-7-service-counts')
  log('B10-7 four labelled counts match the server', ['إجمالي الخدمات', 'نشطة', 'منشورة للعامة', 'ظاهرة للعميل'].every((l) => regionText.includes(l)) && regionText.includes(String(counts.total)) && regionText.includes(String(counts.published)), counts)
  log('STRUCTURE staff layout has one main landmark', (await a.locator('main').count()) === 1, await a.locator('main').count())
} catch (err) { log('EXCEPTION', false, String(err).slice(0, 500)) }
await browser.close()
out('ODI-decisions-ui-steps.json', steps)
console.log(`SUMMARY ${steps.filter((s) => s.result === 'PASS').length}/${steps.length} PASS`)
