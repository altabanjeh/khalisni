// Real catalogue (migrated copy, services.0016 applied): every business service in the browser.
// Orderable ones must pass the details step and submit; incomplete ones must show the
// "not available online yet" notice instead of a form that cannot be submitted.
import path from 'path'
import { launch, ctx, watch, settle, snap, WEB, QA_PW, uiLogin, out, HERE } from './pw.mjs'
const BASE = WEB.A, API = process.env.API_A
const CUSTOMER = 'acceptance-legacy-customer@example.org'
const PDF = path.join(HERE, 'files', 'qa-valid.pdf')
const SERVICES = [
  [12, 'business_company_registration'], [13, 'business_company_information_amendment'], [14, 'business_company_add_activities'],
  [15, 'business_commercial_registration_certificate'], [16, 'business_trade_name_certificate'], [17, 'business_trade_name_registration'],
  [18, 'business_trademark_services'], [19, 'business_license_services'], [20, 'business_company_closure_liquidation'],
]
const results = {}
const browser = await launch()
const c = await ctx(browser, { lang: 'ar', width: 1440 }); const p = await c.newPage(); watch(p)
await uiLogin(p, BASE, CUSTOMER, QA_PW)
const next = () => p.locator('button', { hasText: /^التالي$/ }).first()

async function fillVisible() {
  await p.evaluate(() => {
    const set = (el, value) => { const proto = Object.getPrototypeOf(el); Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) }
    for (const el of document.querySelectorAll('main input, main textarea')) {
      if (!el.offsetParent || el.value || ['file', 'checkbox', 'radio', 'hidden'].includes(el.type)) continue
      if (el.type === 'date') set(el, '2026-11-01')
      else if (el.type === 'number') set(el, '12')
      else if (el.type === 'email') set(el, 'acceptance@example.org')
      else if (el.type === 'tel' || /phone/.test(el.name)) set(el, '0791111999')
      else set(el, 'قيمة اختبار قبول')
    }
  })
  for (const s of await p.locator('main select').all()) {
    if (!(await s.isVisible())) continue
    const opts = await s.locator('option').evaluateAll((os) => os.filter((o) => o.value).map((o) => o.value))
    if (opts.length && !(await s.inputValue())) await s.selectOption(opts[0])
  }
}

for (const [id, slug] of SERVICES) {
  const entry = {}
  const detail = await (await fetch(`${API}/services/${slug}/`)).json()
  entry.apiOrderable = detail.orderable
  entry.apiBlockers = (detail.order_blockers || []).map((b) => b.label_ar || b.key)
  await p.goto(`${BASE}/customer/orders/new?service=${id}`); await settle(p, 1500)
  const notice = await p.getByText('الطلب الإلكتروني لهذه الخدمة غير متاح حالياً.').count()
  entry.noticeShown = notice > 0
  entry.nextDisabled = await next().isDisabled().catch(() => null)
  if (!detail.orderable) {
    await snap(p, `B-${slug}-not-orderable`)
    await p.goto(`${BASE}/services/${slug}`); await settle(p, 1200)
    const pub = await snap(p, `B-${slug}-public`)
    entry.publicNotice = pub.text.includes('الطلب الإلكتروني لهذه الخدمة غير متاح حالياً')
    entry.publicCta = (pub.text.match(/إرسال طلب خاص/g) || []).length
    results[slug] = entry
    continue
  }
  for (let i = 0; i < 4 && !(await p.locator('input[name="full_name"]').isVisible().catch(() => false)); i++) { await next().click(); await settle(p, 500) }
  await p.locator('input[name="full_name"]').fill('عميل قبول')
  await p.locator('input[name="phone"]').fill('0791111999')
  await p.locator('input[name="city"]').fill('عمّان')
  await fillVisible()
  await snap(p, `B-${slug}-details`)
  await next().click(); await settle(p, 800)
  entry.passedDetailsStep = !(await p.locator('input[name="full_name"]').isVisible().catch(() => false))
  entry.detailsErrors = (await p.evaluate(() => document.body.innerText)).match(/[^\n]*مطلوب[^\n]*/g)?.filter((l) => l.length < 80).slice(0, 5) || []
  // documents step
  const files = p.locator('input[type=file]')
  for (let i = 0; i < await files.count(); i++) await files.nth(i).setInputFiles(PDF).catch(() => {})
  const consent = p.locator('input[name="consent"]')
  if (await consent.count()) await consent.check()
  await next().click(); await settle(p, 800)
  await snap(p, `B-${slug}-review`)
  await p.locator('button[type="submit"]', { hasText: 'إرسال الطلب' }).first().click(); await settle(p, 2500)
  const done = await snap(p, `B-${slug}-submitted`)
  entry.orderNumber = (done.text.match(/KH-\d{4}-\d{6}/) || [])[0] || null
  results[slug] = entry
}
out('BUSINESS-SERVICES-results.json', results); console.log(JSON.stringify(results, null, 1))
await browser.close()
