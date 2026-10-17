// M-12 check: does an order submitted with a blank national_id erase the stored one? Does a duplicate ID return 500?
import fs from 'fs'; import path from 'path'; import crypto from 'crypto'
import { QA, QA_PW, out, HERE } from './pw.mjs'
const API = process.env.API_A
const login = async (e) => (await (await fetch(API + '/auth/login/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e, password: QA_PW }) })).json()).access
const a = await login(QA('customer_a')), b = await login(QA('customer_b'))
const H = (t) => ({ Authorization: 'Bearer ' + t })
const r = {}
const me = async (t) => (await (await fetch(API + '/auth/me/', { headers: H(t) })).json())
r.profilePatch = (await fetch(API + '/customer/profile/', { method: 'PATCH', headers: { ...H(a), 'Content-Type': 'application/json' }, body: JSON.stringify({ national_id: '9901234567' }) })).status
r.before = (await me(a)).national_id
const svc = (await (await fetch(API + '/services/client-audit-qa-202610-service/', { headers: H(a) })).json())
const pdf = fs.readFileSync(path.join(HERE, 'files', 'qa-valid.pdf'))
async function submit(t, nid, phone = '0798800103') {
  const fd = new FormData()
  for (const [k, v] of Object.entries({ service: String(svc.id), full_name: 'QA', phone, city: 'Amman', consent: 'true', national_id: nid, document_types: 'client-audit-qa-202610-authorization' })) fd.append(k, v)
  fd.append('documents', new Blob([pdf], { type: 'application/pdf' }), 'a.pdf')
  const res = await fetch(API + '/orders/', { method: 'POST', headers: { ...H(t), 'Idempotency-Key': crypto.randomUUID() }, body: fd })
  return [res.status, (await res.text()).slice(0, 200)]
}
r.blankSubmit = await submit(a, '')
r.after = (await me(a)).national_id
r.duplicateSubmitByB = await submit(b, '9901234567', '0798800104')
r.phoneOfOtherUserByB = await submit(b, '', '0798800103')
out('NATIONAL-ID-results.json', r); console.log(JSON.stringify(r, null, 1))
