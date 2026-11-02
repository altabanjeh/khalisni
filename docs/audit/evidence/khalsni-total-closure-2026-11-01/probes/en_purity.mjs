// AR/EN purity on the migrated REAL catalogue: every public English page (home, services,
// each category, every service detail) must contain no Arabic text outside the language switcher.
// Arabic pages are checked for stray English words (brand/units/emails excluded by latinRuns callers).
import { launch, ctx, watch, settle, snap, WEB, out } from './pw.mjs'
const BASE = WEB.A, API = process.env.API_A
const res = { pages: 0, englishPagesWithArabic: [], consoleErrors: [] }
const ARABIC = /[؀-ۿ]+(?:\s+[؀-ۿ]+)*/g
const browser = await launch()
try {
  const list = await (await fetch(`${API}/services/?page_size=500`)).json()
  const services = (list.results || list).map((s) => s.slug)
  const cats = await (await fetch(`${API}/public-site/service-categories/`)).json()
  const paths = ['/', '/services', '/about', '/contact', '/privacy', '/terms', '/track',
    ...(cats.results || cats).map((c) => `/services?category=${c.slug}`),
    ...services.map((slug) => `/services/${slug}`)]
  const c = await ctx(browser, { lang: 'en', width: 1366, height: 900 }); const p = await c.newPage(); watch(p)
  for (const path of paths) {
    await p.goto(BASE + path); await settle(p, 500)
    const text = await p.evaluate(() => {
      const clone = document.body.cloneNode(true)
      clone.querySelectorAll('[lang="ar"], [data-language-switcher], .language-switcher').forEach((n) => n.remove())
      return clone.innerText
    })
    res.pages += 1
    const runs = [...new Set(text.match(ARABIC) || [])].filter((r) => r !== 'العربية')
    if (runs.length) res.englishPagesWithArabic.push({ path, runs: runs.slice(0, 8) })
  }
  if (services.length) await snap(p, 'TC-en-service-terms', { full: true })
  res.consoleErrors = p._audit.console.slice(0, 10)
  res.services = services.length
  await c.close()

  // Arabic pass: Latin words outside file-type names, e-mail/URLs and order numbers.
  const ALLOWED = /^(PDF|JPG|JPEG|PNG|DOC|DOCX|CSV|English|EN|KH|JOD|WhatsApp|OK)$/i
  res.arabicPagesWithLatin = []
  const a = await ctx(browser, { lang: 'ar', width: 1366, height: 900 }); const q = await a.newPage(); watch(q)
  for (const path of paths) {
    await q.goto(BASE + path); await settle(q, 500)
    const text = await q.evaluate(() => {
      const clone = document.body.cloneNode(true)
      clone.querySelectorAll('[lang="en"], [data-language-switcher], .language-switcher').forEach((n) => n.remove())
      return clone.innerText
    })
    const cleaned = text.replace(/\S+@\S+|https?:\/\/\S+|KH-\d{4}-\d+/g, ' ')
    // A technical abbreviation is acceptable once the page explains it in Arabic.
    const GLOSSED = { IP: 'بروتوكول الإنترنت (IP)', SMS: 'الرسائل النصية القصيرة (SMS)' }
    const words = [...new Set(cleaned.match(/[A-Za-z][A-Za-z.'-]+/g) || [])]
      .filter((w) => !ALLOWED.test(w) && !(GLOSSED[w] && text.includes(GLOSSED[w])))
    if (words.length) res.arabicPagesWithLatin.push({ path, words: words.slice(0, 10) })
    if (path === '/') {
      const headings = await q.locator('main h1, main h2').allInnerTexts()
      res.homeHeadings = headings
      res.homeDuplicateHeadings = headings.filter((h, i) => headings.indexOf(h) !== i)
    }
  }
  res.arabicConsoleErrors = q._audit.console.slice(0, 10)
} catch (e) { res.error = String(e).slice(0, 400) }
out('EN-PURITY-results.json', res); console.log(JSON.stringify(res, null, 1).slice(0, 6000))
await browser.close()
