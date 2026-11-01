// D03 error path: Arabic customer uploads an HTML file renamed .pdf on the missing-docs page.
import path from 'path'
import { launch, ctx, watch, settle, snap, WEB, QA, QA_PW, uiLogin, out, HERE } from './pw.mjs'
const browser = await launch()
const res = {}
for (const lang of ['ar', 'en']) {
  const c = await ctx(browser, { lang, width: 1440 }); const p = await c.newPage(); watch(p)
  await uiLogin(p, WEB.A, QA('customer_a'), QA_PW)
  await p.goto(WEB.A + '/customer/orders/5/missing-docs'); await settle(p, 1200)
  await p.locator('input[type=file]').first().setInputFiles(path.join(HERE, 'files', 'qa-html-as.pdf'))
  await p.locator('button', { hasText: lang === 'ar' ? 'رفع المستندات وإعادة الإرسال' : /Upload documents/ }).first().click()
  await settle(p, 2000)
  const info = await snap(p, `E01-spoofed-upload-${lang}`)
  res[lang] = { apiCalls: p._audit.api.filter((a) => /documents|orders/.test(a)).slice(-4), englishServerMsg: /File content does not match|extension|not part of/.test(info.text), excerpt: (info.text.match(/.*(File content|does not match|الملف|امتداد|محتوى).*/g) || []).slice(0, 4) }
  await c.close()
}
out('ERROR-LANGUAGE-results.json', res); console.log(JSON.stringify(res, null, 1)); await browser.close()
