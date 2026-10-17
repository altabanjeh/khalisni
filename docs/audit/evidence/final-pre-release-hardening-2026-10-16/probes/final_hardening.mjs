// Runtime proof for the final pre-release hardening pass (environment U, after the lifecycle journey).
import fs from 'fs'
import path from 'path'
import { QA, QA_PW, out } from './pw.mjs'
const API = process.env.API_A
const MAIL = process.env.MAIL_DIR
const steps = []
const log = (n, ok, detail) => { steps.push({ step: n, result: ok ? 'PASS' : 'FAIL', detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${n} :: ${JSON.stringify(detail).slice(0, 400)}`) }
const keysOf = (v, acc = new Set()) => { if (Array.isArray(v)) v.forEach((i) => keysOf(i, acc)); else if (v && typeof v === 'object') for (const [k, i] of Object.entries(v)) { acc.add(k); keysOf(i, acc) } return acc }
async function token(role) {
  const r = await fetch(API + '/auth/login/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: QA(role), password: QA_PW }) })
  return (await r.json()).access
}
const adminToken = await token('admin')
const call = async (method, p, body, tok = adminToken, extra = {}) => {
  const r = await fetch(API + p, { method, headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', 'Accept-Language': 'ar', ...extra }, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) })
  return [r.status, await r.json().catch(() => null)]
}
try {
  // --- Provider create ---
  const stamp = Date.now()
  const base = { full_name: 'QA FPH Provider', email: `qa-fph-${stamp}@example.test`, phone: `079${String(stamp).slice(-7)}`, provider_type: 'Agent', city: 'Amman' }
  const [s1, b1] = await call('POST', '/admin/providers/', base)
  log('PROVIDER create without password -> structured 400', s1 === 400 && b1 && 'password' in b1, { status: s1, keys: b1 && Object.keys(b1) })
  const [s2, b2] = await call('POST', '/admin/providers/', { ...base, password: '' })
  log('PROVIDER blank password -> 400', s2 === 400 && 'password' in b2, { status: s2 })
  const [s3] = await call('POST', '/admin/providers/', '{bad json')
  log('PROVIDER malformed JSON -> 400', s3 === 400, { status: s3 })
  const [s4, b4] = await call('POST', '/admin/providers/', { ...base, password: 'Fph-Provider-2026!' })
  log('PROVIDER valid create -> 201', s4 === 201 && !('password' in b4), { status: s4 })
  const [s5, b5] = await call('POST', '/admin/providers/', { ...base, phone: `078${String(stamp).slice(-7)}`, password: 'Fph-Provider-2026!' })
  log('PROVIDER duplicate email -> 400', s5 === 400 && 'email' in b5, { status: s5, keys: b5 && Object.keys(b5) })
  if (s4 === 201) {
    const [s6] = await call('PATCH', `/admin/providers/${b4.id}/`, { city: 'Irbid' })
    log('PROVIDER update without a new password -> 200', s6 === 200, { status: s6 })
  }

  // --- verification_note never reaches public tracking ---
  const custToken = await token('customer_a')
  const [, list] = await call('GET', '/customer/orders/?status_group=done', undefined, custToken)
  const done = (list?.results || []).find((o) => o.status === 'COMPLETED')
  if (done) {
    const [, detail] = await call('GET', `/customer/orders/${done.id}/`, undefined, custToken)
    const track = await (await fetch(`${API}/orders/track/?order_number=${detail.order_number}&phone=${encodeURIComponent(detail.customer.phone)}`)).json()
    const finals = track.final_documents || []
    log('VERIFICATION NOTE public tracking lists the final result without the note', finals.length > 0 && !keysOf(track).has('verification_note'), { order: detail.order_number, finals: finals.length, keys: [...keysOf(finals)] })
    const own = (detail.documents || []).some((d) => 'verification_note' in d)
    log('VERIFICATION NOTE owning customer payload unchanged (key still present)', own, { order: detail.order_number })
  } else {
    log('VERIFICATION NOTE completed order available', false, 'no completed order for customer_a')
  }

  // --- Password reset language follows Accept-Language (what the mobile client now sends) ---
  const before = new Set(fs.existsSync(MAIL) ? fs.readdirSync(MAIL) : [])
  const reset = async (lang, account) => {
    const headers = { 'Content-Type': 'application/json' }
    if (lang) headers['Accept-Language'] = lang
    const r = await fetch(API + '/auth/forgot-password/', { method: 'POST', headers, body: JSON.stringify({ email: account.includes('@') ? account : QA(account) }) })
    await new Promise((res) => setTimeout(res, 800))
    const fresh = fs.readdirSync(MAIL).filter((f) => !before.has(f))
    fresh.forEach((f) => before.add(f))
    const text = fresh.map((f) => fs.readFileSync(path.join(MAIL, f), 'utf-8')).join('\n')
    // Unfold continuation lines, then decode RFC 2047 base64 words (the Arabic subject is encoded).
    const unfolded = text.replace(/\r?\n[ \t]+/g, ' ')
    const raw = (unfolded.match(/^Subject: (.*)$/m) || [])[1] || ''
    const subject = raw.replace(/=\?utf-8\?b\?([^?]*)\?=\s*/gi, (_, b) => Buffer.from(b, 'base64').toString('utf-8')).trim()
    return { status: r.status, subject: subject.slice(0, 120) }
  }
  // One request per account: the per-account reset limit silently suppresses repeats.
  const ar = await reset('ar', 'customer_b')
  log('LANGUAGE Accept-Language: ar (mobile) -> Arabic reset email', ar.status === 200 && ar.subject === 'إعادة تعيين كلمة المرور في خلّصني', ar)
  const none = await reset(null, 'customer@khalisni.local')
  log('LANGUAGE no header (old mobile behaviour) -> English reset email', none.status === 200 && /Khalsni password reset/.test(none.subject), none)
} catch (err) { log('EXCEPTION', false, String(err).slice(0, 500)) }
out('FPH-final-hardening-steps.json', steps)
console.log(`SUMMARY ${steps.filter((s) => s.result === 'PASS').length}/${steps.length} PASS`)
