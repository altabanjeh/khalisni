import { launch, ctx, watch, settle, snap, WEB, out, latinRuns } from './pw.mjs'
const env = process.argv[2] || 'B'
const base = WEB[env]
const svc = env === 'B' ? 'business_company_registration' : 'property-registration-deed'
const browser = await launch()
const c = await ctx(browser, { width: 1366, height: 900, lang: 'ar' })
const page = await c.newPage(); watch(page)
const pages = { home: '/', services: '/services', service: '/services/' + svc, track: '/track-order', about: '/about', contact: '/contact', faq: '/faq', privacy: '/privacy', register: '/register', login: '/login', forgot: '/forgot-password' }
const res = {}
for (const [k, p] of Object.entries(pages)) {
  page._audit.console.length = 0
  await page.goto(base + p); await settle(page, 900)
  const info = await snap(page, `PUB-${env}-${k}-1366-ar`)
  res[k] = { title: info.title, dir: info.dir, overflowX: info.overflowX, console: [...page._audit.console], latin: latinRuns(info.text.replace(/\S+@\S+/g, '')) }
}
// footer + head metadata
res.meta = await page.evaluate(() => ({ title: document.title, metas: [...document.querySelectorAll('meta')].map((m) => (m.name || m.getAttribute('property') || '') + '=' + (m.content || '')).filter((x) => x.length > 1), footer: document.querySelector('footer')?.innerText || '', telLinks: [...document.querySelectorAll('a[href^="tel:"],a[href^="mailto:"],a[href*="wa.me"]')].map((a) => a.href) }))
out(`PUB-${env}-summary.json`, res)
console.log(JSON.stringify(res, null, 1).slice(0, 9000))
await browser.close()
