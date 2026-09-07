import { chromium } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve, join } from 'node:path'

const BASE = resolve('public/images/khalsni')
const files = []
for (const dir of ['categories', 'services', 'fallback', 'hero', 'empty']) {
  for (const f of readdirSync(join(BASE, dir))) files.push(`${dir}/${f}`)
}

const b = await chromium.launch({ channel: 'chrome', headless: true })
const cols = 4
const cell = 320
const rows = Math.ceil(files.length / cols)
const sheet = await b.newPage({ viewport: { width: cols * cell, height: rows * (cell + 26) } })

const tiles = []
for (const f of files) {
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } })
  await p.goto(pathToFileURL(join(BASE, f)).href, { waitUntil: 'load' })
  await p.waitForTimeout(120)
  const buf = await p.screenshot({ clip: { x: 0, y: 0, width: 1600, height: 1000 } })
  tiles.push({ f, b64: buf.toString('base64') })
  await p.close()
}
const html = `<!doctype html><meta charset=utf8><style>
body{margin:0;background:#f4f8ff;font:12px system-ui;display:grid;grid-template-columns:repeat(${cols},${cell}px)}
figure{margin:0;padding:8px}img{width:100%;display:block;border-radius:12px;box-shadow:0 6px 18px #0b3aa825}
figcaption{margin-top:4px;font-weight:700;color:#12234a;font-size:11px}
</style>${tiles.map((t) => `<figure><img src="data:image/png;base64,${t.b64}"><figcaption>${t.f}</figcaption></figure>`).join('')}`
await sheet.setContent(html, { waitUntil: 'load' })
await sheet.waitForTimeout(300)
await sheet.screenshot({ path: 'e2e-results/phase4a-final/illustration-contact-sheet.png', fullPage: true })
await b.close()
console.log('wrote e2e-results/phase4a-final/illustration-contact-sheet.png')
