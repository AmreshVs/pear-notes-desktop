const fs = require('fs')
const path = require('path')

const pkg = require('./package.json')
const appName = pkg.productName ?? pkg.name

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

let packagerConfig = {
  name: appName,
  icon: path.join(__dirname, 'build', 'icon'),
  protocols: [{ name: appName, schemes: [pkg.name] }],
  derefSymlinks: true,
  extendInfo: {
    NSMicrophoneUsageDescription: `${appName} needs access to your microphone to record voice notes.`
  }
}

if (process.env.MAC_CODESIGN_IDENTITY) {
  packagerConfig = {
    ...packagerConfig,
    osxSign: {
      identity: process.env.MAC_CODESIGN_IDENTITY,
      optionsForFile: () => ({
        entitlements: path.join(__dirname, 'build', 'entitlements.mac.plist')
      })
    },
    osxNotarize: {
      tool: 'notarytool',
      keychainProfile: process.env.KEYCHAIN_PROFILE
    }
  }
}

module.exports = {
  packagerConfig,

  makers: [
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
      config: {
        options: {
          icon: path.join(__dirname, 'build', 'icon.png')
        }
      }
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          icon: path.join(__dirname, 'build', 'icon.png')
        }
      }
    }
  ],

  hooks: {
    preMake: async () => {
      fs.rmSync(path.join(__dirname, 'out', 'make'), { recursive: true, force: true })
    }
  },

  plugins: [
    {
      name: 'electron-forge-plugin-prune-prebuilds',
      config: {}
    }
  ]
}
