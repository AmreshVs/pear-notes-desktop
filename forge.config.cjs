const fs = require('fs')
const os = require('os')
const path = require('path')

const pkg = require('./package.json')
const { storeBuild } = require('./electron/storeBuild.cjs')
const appName = pkg.productName ?? pkg.name

const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID ?? 'com.amreshvs.pear-notes'
const APPLE_BUILD_NUMBER = process.env.APPLE_BUILD_NUMBER ?? String(storeBuild(pkg.version, pkg.buildNumber))
const isMas = process.env.MAS_BUILD === '1'
const isDeveloperIdRelease = !isMas && Boolean(process.env.MAC_CODESIGN_IDENTITY)
const DEVELOPER_ID_DISTRIBUTION = 'developer-id'

// From Partner Center -> Product identity. The Store rejects an upload whose
// identity or publisher differs from these.
const MSIX_IDENTITY = {
  name: 'AmreshVenkatesanSuresh.PearNotes-PrivateAISync',
  publisher: 'CN=B816EEFE-E307-4467-A119-53E4B4207BCA',
  publisherDisplayName: 'Amresh Venkatesan Suresh',
  displayName: 'Pear Notes - Private AI & Sync'
}

const escapeXml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// MSIX_STORE_UPLOAD=1 leaves the package unsigned; the Store signs it.
// Otherwise sign for side-loading: a hook, or a .pfx whose subject equals
// MSIX_IDENTITY.publisher (see docs/windows-test-build.md).
function msixSigning() {
  if (process.env.MSIX_STORE_UPLOAD === '1') return { sign: false }
  if (process.env.WINDOWS_SIGN_HOOK) {
    return { windowsSignOptions: { hookModulePath: process.env.WINDOWS_SIGN_HOOK } }
  }
  if (process.env.WINDOWS_CERTIFICATE_FILE) {
    return {
      windowsSignOptions: {
        certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
        certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD
      }
    }
  }
  return {}
}

function getWindowsKitVersion() {
  const programFiles = process.env['PROGRAMFILES(X86)'] || process.env.PROGRAMFILES
  if (!programFiles) return undefined
  const kitsDir = path.join(programFiles, 'Windows Kits')
  try {
    for (const kit of fs.readdirSync(kitsDir).sort().reverse()) {
      const binDir = path.join(kitsDir, kit, 'bin')
      if (!fs.existsSync(binDir)) continue
      const version = fs
        .readdirSync(binDir)
        .filter((d) => /^\d+\.\d+\.\d+\.\d+$/.test(d))
        .sort()
        .pop()
      if (version) return version
    }
  } catch {
    return undefined
  }
}

function entitlements(name) {
  return path.join(__dirname, 'build', name)
}

// Everything here was shipping inside Contents/Resources/app: the whole
// unminified React source tree next to the built bundle, the release env file
// (App Store Connect key id, issuer id, certificate names), agent configs and
// the build tooling. None of it is read at runtime.
//
// Deliberately NOT ignored: `build/` (main.cjs reads build/icon.png for the
// tray) and `native/` (main.cjs requires native/pear-device-auth).
const IGNORED_TOP_LEVEL = new Set([
  // Supplying `ignore` replaces @electron/packager's own defaults, so the
  // things it used to drop have to be named explicitly. `.git` is the
  // important one - it carries the entire source history.
  '/.git',
  '/.gitattributes',
  '/.DS_Store',
  '/out',
  '/storage',
  // `npm run harden-core` stages a preview copy here; it must never be packaged
  // (it can carry a read-only .git that makes osx-sign fail with Permission denied).
  '/.core-hardened',
  '/.core-build',
  '/src',
  '/docs',
  '/flatpak',
  '/flatpak-build',
  '/flatpak-repo',
  '/.flatpak-builder',
  '/test',
  '/scripts',
  '/.agents',
  '/.argent',
  '/.claude',
  '/.codex',
  '/.gemini',
  '/.vscode',
  '/.env',
  '/.gitignore',
  '/.mcp.json',
  '/.prettierrc.json',
  '/README.md',
  '/eslint.config.js',
  '/forge.config.cjs',
  '/vite.config.js',
  '/skills-lock.json',
  '/package-lock.json'
])

function cliFlag(name) {
  const args = process.argv
  for (let i = 0; i < args.length; i++) {
    if (args[i] === `--${name}`) return args[i + 1]
    if (args[i].startsWith(`--${name}=`)) return args[i].slice(name.length + 3)
  }
  return undefined
}

const targetPlatform = (() => {
  const platform = cliFlag('platform') ?? process.platform
  return platform === 'mas' ? 'darwin' : platform
})()

const PREBUILD_PLATFORMS = new Set(['android', 'darwin', 'ios', 'linux', 'win32'])

function isForeignPrebuild(segments) {
  const at = segments.indexOf('prebuilds')
  if (at < 2 || at === segments.length - 1) return false
  const packageRoot =
    segments[at - 2] === 'node_modules' ||
    (segments[at - 3] === 'node_modules' && segments[at - 2].startsWith('@'))
  if (!packageRoot) return false
  const platform = segments[at + 1].split('-')[0]
  return PREBUILD_PLATFORMS.has(platform) && platform !== targetPlatform
}

function ignorePackagedFile(filePath) {
  if (!filePath) return false

  // Supplying a custom `ignore` REPLACES @electron/packager's defaults, which
  // dropped VCS dirs. `@pear-notes/core` is a github: dependency, so npm clones
  // it and leaves a `.git` in node_modules — its read-only objects make
  // `codesign` fail with "Permission denied", silently shipping an unsigned app.
  // Exclude any `.git` segment anywhere in the tree.
  const segments = filePath.split('/')
  if (segments.includes('.git') || segments.includes('.github')) return true

  // `.release.mac.env` and `.release.mac.env.example` carry the ASC key id,
  // issuer id and codesign identity common names.
  if (filePath.startsWith('/.release.')) return true
  if (filePath.startsWith('/build/msix-assets')) return true
  if (filePath.startsWith('/build/dmg-background')) return true

  const top = '/' + segments[1]
  if (IGNORED_TOP_LEVEL.has(top)) return true

  // Core is consumed from node_modules by the Bare worker; its test suite is not.
  if (filePath.startsWith('/node_modules/@pear-notes/core/tests')) return true

  if (isForeignPrebuild(segments)) return true

  return false
}

let packagerConfig = {
  name: appName,
  executableName: 'PearNotes',
  icon: path.join(__dirname, 'build', 'icon'),
  ignore: ignorePackagedFile,
  appBundleId: APPLE_BUNDLE_ID,
  appCategoryType: 'public.app-category.productivity',
  appCopyright: `Copyright © ${new Date().getFullYear()} ${appName}`,
  buildVersion: APPLE_BUILD_NUMBER,
  protocols: [{ name: appName, schemes: [pkg.name] }],
  derefSymlinks: true,
  extendInfo: {
    NSMicrophoneUsageDescription: `${appName} needs access to your microphone to record voice notes and for voice typing. Audio stays on this device.`,
    NSHumanReadableCopyright: `Copyright © ${new Date().getFullYear()} ${appName}`,
    ITSAppUsesNonExemptEncryption: false,
    // Electron's stock Info.plist sets NSAllowsArbitraryLoads: true. The app
    // only needs the loopback blob server, which is what the iOS build already
    // declares - match it here rather than allowing arbitrary cleartext.
    NSAppTransportSecurity: {
      NSAllowsArbitraryLoads: false,
      NSAllowsLocalNetworking: true
    }
  }
}

if (isMas && process.env.MAS_CODESIGN_IDENTITY) {
  packagerConfig = {
    ...packagerConfig,
    osxSign: {
      identity: process.env.MAS_CODESIGN_IDENTITY,
      provisioningProfile: process.env.MAS_PROVISIONING_PROFILE,
      preAutoEntitlements: true,
      optionsForFile: (filePath) => ({
        entitlements: filePath.endsWith(`${appName}.app`)
          ? entitlements('entitlements.mas.plist')
          : entitlements('entitlements.mas.inherit.plist')
      })
    }
  }
} else if (isDeveloperIdRelease) {
  packagerConfig = developerIdPackagerConfig(packagerConfig)
}

// The DMG is the Mac App Store build (platform `mas`, same sandbox, same bundle
// id) re-signed with Developer ID, so both distributions share one container
// and a user can move between them without losing the vault. Notarization and
// stapling happen in scripts/release-mac.mjs --dmg.
function developerIdPackagerConfig(base) {
  const identity = process.env.MAC_CODESIGN_IDENTITY
  const teamId = identity.match(/\(([A-Z0-9]{10})\)$/)?.[1]
  if (!teamId) throw new Error(`Cannot read the team id from MAC_CODESIGN_IDENTITY: ${identity}`)

  return {
    ...base,
    extendInfo: {
      ...base.extendInfo,
      ElectronTeamID: teamId,
      PearNotesDistribution: DEVELOPER_ID_DISTRIBUTION
    },
    osxSign: {
      identity,
      continueOnError: false,
      // application-identifier (what osx-sign would inject) is a restricted
      // entitlement that needs a provisioning profile outside the App Store.
      preAutoEntitlements: false,
      optionsForFile: (filePath) =>
        filePath.endsWith(`${appName}.app`)
          ? {
              entitlements: developerIdEntitlements(teamId),
              requirements: sharedDesignatedRequirement(teamId)
            }
          : { entitlements: entitlements('entitlements.mas.inherit.plist') }
    }
  }
}

function developerIdEntitlements(teamId) {
  const source = fs.readFileSync(entitlements('entitlements.mas.plist'), 'utf8')
  const group = `${teamId}.${APPLE_BUNDLE_ID}`
  const withGroup = source.replace(
    '</dict>',
    `    <key>com.apple.security.application-groups</key>\n    <array>\n        <string>${group}</string>\n    </array>\n</dict>`
  )
  const file = path.join(os.tmpdir(), `pear-notes-developer-id-${process.pid}.plist`)
  fs.writeFileSync(file, withGroup)
  return file
}

// Keychain items record their creator's designated requirement. Accepting the
// App Store and TestFlight signatures too lets the App Store build read the
// safeStorage key a DMG install created, without a keychain prompt.
function sharedDesignatedRequirement(teamId) {
  return (
    `=designated => identifier "${APPLE_BUNDLE_ID}" and anchor apple generic and (` +
    'certificate leaf[field.1.2.840.113635.100.6.1.9] or ' +
    'certificate leaf[field.1.2.840.113635.100.6.1.25.1] or ' +
    '(certificate 1[field.1.2.840.113635.100.6.2.6] and ' +
    'certificate leaf[field.1.2.840.113635.100.6.1.13] and ' +
    `certificate leaf[subject.OU] = "${teamId}"))`
  )
}

const MSIX_MANIFEST_VARIABLES = {
  packageIdentity: MSIX_IDENTITY.name,
  publisher: MSIX_IDENTITY.publisher,
  publisherDisplayName: MSIX_IDENTITY.publisherDisplayName,
  packageDisplayName: escapeXml(MSIX_IDENTITY.displayName),
  appDisplayName: appName,
  appExecutable: 'PearNotes.exe',
  packageBackgroundColor: '#1F2430',
  packageMinOSVersion: '10.0.19041.0',
  packageMaxOSVersionTested: '10.0.26100.0'
}

// Must match STARTUP_TASK_ID in electron/main.cjs.
const MSIX_STARTUP_TASK_ID = 'PearNotesStartup'

// The stock manifest template has no startup task, and a packaged app's
// Run-key write is virtualised, so "Start at login" needs this extension.
function withStartupTask(manifestXml) {
  const withNamespace = manifestXml.replace(
    /\s+IgnorableNamespaces="([^"]*)"/,
    '\n  xmlns:uap5="http://schemas.microsoft.com/appx/manifest/uap/windows10/5"\n  IgnorableNamespaces="$1 uap5"'
  )
  const extension = [
    '      <Extensions>',
    '        <uap5:Extension Category="windows.startupTask" Executable="app\\' +
      MSIX_MANIFEST_VARIABLES.appExecutable +
      '" EntryPoint="Windows.FullTrustApplication">',
    `          <uap5:StartupTask TaskId="${MSIX_STARTUP_TASK_ID}" Enabled="false" DisplayName="${appName}" />`,
    '        </uap5:Extension>',
    '      </Extensions>'
  ].join('\n')
  const result = withNamespace.replace(
    '</uap:VisualElements>',
    `</uap:VisualElements>\n${extension}`
  )
  if (
    result === manifestXml ||
    !result.includes('xmlns:uap5') ||
    !result.includes('uap5:StartupTask')
  ) {
    throw new Error('MSIX manifest template changed; could not add the startup task')
  }
  return result
}

async function msixConfig(targetArch) {
  const { manifest } = require('electron-windows-msix/lib/manifestation.js')
  const { toMsixArch } = require('@electron-forge/maker-msix/dist/util/arch.js')
  const manifestVariables = {
    packageDescription: pkg.description,
    packageVersion: pkg.version,
    targetArch: toMsixArch(targetArch),
    ...MSIX_MANIFEST_VARIABLES
  }
  const manifestXml = await manifest({ manifestVariables })
  const manifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pear-notes-msix-'))
  const appManifest = path.join(manifestDir, 'AppxManifest.xml')
  fs.writeFileSync(appManifest, withStartupTask(manifestXml))
  return {
    windowsKitVersion: getWindowsKitVersion(),
    packageAssets: path.join(__dirname, 'build', 'msix-assets'),
    appManifest,
    manifestVariables: MSIX_MANIFEST_VARIABLES,
    ...msixSigning()
  }
}

const makers = [
  {
    name: '@electron-forge/maker-dmg',
    platforms: isDeveloperIdRelease ? ['mas'] : ['darwin'],
    config: {
      format: 'ULFO',
      icon: path.join(__dirname, 'build', 'icon.icns'),
      background: path.join(__dirname, 'build', 'dmg-background.png'),
      iconSize: 128,
      overwrite: true,
      additionalDMGOptions: { window: { size: { width: 660, height: 400 } } },
      contents: (opts) => [
        { x: 180, y: 200, type: 'file', path: opts.appPath },
        { x: 480, y: 200, type: 'link', path: '/Applications' }
      ]
    }
  },
  {
    name: '@electron-forge/maker-msix',
    platforms: ['win32'],
    config: msixConfig
  },
  {
    name: '@electron-forge/maker-zip',
    platforms: ['darwin', 'linux']
  },
  {
    name: '@electron-forge/maker-deb',
    platforms: ['linux'],
    config: {
      options: {
        name: 'pear-notes',
        bin: 'PearNotes',
        productName: appName,
        icon: path.join(__dirname, 'build', 'icon.png')
      }
    }
  },
  {
    name: '@electron-forge/maker-rpm',
    platforms: ['linux'],
    config: {
      options: {
        name: 'pear-notes',
        bin: 'PearNotes',
        productName: appName,
        icon: path.join(__dirname, 'build', 'icon.png')
      }
    }
  }
]

if (isMas) {
  makers.push({
    name: '@electron-forge/maker-pkg',
    platforms: ['mas'],
    config: {
      identity: process.env.MAS_INSTALLER_IDENTITY
    }
  })
}

async function prunePrebuilds(base, platform, arch) {
  const dirents = await readdir(path.join(base, 'prebuilds'))
  for (const entry of dirents) {
    if (entry.name === `${platform}-${arch}` || entry.name.endsWith('-universal')) continue
    await fs.promises.rm(path.join(base, 'prebuilds', entry.name), { recursive: true, force: true })
  }

  await Promise.all(
    (await listPackageDirs(path.join(base, 'node_modules'))).map((dir) =>
      prunePrebuilds(dir, platform, arch)
    )
  )
}

const LOCAL_AI_DEFERRED_ADDONS = new Set(['bare-ffmpeg'])

async function pruneUnusedLocalAiAddons(buildPath) {
  const runtimeDir = path.join(buildPath, 'local-ai')
  const bundlePath = path.join(runtimeDir, 'qvac', 'worker.bundle.js')
  if (!fs.existsSync(bundlePath)) return
  const source = fs.readFileSync(bundlePath, 'utf8')
  const used = new Set()
  for (const match of source.matchAll(/\/local-ai\/node_modules\/((?:@[^/"\\]+\/)?[^/"\\]+)\//g)) {
    used.add(match[1])
  }
  const modulesDir = path.join(runtimeDir, 'node_modules')
  for (const dir of await listPackageDirs(modulesDir)) {
    const name = path.relative(modulesDir, dir).split(path.sep).join('/')
    const prebuildsDir = path.join(dir, 'prebuilds')
    const unusedQvacAddon = name.startsWith('@qvac/') && !used.has(name)
    if ((unusedQvacAddon || LOCAL_AI_DEFERRED_ADDONS.has(name)) && fs.existsSync(prebuildsDir)) {
      await fs.promises.rm(prebuildsDir, { recursive: true, force: true })
    }
  }
  await fs.promises.rm(bundlePath, { force: true })
}

// @qvac/asr-ggml alone ships a 37 MB test/ fixture tree.
const PACKAGE_DEV_DIRS = ['test', 'tests', '__tests__', 'example', 'examples']

async function prunePackageDevDirs(modulesDir) {
  for (const dir of await listPackageDirs(modulesDir)) {
    for (const name of PACKAGE_DEV_DIRS) {
      await fs.promises.rm(path.join(dir, name), { recursive: true, force: true })
    }
    await prunePackageDevDirs(path.join(dir, 'node_modules'))
  }
}

async function listPackageDirs(modulesDir) {
  const dirs = []
  for (const entry of await readdir(modulesDir)) {
    if (!entry.isDirectory()) continue
    const entryPath = path.join(modulesDir, entry.name)
    if (entry.name.startsWith('@')) {
      for (const scoped of await readdir(entryPath)) {
        if (scoped.isDirectory()) dirs.push(path.join(entryPath, scoped.name))
      }
      continue
    }
    dirs.push(entryPath)
  }
  return dirs
}

async function readdir(dir) {
  try {
    return await fs.promises.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
}

function relocateSidecarBinary(buildPath, platform, arch) {
  const sidecarDir = path.join(buildPath, 'node_modules', 'bare-sidecar')
  if (!fs.existsSync(sidecarDir)) return

  const executable = platform === 'win32' ? 'bare.exe' : 'bare'
  const source = path.join(sidecarDir, 'prebuilds', `${platform}-${arch}`, executable)
  if (!fs.existsSync(source)) {
    throw new Error(`bare-sidecar prebuild missing for ${platform}-${arch}: ${source}`)
  }

  const contentsDir = path.resolve(buildPath, '..', '..')
  if (path.basename(contentsDir) !== 'Contents') {
    throw new Error(`unexpected bundle layout, cannot relocate bare sidecar: ${contentsDir}`)
  }

  const target = path.join(contentsDir, 'MacOS', executable)
  fs.copyFileSync(source, target)
  fs.chmodSync(target, 0o755)
  fs.rmSync(path.join(sidecarDir, 'prebuilds'), { recursive: true, force: true })

  fs.writeFileSync(
    path.join(sidecarDir, 'lib', 'bare.js'),
    [
      "const fs = require('fs')",
      "const path = require('path')",
      '',
      `const relocated = path.join(path.dirname(process.execPath), ${JSON.stringify(executable)})`,
      '',
      'function prebuild() {',
      '  try {',
      "    return require('require-asset')('#bare', __filename)",
      '  } catch {',
      '    return relocated',
      '  }',
      '}',
      '',
      'module.exports = fs.existsSync(relocated) ? relocated : prebuild()',
      ''
    ].join('\n')
  )
}

const LOCAL_AI_RUNTIME_EXECUTABLE = 'bare-local-ai'

// The on-device AI SDK starts its worker with bare-runtime, whose binary sits in
// node_modules/bare-runtime-<platform>-<arch>/bin. The App Store sandbox only
// lets the app launch executables inside Contents/MacOS, so move it there and
// point the host package at the new location.
function relocateLocalAiRuntimeBinary(buildPath, platform, arch) {
  const modulesDir = path.join(buildPath, 'local-ai', 'node_modules')
  if (!fs.existsSync(modulesDir)) return

  const hostPrefix = `bare-runtime-${platform}-`
  const hostDirs = fs
    .readdirSync(modulesDir)
    .filter((name) => name.startsWith(hostPrefix))
    .map((name) => path.join(modulesDir, name))
  const hostDir = path.join(modulesDir, `${hostPrefix}${arch}`)

  for (const dir of hostDirs) {
    if (dir !== hostDir) fs.rmSync(path.join(dir, 'bin'), { recursive: true, force: true })
  }

  const source = path.join(hostDir, 'bin', 'bare')
  if (!fs.existsSync(source)) {
    throw new Error(`bare-runtime binary missing for ${platform}-${arch}: ${source}`)
  }

  const contentsDir = path.resolve(buildPath, '..', '..')
  if (path.basename(contentsDir) !== 'Contents') {
    throw new Error(`unexpected bundle layout, cannot relocate local AI runtime: ${contentsDir}`)
  }

  const target = path.join(contentsDir, 'MacOS', LOCAL_AI_RUNTIME_EXECUTABLE)
  fs.copyFileSync(source, target)
  fs.chmodSync(target, 0o755)
  fs.rmSync(path.join(hostDir, 'bin'), { recursive: true, force: true })

  fs.writeFileSync(
    path.join(hostDir, 'index.js'),
    [
      "const path = require('path')",
      '',
      `exports.bare = path.join(path.dirname(process.execPath), ${JSON.stringify(LOCAL_AI_RUNTIME_EXECUTABLE)})`,
      ''
    ].join('\n')
  )
}

// The renderer is minified by Vite, but the main process and preload ship as
// raw .cjs with full comments and IPC channel names. Minify the packaged copies
// only - the originals on disk stay readable.
function minifyElectronEntries(buildPath) {
  const esbuild = require('esbuild')
  for (const rel of ['electron/main.cjs', 'electron/preload.cjs', 'electron/localAi.cjs']) {
    const file = path.join(buildPath, rel)
    if (!fs.existsSync(file)) continue
    const source = fs.readFileSync(file, 'utf8')
    const { code } = esbuild.transformSync(source, {
      loader: 'js',
      format: 'cjs',
      platform: 'node',
      minify: true,
      // `pure` lets the minifier drop diagnostic logging; console.error stays.
      pure: ['console.log', 'console.debug', 'console.info']
    })
    fs.writeFileSync(file, code)
  }
}

// The Bare sidecar runs @pear-notes/core as raw ESM off disk, so - unlike the
// Vite-minified renderer - core ships readable unless transformed here. This
// minifies and (by default) obfuscates the packaged copy in place; the repo
// copy a dev runs against is untouched. Toggle with PEAR_OBFUSCATE=0.
async function hardenPackagedCore(buildPath) {
  const { hardenCore } = require('./scripts/harden-core.cjs')
  const coreDir = path.join(buildPath, 'node_modules', '@pear-notes', 'core')
  const result = await hardenCore(coreDir)
  console.log(
    `[harden-core] ${result.mode}: ${result.files} files, ` +
      `${(result.before / 1024).toFixed(0)} KB -> ${(result.after / 1024).toFixed(0)} KB ` +
      `(${result.delta >= 0 ? '+' : ''}${result.delta}%)`
  )
}

function stripPackageScripts(buildPath) {
  const manifestPath = path.join(buildPath, 'package.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  if (!manifest.scripts) return
  delete manifest.scripts
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

module.exports = {
  packagerConfig,

  makers,

  hooks: {
    generateAssets: async () => {
      if (!fs.existsSync(path.join(__dirname, 'local-ai', 'node_modules', '@qvac', 'sdk'))) {
        if (isMas || isDeveloperIdRelease) {
          throw new Error(
            'local-ai dependencies are not installed, so this build would ship without on-device AI. Run npm ci in local-ai first.'
          )
        }
        return
      }
      require('child_process').execFileSync(
        process.execPath,
        [path.join(__dirname, 'scripts', 'build-local-ai-worker.mjs')],
        { stdio: 'inherit' }
      )
    },

    preMake: async () => {
      fs.rmSync(path.join(__dirname, 'out', 'make'), { recursive: true, force: true })
    },

    packageAfterPrune: async (config, buildPath, electronVersion, platform, arch) => {
      const nativePlatform = platform === 'mas' ? 'darwin' : platform
      await prunePrebuilds(buildPath, nativePlatform, arch)
      await pruneUnusedLocalAiAddons(buildPath)
      await prunePrebuilds(path.join(buildPath, 'local-ai'), nativePlatform, arch)
      await prunePackageDevDirs(path.join(buildPath, 'node_modules'))
      await prunePackageDevDirs(path.join(buildPath, 'local-ai', 'node_modules'))
      if (nativePlatform === 'darwin') {
        relocateSidecarBinary(buildPath, nativePlatform, arch)
        relocateLocalAiRuntimeBinary(buildPath, nativePlatform, arch)
      }
      minifyElectronEntries(buildPath)
      await hardenPackagedCore(buildPath)
      stripPackageScripts(buildPath)
    }
  },

  // No @electron-forge/plugin-fuses. It does not compose with this app's signing:
  //   - resetAdHocDarwinSignature:false -> osx-sign fails on the fuse-invalidated
  //     Electron binaries (it won't --force over an invalid sig) and silently ships
  //     the app UNSIGNED (caught only at codesign --verify).
  //   - resetAdHocDarwinSignature:true  -> @electron/fuses runs its own ad-hoc
  //     codesign whose app-path guess (`path.split('.app')[0] + '.app'`) mangles the
  //     MAS temp-staging path to `.../T/com.app` and aborts the build.
  // Builds <=20 shipped signed with no fuses, and under the Mac App Store sandbox +
  // hardened runtime the RunAsNode / Node-CLI-inspect / NODE_OPTIONS escape hatches
  // these fuses close are already constrained. If a non-MAS Developer-ID build is
  // ever added, flip fuses on the FINAL signed .app via the @electron/fuses CLI and
  // re-sign, rather than through this plugin.
  plugins: []
}
