import { launch, ctx, watch, settle, snap, WEB, out } from './pw.mjs'
const browser = await launch()
const R = {}
// ---------- U02 search placement (env B real catalog) ----------
for (const [w, h] of [[1366, 900], [390, 844]]) {
  const c = await ctx(browser, { width: w, height: h, lang: 'ar', mobile: w < 500 }); const p = await c.newPage(); watch(p)
  await p.goto(WEB.B + '/services'); await settle(p)
  const before = await p.evaluate(() => document.body.innerText.includes('التصنيفات'))
  const input = p.locator('input[type="search"], input[placeholder*="ابحث"]').first()
  await input.fill('تأسيس'); await p.keyboard.press('Enter').catch(() => {}); await settle(p, 1200)
  const m = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('a[href^="/services/"]')].filter((a) => !a.href.includes('/category/') && a.offsetParent)
    const titles = cards.map((a) => ({ href: a.getAttribute('href'), top: Math.round(a.getBoundingClientRect().top + scrollY) }))
    const catLinks = [...document.querySelectorAll('a[href*="/services/category/"], a[href*="category="]')].filter((a) => a.offsetParent).length
    const countText = (document.body.innerText.match(/[0-9٠-٩]+\s*(نتيجة|نتائج|خدمة)[^\n]*/g) || []).slice(0, 4)
    return { titles: [...new Map(titles.map((t) => [t.href, t])).values()], visibleCategoryLinks: catLinks, countText, vh: innerHeight }
  })
  const shot = await snap(p, `U02-search-tasis-${w}`, { full: false })
  R[`U02_${w}`] = { categoriesBefore: before, ...m, url: p.url(), overflowX: shot.overflowX }
  await input.fill('zzzqqq-nomatch'); await p.keyboard.press('Enter').catch(() => {}); await settle(p, 1000)
  await snap(p, `U02-zero-results-${w}`, { full: false })
  R[`U02_${w}`].zero = (await p.evaluate(() => document.body.innerText)).match(/(لا توجد|لم نجد|لا يوجد)[^\n]*/g)
  await input.fill(''); await p.keyboard.press('Enter').catch(() => {}); await settle(p, 1000)
  // clear via UI control if any
  R[`U02_${w}`].afterClear = await p.evaluate(() => ({ url: location.search, catLinks: [...document.querySelectorAll('a[href*="/services/category/"]')].filter((a) => a.offsetParent).length }))
  await c.close()
}
// ---------- U03 tracking ----------
const tracks = [['A', 'KH-2026-000005', '0798800103'], ['A', 'KH-2026-000001', '0790000002'], ['B', 'KH-2026-000001', '0790000002'], ['A', 'KH-2026-000008', '0798800103']]
for (const [env, num, phone] of tracks) {
  const c = await ctx(browser, { lang: 'ar' }); const p = await c.newPage(); watch(p)
  await p.goto(WEB[env] + '/track-order'); await settle(p)
  await p.fill('#track-order-number', num); await p.fill('#track-phone', phone)
  const [resp] = await Promise.all([p.waitForResponse((r) => r.url().includes('/orders/track/')), p.locator('form button[type="submit"]').first().click()])
  const body = await resp.json().catch(() => null)
  await settle(p, 800)
  const info = await snap(p, `U03-track-${env}-${num}`)
  const links = await p.evaluate(() => [...document.querySelectorAll('main a')].map((a) => `${a.innerText.trim()} -> ${a.getAttribute('href')}`))
  R[`U03_${env}_${num}`] = { apiStatus: resp.status(), apiKeys: body && Object.keys(body), apiBody: JSON.stringify(body).slice(0, 1500), links, hasCode: /legal_authorization|authorization-letter|client-audit-qa-202610-authorization/.test(info.text), latin: (info.text.match(/[A-Za-z][A-Za-z _-]{3,}/g) || []).filter((x) => !/English/.test(x)) }
  // follow the action link unauthenticated
  const act = p.locator('main a[href*="missing"], main a[href*="login"]').first()
  if (await act.count()) { await act.click(); await settle(p); R[`U03_${env}_${num}`].afterAction = p.url() }
  await c.close()
}
// ---------- U04 labels before submit, then empty submit ----------
for (const route of ['/register', '/contact']) {
  const c = await ctx(browser, { lang: 'ar' }); const p = await c.newPage(); watch(p)
  await p.goto(WEB.A + route); await settle(p)
  const labels = await p.evaluate(() => [...document.querySelectorAll('main label')].map((l) => l.innerText.replace(/\s+/g, ' ').trim()))
  const hints = await p.evaluate(() => [...document.querySelectorAll('main p, main small, main [id$="-hint"], main .text-xs')].map((e) => e.innerText.trim()).filter((t) => t && t.length < 160))
  await snap(p, `U04${route.replace('/', '-')}-before-submit`)
  await p.locator('main form button[type="submit"]').first().click(); await settle(p, 600)
  const errs = await p.evaluate(() => [...document.querySelectorAll('[role="alert"], .text-danger, [class*="text-red"], [class*="danger"]')].map((e) => e.innerText.trim()).filter(Boolean))
  await snap(p, `U04${route.replace('/', '-')}-empty-submit`)
  R['U04' + route] = { labels, hints: [...new Set(hints)].slice(0, 30), errorsAfterEmptySubmit: [...new Set(errs)] }
  await c.close()
}
out('UX-results.json', R)
console.log(JSON.stringify(R, null, 1))
await browser.close()
