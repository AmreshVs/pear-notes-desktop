const fs = require('fs')
const path = require('path')

const pkg = require('./package.json')
const appName = pkg.productName ?? pkg.name

const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID ?? 'com.amreshvs.pear-notes'
const APPLE_BUILD_NUMBER = process.env.APPLE_BUILD_NUMBER ?? String(pkg.masBuildNumber ?? '1')
const isMas = process.env.MAS_BUILD === '1'

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

  const top = '/' + segments[1]
  if (IGNORED_TOP_LEVEL.has(top)) return true

  // Core is consumed from node_modules by the Bare worker; its test suite is not.
  if (filePath.startsWith('/node_modules/@pear-notes/core/tests')) return true

  return false
}

let packagerConfig = {
  name: appName,
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
} else if (process.env.MAC_CODESIGN_IDENTITY) {
  packagerConfig = {
    ...packagerConfig,
    osxSign: {
      identity: process.env.MAC_CODESIGN_IDENTITY,
      optionsForFile: () => ({
        entitlements: entitlements('entitlements.mac.plist')
      })
    },
    osxNotarize: {
      tool: 'notarytool',
      keychainProfile: process.env.KEYCHAIN_PROFILE
    }
  }
}

const makers = [
  {
    name: '@electron-forge/maker-dmg',
    platforms: ['darwin'],
    config: {}
  },
  {
    name: '@electron-forge/maker-msix',
    platforms: ['win32'],
    config: {
      windowsKitVersion: getWindowsKitVersion(),
      ...(process.env.WINDOWS_SIGN_HOOK
        ? {
            windowsSignOptions: {
              hookModulePath: process.env.WINDOWS_SIGN_HOOK
            }
          }
        : {})
    }
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
        icon: path.join(__dirname, 'build', 'icon.png')
      }
    }
  },
  {
    name: '@electron-forge/maker-rpm',
    platforms: ['linux'],
    config: {
      options: {
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
      require('child_process').execFileSync(
        process.execPath,
        [path.join(__dirname, 'scripts', 'patch-hypercore.mjs')],
        { stdio: 'inherit' }
      )
      if (!fs.existsSync(path.join(__dirname, 'local-ai', 'node_modules', '@qvac', 'sdk'))) {
        if (isMas) {
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
