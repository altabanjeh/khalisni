// Bundles mobile modules for Node (axios Node adapter) with storage, store and
// query-client stubbed. Three env bundles exercise the production URL guard.
import { createRequire } from 'node:module'
import path from 'node:path'
const require = createRequire('D:/ghassan/frontend/package.json')
const esbuild = require('esbuild')
const here = process.cwd()
const stub = { 'auth/authStorage': 'authStorage.js', 'services/queryClient': 'queryClient.js', 'state/authStore': 'authStore.js' }
const stubs = { name: 'stubs', setup(b) { b.onResolve({ filter: /(auth\/authStorage|services\/queryClient|state\/authStore)$/ }, (a) => { const k = Object.keys(stub).find((k) => a.path.endsWith(k)); return { path: path.join(here, 'stubs', stub[k]) } }) } }
const common = { bundle: true, platform: 'node', format: 'cjs', nodePaths: ['D:/ghassan/mobile/node_modules'], external: ['react-native'], plugins: [stubs], logLevel: 'error' }

await esbuild.build({ ...common, entryPoints: [path.join(here, 'entry.ts')], outfile: path.join(here, 'bundle.cjs'),
  define: { 'process.env.EXPO_PUBLIC_API_BASE_URL': JSON.stringify('http://127.0.0.1:8097'), 'process.env.NODE_ENV': '"development"' } })

const envCases = {
  prod_placeholder: 'https://api.example.com',
  prod_localhost: 'http://127.0.0.1:8000',
  prod_http: 'http://api.khalsni.jo',
  prod_missing: undefined,
  prod_valid: 'https://api.khalsni.jo',
  dev_missing: undefined,
}
for (const [name, url] of Object.entries(envCases)) {
  const define = { 'process.env.NODE_ENV': name.startsWith('prod') ? '"production"' : '"development"' }
  define['process.env.EXPO_PUBLIC_API_BASE_URL'] = url === undefined ? 'undefined' : JSON.stringify(url)
  await esbuild.build({ ...common, entryPoints: ['D:/ghassan/mobile/src/config/env.ts'], outfile: path.join(here, `env_${name}.cjs`), define })
}
console.log('bundled')
