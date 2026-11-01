// Final build: upload preview/replace with one input per document (CN-ACT-08) and the
// single action card on the customer order page (DEF-C01).
import path from 'path'
import { launch, ctx, watch, settle, snap, WEB, QA, QA_PW, uiLogin, out, HERE } from './pw.mjs'
const BASE = WEB.A
const res = {}
const browser = await launch()
try {
  const c = await ctx(browser, { lang: 'ar', width: 1440 }); const p = await c.newPage(); watch(p)
  await uiLogin(p, BASE, QA('customer_a'), QA_PW)
  await p.goto(`${BASE}/customer/orders/5/missing-docs`); await settle(p, 1500)
  res.fileInputsOnMissingDocs = await p.locator('input[type=file]').count()
  await p.locator('input[type=file]').first().setInputFiles(path.join(HERE, 'files', 'qa-valid.pdf'))
  await settle(p, 300)
  const chooser = p.waitForEvent('filechooser')
  await p.getByRole('button', { name: /استبدال الملف/ }).first().click()
  const picker = await chooser
  await picker.setFiles(path.join(HERE, 'files', 'qa-final-distinct.pdf'))
  await settle(p, 300)
  const text = await p.evaluate(() => document.body.innerText)
  res.replace = { replacedName: text.includes('qa-final-distinct.pdf'), oldNameGone: !text.includes('qa-valid.pdf'), fileInputsAfter: await p.locator('input[type=file]').count(), previewLink: await p.getByRole('link', { name: /معاينة الملف/ }).count() }
  await snap(p, 'F2-upload-replaced-ar-1440')
  await p.goto(`${BASE}/customer/orders/5`); await settle(p, 1500)
  const waiting = await snap(p, 'F2-order-waiting-ar-1440')
  const sentence = 'راجع بطاقة الإجراء المطلوبة وارفع الوثائق أو أكمل المعلومات المتاحة في النظام.'
  res.waitingOrder = {
    heroSentenceCount: waiting.text.split(sentence).length - 1,
    uploadButtons: (waiting.text.match(/رفع الوثائق المطلوبة/g) || []).length,
    oldSecondBanner: waiting.text.includes('فتح شاشة النواقص'),
  }
  await p.goto(`${BASE}/customer/orders/8`); await settle(p, 1500)
  const ready = await snap(p, 'F2-order-ready-ar-1440')
  res.readyOrder = { workingSentenceCount: ready.text.split('الفريق يتابع الطلب الآن، ولا يوجد إجراء مطلوب منك حالياً.').length - 1 }
  await c.close()
  const m = await ctx(browser, { lang: 'ar', width: 390, height: 844, mobile: true }); const mp = await m.newPage(); watch(mp)
  await uiLogin(mp, BASE, QA('customer_a'), QA_PW)
  await mp.goto(`${BASE}/customer/orders/5/missing-docs`); await settle(mp, 1500)
  const mobile = await snap(mp, 'F2-missing-docs-ar-390', { full: false })
  res.mobileOrderNumber = { tokenUnbroken: /KH-2026-000005/.test(mobile.text), overflowX: mobile.overflowX }
  await m.close()
} catch (err) { res.error = String(err).slice(0, 400) }
out('FINAL-UI2-results.json', res); console.log(JSON.stringify(res, null, 1))
await browser.close()
