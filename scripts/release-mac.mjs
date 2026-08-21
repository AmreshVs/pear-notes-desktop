import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const configPath = path.join(root, '.release.mac.env')
const packagePath = path.join(root, 'package.json')

const REQUIRED = [
  'APPLE_BUNDLE_ID',
  'MAS_CODESIGN_IDENTITY',
  'MAS_INSTALLER_IDENTITY',
  'MAS_PROVISIONING_PROFILE'
]
const UPLOAD_REQUIRED = ['ASC_KEY_ID', 'ASC_ISSUER_ID']
const NETWORK_RETRY_PATTERN = /ECONNRESET|ETIMEDOUT|socket hang up|EAI_AGAIN/i
const BUILD_ATTEMPTS = 3

const ansi = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
  reset: '\x1b[0m'
}
const ok = (m) => console.log(`${ansi.green}  ok${ansi.reset}  ${m}`)
const warn = (m) => console.log(`${ansi.yellow}  !!${ansi.reset}  ${m}`)
const step = (m) => console.log(`\n${ansi.dim}==>${ansi.reset} ${m}`)

class ReleaseError extends Error {
  constructor(message, hint) {
    super(message)
    this.hint = hint
  }
}

function parseArgs(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith('--')))
  return {
    checkOnly: flags.has('--check'),
    upload: flags.has('--upload'),
    skipValidate: flags.has('--skip-validate'),
    bump: !flags.has('--no-bump')
  }
}

function loadConfig() {
  const config = {}
  if (fs.existsSync(configPath)) {
    for (const line of fs.readFileSync(configPath, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, '')
      config[key] = value
    }
  }
  for (const key of [...REQUIRED, ...UPLOAD_REQUIRED]) {
    if (process.env[key]) config[key] = process.env[key]
  }
  return config
}

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...opts })
  if (result.error) throw result.error
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`
  }
}

function requireIdentity(name, label) {
  const { output } = run('security', ['find-identity', '-v'])
  if (!output.includes(name)) {
    throw new ReleaseError(
      `${label} not found in the keychain: ${name}`,
      'Run "security find-identity -v" and copy the identity string verbatim into .release.mac.env'
    )
  }
  ok(`${label} present`)
}

function readProfile(profilePath) {
  if (!fs.existsSync(profilePath)) {
    throw new ReleaseError(
      `Provisioning profile not found: ${profilePath}`,
      'Download a Mac App Store distribution profile from developer.apple.com and point MAS_PROVISIONING_PROFILE at it'
    )
  }
  const decoded = run('security', ['cms', '-D', '-i', profilePath], { maxBuffer: 1 << 24 })
  if (decoded.status !== 0)
    throw new ReleaseError(`Could not decode provisioning profile: ${profilePath}`)

  const tmp = path.join(process.env.TMPDIR ?? '/tmp', `release-mac-${process.pid}.plist`)
  fs.writeFileSync(tmp, decoded.stdout)
  try {
    const extract = (key, format) =>
      run('plutil', ['-extract', key, format, '-o', '-', tmp]).stdout.trim()
    return {
      name: extract('Name', 'raw'),
      expires: extract('ExpirationDate', 'raw'),
      entitlements: JSON.parse(extract('Entitlements', 'json'))
    }
  } finally {
    fs.rmSync(tmp, { force: true })
  }
}

function checkProfile(config) {
  const profile = readProfile(config.MAS_PROVISIONING_PROFILE)
  const appId = profile.entitlements['com.apple.application-identifier'] ?? ''
  const team = profile.entitlements['com.apple.developer.team-identifier'] ?? ''
  const expected = `${team}.${config.APPLE_BUNDLE_ID}`

  if (appId !== expected) {
    throw new ReleaseError(
      `Profile is for "${appId}" but APPLE_BUNDLE_ID resolves to "${expected}"`,
      'The profile and the bundle id must match, or the upload is rejected'
    )
  }

  const daysLeft = Math.floor((Date.parse(profile.expires) - Date.now()) / 86400000)
  if (daysLeft < 0) {
    throw new ReleaseError(
      `Provisioning profile expired ${-daysLeft} days ago`,
      'Regenerate it on developer.apple.com'
    )
  }
  if (daysLeft < 30) warn(`profile "${profile.name}" expires in ${daysLeft} days`)

  const groups = profile.entitlements['com.apple.security.application-groups'] ?? []
  const injected = `${team}.${config.APPLE_BUNDLE_ID}`
  const covered = groups.some(
    (g) => g === injected || (g.endsWith('.*') && injected.startsWith(g.slice(0, -1)))
  )
  if (!covered) {
    throw new ReleaseError(
      `Profile does not authorize the app group "${injected}"`,
      'osx-sign injects this group at signing time. Register it under Identifiers -> App Groups and attach it to the App ID, then regenerate the profile'
    )
  }

  ok(`profile "${profile.name}" matches ${appId}, ${daysLeft} days left`)
}

function ascToken(config) {
  const keyPath = path.join(
    process.env.HOME,
    '.appstoreconnect',
    'private_keys',
    `AuthKey_${config.ASC_KEY_ID}.p8`
  )
  if (!fs.existsSync(keyPath)) {
    throw new ReleaseError(
      `App Store Connect key not found: ${keyPath}`,
      'The filename must be exactly AuthKey_<KEYID>.p8 — altool will not find it otherwise'
    )
  }
  const key = fs.readFileSync(keyPath)
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const issued = Math.floor(Date.now() / 1000)
  const header = encode({ alg: 'ES256', kid: config.ASC_KEY_ID, typ: 'JWT' })
  const payload = encode({
    iss: config.ASC_ISSUER_ID,
    iat: issued,
    exp: issued + 600,
    aud: 'appstoreconnect-v1'
  })
  const signature = crypto
    .sign('sha256', Buffer.from(`${header}.${payload}`), { key, dsaEncoding: 'ieee-p1363' })
    .toString('base64url')
  return `${header}.${payload}.${signature}`
}

async function checkAppRecord(config) {
  const response = await fetch('https://api.appstoreconnect.apple.com/v1/apps?limit=200', {
    headers: { Authorization: `Bearer ${ascToken(config)}` }
  })
  const body = await response.json()
  if (body.errors) {
    throw new ReleaseError(
      `App Store Connect rejected the API key: ${body.errors[0]?.detail ?? response.status}`,
      'Check ASC_KEY_ID and ASC_ISSUER_ID in .release.mac.env'
    )
  }
  const app = (body.data ?? []).find((a) => a.attributes.bundleId === config.APPLE_BUNDLE_ID)
  if (!app) {
    throw new ReleaseError(
      `No App Store Connect record for "${config.APPLE_BUNDLE_ID}"`,
      'Create it at App Store Connect -> Apps -> + -> New App, platform macOS. The API cannot create app records'
    )
  }
  ok(`app record "${app.attributes.name}" (id ${app.id})`)
}

function bumpBuildNumber() {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  const next = String(Number(pkg.masBuildNumber ?? '0') + 1)
  pkg.masBuildNumber = next
  fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`)
  return next
}

function currentBuildNumber() {
  return String(JSON.parse(fs.readFileSync(packagePath, 'utf8')).masBuildNumber ?? '1')
}

function build(config) {
  const env = {
    ...process.env,
    APPLE_BUNDLE_ID: config.APPLE_BUNDLE_ID,
    MAS_CODESIGN_IDENTITY: config.MAS_CODESIGN_IDENTITY,
    MAS_INSTALLER_IDENTITY: config.MAS_INSTALLER_IDENTITY,
    MAS_PROVISIONING_PROFILE: config.MAS_PROVISIONING_PROFILE,
    MAS_BUILD: '1'
  }

  for (let attempt = 1; attempt <= BUILD_ATTEMPTS; attempt++) {
    fs.rmSync(path.join(root, 'out', 'make'), { recursive: true, force: true })
    const result = spawnSync('npm', ['run', 'make:mas'], { cwd: root, env, encoding: 'utf8' })
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
    if (result.status === 0) return

    if (NETWORK_RETRY_PATTERN.test(output) && attempt < BUILD_ATTEMPTS) {
      warn(`network error during build (attempt ${attempt}/${BUILD_ATTEMPTS}), retrying`)
      continue
    }
    process.stdout.write(output)
    throw new ReleaseError('Build failed')
  }
}

function locateArtifacts() {
  const appDir = path.join(root, 'out', 'PearNotes-mas-arm64', 'PearNotes.app')
  const makeDir = path.join(root, 'out', 'make')
  const pkgName = fs.existsSync(makeDir)
    ? fs.readdirSync(makeDir).find((f) => f.endsWith('.pkg'))
    : null
  if (!fs.existsSync(appDir) || !pkgName) throw new ReleaseError('Build produced no .app/.pkg')
  return { appDir, pkgPath: path.join(makeDir, pkgName) }
}

function verifyArtifacts(config, { appDir, pkgPath }) {
  if (!fs.existsSync(path.join(appDir, 'Contents', 'embedded.provisionprofile'))) {
    throw new ReleaseError(
      'No embedded.provisionprofile in the signed app',
      'MAS_PROVISIONING_PROFILE was not picked up by the signing step'
    )
  }
  ok('provisioning profile embedded')

  const verify = run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', appDir])
  if (verify.status !== 0) {
    process.stdout.write(verify.output)
    throw new ReleaseError('codesign verification failed')
  }
  ok('signature valid, satisfies its Designated Requirement')

  const sidecar = path.join(appDir, 'Contents', 'MacOS', 'bare')
  if (!fs.existsSync(sidecar)) {
    throw new ReleaseError(
      'bare sidecar is not in Contents/MacOS',
      'The packageAfterPrune hook in forge.config.cjs did not run. A sidecar left under Resources fails App Store validation'
    )
  }
  ok('bare sidecar relocated to Contents/MacOS')

  const frameworks = path.join(appDir, 'Contents', 'Frameworks')
  const helpers = fs.existsSync(frameworks)
    ? fs
        .readdirSync(frameworks)
        .filter((n) => n.endsWith('.app'))
        .map((n) => path.join(frameworks, n))
    : []
  for (const target of [sidecar, ...helpers]) {
    const entitlements = run('codesign', ['-d', '--entitlements', '-', target]).output
    for (const required of ['app-sandbox', 'inherit', 'allow-jit']) {
      if (!entitlements.includes(required)) {
        throw new ReleaseError(
          `${path.basename(target)} is missing the ${required} entitlement`,
          required === 'allow-jit'
            ? 'Nested code runs V8 under hardened runtime. Without allow-jit the process dies with "V8 process OOM (Failed to reserve virtual memory for CodeRange)" and the window renders blank'
            : 'Check build/entitlements.mas.inherit.plist'
        )
      }
    }
  }
  ok(`nested code signed with inherit + allow-jit (${helpers.length} helpers + sidecar)`)

  const plist = path.join(appDir, 'Contents', 'Info.plist')
  const bundleId = run('plutil', [
    '-extract',
    'CFBundleIdentifier',
    'raw',
    '-o',
    '-',
    plist
  ]).stdout.trim()
  if (bundleId !== config.APPLE_BUNDLE_ID) {
    throw new ReleaseError(
      `Built bundle id "${bundleId}" does not match APPLE_BUNDLE_ID "${config.APPLE_BUNDLE_ID}"`
    )
  }
  const buildNumber = run('plutil', [
    '-extract',
    'CFBundleVersion',
    'raw',
    '-o',
    '-',
    plist
  ]).stdout.trim()
  const sizeMb = Math.round(fs.statSync(pkgPath).size / 1e6)
  ok(`${bundleId} build ${buildNumber} — ${path.basename(pkgPath)} (${sizeMb} MB)`)
}

function altool(config, action, pkgPath) {
  const result = spawnSync(
    'xcrun',
    [
      'altool',
      action,
      '-f',
      pkgPath,
      '-t',
      'macos',
      '--apiKey',
      config.ASC_KEY_ID,
      '--apiIssuer',
      config.ASC_ISSUER_ID
    ],
    { cwd: root, encoding: 'utf8' }
  )
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  if (result.status !== 0) {
    process.stdout.write(output)
    throw new ReleaseError(`altool ${action} failed`)
  }
  return output
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const config = loadConfig()

  step('Preflight')
  const missing = [
    ...REQUIRED,
    ...(args.upload || !args.skipValidate ? UPLOAD_REQUIRED : [])
  ].filter((key) => !config[key])
  if (missing.length) {
    throw new ReleaseError(
      `Missing configuration: ${missing.join(', ')}`,
      `Copy .release.mac.env.example to .release.mac.env and fill it in`
    )
  }
  ok(`bundle id ${config.APPLE_BUNDLE_ID}`)
  requireIdentity(config.MAS_CODESIGN_IDENTITY, 'application signing identity')
  requireIdentity(config.MAS_INSTALLER_IDENTITY, 'installer signing identity')
  checkProfile(config)
  if (config.ASC_KEY_ID && config.ASC_ISSUER_ID) await checkAppRecord(config)

  if (args.checkOnly) {
    console.log('\nPreflight passed. Nothing was built.')
    return
  }

  const buildNumber = args.bump ? bumpBuildNumber() : currentBuildNumber()
  step(`Building ${config.APPLE_BUNDLE_ID} build ${buildNumber}`)
  build(config)

  step('Verifying artifacts')
  const artifacts = locateArtifacts()
  verifyArtifacts(config, artifacts)

  if (!args.skipValidate) {
    step('Validating with App Store Connect')
    altool(config, '--validate-app', artifacts.pkgPath)
    ok('validation passed')
  }

  if (args.upload) {
    step('Uploading')
    altool(config, '--upload-app', artifacts.pkgPath)
    ok(`uploaded build ${buildNumber}`)
    console.log('\nThe build appears under TestFlight once processing finishes.')
  } else {
    console.log(`\n${artifacts.pkgPath}`)
    console.log('Re-run with --upload to send it to App Store Connect.')
  }
}

main().catch((error) => {
  console.error(`\n${ansi.red}FAILED${ansi.reset}  ${error.message}`)
  if (error.hint) console.error(`${ansi.dim}hint${ansi.reset}    ${error.hint}`)
  process.exit(1)
})
