// Journey leg 0: a new customer registers through the UI, logs in, browses the catalogue,
// opens a service and reaches the request wizard. The password is generated per run and never written out.
import crypto from 'crypto'
import { launch, ctx, watch, settle, snap, WEB, uiLogin, out } from './pw.mjs'
const BASE = WEB.A
const steps = []
const log = (n, ok, detail) => { steps.push({ step: n, result: ok ? 'PASS' : 'FAIL', detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${n} :: ${JSON.stringify(detail).slice(0, 300)}`) }
const email = `acceptance-${Date.now()}@example.org`
const password = `Acc-${crypto.randomBytes(6).toString('hex')}9!`
const browser = await launch()
try {
  for (const [lang, width, mobile] of [['ar', 1440, false], ['en', 390, true]]) {
    const c = await ctx(browser, { lang, width, height: mobile ? 844 : 900, mobile })
    const p = await c.newPage(); watch(p)
    await p.goto(`${BASE}/register`); await settle(p, 600)
    const addr = lang + '-' + email
    await p.locator('#reg-full-name').fill(lang === 'ar' ? 'عميل قبول' : 'Acceptance Customer')
    await p.locator('input[name="phone"]').fill(lang === 'ar' ? '0791234561' : '0791234562')
    await p.locator('#reg-email').fill(addr)
    await p.locator('#reg-password').fill(password)
    await snap(p, `R01-register-filled-${lang}-${width}`)
    await p.locator('form button[type="submit"]').first().click(); await settle(p, 1500)
    log(`R1 register (${lang} ${width})`, p.url().includes('/login'), p.url().replace(BASE, ''))
    await snap(p, `R02-after-register-${lang}-${width}`)
    await uiLogin(p, BASE, addr, password)
    log(`R2 login lands in customer portal (${lang})`, p.url().includes('/customer'), p.url().replace(BASE, ''))
    await snap(p, `R03-customer-home-${lang}-${width}`)
    await p.goto(`${BASE}/services`); await settle(p, 1200)
    const card = p.locator('a[href^="/services/"]:not([href*="category"])').first()
    const href = await card.getAttribute('href')
    await p.goto(BASE + href); await settle(p, 1200)
    await snap(p, `R04-service-detail-${lang}-${width}`)
    const start = p.locator('a, button', { hasText: lang === 'ar' ? /ابدأ|قدّم|تقديم|طلب الخدمة/ : /Start|Apply|Request/ }).first()
    const startText = (await start.innerText().catch(() => '')).trim()
    await start.click().catch(() => {}); await settle(p, 1500)
    log(`R3 browse -> service -> start request (${lang})`, /\/customer\/orders\/new|\/create-order/.test(p.url()), { href, startText, url: p.url().replace(BASE, '') })
    await snap(p, `R05-wizard-entry-${lang}-${width}`)
    log(`R4 no console errors (${lang})`, p._audit.console.length === 0, p._audit.console.slice(0, 5))
    await c.close()
  }
} catch (e) { log('EXCEPTION', false, String(e).slice(0, 400)) }
out('REGISTER-results.json', { steps })
await browser.close()
