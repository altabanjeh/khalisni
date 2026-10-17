// Keyboard / focus probe: tab order, visible focus, skip link, dialog focus handling, Escape,
// at 1440 AR, 1440 EN and 390 AR. Records what receives focus; judges only objective facts.
import { launch, ctx, watch, settle, snap, WEB, QA, QA_PW, uiLogin, out } from './pw.mjs'
const BASE = WEB.A
const results = []
const browser = await launch()

async function focusInfo(p) {
  return p.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return { tag: 'body' }
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none')
    return { tag: el.tagName.toLowerCase(), name: (el.getAttribute('aria-label') || el.innerText || el.name || el.id || '').trim().slice(0, 40), visibleRing: ring, inViewport: r.bottom > 0 && r.top < innerHeight, x: Math.round(r.x), y: Math.round(r.y) }
  })
}
async function tabWalk(p, n) {
  const seq = []
  for (let i = 0; i < n; i++) { await p.keyboard.press('Tab'); seq.push(await focusInfo(p)) }
  return seq
}

try {
  for (const [lang, width] of [['ar', 1440], ['en', 1440], ['ar', 390]]) {
    const c = await ctx(browser, { lang, width, height: width > 500 ? 900 : 844, mobile: width < 500 })
    const p = await c.newPage(); watch(p)
    // public home
    await p.goto(BASE + '/'); await settle(p, 800)
    const homeSeq = await tabWalk(p, 12)
    const firstIsSkip = /تخطي|skip/i.test(homeSeq[0]?.name || '')
    results.push({ where: `home ${lang} ${width}`, firstFocus: homeSeq[0], skipLinkFirst: firstIsSkip, noRing: homeSeq.filter((s) => s.tag !== 'body' && !s.visibleRing).map((s) => s.name), seq: homeSeq.map((s) => `${s.tag}:${s.name}`) })
    // login by keyboard only
    await p.goto(BASE + '/login'); await settle(p, 600)
    const loginSeq = await tabWalk(p, 10)
    results.push({ where: `login ${lang} ${width}`, seq: loginSeq.map((s) => `${s.tag}:${s.name}`), noRing: loginSeq.filter((s) => s.tag !== 'body' && !s.visibleRing).map((s) => s.name) })
    await p.locator('input[type=email]').first().focus()
    await p.keyboard.type(QA('customer_a')); await p.keyboard.press('Tab')
    await p.keyboard.type(QA_PW); await p.keyboard.press('Enter'); await settle(p, 1800)
    results.push({ where: `keyboard login ${lang} ${width}`, ok: p.url().includes('/customer'), url: p.url().replace(BASE, '') })
    // dashboard: open notifications with keyboard, check focus moves into/near panel, Escape closes
    const bell = p.locator('button[aria-haspopup="dialog"]').first()
    await bell.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(700)
    const afterOpen = await focusInfo(p)
    const dialogOpen = await p.locator('[role="dialog"]').count()
    await p.keyboard.press('Escape'); await p.waitForTimeout(400)
    const dialogAfterEsc = await p.locator('[role="dialog"]:visible').count()
    const focusAfterEsc = await focusInfo(p)
    results.push({ where: `notifications panel ${lang} ${width}`, dialogsOpen: dialogOpen, focusAfterOpen: afterOpen, visibleDialogsAfterEscape: dialogAfterEsc, focusAfterEscape: focusAfterEsc })
    // help/manual panel (desktop: inline button; mobile: inside "more" menu)
    if (width > 1500 || width === 1440) {
      const more = p.locator('button[aria-expanded]').filter({ hasNot: p.locator('[aria-haspopup]') })
      const help = p.locator('button', { hasText: lang === 'ar' ? 'الدليل' : /Manual|Guide/ }).first()
      if (!(await help.isVisible().catch(() => false))) { const m = p.locator('header button[aria-expanded]').nth(1); await m.click().catch(() => {}) }
      if (await help.isVisible().catch(() => false)) {
        await help.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(800)
        const inside = await p.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))
        const walk = await tabWalk(p, 15)
        const stayed = await p.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))
        await p.keyboard.press('Escape'); await p.waitForTimeout(400)
        results.push({ where: `help panel ${lang} ${width}`, focusMovedIntoDialog: inside, focusStillInsideAfter15Tabs: stayed, walk: walk.slice(0, 6).map((s) => `${s.tag}:${s.name}`), visibleDialogsAfterEscape: await p.locator('[role="dialog"]:visible').count() })
      }
    }
    // customer order wizard: tab through first step
    await p.goto(BASE + '/customer/orders/new'); await settle(p, 1200)
    const wiz = await tabWalk(p, 20)
    results.push({ where: `wizard ${lang} ${width}`, seq: wiz.map((s) => `${s.tag}:${s.name}`), noRing: wiz.filter((s) => s.tag !== 'body' && !s.visibleRing).map((s) => s.name), offscreen: wiz.filter((s) => s.tag !== 'body' && !s.inViewport).length })
    await c.close()
  }
} catch (e) { results.push({ error: String(e).slice(0, 400) }) }
out('KEYBOARD-results.json', results)
await browser.close()
