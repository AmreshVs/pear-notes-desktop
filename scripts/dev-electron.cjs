const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const { macSdkEnv } = require('./mac-sdk-env.cjs')

const STAMP = path.join(__dirname, '..', 'dist', '.dev-build')
const POLL_MS = 300
const TIMEOUT_MS = 5 * 60 * 1000

const startedAt = Date.now()

function freshDevBuild() {
  try {
    return fs.statSync(STAMP).mtimeMs >= startedAt
  } catch {
    return false
  }
}

function launch() {
  const child = spawn('electron-forge start', { stdio: 'inherit', shell: true, env: macSdkEnv() })
  child.on('exit', (code) => process.exit(code ?? 0))
}

console.log('dev: waiting for the development build before starting Electron')
const timer = setInterval(() => {
  if (freshDevBuild()) {
    clearInterval(timer)
    launch()
  } else if (Date.now() - startedAt > TIMEOUT_MS) {
    clearInterval(timer)
    console.error('dev: no development build appeared in dist/ - check the dev:vite output')
    process.exit(1)
  }
}, POLL_MS)
