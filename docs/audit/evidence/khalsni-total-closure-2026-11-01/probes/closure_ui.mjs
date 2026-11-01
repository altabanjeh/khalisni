// Total closure UI checks on the migrated REAL catalogue (AR/EN, 1440/390):
// CN-ACT-04 category worlds, B10-10 total-only pricing, D06 legal pages + draft banner,
// D05 contact state, B10-3 parcel gate on a newly gated land service, brand variants, overflow.
import { launch, ctx, watch, settle, snap, WEB, QA_PW, out } from './pw.mjs'
const BASE = WEB.A, API = process.env.API_A
const res = {}
const CLIENT_WORLDS = ['العقارات والأراضي', 'خدمات الأعمال', 'الضرائب والرسوم', 'المركبات والنقل', 'العمالة والإقامة', 'الوثائق والتصديقات', 'الخدمات الدولية', 'طلب خاص']
const browser = await launch()
try {
  for (const [lang, width] of [['ar', 1440], ['ar', 390], ['en', 1440], ['en', 390]]) {
    const c = await ctx(browser, { lang, width, height: width > 500 ? 900 : 844, mobile: width < 500 }); const p = await c.newPage(); watch(p)
    const key = `${lang}-${width}`
    await p.goto(`${BASE}/`); await settle(p, 2000)
    const home = await snap(p, `TC-home-${key}`)
    res[`home ${key}`] = {
      h1: await p.locator('h1').first().innerText(),
      worldsFound: lang === 'ar' ? CLIENT_WORLDS.filter((w) => home.text.includes(w)).length : null,
      specialRequestLink: await p.locator('a[href*="special-request"], button:has-text("طلب خاص"), a:has-text("Special")').count(),
      brandVariants: (home.text.match(/خلّصني|Khalisni(?![.@])/g) || []).length,
      overflowX: home.overflowX, consoleErrors: p._audit.console.length,
    }
    await p.goto(`${BASE}/services/tax-clearance`); await settle(p, 1500)
    const fixed = await snap(p, `TC-fixed-price-${key}`)
    res[`fixed price ${key}`] = { amounts: (fixed.text.match(/[\d٠-٩][\d٠-٩٫.,]*\s*(د\.أ|JOD)|JOD\s*[\d.]+/g) || []).slice(0, 6), overflowX: fixed.overflowX }
    for (const kind of ['privacy', 'terms']) {
      await p.goto(`${BASE}/${kind}`); await settle(p, 1200)
      const legal = await snap(p, `TC-${kind}-${key}`)
      res[`${kind} ${key}`] = { draftBanner: /مسودة — تتطلب موافقة|Draft — requires owner\/legal approval/.test(legal.text), textLength: legal.text.length, overflowX: legal.overflowX }
    }
    await p.goto(`${BASE}/contact`); await settle(p, 1200)
    const contact = await snap(p, `TC-contact-${key}`)
    res[`contact ${key}`] = { notPublished: /معلومات التواصل غير منشورة حالياً|Contact details are not published yet/.test(contact.text), localEmail: /\.local/.test(contact.text), formPresent: await p.locator('form').count() }
    await c.close()
  }
  // Parcel gate on a land service that was NOT gated before (B10-3 extension)
  const service = await (await fetch(`${API}/services/request-property-ownership-transfer/`)).json()
  const gate = (service.required_information_schema || []).find((f) => f.label_ar === 'هل تعرف رقم القطعة والحوض؟')
  const parcel = (service.required_information_schema || []).find((f) => f.label_ar === 'رقم القطعة')
  res.parcelGateSchema = { gate: gate && { type: gate.type, options: (gate.options || []).map((o) => o.value) }, parcelVisibleWhen: parcel?.visible_when }
  // Public pricing payloads: no breakdown that does not add up
  const list = await (await fetch(`${API}/services/`)).json()
  const bad = (list.results || list).filter((s) => {
    const pr = s.pricing || {}
    if (pr.government_fee == null && pr.company_fee == null) return false
    return Number(pr.government_fee || 0) + Number(pr.company_fee || 0) !== Number(pr.total_price || 0)
  }).map((s) => s.slug)
  res.pricingInvariantViolations = bad
  const cats = await (await fetch(`${API}/public-site/service-categories/`)).json()
  res.publicCategories = (cats.results || cats).map((c) => [c.slug, c.name_ar, c.services_count ?? c.service_count ?? null])
} catch (e) { res.error = String(e).slice(0, 400) }
out('CLOSURE-UI-results.json', res); console.log(JSON.stringify(res, null, 1))
await browser.close()
