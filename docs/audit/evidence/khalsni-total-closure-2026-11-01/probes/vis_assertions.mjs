// Objective runtime checks for the CN-VIS rows that carry behaviour or a measurable
// property (loose-end closure 2026-11-02), on the migrated REAL catalogue copy:
//  CN-VIS-19 subtle hover: hovering a card lifts it by at most 8px or zooms its image
//            by at most 1.08, with a transition of at most 0.5s; with the OS setting
//            "reduce motion" the hover moves nothing.
//  CN-VIS-15 vertical spacing: no public section uses more than 96px (1440) / 64px (390)
//            of vertical padding on either side; page heights recorded.
//  CN-VIS-18 art direction: every category card image loads (no broken image; a category
//            without its own image shows the branded fallback) and all category images are
//            rendered in one aspect ratio (±5%).
//  CN-VIS-10 boxes in boxes: no card-like box sits more than two levels deep inside
//            other card-like boxes on /, /services and /login.
// CN-VIS-20 (overall impression) is judged on the screenshots only.
import { launch, ctx, watch, settle, snap, WEB, out } from './pw.mjs'

const BASE = WEB.A
const res = {}
const browser = await launch()

async function cardDepth(page) {
  return page.evaluate(() => {
    const isCard = (el) => {
      const cs = getComputedStyle(el)
      const bordered = ['Top', 'Right', 'Bottom', 'Left'].some((side) => parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none')
      const shadowed = cs.boxShadow && cs.boxShadow !== 'none'
      const radius = parseFloat(cs.borderTopLeftRadius) >= 8
      const filled = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent'
      const r = el.getBoundingClientRect()
      return (bordered || shadowed) && radius && filled && r.width > 40 && r.height > 24 && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A', 'IMG'].includes(el.tagName)
    }
    let max = 0
    let worst = null
    const main = document.querySelector('main') || document.body
    for (const el of main.querySelectorAll('*')) {
      if (!isCard(el) || !el.offsetParent) continue
      let depth = 1
      for (let p = el.parentElement; p && p !== main.parentElement; p = p.parentElement) if (isCard(p)) depth += 1
      if (depth > max) { max = depth; worst = (el.className || el.tagName).toString().slice(0, 80) }
    }
    return { max, worst }
  })
}

try {
  // CN-VIS-19 hover + reduced motion
  for (const motion of ['no-preference', 'reduce']) {
    const c = await ctx(browser, { lang: 'ar', width: 1440, height: 900 }); const p = await c.newPage(); watch(p)
    await p.emulateMedia({ reducedMotion: motion })
    await p.goto(`${BASE}/`); await settle(p, 1500)
    const card = p.locator('main a[href^="/services/"]').filter({ has: p.locator('img, .kh-cover') }).first()
    await card.scrollIntoViewIfNeeded()
    const measure = () => card.evaluate((el) => {
      const img = el.querySelector('img')
      const box = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      const parseScale = (t) => { if (!t || t === 'none') return 1; const m = t.match(/matrix\(([^)]+)\)/); return m ? parseFloat(m[1].split(',')[0]) : 1 }
      const durations = [cs.transitionDuration, img ? getComputedStyle(img).transitionDuration : '0s']
        .flatMap((d) => d.split(',')).map((d) => (d.trim().endsWith('ms') ? parseFloat(d) / 1000 : parseFloat(d) || 0))
      return { top: box.top, imgScale: img ? parseScale(getComputedStyle(img).transform) : 1, maxTransition: Math.max(...durations) }
    })
    const before = await measure()
    await card.hover(); await p.waitForTimeout(700)
    const after = await measure()
    await p.mouse.move(5, 5); await c.close()
    const lift = before.top - after.top
    res[`hover ${motion}`] = { liftPx: Math.round(lift * 10) / 10, imgScale: after.imgScale, maxTransitionS: Math.max(before.maxTransition, after.maxTransition) }
  }
  const h = res['hover no-preference'], r = res['hover reduce']
  res.CN_VIS_19 = {
    pass: (h.liftPx > 0 || h.imgScale > 1) && h.liftPx <= 8 && h.imgScale <= 1.08 && h.maxTransitionS <= 0.5
      && Math.abs(r.liftPx) < 0.5 && Math.abs(r.imgScale - 1) < 0.001,
    rule: 'hover moves the card by 0-8px or zooms its image by at most 1.08, transition <= 0.5s; reduce-motion: no movement',
  }

  // CN-VIS-15 spacing, CN-VIS-18 images, CN-VIS-10 nesting
  const spacing = {}, nesting = {}, heights = {}
  let images = null
  for (const width of [1440, 390]) {
    const c = await ctx(browser, { lang: 'ar', width, height: width > 500 ? 900 : 844, mobile: width < 500 }); const p = await c.newPage(); watch(p)
    // In production nginx serves /media/ from the backend (frontend/nginx.conf); the
    // local static preview does not, so the same mapping is applied here.
    if (process.env.MEDIA_ORIGIN) await c.route('**/media/**', async (route) => {
      const url = new URL(route.request().url())
      route.fulfill({ response: await c.request.get(process.env.MEDIA_ORIGIN + url.pathname + url.search) })
    })
    for (const path of ['/', '/services', '/login']) {
      await p.goto(BASE + path); await settle(p, 1500)
      const pad = await p.evaluate(() => [...document.querySelectorAll('main section, main > div > section, main > section, main > div')]
        .filter((el) => el.offsetParent)
        .map((el) => { const cs = getComputedStyle(el); return Math.max(parseFloat(cs.paddingTop), parseFloat(cs.paddingBottom)) }))
      spacing[`${path} ${width}`] = Math.max(0, ...pad)
      heights[`${path} ${width}`] = await p.evaluate(() => document.documentElement.scrollHeight)
      nesting[`${path} ${width}`] = await cardDepth(p)
      if (path === '/' && width === 1440) {
        await snap(p, 'VIS-home-ar-1440')
        images = await p.evaluate(async () => {
          const imgs = [...document.querySelectorAll('main a[href*="category"] img, main [data-testid*="world"] img, main a[href^="/services?category"] img')]
          for (const img of imgs) {
            img.scrollIntoView({ block: 'center' })
            // Lazy images: wait until each one has really loaded (or failed).
            await Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 5000))])
          }
          return imgs.map((img) => {
            const box = img.getBoundingClientRect()
            return { loaded: img.complete && img.naturalWidth > 0, ratio: box.height ? box.width / box.height : 0, src: img.currentSrc.split('/').pop().split('?')[0] }
          })
        })
      }
    }
    await c.close()
  }
  const limit = (key) => (key.endsWith('390') ? 64 : 96)
  res.spacing = spacing
  res.pageHeights = heights
  res.CN_VIS_15 = { pass: Object.entries(spacing).every(([k, v]) => v <= limit(k)), rule: 'section vertical padding <= 96px (1440) / 64px (390)' }
  const ratios = (images || []).filter((i) => i.loaded).map((i) => i.ratio)
  const meanRatio = ratios.reduce((a, b) => a + b, 0) / (ratios.length || 1)
  res.categoryImages = images
  res.CN_VIS_18 = {
    pass: Boolean(images && images.length >= 8 && images.every((i) => i.loaded) && ratios.every((x) => Math.abs(x - meanRatio) / meanRatio <= 0.05)),
    rule: 'every category image loads; one aspect ratio (±5%)', count: images?.length ?? 0,
  }
  res.nesting = nesting
  res.CN_VIS_10 = { pass: Object.values(nesting).every((n) => n.max <= 2), rule: 'card-like boxes nest at most two levels' }
} catch (e) { res.error = String(e).slice(0, 400) }
out('VIS-ASSERTIONS-results.json', res)
console.log(JSON.stringify(res, null, 1).slice(0, 4000))
await browser.close()
