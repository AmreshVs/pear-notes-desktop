import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const clientFile = path.join(
  projectRoot,
  'local-ai',
  'node_modules',
  '@qvac',
  'sdk',
  'dist',
  'src',
  'client',
  'rpc',
  'node-rpc-client.js'
)

const PATCHES = [
  {
    name: 'IPC socket name',
    original: 'const socketName = `qvac-worker-${process.pid}-${timestamp}-${randomSuffix}`;',
    patched: 'const socketName = `q${process.pid}-${randomSuffix}`;',
    reason: 'so the socket path fits macOS sandbox containers'
  },
  {
    name: 'worker home directory',
    original: "HOME_DIR: process.env['SNAP_USER_COMMON']",
    patched:
      "HOME_DIR: process.env['QVAC_HOME_DIR'] ? String(process.env['QVAC_HOME_DIR']) : process.env['SNAP_USER_COMMON']",
    reason: 'so KV caches and other worker files stay inside the app AI folder'
  }
]

if (!fs.existsSync(clientFile)) {
  console.log('local-ai SDK is not installed, skipping the QVAC client patches')
  process.exit(0)
}

let source = fs.readFileSync(clientFile, 'utf8')
for (const patch of PATCHES) {
  if (source.includes(patch.patched)) {
    console.log(`QVAC ${patch.name} already patched`)
    continue
  }
  if (!source.includes(patch.original)) {
    console.error(
      `Could not find the QVAC ${patch.name} in node-rpc-client.js. The SDK changed; update scripts/patch-qvac-client.mjs.`
    )
    process.exit(1)
  }
  source = source.replace(patch.original, patch.patched)
  console.log(`Patched the QVAC ${patch.name} ${patch.reason}`)
}
fs.writeFileSync(clientFile, source)
