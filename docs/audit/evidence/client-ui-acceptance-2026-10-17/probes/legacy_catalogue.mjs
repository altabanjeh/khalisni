// Real 38-service catalogue (migrated copy of the legacy DB) in the browser:
// business-service form submittability, parcel/basin gate, fee display, admin catalogue screens.
import { launch, ctx, watch, settle, snap, WEB, QA_PW, uiLogin, out } from './pw.mjs'
const BASE = WEB.A, API = process.env.API_A
const CUSTOMER = 'acceptance-legacy-customer@example.org', ADMIN = 'acceptance-legacy-admin@example.org'
const res = {}
const browser = await launch()

async function selectsInfo(p) {
  return p.evaluate(() => [...document.querySelectorAll('main select, form select')].filter((s) => s.offsetParent).map((s) => ({
    label: (document.querySelector(`label[for="${s.id}"]`)?.innerText || s.getAttribute('aria-label') || s.name || '').trim().slice(0, 60),
    required: s.required || s.getAttribute('aria-required') === 'true',
    options: [...s.options].map((o) => o.text.trim()).slice(0, 6), realOptions: [...s.options].filter((o) => o.value).length,
  })))
}

try {
  const c = await ctx(browser, { lang: 'ar', width: 1440 }); const p = await c.newPage(); watch(p)
  await uiLogin(p, BASE, CUSTOMER, QA_PW)
  for (const [key, sid] of [['business_company_registration', 12], ['business_trade_name_registration', 17], ['request-cadastral-map', 22], ['request-land-survey', 30]]) {
    await p.goto(`${BASE}/customer/orders/new?service=${sid}`); await settle(p, 1500)
    const next = () => p.locator('button', { hasText: /^التالي$/ }).first()
    for (let i = 0; i < 4 && !(await p.locator('input[name="full_name"]').isVisible().catch(() => false)); i++) { await next().click().catch(() => {}); await settle(p, 500) }
    await p.locator('input[name="full_name"]').fill('عميل قبول').catch(() => {})
    await p.locator('input[name="phone"]').fill('0791111999').catch(() => {})
    await p.locator('input[name="city"]').fill('عمّان').catch(() => {})
    const selects = await selectsInfo(p)
    const entry = { selects, emptyRequiredSelects: selects.filter((s) => s.required && s.realOptions === 0).map((s) => s.label) }
    if (key === 'request-cadastral-map') {
      const gate = p.locator('select').filter({ has: p.locator('option', { hasText: 'نعم' }) }).first()
      entry.gateOptions = await gate.locator('option').allInnerTexts().catch(() => [])
      const parcelBefore = await p.getByText(/رقم القطعة/).count()
      await gate.selectOption({ label: 'نعم' }).catch(() => {}); await settle(p, 300)
      const parcelAfterYes = await p.getByText(/رقم القطعة/).count()
      entry.parcelGate = { parcelLabelsBefore: parcelBefore, parcelLabelsAfterYes: parcelAfterYes }
    }
    // fill every visible text input/textarea that is empty so only select-related blocks remain
    await p.evaluate(() => {
      for (const el of document.querySelectorAll('main input[type=text], main input:not([type]), main textarea, main input[type=number]')) {
        if (el.offsetParent && !el.value) { const set = Object.getOwnPropertyDescriptor(el.__proto__, 'value').set; set.call(el, el.type === 'number' ? '12' : 'قيمة اختبار'); el.dispatchEvent(new Event('input', { bubbles: true })) }
      }
    })
    for (const s of await p.locator('main select').all()) {
      const opts = await s.locator('option').evaluateAll((os) => os.filter((o) => o.value).map((o) => o.value))
      if (opts.length && !(await s.inputValue())) await s.selectOption(opts[0]).catch(() => {})
    }
    await snap(p, `L-${key}-form`)
    await next().click().catch(() => {}); await settle(p, 800)
    const body = await p.evaluate(() => document.body.innerText)
    entry.advancedToDocuments = /المستندات المطلوبة|ارفع|رفع المستند/.test(body) && !(await p.locator('input[name="full_name"]').isVisible().catch(() => false))
    entry.errors = (body.match(/[^\n]*(مطلوب|اختر)[^\n]*/g) || []).filter((l) => l.length < 90).slice(0, 8)
    await snap(p, `L-${key}-after-next`)
    res[key] = entry
  }
  // public pages
  const a = await ctx(browser, { lang: 'ar', width: 1440 }); const pub = await a.newPage(); watch(pub)
  for (const slug of ['passport-renewal', 'business_company_registration', 'request-cadastral-map']) {
    await pub.goto(`${BASE}/services/${slug}`); await settle(pub, 1200)
    const info = await snap(pub, `L-public-${slug}`)
    res[`public-${slug}`] = { notFound: /غير موجودة|لم يتم العثور|404/.test(info.text), duration: (info.text.match(/المدة المتوقعة[^\n]*/g) || []).slice(0, 2), fees: (info.text.match(/[^\n]*د\.أ[^\n]*/g) || []).slice(0, 5), priceNote: (info.text.match(/يتم تأكيد الرسوم[^\n]*/g) || []).length }
  }
  // fixed price visible service: find via API
  const list = await (await fetch(API + '/services/?page_size=100')).json()
  const services = list.results || list
  const fixed = services.filter((s) => s.price_type === 'fixed').slice(0, 2)
  for (const s of fixed) {
    await pub.goto(`${BASE}/services/${s.slug}`); await settle(pub, 1200)
    const info = await snap(pub, `L-public-fixed-${s.slug}`)
    res[`public-fixed-${s.slug}`] = { api: { total: s.total_price ?? s.total_fee, gov: s.government_fee, svc: s.service_fee, base: s.base_price }, fees: (info.text.match(/[^\n]*(د\.أ|الرسوم|رسوم)[^\n]*/g) || []).slice(0, 8) }
  }
  await pub.goto(`${BASE}/services`); await settle(pub, 1500)
  const sInfo = await snap(pub, 'L-public-services')
  res.publicServicesQuestionMarks = /\?\?\?/.test(sInfo.text)
  // admin screens
  const ac = await ctx(browser, { lang: 'ar', width: 1440 }); const ad = await ac.newPage(); watch(ad)
  await uiLogin(ad, BASE, ADMIN, QA_PW)
  await ad.goto(`${BASE}/admin/services`); await settle(ad, 2000)
  const as = await snap(ad, 'L-admin-services')
  res.adminServices = { counts: (as.text.match(/[^\n]*(إجمالي|نشطة|منشورة|ظاهرة)[^\n]*\n?[^\n]*/g) || []).slice(0, 8), pagination: (as.text.match(/عرض \d+[^\n]*/g) || []).slice(0, 2), questionMarks: (as.text.match(/\?{3,}/g) || []).length }
  await ad.goto(`${BASE}/admin/rules`); await settle(ad, 2000)
  const ar = await snap(ad, 'L-admin-rules')
  res.adminRules = { mojibake: (ar.text.match(/[ÙØ][^\s]{1,6}/g) || []).slice(0, 6) }
  await ad.goto(`${BASE}/admin/users`); await settle(ad, 2000)
  const au = await snap(ad, 'L-admin-users')
  res.adminUsersDebugAccounts = (au.text.match(/[\w.-]*debug[\w.-]*@[\w.]+/g) || []).slice(0, 6)
} catch (e) { res.error = String(e).slice(0, 400) }
out('LEGACY-CATALOGUE-results.json', res); console.log(JSON.stringify(res, null, 1))
await browser.close()
