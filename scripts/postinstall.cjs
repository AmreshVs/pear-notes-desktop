const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const { macSdkEnv } = require('./mac-sdk-env.cjs')

const env = macSdkEnv()

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit', env })
  } catch {
    console.warn(`Warning: "${cmd}" failed (may be expected on this platform)`)
  }
}

// Ensure Electron binary is downloaded
run('node node_modules/electron/install.js')

// Rebuild native modules for DMG maker (macOS only)
if (process.platform === 'darwin') {
  const modules = ['macos-alias', 'fs-xattr']
  for (const mod of modules) {
    const dir = path.join('node_modules', mod)
    if (fs.existsSync(path.join(dir, 'binding.gyp'))) {
      run(`npx node-gyp rebuild --directory=${dir}`)
    }
  }
}

// Rebuild the device-auth addon against Electron's ABI (it loads in the main process)
const deviceAuthDir = path.join('native', 'pear-device-auth')
if (fs.existsSync(path.join(deviceAuthDir, 'binding.gyp'))) {
  if (!fs.existsSync(path.join(deviceAuthDir, 'node_modules', 'node-addon-api'))) {
    run(`npm ci --ignore-scripts --prefix ${deviceAuthDir}`)
  }
  try {
    const electronVersion = require('electron/package.json').version
    run(
      `npx node-gyp rebuild --directory=${deviceAuthDir} --target=${electronVersion} --dist-url=https://electronjs.org/headers --arch=${process.arch}`
    )
  } catch (e) {
    console.warn('Warning: could not rebuild pear-device-auth for Electron:', e.message)
  }
}
