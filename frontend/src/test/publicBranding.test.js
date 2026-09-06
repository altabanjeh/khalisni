import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')

test('index.html points application identity at the official Khalsni icon derivatives', () => {
  const html = read('index.html')
  expect(html).toMatch(/<link rel="icon"[^>]*href="\/favicon\.ico"/)
  expect(html).toMatch(/href="\/favicon-32x32\.png"/)
  expect(html).toMatch(/rel="apple-touch-icon"[^>]*href="\/apple-touch-icon\.png"/)
  expect(html).toMatch(/rel="manifest" href="\/site\.webmanifest"/)
  expect(html).toMatch(/name="theme-color" content="#006BB9"/)
  expect(html).toMatch(/<title>خلصني \| Khalsni<\/title>/)
  // the stale Vite scaffold favicon must no longer be referenced
  expect(html).not.toMatch(/favicon\.svg/)
})

test('stale scaffold brand graphics have been removed', () => {
  expect(existsSync(resolve(root, 'public/favicon.svg'))).toBe(false)
  expect(existsSync(resolve(root, 'src/assets/react.svg'))).toBe(false)
  expect(existsSync(resolve(root, 'src/assets/vite.svg'))).toBe(false)
})

test('official supplied brand assets are present in the permanent public path', () => {
  for (const f of [
    'public/brand/khalsni-wordmark.png',
    'public/brand/khalsni-app-icon.png',
    'public/favicon.ico',
    'public/apple-touch-icon.png',
    'public/icon-192.png',
    'public/icon-512.png',
    'public/icon-maskable-512.png',
    'public/site.webmanifest',
  ]) {
    expect(existsSync(resolve(root, f))).toBe(true)
  }
})

test('web manifest is valid and Khalsni-branded', () => {
  const manifest = JSON.parse(read('public/site.webmanifest'))
  expect(manifest.name).toContain('خلصني')
  expect(manifest.theme_color).toBe('#006BB9')
  const purposes = manifest.icons.map((i) => `${i.sizes} ${i.purpose || ''}`.trim())
  expect(purposes).toContain('512x512 maskable')
})
