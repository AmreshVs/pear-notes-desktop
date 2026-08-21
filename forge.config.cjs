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

let packagerConfig = {
  name: appName,
  icon: path.join(__dirname, 'build', 'icon'),
  appBundleId: APPLE_BUNDLE_ID,
  appCategoryType: 'public.app-category.productivity',
  appCopyright: `Copyright © ${new Date().getFullYear()} ${appName}`,
  buildVersion: APPLE_BUILD_NUMBER,
  protocols: [{ name: appName, schemes: [pkg.name] }],
  derefSymlinks: true,
  extendInfo: {
    NSMicrophoneUsageDescription: `${appName} needs access to your microphone to record voice notes.`,
    NSHumanReadableCopyright: `Copyright © ${new Date().getFullYear()} ${appName}`,
    ITSAppUsesNonExemptEncryption: false
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
      stripPackageScripts(buildPath)
    }
  },

  plugins: []
}
