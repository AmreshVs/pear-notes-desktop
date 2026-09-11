const fs = require('fs')
const path = require('path')

const { FusesPlugin } = require('@electron-forge/plugin-fuses')
const { FuseV1Options, FuseVersion } = require('@electron/fuses')

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

  // `.release.mac.env` and `.release.mac.env.example` carry the ASC key id,
  // issuer id and codesign identity common names.
  if (filePath.startsWith('/.release.')) return true

  const top = '/' + filePath.split('/')[1]
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
    NSMicrophoneUsageDescription: `${appName} needs access to your microphone to record voice notes.`,
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

// The renderer is minified by Vite, but the main process and preload ship as
// raw .cjs with full comments and IPC channel names. Minify the packaged copies
// only - the originals on disk stay readable.
function minifyElectronEntries(buildPath) {
  const esbuild = require('esbuild')
  for (const rel of ['electron/main.cjs', 'electron/preload.cjs']) {
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
    preMake: async () => {
      fs.rmSync(path.join(__dirname, 'out', 'make'), { recursive: true, force: true })
    },

    packageAfterPrune: async (config, buildPath, electronVersion, platform, arch) => {
      const nativePlatform = platform === 'mas' ? 'darwin' : platform
      await prunePrebuilds(buildPath, nativePlatform, arch)
      if (nativePlatform === 'darwin') {
        relocateSidecarBinary(buildPath, nativePlatform, arch)
      }
      minifyElectronEntries(buildPath)
      await hardenPackagedCore(buildPath)
      stripPackageScripts(buildPath)
    }
  },

  plugins: [
    // Close off the Node-level escape hatches Electron leaves open by default.
    //
    // OnlyLoadAppFromAsar is deliberately absent: the backend runs in a Bare
    // sidecar spawned as a separate process, which reads workers/main.js and
    // node_modules/@pear-notes/core from the real filesystem. That binary has
    // no asar support, so this app cannot be packed into an archive.
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false
    })
  ]
}
