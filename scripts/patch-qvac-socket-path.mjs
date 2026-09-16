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

const ORIGINAL = 'const socketName = `qvac-worker-${process.pid}-${timestamp}-${randomSuffix}`;'
const PATCHED = 'const socketName = `q${process.pid}-${randomSuffix}`;'

if (!fs.existsSync(clientFile)) {
  console.log('local-ai SDK is not installed, skipping IPC socket path patch')
  process.exit(0)
}

const source = fs.readFileSync(clientFile, 'utf8')

if (source.includes(PATCHED)) {
  console.log('QVAC IPC socket path already shortened')
  process.exit(0)
}

if (!source.includes(ORIGINAL)) {
  console.error(
    'Could not find the QVAC IPC socket name in node-rpc-client.js. The SDK changed; update scripts/patch-qvac-socket-path.mjs.'
  )
  process.exit(1)
}

fs.writeFileSync(clientFile, source.replace(ORIGINAL, PATCHED))
console.log('Shortened the QVAC IPC socket name so the path fits macOS sandbox containers')
