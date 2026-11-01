// Repeater fields in the browser on the migrated REAL catalogue (CN-BIZ-04, B10-3): the plots repeater on
// request-property-consolidation is hidden until the parcel gate is "yes", starts with its minimum of
// 2 rows, adds and removes rows, and refuses an empty required row. Plus the CN-BIZ-05 coordinates
// field and the CN-BIZ-09 50 MB upload hint, read from the public API. Disposable customer.
import crypto from 'crypto'
import { launch, ctx, watch, settle, snap, WEB, uiLogin, out } from './pw.mjs'

const BASE = WEB.A, API = process.env.API_A
const steps = []
const log = (n, ok, detail) => { steps.push({ step: n, result: ok ? 'PASS' : 'FAIL', detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${n} :: ${JSON.stringify(detail).slice(0, 300)}`) }
const browser = await launch()
try {
  const email = `repeater-${Date.now()}@example.org`
  const password = `Rp-${crypto.randomBytes(6).toString('hex')}9!`
  const phone = `079${crypto.randomInt(1000000, 9999999)}`
  const reg = await fetch(`${API}/auth/register/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name: 'عميل المكررات', email, phone, password }) })
  log('0 disposable customer', reg.status === 201, reg.status)
  const svc = await (await fetch(`${API}/services/request-property-consolidation/`)).json()
  for (const lang of ['ar', 'en']) {
    const c = await ctx(browser, { lang, width: lang === 'ar' ? 390 : 1366, height: 900, mobile: lang === 'ar' }); const p = await c.newPage(); watch(p)
    await uiLogin(p, BASE, email, password)
    await p.goto(`${BASE}/customer/orders/new?service=${svc.id}`); await settle(p, 1500)
    const nextLabel = lang === 'ar' ? /^التالي$/ : /^Next$/
    for (let i = 0; i < 4 && !(await p.locator('input[name="full_name"]').isVisible().catch(() => false)); i++) { await p.locator('button', { hasText: nextLabel }).first().click(); await settle(p, 600) }
    const addLabel = lang === 'ar' ? /إضافة/ : /Add/
    const before = await p.locator('button', { hasText: addLabel }).filter({ hasText: lang === 'ar' ? /قطعة|إضافة/ : /Add/ }).count()
    const gate = p.locator('main select').filter({ has: p.locator('option[value="yes"]') }).first()
    await gate.selectOption('yes'); await settle(p, 500)
    const rows = () => p.locator('input[name*="plots."]').count()
    const shown = await rows()
    await p.locator('button', { hasText: addLabel }).first().click(); await settle(p, 300)
    const afterAdd = await rows()
    const removeLabel = lang === 'ar' ? /حذف/ : /Remove/
    await p.locator('button', { hasText: removeLabel }).last().click(); await settle(p, 300)
    const afterRemove = await rows()
    await snap(p, `RP-plots-${lang}`)
    log(`1 plots repeater (${lang}): hidden before yes, 2 rows, add/remove`, before === 0 && shown === 4 && afterAdd === 6 && afterRemove === 4,
      { addButtonsBeforeGate: before, inputsShown: shown, afterAdd, afterRemove, consoleErrors: p._audit.console.slice(0, 2) })
    await c.close()
  }
  // Server refuses an empty plot row (client checks can be bypassed)
  const login = await (await fetch(`${API}/auth/login/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).json()
  const gateKey = (svc.required_information_schema || []).find((f) => f.type === 'select' && (f.options || []).some((o) => o.value === 'yes'))?.key
  const form = new FormData()
  for (const [k, v] of Object.entries({ service: svc.id, full_name: 'عميل المكررات', phone, city: 'عمّان', consent: 'true',
    service_answers: JSON.stringify({ [gateKey]: 'yes', plots: [{ parcel_number: '12', basin_number: '3' }, { parcel_number: '', basin_number: '' }] }) })) form.append(k, String(v))
  const r = await fetch(`${API}/orders/`, { method: 'POST', headers: { Authorization: 'Bearer ' + login.access, 'Accept-Language': 'ar' }, body: form })
  const body = await r.json().catch(() => null)
  log('2 server refuses an empty required plot row', r.status === 400 && JSON.stringify(body).includes('plots'), { status: r.status, body: JSON.stringify(body).slice(0, 200) })
  const boundary = await (await fetch(`${API}/services/request-boundary-demarcation/`)).json()
  const coords = (boundary.required_information_schema || []).find((f) => f.key === 'site_coordinates')
  const photos = (boundary.required_documents || []).find((d) => /صور الموقع/.test(d.name_ar || ''))
  log('3 boundary: optional coordinates + optional site photos (CN-BIZ-05)', coords && !coords.required && photos && !photos.is_required, { coords: coords?.label_ar, photos: photos?.name_ar })
  const permit = await (await fetch(`${API}/services/request-building-permit/`)).json()
  const drawings = (permit.required_documents || []).find((d) => /المخططات الهندسية/.test(d.name_ar || ''))
  log('4 building permit: engineering drawings accept 50 MB (CN-BIZ-09)', Boolean(drawings) && Number(drawings.max_file_size) === 50 * 1024 * 1024, { max_file_size: drawings?.max_file_size })
  const company = await (await fetch(`${API}/services/business_company_registration/`)).json()
  const partners = (company.required_information_schema || []).find((f) => f.key === 'partners')
  log('5 company registration: partners repeater (CN-BIZ-01)', partners?.type === 'repeater' && (partners.item_fields || []).length === 4, { items: (partners?.item_fields || []).map((f) => f.key), min: partners?.min_items })
} catch (e) { log('EXCEPTION', false, String(e).slice(0, 500)) }
out('REPEATER-UI-results.json', { steps })
await browser.close()
