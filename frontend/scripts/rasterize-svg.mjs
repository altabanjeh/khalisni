// node scripts/rasterize-svg.mjs <in.svg> <out.png> [w] [h]
import { chromium } from '@playwright/test'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const inp = resolve(process.argv[2])
const out = resolve(process.argv[3])
const w = Number(process.argv[4] || 1600)
const h = Number(process.argv[5] || 1000)
const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })
await p.goto(pathToFileURL(inp).href, { waitUntil: 'load' })
await p.waitForTimeout(150)
await p.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h } })
await b.close()
console.log('rasterized', out)
