import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import coreInstall from './coreInstall.cjs'
import { macSdkEnv } from './mac-sdk-env.cjs'
import { formatDuration, streamCommand } from './progress.mjs'
import { storeBuild } from '../electron/storeBuild.cjs'

Object.assign(process.env, macSdkEnv())

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const configPath = path.join(root, '.release.mac.env')
const packagePath = path.join(root, 'package.json')
const appName = JSON.parse(fs.readFileSync(packagePath, 'utf8')).productName

const REQUIRED = [
  'APPLE_BUNDLE_ID',
  'MAS_CODESIGN_IDENTITY',
  'MAS_INSTALLER_IDENTITY',
  'MAS_PROVISIONING_PROFILE'
]
const UPLOAD_REQUIRED = ['ASC_KEY_ID', 'ASC_ISSUER_ID']
const DMG_REQUIRED = ['APPLE_BUNDLE_ID', 'MAC_CODESIGN_IDENTITY', ...UPLOAD_REQUIRED]
const DMG_ARCH = 'arm64'
const APP_STORE_CERT_OID = '1.2.840.113635.100.6.1.9'
const TESTFLIGHT_CERT_OID = '1.2.840.113635.100.6.1.25.1'
const NETWORK_RETRY_PATTERN = /ECONNRESET|ETIMEDOUT|socket hang up|EAI_AGAIN/i
const BUILD_ATTEMPTS = 3

const ansi = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
}
const ok = (m) => console.log(`${ansi.green}  ok${ansi.reset}  ${m}`)
const warn = (m) => console.log(`${ansi.yellow}  !!${ansi.reset}  ${m}`)

const startedAt = Date.now()
let stepIndex = 0
let stepCount = 0

const step = (m) => {
  stepIndex += 1
  const counter = stepCount ? ` ${stepIndex}/${stepCount}` : ''
  console.log(
    `\n${ansi.dim}==>${ansi.reset}${ansi.bold}${counter}${ansi.reset} ${m} ${ansi.dim}(${formatDuration(Date.now() - startedAt)} in)${ansi.reset}`
  )
}

const took = (ms) => console.log(`${ansi.dim}      took ${formatDuration(ms)}${ansi.reset}`)

const HYPERCORE_FIRST_BAD = [11, 35, 5]

function isHypercoreWithLinkingHang(version) {
  const parts = version.split('.').map(Number)
  const index = parts.findIndex((part, i) => part !== HYPERCORE_FIRST_BAD[i])
  return index === -1 || parts[index] > HYPERCORE_FIRST_BAD[index]
}

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
    dmg: flags.has('--dmg'),
    upload: flags.has('--upload'),
    skipValidate: flags.has('--skip-validate'),
    bump: flags.has('--bump'),
    commit: !flags.has('--no-commit')
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
  for (const key of [...REQUIRED, ...DMG_REQUIRED]) {
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

// Listing an identity does not prove its private key is usable from this
// process, and @electron/packager swallows osxSign errors, so a locked or
// inaccessible key otherwise ships an ad-hoc signed app minutes later.
function requireSigningAccess(name, label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pear-notes-sign-'))
  try {
    const probe = path.join(dir, 'probe')
    fs.copyFileSync('/usr/bin/true', probe)
    const { status, output } = run('codesign', ['--force', '--sign', name, probe])
    if (status !== 0) {
      process.stdout.write(output)
      throw new ReleaseError(
        `Cannot sign with the ${label}: ${name}`,
        'Run the release from a normal Terminal session with the login keychain unlocked (security unlock-keychain), and allow codesign to use the key'
      )
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
  ok(`${label} usable for signing`)
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

function ascKeyPath(config) {
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
  return keyPath
}

function ascToken(config) {
  const key = fs.readFileSync(ascKeyPath(config))
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
  pkg.buildNumber = Number(pkg.buildNumber ?? 0) + 1
  fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`)
  return String(storeBuild(pkg.version, pkg.buildNumber))
}

function currentBuildNumber() {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  return String(storeBuild(pkg.version, pkg.buildNumber))
}

function isGitRepo() {
  return run('git', ['-C', root, 'rev-parse', '--git-dir']).status === 0
}

function commitBuildNumber(buildNumber) {
  if (!isGitRepo()) {
    return warn(`not a git repository - build ${buildNumber} is not recorded in history`)
  }

  const staged = run('git', ['-C', root, 'diff', '--quiet', '--', 'package.json'])
  if (staged.status === 0) {
    return ok(`package.json already matches build ${buildNumber}`)
  }

  const commit = run('git', [
    '-C',
    root,
    'commit',
    '--only',
    'package.json',
    '-m',
    `Bump build to ${buildNumber}`
  ])

  if (commit.status !== 0) {
    process.stdout.write(commit.output)
    throw new ReleaseError(
      `could not commit the build number bump`,
      'Commit package.json yourself, or re-run with --no-commit to leave it dirty'
    )
  }

  const sha = run('git', ['-C', root, 'rev-parse', '--short', 'HEAD']).stdout.trim()
  ok(`committed build ${buildNumber} as ${sha}`)
}

const SOCKET_FIREWALL = '/usr/local/bin/sfw'

async function installLocalAiRuntime() {
  const cwd = path.join(root, 'local-ai')
  const [command, args] = fs.existsSync(SOCKET_FIREWALL)
    ? [SOCKET_FIREWALL, ['npm', 'ci']]
    : ['npm', ['ci']]
  const { status, output, durationMs } = await streamCommand(command, args, {
    cwd,
    heartbeat: 'still installing'
  })

  if (status !== 0) {
    process.stdout.write(output)
    throw new ReleaseError(
      'Could not install the on-device AI runtime',
      'Run npm ci in local-ai and check the error above'
    )
  }
  took(durationMs)
}

async function build(config) {
  await installLocalAiRuntime()

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

    const { status, output, durationMs } = await streamCommand('npm', ['run', 'make:mas'], {
      cwd: root,
      env,
      heartbeat: 'still building'
    })

    if (status === 0) return took(durationMs)

    if (NETWORK_RETRY_PATTERN.test(output) && attempt < BUILD_ATTEMPTS) {
      warn(`network error during build (attempt ${attempt}/${BUILD_ATTEMPTS}), retrying`)
      continue
    }
    throw new ReleaseError(`Build failed after ${formatDuration(durationMs)}`)
  }
}

function locateArtifacts() {
  const appDir = path.join(root, 'out', `${appName}-mas-arm64`, `${appName}.app`)
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

  const { sidecar, localAiRuntime, helpers } = verifyBundle(config, appDir)

  for (const target of [sidecar, localAiRuntime, ...helpers]) {
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
  ok(
    `nested code signed with inherit + allow-jit (${helpers.length} helpers, sidecar and AI runtime)`
  )

  const sizeMb = Math.round(fs.statSync(pkgPath).size / 1e6)
  ok(`${path.basename(pkgPath)} (${sizeMb} MB)`)
}

function verifyBundle(config, appDir) {
  const verify = run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', appDir])
  if (verify.status !== 0) {
    process.stdout.write(verify.output)
    const adhoc = run('codesign', ['-dv', appDir]).output.includes('Signature=adhoc')
    throw new ReleaseError(
      'codesign verification failed',
      adhoc
        ? 'The app is only ad-hoc signed: the signing step failed and @electron/packager hid the error. Check that the signing key is usable from this session'
        : undefined
    )
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

  const localAiRuntime = path.join(appDir, 'Contents', 'MacOS', 'bare-local-ai')
  const localAiSdk = path.join(
    appDir,
    'Contents',
    'Resources',
    'app',
    'local-ai',
    'node_modules',
    '@qvac',
    'sdk',
    'package.json'
  )
  const localAiWorker = path.join(
    appDir,
    'Contents',
    'Resources',
    'app',
    'local-ai',
    'qvac',
    'worker.entry.mjs'
  )
  if (
    !fs.existsSync(localAiRuntime) ||
    !fs.existsSync(localAiSdk) ||
    !fs.existsSync(localAiWorker)
  ) {
    throw new ReleaseError(
      'On-device AI runtime is incomplete in the app',
      'Expected Contents/MacOS/bare-local-ai, the @qvac/sdk package and local-ai/qvac/worker.entry.mjs. Check the generateAssets and packageAfterPrune hooks in forge.config.cjs'
    )
  }
  const packagedRpcClient = path.join(
    appDir,
    'Contents/Resources/app/local-ai/node_modules/@qvac/sdk/dist/src/client/rpc/node-rpc-client.js'
  )
  const packagedRpcSource = fs.readFileSync(packagedRpcClient, 'utf8')
  if (!packagedRpcSource.includes('const socketName = `q${process.pid}')) {
    throw new ReleaseError(
      'The QVAC IPC socket name is not shortened in the packaged app',
      'A sandboxed app has a long container path, so the default socket name exceeds the 104 character limit and every AI call fails with listen EINVAL. Run node scripts/patch-qvac-client.mjs'
    )
  }
  if (!packagedRpcSource.includes("process.env['QVAC_HOME_DIR']")) {
    throw new ReleaseError(
      'The QVAC worker home directory is not patched in the packaged app',
      'Without it Ask KV caches (note text) land in the container home instead of the AI folder that wipes clear. Run node scripts/patch-qvac-client.mjs'
    )
  }
  ok('on-device AI runtime packaged, worker binary in Contents/MacOS')

  const appModules = path.join(appDir, 'Contents', 'Resources', 'app', 'node_modules')
  for (const manifest of [
    path.join(appModules, 'hypercore', 'package.json'),
    path.join(appModules, '@pear-notes', 'core', 'node_modules', 'hypercore', 'package.json')
  ]) {
    if (!fs.existsSync(manifest)) continue
    const { version } = JSON.parse(fs.readFileSync(manifest, 'utf8'))
    if (isHypercoreWithLinkingHang(version)) {
      throw new ReleaseError(
        `The packaged hypercore is ${version}`,
        'hypercore 11.35.5 and later hang a joiner in multi-device linking. Keep it at 11.35.4 or below'
      )
    }
  }
  ok('packaged hypercore predates the linking hang')

  const frameworks = path.join(appDir, 'Contents', 'Frameworks')
  const helpers = fs.existsSync(frameworks)
    ? fs
        .readdirSync(frameworks)
        .filter((n) => n.endsWith('.app'))
        .map((n) => path.join(frameworks, n))
    : []

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
  ok(`${bundleId} build ${buildNumber}`)

  return { sidecar, localAiRuntime, helpers }
}

function developerIdEnv(config) {
  const env = {
    ...process.env,
    APPLE_BUNDLE_ID: config.APPLE_BUNDLE_ID,
    MAC_CODESIGN_IDENTITY: config.MAC_CODESIGN_IDENTITY
  }
  delete env.MAS_BUILD
  delete env.MAS_CODESIGN_IDENTITY
  return env
}

function notaryAuth(config) {
  return [
    '--key',
    ascKeyPath(config),
    '--key-id',
    config.ASC_KEY_ID,
    '--issuer',
    config.ASC_ISSUER_ID
  ]
}

function checkCorePin() {
  const { level, detail } = coreInstall.checkCorePinRef(root)
  if (level === 'fail') {
    throw new ReleaseError(
      detail,
      'Set the core version: npm run core:bump <version>, or node ../scripts/bump.js > Mobile + desktop > Use a core version from npm'
    )
  }
  if (level === 'warn') warn(detail)
  else ok(detail)
}

function checkNotaryCredentials(config) {
  const history = run('xcrun', ['notarytool', 'history', ...notaryAuth(config)])
  if (history.status !== 0) {
    process.stdout.write(history.output)
    throw new ReleaseError(
      'The notary service rejected the App Store Connect API key',
      'Notarization needs a Team key with the Developer role or higher, created under Users and Access -> Integrations'
    )
  }
  ok('notary service accepts the API key')
}

async function forge(config, args, heartbeat) {
  for (let attempt = 1; attempt <= BUILD_ATTEMPTS; attempt++) {
    const { status, output, durationMs } = await streamCommand('npx', ['--no-install', ...args], {
      cwd: root,
      env: developerIdEnv(config),
      heartbeat
    })

    if (status === 0) return took(durationMs)

    if (NETWORK_RETRY_PATTERN.test(output) && attempt < BUILD_ATTEMPTS) {
      warn(`network error (attempt ${attempt}/${BUILD_ATTEMPTS}), retrying`)
      continue
    }
    throw new ReleaseError(
      `${args.slice(0, 2).join(' ')} failed after ${formatDuration(durationMs)}`
    )
  }
}

async function buildDeveloperId(config) {
  await installLocalAiRuntime()

  const { status, output } = await streamCommand('npm', ['run', 'build'], { cwd: root })
  if (status !== 0) {
    process.stdout.write(output)
    throw new ReleaseError('vite build failed')
  }

  await forge(
    config,
    ['electron-forge', 'package', '--platform=mas', `--arch=${DMG_ARCH}`],
    'still packaging'
  )
}

function verifyDeveloperIdApp(config, appDir) {
  const { sidecar, localAiRuntime, helpers } = verifyBundle(config, appDir)

  const identity = run('codesign', ['-dvv', appDir]).output
  if (!identity.includes(`Authority=${config.MAC_CODESIGN_IDENTITY}`)) {
    throw new ReleaseError(
      `The app is not signed by ${config.MAC_CODESIGN_IDENTITY}`,
      'Check MAC_CODESIGN_IDENTITY in .release.mac.env'
    )
  }

  const requirement = run('codesign', ['-d', '-r-', appDir]).output
  for (const oid of [APP_STORE_CERT_OID, TESTFLIGHT_CERT_OID]) {
    if (!requirement.includes(oid)) {
      throw new ReleaseError(
        `The designated requirement does not accept the ${oid} signature`,
        'Without it the App Store build cannot read the keychain key this install creates, and cannot open its vault'
      )
    }
  }
  ok('designated requirement also accepts App Store and TestFlight signatures')

  const appEntitlements = run('codesign', ['-d', '--entitlements', '-', appDir]).output
  const group = `${teamIdOf(config.MAC_CODESIGN_IDENTITY)}.${config.APPLE_BUNDLE_ID}`
  if (!appEntitlements.includes('app-sandbox') || !appEntitlements.includes(group)) {
    throw new ReleaseError(
      `The app is not sandboxed with the app group ${group}`,
      'The DMG must use the App Store container, or moving to the App Store build loses the vault'
    )
  }
  if (appEntitlements.includes('application-identifier')) {
    throw new ReleaseError(
      'The app carries com.apple.application-identifier',
      'That entitlement needs a provisioning profile outside the App Store, and the app will not launch'
    )
  }
  ok(`sandboxed in the App Store container, app group ${group}`)

  for (const target of [appDir, sidecar, localAiRuntime, ...helpers]) {
    const details = run('codesign', ['-dv', target]).output
    if (!/flags=0x[0-9a-f]*\([^)]*runtime/.test(details)) {
      throw new ReleaseError(
        `${path.basename(target)} is not signed with the hardened runtime`,
        'Notarization rejects any executable without it'
      )
    }
    const entitlements = run('codesign', ['-d', '--entitlements', '-', target]).output
    for (const required of ['app-sandbox', 'allow-jit']) {
      if (!entitlements.includes(required)) {
        throw new ReleaseError(
          `${path.basename(target)} is missing the ${required} entitlement`,
          required === 'allow-jit'
            ? 'V8 cannot reserve its code range under hardened runtime without it, and the window renders blank'
            : 'Nested code must inherit the sandbox. Check build/entitlements.mas.inherit.plist'
        )
      }
    }
  }
  ok(
    `hardened runtime, sandbox and allow-jit on the app, ${helpers.length} helpers, sidecar and AI runtime`
  )
}

function teamIdOf(identity) {
  const teamId = identity.match(/\(([A-Z0-9]{10})\)$/)?.[1]
  if (!teamId) throw new ReleaseError(`Cannot read the team id from ${identity}`)
  return teamId
}

async function notarize(config, file, label) {
  const { status, output } = await streamCommand(
    'xcrun',
    ['notarytool', 'submit', file, ...notaryAuth(config), '--wait', '--output-format', 'json'],
    { cwd: root, heartbeat: `still notarizing ${label}` }
  )
  const id = output.match(/"id"\s*:\s*"([^"]+)"/)?.[1]
  const result = output.match(/"status"\s*:\s*"([^"]+)"/)?.[1]

  if (status !== 0 || result !== 'Accepted') {
    if (id) {
      const log = run('xcrun', ['notarytool', 'log', id, ...notaryAuth(config)])
      process.stdout.write(log.output)
    }
    throw new ReleaseError(
      `Notarization of ${label} ended with status ${result ?? 'unknown'}`,
      id ? `The notary log is printed above (submission ${id})` : undefined
    )
  }
  ok(`${label} notarized (submission ${id})`)
}

function staple(target) {
  const stapled = run('xcrun', ['stapler', 'staple', target])
  if (stapled.status !== 0) {
    process.stdout.write(stapled.output)
    throw new ReleaseError(`Could not staple the notarization ticket to ${path.basename(target)}`)
  }
  ok(`ticket stapled to ${path.basename(target)}`)
}

function assess(args, label) {
  const result = run('spctl', ['--assess', '-vv', ...args])
  if (result.status !== 0 || !result.output.includes('Notarized Developer ID')) {
    process.stdout.write(result.output)
    throw new ReleaseError(`Gatekeeper does not accept the ${label}`)
  }
  ok(`Gatekeeper accepts the ${label} as Notarized Developer ID`)
}

async function releaseDmg(config) {
  const appDir = path.join(root, 'out', `${appName}-mas-${DMG_ARCH}`, `${appName}.app`)
  const makeDir = path.join(root, 'out', 'make')
  const version = JSON.parse(fs.readFileSync(packagePath, 'utf8')).version

  step(`Building ${config.APPLE_BUNDLE_ID} ${version} (${DMG_ARCH}), Developer ID signed`)
  fs.rmSync(path.dirname(appDir), { recursive: true, force: true })
  await buildDeveloperId(config)
  if (!fs.existsSync(appDir)) throw new ReleaseError(`Packaging produced no ${appDir}`)

  step('Verifying the app')
  verifyDeveloperIdApp(config, appDir)

  step('Notarizing the app')
  const appZip = path.join(root, 'out', `${appName}-${version}-${DMG_ARCH}.zip`)
  fs.rmSync(appZip, { force: true })
  execFileSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', appDir, appZip])
  try {
    await notarize(config, appZip, 'the app')
  } finally {
    fs.rmSync(appZip, { force: true })
  }
  staple(appDir)
  assess(['--type', 'execute', appDir], 'app')

  step('Building the DMG')
  await forge(
    config,
    [
      'electron-forge',
      'make',
      '--skip-package',
      '--platform=mas',
      `--arch=${DMG_ARCH}`,
      '--targets=@electron-forge/maker-dmg'
    ],
    'still building the DMG'
  )
  const dmgName = fs.existsSync(makeDir)
    ? fs.readdirSync(makeDir).find((f) => f.endsWith('.dmg'))
    : null
  if (!dmgName) throw new ReleaseError('The DMG maker produced no .dmg')
  const dmgPath = path.join(makeDir, dmgName)

  const signed = run('codesign', [
    '--sign',
    config.MAC_CODESIGN_IDENTITY,
    '--timestamp',
    '--force',
    dmgPath
  ])
  if (signed.status !== 0) {
    process.stdout.write(signed.output)
    throw new ReleaseError('Could not sign the DMG')
  }
  ok(`signed ${dmgName}`)

  step('Notarizing the DMG')
  await notarize(config, dmgPath, 'the DMG')
  staple(dmgPath)
  assess(['--type', 'open', '--context', 'context:primary-signature', dmgPath], 'DMG')

  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(dmgPath)).digest('hex')
  const sizeMb = Math.round(fs.statSync(dmgPath).size / 1e6)
  console.log(`\n${dmgPath}`)
  console.log(`${sizeMb} MB  sha256 ${sha256}`)
}

async function altool(config, action, pkgPath, heartbeat) {
  const { status, output, durationMs } = await streamCommand(
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
    { cwd: root, heartbeat }
  )

  if (status !== 0) throw new ReleaseError(`altool ${action} failed`)
  took(durationMs)
  return output
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const config = loadConfig()

  if (args.dmg) return mainDmg(args, config)

  stepCount = args.checkOnly
    ? 1
    : 3 + (args.bump && args.commit ? 1 : 0) + (args.skipValidate ? 0 : 1) + (args.upload ? 1 : 0)

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
  requireSigningAccess(config.MAS_CODESIGN_IDENTITY, 'application signing identity')
  requireIdentity(config.MAS_INSTALLER_IDENTITY, 'installer signing identity')
  checkProfile(config)
  checkCorePin()
  if (config.ASC_KEY_ID && config.ASC_ISSUER_ID) await checkAppRecord(config)

  if (args.checkOnly) {
    console.log('\nPreflight passed. Nothing was built.')
    return
  }

  const buildNumber = args.bump ? bumpBuildNumber() : currentBuildNumber()

  if (args.bump && args.commit) {
    step(`Recording build ${buildNumber}`)
    commitBuildNumber(buildNumber)
  }

  step(`Building ${config.APPLE_BUNDLE_ID} build ${buildNumber}`)
  await build(config)

  step('Verifying artifacts')
  const artifacts = locateArtifacts()
  verifyArtifacts(config, artifacts)

  if (!args.skipValidate) {
    step('Validating with App Store Connect')
    await altool(config, '--validate-app', artifacts.pkgPath, 'still validating')
    ok('validation passed')
  }

  if (args.upload) {
    step('Uploading')
    await altool(config, '--upload-app', artifacts.pkgPath, 'still uploading')
    ok(`uploaded build ${buildNumber}`)
    console.log('\nThe build appears under TestFlight once processing finishes.')
  } else {
    console.log(`\n${artifacts.pkgPath}`)
    console.log('Re-run with --upload to send it to App Store Connect.')
  }

  console.log(`${ansi.dim}\nTotal time ${formatDuration(Date.now() - startedAt)}${ansi.reset}`)
}

async function mainDmg(args, config) {
  stepCount = args.checkOnly ? 1 : 6

  step('Preflight (Developer ID DMG)')
  const missing = DMG_REQUIRED.filter((key) => !config[key])
  if (missing.length) {
    throw new ReleaseError(
      `Missing configuration: ${missing.join(', ')}`,
      'Add them to .release.mac.env (see .release.mac.env.example)'
    )
  }
  ok(`bundle id ${config.APPLE_BUNDLE_ID}`)
  requireIdentity(config.MAC_CODESIGN_IDENTITY, 'Developer ID Application identity')
  requireSigningAccess(config.MAC_CODESIGN_IDENTITY, 'Developer ID Application identity')
  checkCorePin()
  checkNotaryCredentials(config)

  if (args.checkOnly) {
    console.log('\nPreflight passed. Nothing was built.')
    return
  }

  await releaseDmg(config)
  console.log(`${ansi.dim}\nTotal time ${formatDuration(Date.now() - startedAt)}${ansi.reset}`)
}

main().catch((error) => {
  console.error(`\n${ansi.red}FAILED${ansi.reset}  ${error.message}`)
  if (error.hint) console.error(`${ansi.dim}hint${ansi.reset}    ${error.hint}`)
  process.exit(1)
})
