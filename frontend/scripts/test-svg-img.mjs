import { chromium } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'

const B = process.env.E2E_BASE_URL || 'http://127.0.0.1:4319'
const BASE = resolve('public/images/khalsni')
const files = []
for (const dir of ['categories', 'services', 'fallback', 'hero', 'empty']) {
  for (const f of readdirSync(join(BASE, dir))) files.push(`${dir}/${f}`)
}
const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage()
await p.goto(B + '/', { waitUntil: 'domcontentloaded' })
const results = []
for (const f of files) {
  const src = `${B}/images/khalsni/${f}`
  const r = await p.evaluate(
    (u) =>
      new Promise((res) => {
        const img = new Image()
        img.onload = () => res({ ok: true, w: img.naturalWidth, h: img.naturalHeight })
        img.onerror = (e) => res({ ok: false, err: String(e) })
        img.src = u
        setTimeout(() => res({ ok: false, timeout: true }), 5000)
      }),
    src,
  )
  results.push({ f, ...r })
}
await b.close()
for (const r of results) console.log((r.ok ? 'OK  ' : 'FAIL') + ` ${r.f}  ${r.w || ''}x${r.h || ''}${r.timeout ? ' TIMEOUT' : ''}`)
