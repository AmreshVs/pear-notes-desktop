import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const runtimeRoot = path.join(projectRoot, 'local-ai')
const sdkDir = path.join(runtimeRoot, 'node_modules', '@qvac', 'sdk')
const configPath = path.join(runtimeRoot, 'qvac.config.json')
const manifestPath = path.join(runtimeRoot, 'qvac', 'addons.manifest.json')

const DESKTOP_HOSTS = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'win32-x64']
const DEFERRED_MODULES = ['expo-file-system', 'react-native-bare-kit', '@qvac/decoder-audio', 'bare-ffmpeg']

const socketPatch = spawnSync(process.execPath, [path.join(projectRoot, 'scripts', 'patch-qvac-socket-path.mjs')], {
  stdio: 'inherit'
})
if (socketPatch.status !== 0) process.exit(socketPatch.status ?? 1)

if (!fs.existsSync(path.join(sdkDir, 'package.json'))) {
  console.error('local-ai dependencies are missing. Run npm install in local-ai first.')
  process.exit(1)
}

const bundlePath = path.join(runtimeRoot, 'qvac', 'worker.bundle.js')
const bundleInputs = [
  configPath,
  path.join(runtimeRoot, 'package-lock.json'),
  path.join(sdkDir, 'package.json')
]

function isBundleCurrent() {
  if (process.env.LOCAL_AI_REBUILD === '1') return false
  if (!fs.existsSync(bundlePath) || !fs.existsSync(manifestPath)) return false
  const bundleTime = fs.statSync(bundlePath).mtimeMs
  return bundleInputs.every((input) => !fs.existsSync(input) || fs.statSync(input).mtimeMs <= bundleTime)
}

const registryModels = await import(
  pathToFileURL(
    path.join(runtimeRoot, 'node_modules', '@qvac', 'inference', 'dist', 'models', 'registry', 'models.js')
  ).href
)
const { findLocalAiRegistryMismatches, findMissingLocalAiModelNames } = await import(
  '@pear-notes/core/store/services/localAiRegistryCheck.js'
)
const localeModelNames = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'src', 'locales', 'en.json'), 'utf8')
).settings?.onDeviceAi?.modelNames
const registryProblems = [
  ...findLocalAiRegistryMismatches(registryModels),
  ...findMissingLocalAiModelNames(localeModelNames)
]
if (registryProblems.length) {
  console.error(
    `The local AI model catalog doesn't match the installed QVAC SDK:\n  ${registryProblems.join('\n  ')}`
  )
  process.exit(1)
}

if (isBundleCurrent()) {
  console.log('Local AI worker is up to date.')
  process.exit(0)
}

const MIN_BUNDLER_NODE_MAJOR = 24
if (Number(process.versions.node.split('.')[0]) < MIN_BUNDLER_NODE_MAJOR) {
  console.error(
    `Building the local AI worker needs Node ${MIN_BUNDLER_NODE_MAJOR} or newer (bare-module-lexer crashes on Node ${process.versions.node}). Run: nvm use 24 && node scripts/build-local-ai-worker.mjs`
  )
  process.exit(1)
}

process.env.PATH = [path.dirname(process.execPath), process.env.PATH].filter(Boolean).join(path.delimiter)

const { bundleSdk, verifyBundle, hasErrors, formatVerifyBundleResult } = await import(
  pathToFileURL(path.join(sdkDir, 'dist', 'src', 'commands', 'index.js')).href
)

const result = await bundleSdk({
  projectRoot: runtimeRoot,
  sdkPath: sdkDir,
  configPath,
  hosts: DESKTOP_HOSTS,
  defer: DEFERRED_MODULES,
  quiet: true
})

const verification = await verifyBundle({
  projectRoot: runtimeRoot,
  addonsSource: result.bundlePath,
  hosts: DESKTOP_HOSTS,
  configPath
})

if (hasErrors(verification)) {
  console.error(formatVerifyBundleResult(verification))
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const addons = Array.isArray(manifest.addons) ? manifest.addons : []
console.log(`Local AI worker ready with ${addons.length} native addons: ${addons.join(', ')}`)
