const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

function run (cmd) {
  try {
    execSync(cmd, { stdio: 'inherit' })
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
