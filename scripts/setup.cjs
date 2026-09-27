const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { compareInstalledCore } = require('./coreInstall.cjs')

const ROOT = path.resolve(__dirname, '..')
const MIN_NODE_MAJOR = 24
const SOCKET_FIREWALL = '/usr/local/bin/sfw'
const LOCAL_AI_DIR = path.join(ROOT, 'local-ai')

function step(title) {
  console.log(`\n==> ${title}`)
}

function stop(message) {
  console.error(`\n  setup: ${message}\n`)
  process.exit(1)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit', ...options })
  if (result.error) stop(`${command} could not start: ${result.error.message}`)
  if (result.status !== 0) stop(`${[command, ...args].join(' ')} failed (exit ${result.status})`)
}

function npm(args, options) {
  if (fs.existsSync(SOCKET_FIREWALL)) run(SOCKET_FIREWALL, ['npm', ...args], options)
  else run('npm', args, { shell: process.platform === 'win32', ...options })
}

function checkNode() {
  const major = Number(process.versions.node.split('.')[0])
  if (major < MIN_NODE_MAJOR) {
    stop(
      `Node ${MIN_NODE_MAJOR}+ is required (the local AI worker build crashes on ${process.versions.node}). Run: nvm use ${MIN_NODE_MAJOR}`
    )
  }
}

function installDependencies() {
  step('Installing dependencies (the pinned core is always refetched)')
  fs.rmSync(path.join(ROOT, 'node_modules', '@pear-notes', 'core'), {
    recursive: true,
    force: true
  })
  npm(['install', '--ignore-scripts', '--no-audit', '--no-fund'])
}

function verifyCore() {
  step('Checking the installed core against the pin')
  const { level, detail } = compareInstalledCore(ROOT)
  if (level === 'fail') stop(detail)
  console.log(`  ${level === 'pass' ? 'ok' : 'warning'}: ${detail}`)
}

function runPostinstall() {
  step('Downloading Electron and rebuilding native modules')
  run(process.execPath, [path.join(ROOT, 'scripts', 'postinstall.cjs')])
  if (!fs.existsSync(path.join(ROOT, 'node_modules', 'electron', 'dist'))) {
    stop('the Electron binary did not download - check the network and run npm run setup again')
  }
}

function installLocalAi() {
  if (!fs.existsSync(path.join(LOCAL_AI_DIR, 'package-lock.json'))) return
  step('Installing on-device AI dependencies')
  npm(['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: LOCAL_AI_DIR })
  step('Building the on-device AI worker')
  run(process.execPath, [path.join(ROOT, 'scripts', 'build-local-ai-worker.mjs')])
}

checkNode()
installDependencies()
verifyCore()
runPostinstall()
installLocalAi()
console.log('\n  setup: done. Start the app with npm run dev.\n')
