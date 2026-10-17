// Real catalogue in the browser after the remediation: durations (DEF-D02), land-survey
// duplicates (B10-2), parcel/basin gate in the UI and on the server (B10-3), admin rules
// labels (DEF-A02), Arabic server errors (D03).
import { launch, ctx, watch, settle, snap, WEB, QA_PW, uiLogin, out } from './pw.mjs'
const BASE = WEB.A, API = process.env.API_A
const res = {}
const browser = await launch()
try {
  // Public service pages: no "1 يوم" placeholder; the approved/source sentence only.
  for (const [lang, width] of [['ar', 1440], ['ar', 390], ['en', 1440]]) {
    const c = await ctx(browser, { lang, width, height: width > 500 ? 900 : 844, mobile: width < 500 }); const p = await c.newPage(); watch(p)
    for (const slug of ['business_commercial_registration_certificate', 'request-land-survey', 'request-cadastral-map']) {
      await p.goto(`${BASE}/services/${slug}`); await settle(p, 1200)
      const info = await snap(p, `C-public-${slug}-${lang}-${width}`)
      res[`public ${slug} ${lang} ${width}`] = {
        placeholderOneDay: /المدة المتوقعة: 1 يوم|Expected completion: 1 day/.test(info.text),
        durationText: (info.text.match(/[^\n]*(تُحدَّد مدة الإنجاز|حسب إجراءات|confirmed after)[^\n]*/g) || []).slice(0, 2),
        overflowX: info.overflowX,
      }
    }
    await p.goto(`${BASE}/services`); await settle(p, 1500)
    const list = await snap(p, `C-public-services-${lang}-${width}`)
    res[`services list ${lang} ${width}`] = { placeholderOneDayCount: (list.text.match(/المدة المتوقعة: 1 يوم|Expected completion: 1 days?/g) || []).length }
    await c.close()
  }
  // Customer forms
  const c = await ctx(browser, { lang: 'ar', width: 1440 }); const p = await c.newPage(); watch(p)
  await uiLogin(p, BASE, 'acceptance-legacy-customer@example.org', QA_PW)
  await p.goto(`${BASE}/customer/orders/new?service=30`); await settle(p, 1500)
  const next = () => p.locator('button', { hasText: /^التالي$/ }).first()
  for (let i = 0; i < 4 && !(await p.locator('input[name="full_name"]').isVisible().catch(() => false)); i++) { await next().click(); await settle(p, 500) }
  const survey = await snap(p, 'C-land-survey-form')
  res.landSurvey = {
    phoneLabels: (survey.text.match(/^(الهاتف|رقم الهاتف)/gm) || []),
    nameLabels: (survey.text.match(/^(الاسم|اسم مقدم الطلب)/gm) || []),
    purposeIsText: await p.locator('input[name^="service_info_field_225e3741b4"][type="text"], textarea[name^="service_info_field_225e3741b4"]').count(),
  }
  await p.goto(`${BASE}/customer/orders/new?service=22`); await settle(p, 1500)
  for (let i = 0; i < 4 && !(await p.locator('input[name="full_name"]').isVisible().catch(() => false)); i++) { await next().click(); await settle(p, 500) }
  const gate = p.locator('select').filter({ has: p.locator('option', { hasText: 'نعم' }) }).first()
  await gate.selectOption('yes'); await settle(p, 300)
  const parcelVisible = await p.getByText('رقم القطعة', { exact: true }).count()
  await gate.selectOption('no'); await settle(p, 300)
  const parcelHidden = await p.getByText('رقم القطعة', { exact: true }).count()
  const either = await p.locator('select').filter({ has: p.locator('option', { hasText: 'لمفوض عنه' }) }).count()
  await snap(p, 'C-cadastral-form')
  res.cadastralGate = { parcelLabelWhenYes: parcelVisible, parcelLabelWhenNo: parcelHidden, ownerOrDelegateIsChoice: either }
  // Server-side: the same gate enforced on the API (Arabic messages).
  const login = await (await fetch(`${API}/auth/login/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'acceptance-legacy-customer@example.org', password: QA_PW }) })).json()
  const service = await (await fetch(`${API}/services/request-cadastral-map/`)).json()
  const gateKey = service.required_information_schema.find((f) => f.label_ar === 'هل تعرف رقم القطعة والحوض؟')?.key
  const post = async (answers) => {
    const r = await fetch(`${API}/orders/`, { method: 'POST', headers: { Authorization: `Bearer ${login.access}`, 'Content-Type': 'application/json', 'Accept-Language': 'ar' },
      body: JSON.stringify({ service: service.id, full_name: 'عميل قبول', phone: '0791111999', city: 'عمّان', consent: true, service_answers: answers }) })
    return [r.status, await r.json()]
  }
  const [s1, b1] = await post({ [gateKey]: 'yes' })
  res.serverGate = { yesWithoutParcel: s1, messages: b1.service_answers, notOption: (await post({ [gateKey]: 'maybe' }))[1].service_answers }
  await c.close()
  // Admin rules page labels
  const a = await ctx(browser, { lang: 'ar', width: 1440 }); const ad = await a.newPage(); watch(ad)
  await uiLogin(ad, BASE, 'acceptance-legacy-admin@example.org', QA_PW)
  await ad.goto(`${BASE}/admin/rules`); await settle(ad, 2000)
  for (const tab of await ad.locator('button', { hasText: 'المستندات المطلوبة' }).all()) { await tab.click().catch(() => {}); await settle(ad, 1500); break }
  const rules = await snap(ad, 'C-admin-rules-documents')
  res.adminRules = { mojibake: (rules.text.match(/[ÙØ][\S]{1,6}/g) || []).slice(0, 5), fileTypeLabels: (rules.text.match(/ملف PDF|صورة JPG|ملف Word/g) || []).slice(0, 3) }
  await ad.goto(`${BASE}/admin/services`); await settle(ad, 2000)
  const services = await snap(ad, 'C-admin-services')
  res.adminServices = { counts: (services.text.match(/(إجمالي الخدمات|نشطة|منشورة للعامة)\n\d+/g) || []) }
  await a.close()
} catch (e) { res.error = String(e).slice(0, 400) }
out('CATALOGUE-UI-results.json', res); console.log(JSON.stringify(res, null, 1))
await browser.close()
