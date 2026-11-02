// Pagination harness: bundles the mobile paged-list helpers, list APIs and deletion details for Node
// (axios Node adapter). Reuses the auth/query stubs of ../harness-src.
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const require = createRequire('D:/ghassan/frontend/package.json')
const esbuild = require('esbuild')
const here = path.dirname(fileURLToPath(import.meta.url))
const stubDir = path.join(here, '..', 'harness-src', 'stubs')
const stub = { 'auth/authStorage': 'authStorage.js', 'services/queryClient': 'queryClient.js', 'state/authStore': 'authStore.js' }
const stubs = { name: 'stubs', setup(b) { b.onResolve({ filter: /(auth\/authStorage|services\/queryClient|state\/authStore)$/ }, (a) => { const k = Object.keys(stub).find((key) => a.path.endsWith(key)); return { path: path.join(stubDir, stub[k]) } }) } }
await esbuild.build({
  bundle: true, platform: 'node', format: 'cjs', nodePaths: ['D:/ghassan/mobile/node_modules'], external: ['react-native'], plugins: [stubs], logLevel: 'error',
  entryPoints: [path.join(here, 'entry.ts')], outfile: path.join(here, 'bundle.cjs'),
  define: { 'process.env.EXPO_PUBLIC_API_BASE_URL': JSON.stringify('http://127.0.0.1:8099'), 'process.env.NODE_ENV': '"development"' },
})
console.log('bundled')
