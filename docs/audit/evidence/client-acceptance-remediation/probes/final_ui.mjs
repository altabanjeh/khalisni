// Final UI evidence: upload preview/replace (CN-ACT-08), contact phone input (U04),
// employee queue priority label (DEF-E01), help-guide admin language (DEF-A01), slogan (CN-VIS-04).
import path from 'path'
import { launch, ctx, watch, settle, snap, WEB, QA, QA_PW, uiLogin, out, HERE } from './pw.mjs'
const BASE = WEB.A
const res = {}
const browser = await launch()
try {
  for (const [lang, width] of [['ar', 1440], ['ar', 390], ['en', 390]]) {
    const c = await ctx(browser, { lang, width, height: width > 500 ? 900 : 844, mobile: width < 500 }); const p = await c.newPage(); watch(p)
    await p.goto(`${BASE}/`); await settle(p, 1200)
    const home = await snap(p, `F-home-${lang}-${width}`, { full: false })
    res[`slogan ${lang} ${width}`] = { h1: await p.locator('h1').first().innerText(), overflowX: home.overflowX }
    await p.goto(`${BASE}/contact`); await settle(p, 800)
    const phone = p.locator('input[type="tel"]').first()
    res[`contact ${lang} ${width}`] = {
      type: await phone.getAttribute('type'), inputmode: await phone.getAttribute('inputmode'), autocomplete: await phone.getAttribute('autocomplete'),
      describedBy: Boolean(await phone.getAttribute('aria-describedby')),
    }
    await snap(p, `F-contact-${lang}-${width}`)
    await c.close()
  }
  const c = await ctx(browser, { lang: 'ar', width: 1440 }); const p = await c.newPage(); watch(p)
  await uiLogin(p, BASE, QA('customer_a'), QA_PW)
  await p.goto(`${BASE}/customer/orders/5/missing-docs`); await settle(p, 1500)
  await p.locator('input[type=file]').first().setInputFiles(path.join(HERE, 'files', 'qa-valid.pdf'))
  await settle(p, 400)
  const preview = p.getByRole('link', { name: /معاينة الملف/ }).first()
  const replace = p.getByRole('button', { name: /استبدال الملف/ }).first()
  res.upload = { previewLink: await preview.count(), previewHref: (await preview.getAttribute('href') || '').slice(0, 5), replaceButton: await replace.count(), removeButton: await p.getByRole('button', { name: /حذف الملف/ }).count() }
  await snap(p, 'F-upload-preview-replace-ar-1440')
  await c.close()
  const e = await ctx(browser, { lang: 'en', width: 1440 }); const ep = await e.newPage(); watch(ep)
  await uiLogin(ep, BASE, QA('employee'), QA_PW)
  await ep.goto(`${BASE}/employee/orders`); await settle(ep, 1500)
  const queue = await snap(ep, 'F-employee-queue-en-1440')
  res.queue = { rawNormal: /\bNORMAL\b/.test(queue.text), normalLabel: /\bNormal\b/.test(queue.text) }
  await e.close()
  for (const lang of ['ar', 'en']) {
    const a = await ctx(browser, { lang, width: 1440 }); const ap = await a.newPage(); watch(ap)
    await uiLogin(ap, BASE, QA('admin'), QA_PW)
    await ap.goto(`${BASE}/admin/help-guides`); await settle(ap, 2000)
    const guides = await snap(ap, `F-admin-help-guides-${lang}-1440`)
    res[`help guides ${lang}`] = lang === 'ar'
      ? { englishChrome: ['In-App Help', 'New Screen guide', 'All roles', 'Deactivate'].filter((w) => guides.text.includes(w)) }
      : { arabicChrome: ['دليل', 'كل الأدوار', 'تعطيل'].filter((w) => guides.text.includes(w)) }
    await a.close()
  }
} catch (err) { res.error = String(err).slice(0, 400) }
out('FINAL-UI-results.json', res); console.log(JSON.stringify(res, null, 1))
await browser.close()
