import { chromium } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'
const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4319'
mkdirSync('e2e-results/screenshots', { recursive: true })
const b = await chromium.launch({ channel:'chrome', headless:true })
const ctx = await b.newContext({ viewport:{width:1440,height:900} })
await ctx.addInitScript(() => { try { localStorage.setItem('khalisni-language','en') } catch {} })
const p = await ctx.newPage()
const out = {}
const ROUTES = ['/','/services','/track-order','/login','/register','/faq','/about']
for (const r of ROUTES) {
  await p.goto(BASE+r, { waitUntil:'domcontentloaded' }); await p.waitForTimeout(900)
  const dir = await p.getAttribute('html','dir')
  const lang = await p.getAttribute('html','lang')
  const txt = (await p.locator('#root').innerText()).trim()
  const overflow = await p.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth))
  // crude "is there Arabic script visible" check
  const hasArabic = /[؀-ۿ]/.test(txt)
  out[r] = { dir, lang, len: txt.length, overflow, hasArabicChars: hasArabic, sample: txt.slice(0,90).replace(/\n/g,' ') }
}
// switcher presence on public
await p.goto(BASE+'/', { waitUntil:'domcontentloaded' }); await p.waitForTimeout(600)
const switcherOnPublic = await p.locator('button:has-text("English"), button:has-text("العربية"), [class*="LanguageSwitcher"], button:has-text("EN")').count()
out._public_language_switcher_count = switcherOnPublic
// screenshots EN
for (const [name,route] of [['public-home','/'],['public-services','/services'],['public-login','/login']]) {
  await p.goto(BASE+route, { waitUntil:'domcontentloaded' }); await p.waitForTimeout(900)
  await p.screenshot({ path:`e2e-results/screenshots/${name}-en-1440.png`, fullPage:true })
}
// authenticated: does the dashboard topbar switcher work?
const lr = await ctx.request.post((process.env.E2E_API_URL||'http://127.0.0.1:8009')+'/api/auth/login/', { data:{email:'admin@khalisni.local',password:'Admin@123'} })
const {access,refresh} = await lr.json()
const actx = await b.newContext({ viewport:{width:1440,height:900} })
await actx.addInitScript(([a,rr])=>{localStorage.setItem('khalisni_access',a);localStorage.setItem('khalisni_refresh',rr);localStorage.setItem('khalisni_auth_storage','local')},[access,refresh])
const ap = await actx.newPage()
await ap.goto(BASE+'/admin', { waitUntil:'domcontentloaded' }); await ap.waitForTimeout(1200)
out._admin_default_dir = await ap.getAttribute('html','dir')
const enBtn = ap.getByRole('button', { name: /english/i }).first()
out._admin_english_button_visible = await enBtn.isVisible().catch(()=>false)
if (out._admin_english_button_visible) {
  await enBtn.click(); await ap.waitForTimeout(800)
  out._admin_dir_after_english = await ap.getAttribute('html','dir')
}
await b.close()
writeFileSync('e2e-results/english.json', JSON.stringify(out,null,2))
console.log(JSON.stringify(out,null,2))
