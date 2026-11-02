// Consolidation parcel gate parity (B10-1/2/3): the migrated real schema through the
// web (frontend/src/utils/serviceForms.js) and mobile (mobile/src/utils/serviceForms.ts)
// form rules, compared with the server verdicts from consolidation_parity_backend.py.
// Same cases everywhere: "no" -> plots hidden, not required, not sent; "yes" ->
// plots shown and required with at least 2 complete rows.
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const require = createRequire('D:/ghassan/frontend/package.json')
const esbuild = require('esbuild')
const here = path.dirname(fileURLToPath(import.meta.url))
const ev = path.join(here, '..', 'evidence')
const tmp = path.join(here, '_parity_tmp')
fs.mkdirSync(tmp, { recursive: true })
await esbuild.build({ entryPoints: ['D:/ghassan/frontend/src/utils/serviceForms.js'], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(tmp, 'web.cjs'), logLevel: 'error', define: { 'import.meta.env': JSON.stringify({ VITE_API_BASE_URL: 'http://127.0.0.1:1/api', MODE: 'test' }) } })
await esbuild.build({ entryPoints: ['D:/ghassan/mobile/src/utils/serviceForms.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(tmp, 'mobile.cjs'), nodePaths: ['D:/ghassan/mobile/node_modules'], external: ['react-native'], logLevel: 'error' })
const web = require(path.join(tmp, 'web.cjs'))
const mobile = require(path.join(tmp, 'mobile.cjs'))
fs.rmSync(tmp, { recursive: true, force: true })

const { gate, schema } = JSON.parse(fs.readFileSync(path.join(ev, 'consolidation_schema.json'), 'utf8'))
const server = JSON.parse(fs.readFileSync(path.join(ev, 'CONSOLIDATION-PARITY-backend.json'), 'utf8'))
const service = { required_information_schema: schema }
const webFields = web.getServiceSchemaFields(service, 'ar')
const mobileFields = mobile.getServiceSchemaFields(service)
const webPlots = webFields.find((f) => f.key === 'plots')
const mobilePlots = mobileFields.find((f) => f.key === 'plots')
const webGate = webFields.find((f) => f.key === gate)
const mobileGate = mobileFields.find((f) => f.key === gate)
const row = (p, b) => ({ parcel_number: p, basin_number: b })
const cases = {
  no_without_rows: { gate: 'no', rows: [] },
  no_with_partial_row: { gate: 'no', rows: [{ parcel_number: '1' }] },
  yes_without_rows: { gate: 'yes', rows: [] },
  yes_one_complete_row: { gate: 'yes', rows: [row('1', '2')] },
  yes_two_complete_rows: { gate: 'yes', rows: [row('1', '2'), row('3', '4')] },
}
const out = {}
let parity = true
for (const [name, c] of Object.entries(cases)) {
  // Web: form values keyed by input names; repeater rows keyed by item input keys.
  const webRows = c.rows.map((r) => Object.fromEntries(webPlots.itemFields.map((item) => [item.inputKey, r[item.key] ?? ''])))
  const webValues = { [webGate.inputName]: c.gate, [webPlots.inputName]: webRows }
  const webVisible = web.isSchemaFieldVisible(webPlots, webFields, webValues)
  const webSent = 'plots' in web.buildServiceAnswers(webFields, webValues)
  const webNeedsRows = webVisible && webPlots.required ? Math.max(webPlots.effectiveMin ?? webPlots.minItems, 1) : 0
  const webComplete = webRows.filter((r) => webPlots.itemFields.every((item) => !item.required || String(r[item.inputKey] ?? '').trim())).length
  const webBlocks = webVisible && (webRows.length < webNeedsRows || webComplete < webRows.length)
  // Mobile: values keyed by input names; repeater rows keyed by the repeater input name.
  const mobileValues = { [mobileGate.inputName]: c.gate }
  const mobileRows = { [mobilePlots.inputName]: c.rows.map((r) => Object.fromEntries(mobilePlots.itemFields.map((item) => [item.key, r[item.key] ?? '']))) }
  const mobileVisible = mobile.isSchemaFieldVisible(mobilePlots, mobileFields, mobileValues)
  const mobileSent = 'plots' in mobile.buildServiceAnswers(mobileFields, mobileValues, mobileRows)
  const mobileErrors = mobileVisible ? mobile.validateRepeaterRows(mobilePlots, mobile.getRepeaterRows(mobilePlots, mobileRows)) : {}
  const mobileBlocks = Object.keys(mobileErrors).length > 0
  const serverBlocks = Boolean(server[name].plots_error)
  const expectedBlocks = c.gate === 'yes' && c.rows.length < 2
  // Clients send the displayed rows of a visible repeater; the server keeps
  // them in the cleaned answers only when they are valid.
  const agree = webVisible === mobileVisible && webVisible === (c.gate === 'yes')
    && webSent === mobileSent && webSent === (c.gate === 'yes' && c.rows.length > 0)
    && server[name].plots_sent === (c.gate === 'yes' && !expectedBlocks)
    && webBlocks === mobileBlocks && mobileBlocks === serverBlocks && serverBlocks === expectedBlocks
  parity = parity && agree
  out[name] = { agree, web: { visible: webVisible, sent: webSent, blocks: webBlocks }, mobile: { visible: mobileVisible, sent: mobileSent, blocks: mobileBlocks }, server: server[name] }
}
const result = { rule: 'gate "no": plots hidden, not required, not sent; gate "yes": plots required, min 2 complete rows', parity, minItems: { web: webPlots.minItems, mobile: mobilePlots.minItems }, cases: out }
fs.writeFileSync(path.join(ev, 'CONSOLIDATION-PARITY-results.json'), JSON.stringify(result, null, 1))
console.log(JSON.stringify(result, null, 1))
process.exit(parity ? 0 : 1)
