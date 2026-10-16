// Echo server: records the Accept-Language of every request; the first /auth/me/ answers 401
// so the client walks its refresh + retry path.
import http from 'node:http'
const seen = []
let meCalls = 0
const server = http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => (body += c)); req.on('end', () => {
    seen.push({ method: req.method, url: req.url, acceptLanguage: req.headers['accept-language'] || null, auth: req.headers.authorization || null })
    res.setHeader('Content-Type', 'application/json')
    if (req.url === '/api/auth/me/') { meCalls += 1; if (meCalls === 1) { res.statusCode = 401; return res.end('{"detail":"expired"}') } return res.end('{"id":1}') }
    if (req.url === '/api/auth/token/refresh/') return res.end('{"access":"fresh-access"}')
    if (req.url === '/api/auth/forgot-password/') return res.end('{"detail":"ok"}')
    res.statusCode = 404; res.end('{}')
  })
})
await new Promise((r) => server.listen(8099, '127.0.0.1', r))
const { authApi } = (await import('module')).createRequire(import.meta.url)('./bundle.cjs')
await authApi.me()
await authApi.forgotPassword('someone@example.test')
server.close()
const ok = seen.length === 4 && seen.every((r) => r.acceptLanguage === 'ar')
console.log(JSON.stringify(seen, null, 1))
console.log(ok ? 'PASS every request (initial, refresh, retry, forgot-password) sent Accept-Language: ar' : 'FAIL')
process.exit(ok ? 0 : 1)
