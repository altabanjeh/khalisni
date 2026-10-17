import { launch, ctx, settle, snap, WEB, out } from './pw.mjs'
const b = await launch(); const r = {}
for (const lang of ['ar', 'en']) {
  const c = await ctx(b, { lang, width: 1440 }); const p = await c.newPage()
  await p.goto(WEB.A + '/services/tax-clearance'); await settle(p, 1500)
  const i = await snap(p, `L-public-fixed-tax-clearance-${lang}`)
  r[lang] = (i.text.match(/[^\n]*(36|٣٦|7|٧|11|١١)[^\n]*/g) || []).filter((l) => l.length < 80).slice(0, 10)
}
out('FEES-results.json', r); console.log(JSON.stringify(r, null, 1)); await b.close()
