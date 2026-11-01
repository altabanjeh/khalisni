// Bundles mobile/src/utils/serviceForms.ts for Node (no React Native) for run.cjs.
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire('D:/ghassan/frontend/package.json')
const esbuild = require('esbuild')
await esbuild.build({ entryPoints: ['D:/ghassan/mobile/src/utils/serviceForms.ts'], bundle: true, platform: 'node', format: 'cjs',
  outfile: path.join(here, 'serviceForms.cjs'), nodePaths: ['D:/ghassan/mobile/node_modules'], external: ['react-native'], logLevel: 'error' })
console.log('bundled')
