/**
 * Visual-acceptance capture for the brand-integration + managed-service-image work.
 *
 * Usage (stack already running):
 *   E2E_BASE_URL=http://localhost:4173 \
 *   E2E_ADMIN_EMAIL=admin@khalisni.local E2E_ADMIN_PASSWORD=Admin@123 \
 *   node e2e/brand-service-image-shots.mjs
 *
 * Writes PNGs to  e2e-results/brand-shots/
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:4173'
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@khalisni.local'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Admin@123'
const OUT = resolve('e2e-results/brand-shots')
mkdirSync(OUT, { recursive: true })

const BREAKPOINTS = [360, 390, 768, 1024, 1440]

async function setLang(page, lang) {
  await page.addInitScript((l) => {
    try { window.localStorage.setItem('khalisni-language', l) } catch (e) {}
  }, lang)
}

async function shoot(page, name) {
  const file = resolve(OUT, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  console.log('  ✓', name, `(${page.viewportSize().width}px)`)
}

async function gotoStable(page, path) {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  // nudge lazy images into loading, then give them a bounded moment to settle
  await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight)
    await new Promise((r) => setTimeout(r, 300))
    window.scrollTo(0, 0)
    const imgs = [...document.querySelectorAll('img')].filter((i) => !i.complete)
    await Promise.race([
      Promise.all(imgs.map((img) => new Promise((r) => { img.onload = img.onerror = r }))),
      new Promise((r) => setTimeout(r, 4000)),
    ])
  })
  await page.waitForTimeout(400)
}

const run = async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })

  // ---- language + breakpoint matrix for the public catalogue ----
  for (const lang of ['ar', 'en']) {
    for (const width of BREAKPOINTS) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
      const page = await ctx.newPage()
      await setLang(page, lang)

      await gotoStable(page, '/')
      await shoot(page, `home_${lang}_${width}`)

      await gotoStable(page, '/services')
      await shoot(page, `services_${lang}_${width}`)

      await ctx.close()
    }
  }

  // ---- representative deep pages (desktop + mobile) ----
  for (const [label, width] of [['desktop', 1440], ['mobile', 390]]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } })
    const page = await ctx.newPage()
    await setLang(page, 'ar')

    // category page with multiple service cards
    await gotoStable(page, '/services')
    const firstCategory = page.locator('a[href*="/services/category/"]').first()
    if (await firstCategory.count()) {
      await firstCategory.click()
      await page.waitForTimeout(1500)
      await page.waitForTimeout(1200)
      await shoot(page, `category_ar_${label}`)
    }

    // service detail page
    await gotoStable(page, '/services/request-cadastral-map')
    await shoot(page, `service_detail_ar_${label}`)

    await ctx.close()
  }

  // ---- English service detail ----
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    await setLang(page, 'en')
    await gotoStable(page, '/services/request-property-registration-certificate')
    await shoot(page, 'service_detail_en_1440')
    await ctx.close()
  }

  // ---- auth screen (branding) ----
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    await setLang(page, 'ar')
    await gotoStable(page, '/login')
    await shoot(page, 'login_ar_1440')
    await ctx.close()
  }

  // ---- admin: service edit screen with the image control + collapsed nav ----
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const page = await ctx.newPage()
    await setLang(page, 'ar')
    await gotoStable(page, '/login')
    await page.fill('#login-email', ADMIN_EMAIL)
    await page.fill('#login-password', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(1500)
    await page.waitForTimeout(1500)
    await shoot(page, 'admin_dashboard_ar_1440')

    await gotoStable(page, '/admin/services')
    await page.waitForTimeout(1800)
    // open the "new service" form (has the same Service Image control as edit)
    await page.getByRole('button', { name: '+ خدمة جديدة' }).click()
    await page.waitForTimeout(1800)
    const imgField = page.getByText('صورة الخدمة', { exact: false }).first()
    await imgField.scrollIntoViewIfNeeded()
    await page.waitForTimeout(700)
    const box = await imgField.boundingBox()
    await page.screenshot({
      path: resolve(OUT, 'admin_service_edit_image_ar_1440.png'),
      clip: { x: Math.max(0, box.x - 420), y: Math.max(0, box.y - 240), width: 980, height: 640 },
    })
    console.log('  ✓ admin_service_edit_image_ar_1440')

    // collapsed / mobile navigation drawer (Khalsni app icon + wordmark)
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoStable(page, '/admin/services')
    await page.getByRole('button', { name: 'فتح القائمة الجانبية' }).click()
    await page.waitForTimeout(900)
    await shoot(page, 'admin_nav_mobile_390')
    await ctx.close()
  }

  await browser.close()
  console.log('\nAll shots written to', OUT)
}

run().catch((err) => { console.error(err); process.exit(1) })
