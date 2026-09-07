import { chromium } from '@playwright/test'
const B = process.env.E2E_BASE_URL || 'http://127.0.0.1:4319'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
p.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)))
await p.goto(`${B}/services`, { waitUntil: 'networkidle' })
for (let y = 0; y < 3600; y += 400) {
  await p.evaluate((yy) => window.scrollTo(0, yy), y)
  await p.waitForTimeout(300)
}
await p.waitForTimeout(2000)
const info = await p.evaluate(() =>
  [...document.querySelectorAll('.kh-cover')].map((c) => {
    const img = c.querySelector('img')
    return {
      src: img ? img.getAttribute('src') || '' : null,
      complete: img ? img.complete : null,
      nw: img ? img.naturalWidth : null,
      gradient: !img && (c.getAttribute('style') || '').includes('background-image'),
    }
  }),
)
console.log(JSON.stringify(info.filter((i) => i.gradient || (i.src && i.src.includes('traffic'))), null, 2))
console.log('consoleErrors:', errs)
await b.close()
