import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const B = process.env.E2E_BASE_URL || 'http://127.0.0.1:4319'
const API = process.env.E2E_API_URL || 'http://127.0.0.1:8009'
const DIR = 'e2e-results/phase4a-final'
mkdirSync(DIR, { recursive: true })

const b = await chromium.launch({ channel: 'chrome', headless: true })
const lr = await (await b.newContext()).request.post(`${API}/api/auth/login/`, {
  data: { email: 'admin@khalisni.local', password: 'Admin@123' },
})
const { access, refresh } = await lr.json()

async function grab(lang, name, prep) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } })
  await ctx.addInitScript(([a, r, l]) => {
    localStorage.setItem('khalisni_access', a)
    localStorage.setItem('khalisni_refresh', r)
    localStorage.setItem('khalisni_auth_storage', 'local')
    localStorage.setItem('khalisni-language', l)
  }, [access, refresh, lang])
  const p = await ctx.newPage()
  await p.goto(`${B}/admin/services`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(1500)
  await prep(p)
  await p.waitForTimeout(900)
  await p.screenshot({ path: `${DIR}/${lang}-${name}-1440.png`, fullPage: true })
  await p.close()
  await ctx.close()
  console.log(`${lang}-${name}`)
}

for (const lang of ['en', 'ar']) {
  const newService = lang === 'en' ? '+ New service' : '+ خدمة جديدة'
  const newDef = lang === 'en' ? '+ Document definition' : '+ تعريف وثيقة'
  await grab(lang, 'service-editor', async (p) => {
    await p.getByRole('button', { name: newService }).click()
  })
  await grab(lang, 'document-definition', async (p) => {
    await p.getByRole('button', { name: newDef }).click()
  })
}

await b.close()
