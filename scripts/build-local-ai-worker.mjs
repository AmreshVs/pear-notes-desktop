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

if (!fs.existsSync(path.join(sdkDir, 'package.json'))) {
  console.error('local-ai dependencies are missing. Run npm install in local-ai first.')
  process.exit(1)
}

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
