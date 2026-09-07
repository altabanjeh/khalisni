import { chromium } from '@playwright/test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
const out = process.argv[3]
const cols = Number(process.argv[4] || 3)
const files = readdirSync(dir).filter((f) => /\.(jpg|jpeg|png|svg)$/i.test(f)).sort()
const cells = files
  .map((f) => {
    const buf = readFileSync(join(dir, f))
    const mime = f.endsWith('.svg') ? 'image/svg+xml' : f.endsWith('.png') ? 'image/png' : 'image/jpeg'
    return `<figure><img src="data:${mime};base64,${buf.toString('base64')}"><figcaption>${f}</figcaption></figure>`
  })
  .join('')
const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({ viewport: { width: cols * 380, height: 1600 } })
await p.setContent(
  `<style>body{margin:0;background:#eef;font:12px system-ui;display:grid;grid-template-columns:repeat(${cols},1fr);gap:12px;padding:12px}figure{margin:0}img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:10px;background:#fff}figcaption{font-weight:700;margin-top:3px}</style>${cells}`,
  { waitUntil: 'load' },
)
await p.waitForTimeout(500)
await p.screenshot({ path: out, fullPage: true })
await b.close()
console.log('wrote', out, files.length, 'tiles')
