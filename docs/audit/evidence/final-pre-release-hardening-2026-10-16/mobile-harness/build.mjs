import { createRequire } from 'node:module'
import path from 'node:path'
const require = createRequire('D:/ghassan/frontend/package.json')
const esbuild = require('esbuild')
const here = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1')
const stub = { '../auth/authStorage': 'authStorage.js', '../services/queryClient': 'queryClient.js', '../state/authStore': 'authStore.js' }
await esbuild.build({
  entryPoints: ['D:/ghassan/mobile/src/api/auth.api.ts'],
  bundle: true, platform: 'node', format: 'cjs', outfile: path.join(here, 'bundle.cjs'), packages: 'external',
  nodePaths: ['D:/ghassan/mobile/node_modules'],
  define: { 'process.env.EXPO_PUBLIC_API_BASE_URL': JSON.stringify(process.env.API_URL || 'http://127.0.0.1:8099') },
  plugins: [{ name: 'stubs', setup(b) { b.onResolve({ filter: /^\.\.\/(auth\/authStorage|services\/queryClient|state\/authStore)$/ }, (a) => ({ path: path.join(here, 'stubs', stub[a.path]) })) } }],
})
console.log('bundled')
